/**
 * Language Family Parser - Parse language family files following modele-linguistique.txt
 */

import type {
  LanguageFamily,
  LanguageFamilyContent,
  ParsedFile,
  ParseError,
  ParseWarning,
  DecolonialHeader,
  PeopleReference,
} from "@/types/afrik";
import {
  extractIdentifier,
  parseSection,
  parseSections,
  extractRelations,
} from "../parser";

/**
 * Parse a language family file content into LanguageFamily object
 */
export function parseLanguageFamilyFile(
  content: string
): ParsedFile<LanguageFamily> {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  try {
    // 1. Extract stable identifier (REQUIRED)
    let id: string;
    try {
      id = extractIdentifier(content, "FLG");
    } catch (error) {
      errors.push({
        type: "missing_id",
        message: "Language family ID (FLG_xxxxx) is required",
      });
      return { success: false, errors, warnings };
    }

    // 2. Parse decolonial header (MANDATORY for language families)
    const headerContent = content.split("## MODÈLE STRUCTURÉ AFRIK")[0];
    const decolonialHeader: DecolonialHeader = {};

    // Extract fields from decolonial header
    const linkMatch = headerContent.match(
      /Lien avec la famille linguistique\s*:\s*([^\n]+)/
    );
    if (linkMatch) decolonialHeader.linkWithFamily = linkMatch[1].trim();

    const nameFrMatch = headerContent.match(/Nom français\s*:\s*([^\n]+)/);
    const nameFr = nameFrMatch ? nameFrMatch[1].trim() : "";

    const nameEnMatch = headerContent.match(
      /Nom anglais \/ auto-appellation académique\s*:\s*([^\n]+)/
    );
    const nameEn = nameEnMatch ? nameEnMatch[1].trim() : undefined;

    const historicalMatch = headerContent.match(
      /Appellation\(s\) historique\(s\)\s*:\s*([^\n]+)/
    );
    if (historicalMatch) {
      decolonialHeader.historicalAppellations = historicalMatch[1]
        .split(",")
        .map((a) => a.trim());
    }

    const originMatch = headerContent.match(
      /Origine du terme historique\s*:\s*([^\n]+)/
    );
    if (originMatch)
      decolonialHeader.originOfHistoricalTerm = originMatch[1].trim();

    const problematicMatch = headerContent.match(
      /Pourquoi le terme pose problème[^:]*:\s*([^\n]+)/
    );
    if (problematicMatch)
      decolonialHeader.whyProblematic = problematicMatch[1].trim();

    const selfAppMatch = headerContent.match(
      /Auto-appellation[^:]*:\s*([^\n]+)/
    );
    if (selfAppMatch) decolonialHeader.selfAppellation = selfAppMatch[1].trim();

    const contemporaryMatch = headerContent.match(
      /Usage contemporain[^:]*:\s*([^\n]+)/
    );
    if (contemporaryMatch)
      decolonialHeader.contemporaryUsage = contemporaryMatch[1].trim();

    const areaMatch = headerContent.match(
      /Aire \/ répartition géographique générale\s*:\s*([^\n]+)/
    );
    if (areaMatch) decolonialHeader.geographicArea = areaMatch[1].trim();

    const numLangMatch = headerContent.match(
      /Nombre de langues[^:]*:\s*([^\n]+)/
    );
    if (numLangMatch) {
      const num = numLangMatch[1].match(/(\d+)/);
      if (num) decolonialHeader.numberOfLanguages = parseInt(num[1], 10);
    }

    const speakersMatch = headerContent.match(
      /Nombre total de locuteurs[^:]*:\s*([^\n]+)/
    );
    if (speakersMatch) {
      const num = speakersMatch[1].replace(/\s/g, "").match(/(\d+)/);
      if (num) decolonialHeader.totalSpeakers = parseInt(num[1], 10);
    }

    // Warn if decolonial header is incomplete
    if (
      !decolonialHeader.originOfHistoricalTerm &&
      !decolonialHeader.selfAppellation
    ) {
      warnings.push({
        type: "missing_optional_section",
        message:
          "Decolonial header should include origin of historical term and self-appellation",
        section: "Decolonial Header",
      });
    }

    // 3. Parse all sections into JSONB content (evolutionary)
    const familyContent: LanguageFamilyContent = {
      decolonialHeader,
    };

    // Section 1: General information
    const generalInfoSection = parseSection(
      content,
      "1. Informations générales"
    );
    if (generalInfoSection) {
      familyContent.generalInfo = {
        branches: generalInfoSection["Branches internes / sous-groupes"]
          ? generalInfoSection["Branches internes / sous-groupes"]
              .split(",")
              .map((b: string) => b.trim())
          : undefined,
        geographicArea: generalInfoSection["Aire géographique"],
        numberOfLanguages: parseNumber(generalInfoSection["Nombre de langues"]),
        totalSpeakers: parseNumber(
          generalInfoSection["Nombre total de locuteurs"]
        ),
      };
    }

    // Section 2: Associated peoples
    const peoplesSection = parseSection(content, "2. Peuples associés");
    if (peoplesSection) {
      // Check if it's already an array from parsePeoplesSection
      if (Array.isArray(peoplesSection)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        familyContent.associatedPeoples = peoplesSection.map((p: any) => ({
          name: p.name,
          peopleId: p.peopleId,
        }));
      } else {
        // Fall back to object parsing
        const peoples: PeopleReference[] = [];

        // Extract from parsed section
        for (const [key, value] of Object.entries(peoplesSection)) {
          if (key.startsWith("Peuple") && typeof value === "string") {
            const pplMatch = value.match(/PPL_[A-Z_]+/);
            const name = value
              .replace(/\(PPL_[A-Z_]+\)/g, "")
              .replace(/\([^)]*\)/g, "")
              .trim();
            peoples.push({
              name,
              peopleId: pplMatch ? pplMatch[0] : undefined,
            });
          }
        }

        if (peoples.length > 0) {
          familyContent.associatedPeoples = peoples;
        }
      }
    }

    // Section 3: Linguistic characteristics
    const linguisticSection = parseSection(
      content,
      "3. Caractéristiques linguistiques"
    );
    if (linguisticSection) {
      familyContent.linguisticCharacteristics = {
        typology: linguisticSection["Typologie linguistique"],
        phonologicalFeatures: linguisticSection["Particularités phonologiques"],
        relationsWithNeighbors:
          linguisticSection["Liens avec les familles voisines"],
        keyInnovations: linguisticSection["Innovations clés"],
      };
    }

    // Section 4: History and origins
    const historySection = parseSection(content, "4. Histoire et origines");
    if (historySection) {
      familyContent.historyAndOrigins = {
        probableOrigin:
          historySection[
            "Origine probable (théories archéologiques, linguistiques, génétiques)"
          ] || historySection["Origine probable"],
        emergencePeriod: historySection["Période d'émergence estimée"],
        diffusion:
          historySection[
            "Diffusion des langues (routes migratoires, expansion)"
          ] || historySection["Diffusion des langues"],
        historicalBreaks:
          historySection["Ruptures historiques (séparations, fusions)"] ||
          historySection["Ruptures historiques"],
        contactZones: historySection["Zones de contact et métissages"],
        majorEvents:
          historySection[
            "Événements historiques majeurs ayant influencé la famille"
          ],
      };
    }

    // Section 5: Geographic distribution and demography
    const distributionSection = parseSection(
      content,
      "5. Répartition géographique et démographie"
    );
    if (distributionSection) {
      familyContent.distribution = {
        totalSpeakers: parseNumber(
          distributionSection["Nombre total de locuteurs"]
        ),
        distributionByCountry: {}, // Would need more complex parsing for country breakdown
      };
    }

    // Section 6: Sources
    const sourcesSection = parseSection(content, "6. Sources");
    if (sourcesSection) {
      const sources: string[] = [];

      // Sources are typically just listed values after the section header
      for (const [key, value] of Object.entries(sourcesSection)) {
        if (typeof value === "string" && value.trim()) {
          // Remove leading dashes and trim
          const cleanValue = value.replace(/^-\s*/, "").trim();
          if (cleanValue) {
            sources.push(cleanValue);
          }
        }
      }

      // Also try to extract from raw section if empty
      if (sources.length === 0) {
        const sourcesMatch = content.match(
          /# 6\. Sources\s*([\s\S]*?)(?=# \d+\.|$)/
        );
        if (sourcesMatch) {
          const sourceLines = sourcesMatch[1]
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("-"))
            .map((line) => line.replace(/^-\s*/, "").trim())
            .filter((line) => line.length > 0);
          sources.push(...sourceLines);
        }
      }

      if (sources.length > 0) {
        familyContent.sources = sources;
      }
    }

    // 4. Include all unknown sections (for evolutivity)
    const allSections = parseSections(content);
    for (const [sectionTitle, sectionData] of Object.entries(allSections)) {
      // Skip known sections
      if (
        !sectionTitle.startsWith("1.") &&
        !sectionTitle.startsWith("2.") &&
        !sectionTitle.startsWith("3.") &&
        !sectionTitle.startsWith("4.") &&
        !sectionTitle.startsWith("5.") &&
        !sectionTitle.startsWith("6.")
      ) {
        // Check if it's under the structured model section
        if (content.indexOf("## MODÈLE STRUCTURÉ AFRIK") !== -1) {
          const structuredContent = content.split(
            "## MODÈLE STRUCTURÉ AFRIK"
          )[1];
          if (structuredContent && structuredContent.includes(sectionTitle)) {
            // This is a new/unknown section - include it
            familyContent[sectionTitle] = sectionData;
          }
        }
      }
    }

    // 5. Construct LanguageFamily object
    const languageFamily: LanguageFamily = {
      id,
      nameFr,
      nameEn,
      content: familyContent,
    };

    return {
      success: true,
      data: languageFamily,
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
 * Helper: Parse number from string (handles formatted numbers with spaces)
 */
function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;

  const cleaned = value.replace(/\s/g, "").replace(/\+/g, "");
  const match = cleaned.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}
