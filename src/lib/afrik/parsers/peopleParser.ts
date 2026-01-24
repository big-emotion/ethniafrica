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
export function parsePeopleFile(content: string): ParsedFile<People> {
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

    // 3. Extract critical relations
    const languageFamilyId = extractRelations(
      content,
      "languageFamily"
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
    const cultureSection = parseSection(
      content,
      "5. Culture, rites et traditions"
    );
    if (cultureSection) {
      // For now, store as-is. Can be further structured if needed
      peopleContent.culture = cultureSection as DetailedCultureSection;
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
