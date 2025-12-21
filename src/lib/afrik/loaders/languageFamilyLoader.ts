/**
 * Language Family Loader - Load language family files from filesystem
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { LanguageFamily, ParsedFile } from "@/types/afrik";
import { parseLanguageFamilyFile } from "../parsers/languageFamilyParser";

// Cache for loaded language families
const languageFamilyCache = new Map<string, LanguageFamily>();

// Base path for language family files
const LANGUAGE_FAMILIES_PATH = join(
  process.cwd(),
  "dataset/source/afrik/famille_linguistique"
);

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

    const result = parseLanguageFamilyFile(content);

    if (result.success && result.data) {
      // Cache the parsed language family
      languageFamilyCache.set(familyId, result.data);
    }

    return result;
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
