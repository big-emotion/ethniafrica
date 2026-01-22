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
  Kingdom,
} from "@/types/afrik";
import {
  extractIdentifier,
  parseSection,
  parseSections,
  extractRelations,
} from "../parser";

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

    const nameFr = headerSection["Nom officiel actuel"] || "";
    const etymology = headerSection["Étymologie du nom"];
    const nameOriginActor =
      headerSection["Personne / peuple / administration à l'origine du nom"];

    // 3. Parse all sections into JSONB content (evolutionary)
    const allSections = parseSections(content);
    const countryContent: CountryContent = {};

    // Section 1: Historical names
    const historicalNamesSection = parseSection(
      content,
      "1. Appellations historiques et origines du nom"
    );
    if (historicalNamesSection) {
      countryContent.historicalNames =
        historicalNamesSection as HistoricalNamesSection;
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

    // Section 5: Culture
    const cultureSection = parseSection(
      content,
      "5. Culture, modes de vie, langues, spiritualités, organisation traditionnelle"
    );
    if (cultureSection) {
      countryContent.culture = cultureSection as CultureSection;
    }

    // Section 6: Historical facts
    const historicalFactsSection = parseSection(
      content,
      "6. Faits historiques majeurs"
    );
    if (historicalFactsSection) {
      countryContent.historicalFacts =
        historicalFactsSection as HistoricalFactsSection;
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

    // Demographics section
    const demographicsSection = parseSection(content, "DONNÉES DÉMOGRAPHIQUES");
    if (demographicsSection) {
      countryContent.demographics = demographicsSection as DemographicsSection;
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
