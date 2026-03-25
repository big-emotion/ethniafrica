/**
 * Country Parser - Parse country files following modele-pays.txt
 */

import type {
  Country,
  CountryContent,
  ParsedFile,
  ParseError,
  ParseWarning,
  HistoricalNamesSection,
  MajorPeopleEntry,
  CultureSection,
  HistoricalFactsSection,
  DemographicsSection,
  PeopleDemographicEntry,
  PeopleId,
  LanguageFamilyId,
  Kingdom,
} from "@/types/afrik";
import {
  extractIdentifier,
  parseSection,
  parseSections,
  extractRelations,
} from "../parser";

/**
 * Strip duplicate parenthetical from country name.
 * "Burkina Faso (Burkina Faso)" → "Burkina Faso"
 * "République du Zimbabwe (Republic of Zimbabwe)" → unchanged
 */
function cleanCountryName(raw: string): string {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (match && match[1].trim() === match[2].trim()) {
    return match[1].trim();
  }
  return raw.trim();
}

/**
 * Parse language reference string into LanguageReference array.
 * "Français (langue officielle, fra), Mooré (mos), Dioula (dyu)"
 * → [{ name: "Français", isoCode: "fra", isPrimary: true }, ...]
 *
 * Splits on commas NOT inside parentheses to handle "Français (langue officielle, fra)".
 */
function parseLanguagesFromString(
  langStr: string
): { name: string; isoCode?: string; isPrimary?: boolean }[] {
  // Split on commas that are not inside parentheses (depth tracking)
  const rawParts: string[] = [];
  let depth = 0;
  let current = "";

  for (let i = 0; i < langStr.length; i++) {
    const c = langStr[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;

    if (c === "," && depth === 0) {
      if (current.trim()) rawParts.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  if (current.trim()) rawParts.push(current.trim());

  const result: { name: string; isoCode?: string; isPrimary?: boolean }[] = [];

  for (const part of rawParts) {
    if (!part) continue;

    // Extract ISO 639-3 code: last 3-lowercase-letter token inside parens
    const isoMatch = part.match(/\((?:[^)]*,\s*)?([a-z]{3})\)/);
    const isoCode = isoMatch ? isoMatch[1] : undefined;

    const isOfficial = /officiel/i.test(part);

    // Clean name: remove all parenthetical content
    const cleanName = part.replace(/\s*\([^)]*\)/g, "").trim();
    if (!cleanName) continue;

    result.push({
      name: cleanName,
      isoCode,
      isPrimary: isOfficial || undefined,
    });
  }

  return result;
}

/**
 * Map raw parsed historical names (French keys) to HistoricalNamesSection (camelCase).
 */
function mapHistoricalNames(
  raw: Record<string, unknown>
): HistoricalNamesSection {
  return {
    antiquity: (raw["Antiquité"] || raw["Antiquite"]) as string | undefined,
    middleAges: (raw["Moyen Âge"] || raw["Moyen Age"]) as string | undefined,
    precolonial: (raw["Époque précoloniale"] || raw["Epoque precoloniale"]) as
      | string
      | undefined,
    colonization: raw["Colonisation"] as string | undefined,
    contemporary: (raw["Période contemporaine"] ||
      raw["Periode contemporaine"]) as string | undefined,
  };
}

/**
 * Map raw parsed culture section (French keys) to CultureSection (camelCase).
 */
function mapCultureSection(raw: Record<string, unknown>): CultureSection {
  const langStr = raw["Langues principales (avec ISO 639-3)"] as
    | string
    | undefined;
  const mainLanguages = langStr ? parseLanguagesFromString(langStr) : undefined;

  return {
    mainLanguages:
      mainLanguages && mainLanguages.length > 0 ? mainLanguages : undefined,
    culturalTraditions: raw["Traditions culturelles"] as string | undefined,
    dominantReligions: raw["Religions dominantes"] as string | undefined,
    lifestyles: (raw["Modes de vie"] || raw["Mode de vie"]) as
      | string
      | undefined,
    socialOrganization: (raw["Organisation sociale"] ||
      raw["Organisation sociétale"]) as string | undefined,
    regionalRelations: (raw["Relations régionales"] ||
      raw["Relations regionales"]) as string | undefined,
  };
}

/**
 * Map raw parsed historical facts (French keys) to HistoricalFactsSection (camelCase).
 */
function mapHistoricalFacts(
  raw: Record<string, unknown>
): HistoricalFactsSection {
  return {
    ancientPeriods: (raw["Périodes anciennes"] || raw["Periodes anciennes"]) as
      | string
      | undefined,
    middleAges: (raw["Moyen Âge"] || raw["Moyen Age"]) as string | undefined,
    precolonial: (raw["Époque précoloniale"] || raw["Epoque precoloniale"]) as
      | string
      | undefined,
    colonization: raw["Colonisation"] as string | undefined,
    independenceStruggle: (raw["Lutte pour l'indépendance"] ||
      raw["Lutte pour l'independance"]) as string | undefined,
    postIndependence: (raw["Période post-indépendance"] ||
      raw["Periode post-independance"]) as string | undefined,
  };
}

/**
 * Parse DONNÉES DÉMOGRAPHIQUES section with ### Peuple : Name blocks.
 */
function parseDemographicsContent(content: string): DemographicsSection {
  const peoples: PeopleDemographicEntry[] = [];

  // Split by ### headers (### Peuple : Name or ### Autres peuples)
  const blockPattern = /^###\s+(?:Peuple\s*:\s*(.+)|Autres peuples)\s*$/gm;
  const blockMatches: Array<{ name: string; startIndex: number }> = [];

  let m;
  while ((m = blockPattern.exec(content)) !== null) {
    const name = m[1]?.trim() || "Autres peuples";
    blockMatches.push({ name, startIndex: m.index });
  }

  for (let i = 0; i < blockMatches.length; i++) {
    const block = blockMatches[i];
    const endIndex =
      i + 1 < blockMatches.length
        ? blockMatches[i + 1].startIndex
        : content.length;
    const blockContent = content.slice(block.startIndex, endIndex);

    const entry: PeopleDemographicEntry = { name: block.name };

    const popMatch = blockContent.match(/Population\s*:\s*([\d\s]+)/);
    if (popMatch) {
      const popNum = parseInt(popMatch[1].replace(/\s/g, ""), 10);
      if (!isNaN(popNum)) entry.population = popNum;
    }

    const pctMatch = blockContent.match(
      /Pourcentage dans le pays\s*:\s*(\d+(?:[.,]\d+)?)%/
    );
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1].replace(",", "."));
      if (!isNaN(pct)) entry.percentageInCountry = pct;
    }

    const pctAfricaMatch = blockContent.match(
      /Pourcentage en Afrique\s*:\s*(\d+(?:[.,]\d+)?)%/
    );
    if (pctAfricaMatch) {
      const pctAfrica = parseFloat(pctAfricaMatch[1].replace(",", "."));
      if (!isNaN(pctAfrica)) entry.percentageInAfrica = pctAfrica;
    }

    const idMatch = blockContent.match(/PPL_[A-Z_]+/);
    if (idMatch) entry.peopleId = idMatch[0] as PeopleId;

    const regionMatch = blockContent.match(/Région\s*:\s*([^\n]+)/);
    if (regionMatch) entry.region = regionMatch[1].trim();

    const familyMatch = blockContent.match(/FLG_[A-Z_]+/);
    if (familyMatch) entry.languageFamily = familyMatch[0] as LanguageFamilyId;

    peoples.push(entry);
  }

  return { peoples };
}

/**
 * Parse a country file content into Country object
 */
export function parseCountryFile(content: string): ParsedFile<Country> {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  try {
    // 1. Extract stable identifier (REQUIRED)
    let id: string;
    try {
      id = extractIdentifier(content, "ISO_COUNTRY");
    } catch (error) {
      errors.push({
        type: "missing_id",
        message: "Country ISO code is required",
      });
      return { success: false, errors, warnings };
    }

    // 2. Extract critical fields from header section
    const headerSection = parseSection(content, "Nom du pays");
    if (!headerSection) {
      errors.push({
        type: "missing_section",
        message: 'Header section "Nom du pays" is required',
        section: "Nom du pays",
      });
      return { success: false, errors, warnings };
    }

    const nameFrRaw = (headerSection["Nom officiel actuel"] || "") as string;
    const nameFr = cleanCountryName(nameFrRaw);
    const etymology = headerSection["Étymologie du nom"];
    const nameOriginActor =
      headerSection["Personne / peuple / administration à l'origine du nom"];

    // 3. Parse all sections into JSONB content (evolutionary)
    const allSections = parseSections(content);
    const countryContent: CountryContent = {};

    // Section 1: Historical names — map French keys to camelCase
    const historicalNamesSection = parseSection(
      content,
      "1. Appellations historiques et origines du nom"
    );
    if (historicalNamesSection && !Array.isArray(historicalNamesSection)) {
      countryContent.historicalNames = mapHistoricalNames(
        historicalNamesSection as Record<string, unknown>
      );
    }

    // Section 2: Kingdoms
    const kingdomsSection = parseSection(
      content,
      "2. Civilisations, royaumes et entités politiques historiques"
    );
    if (
      kingdomsSection &&
      !Array.isArray(kingdomsSection) &&
      kingdomsSection.kingdoms
    ) {
      countryContent.kingdoms = kingdomsSection.kingdoms as Kingdom[];
    }

    // Section 3: Major peoples
    const majorPeoplesSection = parseSection(content, "3. Peuples majeurs");
    if (majorPeoplesSection && Array.isArray(majorPeoplesSection)) {
      countryContent.majorPeoples = majorPeoplesSection as MajorPeopleEntry[];
    }

    // Section 5: Culture — map French keys to camelCase + parse languages
    const cultureSectionRaw = parseSection(
      content,
      "5. Culture, modes de vie, langues, spiritualités, organisation traditionnelle"
    );
    if (cultureSectionRaw && !Array.isArray(cultureSectionRaw)) {
      countryContent.culture = mapCultureSection(
        cultureSectionRaw as Record<string, unknown>
      );
    }

    // Section 6: Historical facts — map French keys to camelCase
    const historicalFactsSectionRaw = parseSection(
      content,
      "6. Faits historiques majeurs"
    );
    if (
      historicalFactsSectionRaw &&
      !Array.isArray(historicalFactsSectionRaw)
    ) {
      countryContent.historicalFacts = mapHistoricalFacts(
        historicalFactsSectionRaw as Record<string, unknown>
      );
    }

    // Section 7: Sources
    const sourcesSection = parseSection(content, "7. Sources");
    if (sourcesSection) {
      const sources: string[] = [];
      for (const [key, value] of Object.entries(sourcesSection)) {
        if (typeof value === "string") {
          sources.push(value);
        }
      }
      countryContent.sources = sources;
    }

    // Demographics section — parse ### Peuple : blocks
    const demoSectionMatch = content.match(
      /^#\s+DONNÉES DÉMOGRAPHIQUES\s*$([\s\S]*?)(?=^#\s+|\Z)/m
    );
    if (demoSectionMatch) {
      countryContent.demographics = parseDemographicsContent(
        demoSectionMatch[1]
      );
    } else {
      // Fallback: try parseSection (may return empty)
      const demographicsSection = parseSection(
        content,
        "DONNÉES DÉMOGRAPHIQUES"
      );
      if (demographicsSection && !Array.isArray(demographicsSection)) {
        const demo = parseDemographicsContent(
          content.slice(content.indexOf("# DONNÉES DÉMOGRAPHIQUES"))
        );
        if (demo.peoples && demo.peoples.length > 0) {
          countryContent.demographics = demo;
        }
      }
    }

    // 4. Include all unknown sections (for evolutivity)
    const knownSections = [
      "Nom du pays",
      "1. Appellations historiques et origines du nom",
      "2. Civilisations, royaumes et entités politiques historiques",
      "3. Peuples majeurs",
      "5. Culture, modes de vie, langues, spiritualités, organisation traditionnelle",
      "6. Faits historiques majeurs",
      "7. Sources",
      "DONNÉES DÉMOGRAPHIQUES",
    ];

    for (const [sectionTitle, sectionData] of Object.entries(allSections)) {
      // Skip already processed sections
      if (!knownSections.includes(sectionTitle)) {
        // This is a new/unknown section - include it
        countryContent[sectionTitle] = sectionData;
      }
    }

    // 5. Construct Country object
    const country: Country = {
      id,
      nameFr,
      nameOfficial: headerSection["Nom officiel actuel"] as string | undefined,
      etymology,
      nameOriginActor,
      content: countryContent,
    };

    return {
      success: true,
      data: country,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    errors.push({
      type: "parse_failure",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { success: false, errors, warnings };
  }
}
