/**
 * People Parser - Parse people files following modele-peuple.txt
 */

import type {
  People,
  PeopleContent,
  ParsedFile,
  ParseError,
  ParseWarning,
  AppellationsSection,
  OriginsSection,
  OrganizationSection,
  LanguagesSection,
  DetailedCultureSection,
  HistoricalRoleSection,
  GlobalDemographySection,
  CountryDistribution,
} from "@/types/afrik";
import {
  extractIdentifier,
  parseSection,
  parseSections,
  extractRelations,
} from "../parser";

/**
 * Parse a people file content into People object
 */
export function parsePeopleFile(
  content: string,
  filePath?: string
): ParsedFile<People> {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  try {
    // 1. Extract stable identifier (REQUIRED)
    let id: string;
    try {
      id = extractIdentifier(content, "PPL");
    } catch (error) {
      errors.push({
        type: "missing_id",
        message: "People ID (PPL_xxxxx) is required",
      });
      return { success: false, errors, warnings };
    }

    // 2. Extract critical fields from header section
    const headerSection = parseSection(content, "Nom du peuple");
    if (!headerSection) {
      errors.push({
        type: "missing_section",
        message: 'Header section "Nom du peuple" is required',
        section: "Nom du peuple",
      });
      return { success: false, errors, warnings };
    }

    const nameMain = headerSection["Nom principal du peuple"] || "";

    // 3. Extract critical relations (with filePath fallback for FLG_)
    const languageFamilyId = extractRelations(
      content,
      "languageFamily",
      filePath
    ) as string;
    if (!languageFamilyId) {
      errors.push({
        type: "missing_section",
        message: "Language family (FLG_xxxxx) is required",
        section: "Header",
      });
      return { success: false, errors, warnings };
    }

    const currentCountries = extractRelations(content, "countries") as string[];

    // 4. Parse all sections into JSONB content (evolutionary)
    const peopleContent: PeopleContent = {};

    // Appellations section (decolonial sensitivity)
    peopleContent.appellations = {
      mainName: headerSection["Nom principal du peuple"] || "",
      selfAppellation: headerSection["Auto-appellation"] || "",
      exonyms: headerSection["Exonymes / appellations historiques"]
        ? [headerSection["Exonymes / appellations historiques"]]
        : undefined,
      originOfExonyms: headerSection["Origine des termes (exonymes)"],
      whyProblematic:
        headerSection[
          "Pourquoi certains termes posent problème (si applicable)"
        ],
      contemporaryUsage: headerSection["Usage contemporain des appellations"],
      linguisticFamily: languageFamilyId,
      ethnoLinguisticGroup: headerSection["Groupe ethno-linguistique"],
      historicalRegion: headerSection["Région historique"],
      currentCountries,
    };

    // Section 1: Ethnicities included
    const ethnicitiesSection = parseSection(
      content,
      "1. Ethnies incluses dans le peuple"
    );
    if (ethnicitiesSection) {
      const ethnicities: string[] = [];
      for (const [key, value] of Object.entries(ethnicitiesSection)) {
        if (typeof value === "string") {
          ethnicities.push(value);
        }
      }
      peopleContent.ethnicities = ethnicities;
    }

    // Section 2: Origins
    const originsSection = parseSection(
      content,
      "2. Origines, migrations et formation du peuple"
    );
    if (originsSection) {
      peopleContent.origins = {
        ancientOrigins:
          originsSection[
            "Origines anciennes (théories archéologiques, linguistiques, génétiques)"
          ] || originsSection["Origines anciennes"],
        formationPeriod: originsSection["Période de formation estimée"],
        migrationRoutes: originsSection["Routes migratoires principales"]
          ? [originsSection["Routes migratoires principales"]]
          : originsSection["Routes migratoires"]
            ? [originsSection["Routes migratoires"]]
            : undefined,
        historicalSettlementZones: originsSection[
          "Zones d'établissement historiques"
        ]
          ? [originsSection["Zones d'établissement historiques"]]
          : undefined,
        unificationsOrDivisions: originsSection["Unifications / divisions"],
        externalInfluences:
          originsSection[
            "Influences externes (peuples voisins, colonisation, commerce)"
          ] || originsSection["Influences externes"],
        majorHistoricalEvents:
          originsSection[
            "Événements historiques majeurs ayant façonné le peuple"
          ],
      } as OriginsSection;
    }

    // Section 3: Organization
    const organizationSection = parseSection(
      content,
      "3. Organisation et structure interne"
    );
    if (organizationSection) {
      peopleContent.organization = {
        traditionalPoliticalSystem:
          organizationSection["Système politique traditionnel"],
        clanOrganization: organizationSection["Organisation clanique"],
        ageClassSystems:
          organizationSection["Systèmes de classes d'âge (si applicable)"],
        roleOfLineages: organizationSection["Rôle des lignages"],
        religiousAuthority: organizationSection["Autorité religieuse"],
      } as OrganizationSection;
    }

    // Section 4: Languages
    const languagesSection = parseSection(
      content,
      "4. Langues et sous-familles"
    );
    if (languagesSection) {
      // Extract ISO codes from the entire section content
      const languagesSectionContent =
        content.match(
          /# 4\. Langues et sous-familles[\s\S]*?(?=# \d+\.|$)/
        )?.[0] || "";
      const isoCodes = extractRelations(
        languagesSectionContent,
        "languages"
      ) as string[];

      peopleContent.languages = {
        mainLanguage: languagesSection["Langue principale"],
        isoCodes: isoCodes.length > 0 ? isoCodes : undefined,
        dialects: languagesSection["Dialectes"]
          ? [languagesSection["Dialectes"]]
          : undefined,
        vehicularRole: languagesSection["Rôle véhiculaire"],
      } as LanguagesSection;
    }

    // Section 5: Culture (detailed - may have subsections)
    const cultureResult = parseCultureSection(content);
    if (cultureResult) {
      peopleContent.culture = cultureResult;
    }

    // Section 6: Historical role
    const historicalRoleSection = parseSection(
      content,
      "6. Rôle historique et interactions régionales"
    );
    if (historicalRoleSection) {
      peopleContent.historicalRole = {
        kingdomsOrChiefdoms: historicalRoleSection["Royaumes / chefferies"],
        relationsWithNeighbors:
          historicalRoleSection["Relations avec peuples voisins"],
        conflictsOrAlliances: historicalRoleSection["Conflits / alliances"],
        diaspora: historicalRoleSection["Diaspora"],
      } as HistoricalRoleSection;
    }

    // Section 7: Global demography
    const demographySection = parseSection(content, "7. Démographie globale");
    if (demographySection) {
      peopleContent.demography = {
        totalPopulation: parsePopulation(
          demographySection["Population totale (tous pays)"]
        ),
        referenceYear: parseYear(demographySection["Année de référence"]),
        source: demographySection["Source"],
      } as GlobalDemographySection;

      // Parse distributionByCountry from ### Répartition par pays subsection
      const distributionByCountry =
        parseDistributionByCountryForPeople(content);
      if (distributionByCountry.length > 0) {
        peopleContent.demography.distributionByCountry = distributionByCountry;
      }
    }

    // Section 8: Sources
    const sourcesSection = parseSection(content, "8. Sources");
    if (sourcesSection) {
      const sources: string[] = [];
      for (const [key, value] of Object.entries(sourcesSection)) {
        if (typeof value === "string") {
          sources.push(value);
        }
      }
      peopleContent.sources = sources;
    }

    // 5. Include all unknown sections (for evolutivity)
    const allSections = parseSections(content);
    for (const [sectionTitle, sectionData] of Object.entries(allSections)) {
      // Skip header and known sections
      if (
        sectionTitle !== "Nom du peuple" &&
        !sectionTitle.startsWith("1.") &&
        !sectionTitle.startsWith("2.") &&
        !sectionTitle.startsWith("3.") &&
        !sectionTitle.startsWith("4.") &&
        !sectionTitle.startsWith("5.") &&
        !sectionTitle.startsWith("6.") &&
        !sectionTitle.startsWith("7.") &&
        !sectionTitle.startsWith("8.")
      ) {
        // This is a new/unknown section - include it
        peopleContent[sectionTitle] = sectionData;
      }
    }

    // 6. Construct People object
    const people: People = {
      id,
      nameMain,
      languageFamilyId,
      currentCountries,
      content: peopleContent,
    };

    return {
      success: true,
      data: people,
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

/**
 * Helper: Parse population (handles ranges like "15 000 000 - 20 000 000")
 */
function parsePopulation(value?: string): number | undefined {
  if (!value) return undefined;

  // Remove spaces and extract first number
  const cleaned = value.replace(/\s/g, "");
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Helper: Parse year
 */
function parseYear(value?: string): number | undefined {
  if (!value) return undefined;

  const match = value.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Parse distributionByCountry from section 7 subsection "### Répartition par pays"
 * Handles formats:
 *   - ZWE : 12 000 000 (80%)
 *   - Zimbabwe (ZWE) : 12 000 000
 */
function parseDistributionByCountryForPeople(
  content: string
): CountryDistribution[] {
  const distributions: CountryDistribution[] = [];

  // Extract the "### Répartition par pays" subsection from section 7
  const subsectionMatch = content.match(
    /###\s*Répartition par pays\s*\n([\s\S]*?)(?=\n#|\n\*\*|$)/i
  );
  if (!subsectionMatch) return distributions;

  const subsectionContent = subsectionMatch[1];
  const lines = subsectionContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("-")) continue;

    // Pattern 1: "- ZWE : 12 000 000 (80%)"
    const isoDirectMatch = trimmed.match(
      /^-\s*([A-Z]{3})\s*:\s*([\d\s]+?)(?:\s*\((\d+(?:[.,]\d+)?)%\))?\s*$/
    );
    if (isoDirectMatch) {
      const entry: CountryDistribution = { country: isoDirectMatch[1] };
      const pop = parseInt(isoDirectMatch[2].replace(/\s/g, ""), 10);
      if (!isNaN(pop)) entry.population = pop;
      if (isoDirectMatch[3]) {
        const pct = parseFloat(isoDirectMatch[3].replace(",", "."));
        if (!isNaN(pct)) entry.percentage = pct;
      }
      distributions.push(entry);
      continue;
    }

    // Pattern 2: "- Zimbabwe (ZWE) : 12 000 000"
    const nameIsoMatch = trimmed.match(
      /^-\s*.+?\(([A-Z]{3})\)\s*:\s*([\d\s]+?)(?:\s*\((\d+(?:[.,]\d+)?)%\))?\s*$/
    );
    if (nameIsoMatch) {
      const entry: CountryDistribution = { country: nameIsoMatch[1] };
      const pop = parseInt(nameIsoMatch[2].replace(/\s/g, ""), 10);
      if (!isNaN(pop)) entry.population = pop;
      if (nameIsoMatch[3]) {
        const pct = parseFloat(nameIsoMatch[3].replace(",", "."));
        if (!isNaN(pct)) entry.percentage = pct;
      }
      distributions.push(entry);
      continue;
    }
  }

  return distributions;
}

// ==========================================
// CULTURE SECTION PARSER (Fix 4)
// ==========================================

/**
 * Subsection header mapping: ## letter prefix -> DetailedCultureSection key
 */
const CULTURE_SUBSECTION_MAP: Array<[RegExp, string]> = [
  [/^##\s*A\.\s*DIVINIT/i, "divinitiesAndSpirits"],
  [/^##\s*B\.\s*COSMOLOGI/i, "cosmology"],
  [/^##\s*C\.\s*CONCEPTION/i, "personAndNature"],
  [/^##\s*D\.\s*RITES/i, "ritesAndPractices"],
  [/^##\s*E\.\s*SYMBOLES/i, "symbolsAndArts"],
  [/^##\s*F\.\s*SPIRITUALIT/i, "contemporarySpirituality"],
];

/**
 * Parse the full culture section (Section 5) with nested ## and ### subsections.
 * Returns undefined if Section 5 is not found.
 * Falls back to flat key-value parsing when no ## subsections are present.
 */
function parseCultureSection(
  content: string
): DetailedCultureSection | undefined {
  // Extract the raw text of Section 5
  const sectionMatch = content.match(
    /^#\s*5\.\s*Culture,?\s*rites\s*et\s*traditions\s*$/im
  );
  if (!sectionMatch || sectionMatch.index === undefined) return undefined;

  const sectionStart = sectionMatch.index + sectionMatch[0].length;
  // Find the next top-level section (# N.)
  const nextTopSection = content.slice(sectionStart).match(/^#\s+\d+\./m);
  const sectionEnd = nextTopSection?.index
    ? sectionStart + nextTopSection.index
    : content.length;
  const rawSection = content.slice(sectionStart, sectionEnd);

  // Check if there are any ## subsections
  const hasSubsections = /^##\s+[A-F]\./m.test(rawSection);
  if (!hasSubsections) {
    // Fallback: parse as flat key-value, store as-is
    const flat = parseSection(content, "5. Culture, rites et traditions");
    if (flat) {
      return flat as DetailedCultureSection;
    }
    return undefined;
  }

  // Split into ## subsections
  const result: DetailedCultureSection = {};

  for (const [pattern, key] of CULTURE_SUBSECTION_MAP) {
    const subsectionText = extractSubsection(rawSection, pattern);
    if (!subsectionText) continue;

    switch (key) {
      case "divinitiesAndSpirits":
        result.divinitiesAndSpirits = parseDivinitiesSubsection(subsectionText);
        break;
      case "cosmology":
        result.cosmology = parseCosmologySubsection(subsectionText);
        break;
      case "personAndNature":
        result.personAndNature = parsePersonNatureSubsection(subsectionText);
        break;
      case "ritesAndPractices":
        result.ritesAndPractices = parseRitesSubsection(subsectionText);
        break;
      case "symbolsAndArts":
        result.symbolsAndArts = parseSymbolsSubsection(subsectionText);
        break;
      case "contemporarySpirituality":
        result.contemporarySpirituality =
          parseContemporarySpiritualitySubsection(subsectionText);
        break;
    }
  }

  return result;
}

/**
 * Extract a ## subsection text from the raw section content.
 * Returns the text between the matching ## header and the next ## header (or end).
 */
function extractSubsection(
  rawSection: string,
  headerPattern: RegExp
): string | undefined {
  const lines = rawSection.split("\n");
  let startIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (headerPattern.test(lines[i].trim())) {
      startIdx = i + 1;
      break;
    }
  }
  if (startIdx < 0) return undefined;

  // Find the next ## header
  let endIdx = lines.length;
  for (let i = startIdx; i < lines.length; i++) {
    if (/^##\s+[A-F]\./i.test(lines[i].trim())) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join("\n");
}

/**
 * Extract ### sub-blocks from a subsection text.
 * Returns a map of normalized sub-header -> content text.
 */
function extractSubBlocks(text: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const lines = text.split("\n");
  let currentHeader = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("###")) {
      // Save previous block
      if (currentHeader) {
        blocks.set(currentHeader, currentLines.join("\n").trim());
      }
      // Normalize header: remove ### prefix, colon suffix, whitespace
      currentHeader = trimmed
        .replace(/^###\s*/, "")
        .replace(/\s*:?\s*$/, "")
        .toLowerCase();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  // Save last block
  if (currentHeader) {
    blocks.set(currentHeader, currentLines.join("\n").trim());
  }

  return blocks;
}

/**
 * Extract key-value pairs from a block of text (lines starting with "- Key : Value").
 */
function extractKV(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = text.split("\n");
  let currentKey = "";
  let currentValue = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("**")) {
      continue;
    }
    if (trimmed.startsWith("-") && trimmed.includes(":")) {
      if (currentKey) {
        result[currentKey] = currentValue.trim();
      }
      const colonIdx = trimmed.indexOf(":");
      currentKey = trimmed.slice(1, colonIdx).trim().toLowerCase();
      currentValue = trimmed.slice(colonIdx + 1).trim();
    } else if (currentKey) {
      currentValue += " " + trimmed;
    }
  }
  if (currentKey) {
    result[currentKey] = currentValue.trim();
  }

  return result;
}

// ---- Subsection A: Divinities and spirits ----

function parseDivinitiesSubsection(
  text: string
): DetailedCultureSection["divinitiesAndSpirits"] {
  const blocks = extractSubBlocks(text);
  const result: NonNullable<DetailedCultureSection["divinitiesAndSpirits"]> =
    {};

  // Supreme deity
  for (const [header, content] of blocks) {
    if (header.includes("suprême") || header.includes("divinité suprême")) {
      const kv = extractKV(content);
      result.supremeDeity = {
        endonym: kv["endonyme (nom local)"] || kv["endonyme"],
        exonym: kv["exonyme"],
        attributes: kv["attributs et rôle"] || kv["attributs"],
      };
    } else if (
      header.includes("intermédiaire") ||
      header.includes("divinités intermédiaires")
    ) {
      const kv = extractKV(content);
      result.intermediateDivinities = [
        {
          name: kv["nom"],
          role: kv["rôle"],
          domain: kv["domaine"],
        },
      ];
    } else if (header.includes("esprit") && header.includes("nature")) {
      const kv = extractKV(content);
      result.natureSpirits = {
        forestSpirits: kv["esprits des forêts"],
        waterSpirits: kv["esprits des eaux"] || kv["esprits des rivières"],
        earthSpirits: kv["esprits de la terre"],
        otherSpirits: kv["autres esprits"],
      };
    } else if (header.includes("forces spirituelles")) {
      const kv = extractKV(content);
      result.natureSpirits = {
        ...result.natureSpirits,
        otherSpirits: kv["nyama"] || kv["force vitale"],
      };
    } else if (header.includes("ancêtres") || header.includes("ancestr")) {
      const kv = extractKV(content);
      result.ancestors = {
        roleOfAncestors: kv["rôle"] || kv["rôle des ancêtres"],
        cultPractices: kv["culte"] || kv["pratiques"],
      };
    }
  }

  // If no sub-blocks were found, try flat KV parsing of the whole subsection
  if (Object.keys(result).length === 0) {
    const kv = extractKV(text);
    if (kv["endonyme (nom local)"] || kv["endonyme"]) {
      result.supremeDeity = {
        endonym: kv["endonyme (nom local)"] || kv["endonyme"],
        exonym: kv["exonyme"],
        attributes: kv["attributs et rôle"] || kv["attributs"],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ---- Subsection B: Cosmology ----

function parseCosmologySubsection(
  text: string
): DetailedCultureSection["cosmology"] {
  const blocks = extractSubBlocks(text);
  const result: NonNullable<DetailedCultureSection["cosmology"]> = {};

  for (const [header, content] of blocks) {
    if (header.includes("structure") || header.includes("monde")) {
      const kv = extractKV(content);
      result.worldStructure = {
        upperWorld:
          kv["monde supérieur"] || kv["ciel / monde divin (san)"] || kv["ciel"],
        intermediateWorld:
          kv["monde intermédiaire"] || kv["terre / monde des vivants (dugu)"],
        terrestrialWorld: kv["monde terrestre"],
        underworld: kv["monde souterrain"],
      };
    } else if (header.includes("concept") || header.includes("spirituel")) {
      const kv = extractKV(content);
      result.spiritualConcepts = {
        soulOrVitalForce: kv["force vitale"] || kv["âme"],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ---- Subsection C: Person and nature ----

function parsePersonNatureSubsection(
  text: string
): DetailedCultureSection["personAndNature"] {
  const blocks = extractSubBlocks(text);
  const result: NonNullable<DetailedCultureSection["personAndNature"]> = {};

  for (const [header, content] of blocks) {
    if (header.includes("corps") && header.includes("esprit")) {
      const kv = extractKV(content);
      result.bodyAndSpirit = {
        physicalBody: kv["corps physique"],
        spiritualEssence: kv["essence spirituelle"],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ---- Subsection D: Rites and practices ----

function parseRitesSubsection(
  text: string
): DetailedCultureSection["ritesAndPractices"] {
  const blocks = extractSubBlocks(text);
  const result: NonNullable<DetailedCultureSection["ritesAndPractices"]> = {};

  for (const [header, content] of blocks) {
    if (header.includes("initiation")) {
      const kv = extractKV(content);
      result.initiationRites = {
        maleInitiation: kv["initiation masculine"],
        femaleInitiation: kv["initiation féminine"],
      };
    } else if (header.includes("funéraire") || header.includes("funèbre")) {
      const kv = extractKV(content);
      result.funeraryRites = {
        wake: kv["veillée"],
        burial: kv["enterrement"],
        postFuneraryCeremonies: kv["cérémonies post-funéraires"],
      };
    } else if (header.includes("agricol")) {
      const kv = extractKV(content);
      result.agriculturalRites = {
        landBlessing: kv["bénédiction des terres"],
        harvestFestivals: kv["fêtes de récolte"] || kv["fêtes des récoltes"],
      };
    } else if (header.includes("purification")) {
      const kv = extractKV(content);
      result.purificationRites = {
        ritualBaths: kv["bains rituels"],
        fumigation: kv["fumigation"],
        exorcism: kv["exorcisme"],
      };
    } else if (header.includes("divination")) {
      const kv = extractKV(content);
      result.divination = {
        divinationMethods: kv["méthodes de divination"],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ---- Subsection E: Symbols, arts, material culture ----

function parseSymbolsSubsection(
  text: string
): DetailedCultureSection["symbolsAndArts"] {
  const blocks = extractSubBlocks(text);
  const result: NonNullable<DetailedCultureSection["symbolsAndArts"]> = {};

  for (const [header, content] of blocks) {
    if (header.includes("symbole")) {
      const kv = extractKV(content);
      if (kv["nom"]) {
        result.symbols = [{ name: kv["nom"], meaning: kv["signification"] }];
      }
    } else if (header.includes("art") || header.includes("musique")) {
      const kv = extractKV(content);
      result.artsAndMusic = {
        sculpture: kv["sculpture"],
        masks: kv["masques"],
        musicalInstruments: kv["instruments de musique"] || kv["instruments"],
        dances: kv["danses"],
        songs: kv["chants"],
        weaving: kv["tissage"],
      };
    } else if (header.includes("gastronomie")) {
      const kv = extractKV(content);
      result.gastronomy = {
        emblematicDishes: kv["plats emblématiques"] || kv["plats"],
        culinaryKnowHow: kv["savoir-faire culinaire"],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

// ---- Subsection F: Contemporary spiritualities ----

function parseContemporarySpiritualitySubsection(
  text: string
): DetailedCultureSection["contemporarySpirituality"] {
  const blocks = extractSubBlocks(text);
  const result: NonNullable<
    DetailedCultureSection["contemporarySpirituality"]
  > = {};

  for (const [header, content] of blocks) {
    if (header.includes("christianisme") || header.includes("chrétien")) {
      const kv = extractKV(content);
      const pctStr = kv["pourcentage"];
      const pct = pctStr ? parseFloat(pctStr) : undefined;
      result.christianity = {
        percentageOfPopulation: pct,
        denominations: kv["dénominations"],
      };
    } else if (header.includes("islam")) {
      const kv = extractKV(content);
      const pctStr = kv["pourcentage"];
      const pct = pctStr ? parseFloat(pctStr) : undefined;
      result.islam = {
        percentageOfPopulation: pct,
        specificPractices: kv["pratiques spécifiques"],
      };
    } else if (
      header.includes("traditionnel") ||
      header.includes("religions traditionnelles")
    ) {
      const kv = extractKV(content);
      result.traditionalReligions = {
        persistenceOfPractices: kv["persistance"],
        guardiansOfTraditions: kv["gardiens"],
      };
    } else if (header.includes("syncrétisme")) {
      const kv = extractKV(content);
      result.religiousSyncretism = {
        coexistenceOfPractices: kv["coexistence"],
        contemporaryAdaptations: kv["adaptations"],
      };
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
