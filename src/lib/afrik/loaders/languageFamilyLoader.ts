/**
 * Language Family Loader - Load language family files from filesystem
 * Updated to use V3 parser with harmonized AFRIK markdown files
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type {
  LanguageFamily,
  ParsedFile,
  LanguageFamilyContent,
} from "@/types/afrik";
import {
  parseLanguageFamilyV2,
  type LanguageFamilyV2,
} from "../parsers/languageFamilyParserV2";

// Cache for loaded language families
const languageFamilyCache = new Map<string, LanguageFamily>();

// Base path for language family files
const LANGUAGE_FAMILIES_PATH = join(
  process.cwd(),
  "dataset/source/afrik/famille_linguistique"
);

/**
 * Convert V2 parser output to LanguageFamily type expected by database
 */
function convertV2ToLanguageFamily(v2: LanguageFamilyV2): LanguageFamily {
  // V2 parser already generates structured fields in the right format
  const content: LanguageFamilyContent = {
    generalInfo: {
      geographicArea: v2.geographicArea.join(", "),
      numberOfLanguages: v2.numberOfLanguages,
      totalSpeakers: v2.speakers || undefined,
    },
    associatedPeoples: v2.peoples.map((p) => ({
      name: p.name,
      peopleId: p.peopleId || undefined,
    })),
    sources: v2.sources,

    // Structured fields already in the right format
    decolonialHeader: v2.decolonialHeader,
    linguisticCharacteristics: v2.linguisticCharacteristics,
    historyAndOrigins: v2.historyAndOrigins,
    // Distribution: only include totalSpeakers (distributionByCountry is raw string in .txt)
    distribution: v2.distribution
      ? {
          totalSpeakers: v2.distribution.totalSpeakers,
          // Don't include distributionByCountry as it's a raw string, not Record<string, number>
        }
      : undefined,
  };

  return {
    id: v2.familyId,
    nameFr: v2.name,
    nameEn: v2.nameEn,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Load a single language family by FLG_ ID
 */
export async function loadLanguageFamily(
  familyId: string
): Promise<ParsedFile<LanguageFamily>> {
  // Check cache first
  if (languageFamilyCache.has(familyId)) {
    return {
      success: true,
      data: languageFamilyCache.get(familyId)!,
    };
  }

  try {
    const filePath = join(LANGUAGE_FAMILIES_PATH, `${familyId}.txt`);
    const content = readFileSync(filePath, "utf-8");

    // Use V2 parser (for harmonized markdown files)
    const parsedV2 = parseLanguageFamilyV2(content);

    // Convert to LanguageFamily format
    const languageFamily = convertV2ToLanguageFamily(parsedV2);

    // Cache the parsed language family
    languageFamilyCache.set(familyId, languageFamily);

    return {
      success: true,
      data: languageFamily,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          type: "parse_failure",
          message:
            error instanceof Error
              ? error.message
              : `Failed to load language family ${familyId}`,
        },
      ],
    };
  }
}

/**
 * Load all language families from the filesystem
 */
export async function loadAllLanguageFamilies(): Promise<LanguageFamily[]> {
  try {
    const files = readdirSync(LANGUAGE_FAMILIES_PATH);
    const familyFiles = files.filter(
      (f) => f.endsWith(".txt") && f.startsWith("FLG_")
    );

    const families: LanguageFamily[] = [];

    for (const file of familyFiles) {
      const familyId = file.replace(".txt", "");
      const result = await loadLanguageFamily(familyId);

      if (result.success && result.data) {
        families.push(result.data);
      } else if (!result.success) {
        console.error(`Failed to load ${familyId}:`, result.errors);
      }
    }

    return families;
  } catch (error) {
    console.error("Failed to load language families:", error);
    return [];
  }
}

/**
 * Clear the language family cache
 */
export function clearLanguageFamilyCache(): void {
  languageFamilyCache.clear();
}
