/**
 * Language Family JSON Loader — reads pre-converted .json files from dataset/source/afrik/famille_linguistique/
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { LanguageFamily, ParsedFile } from "@/types/afrik";

const FAMILIES_PATH = join(
  process.cwd(),
  "dataset/source/afrik/famille_linguistique"
);
const familyCache = new Map<string, LanguageFamily>();

export async function loadLanguageFamily(
  familyId: string
): Promise<ParsedFile<LanguageFamily>> {
  if (familyCache.has(familyId)) {
    return { success: true, data: familyCache.get(familyId)! };
  }
  try {
    const filePath = join(FAMILIES_PATH, `${familyId}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const data: LanguageFamily = JSON.parse(raw);
    if (!data.id)
      throw new Error(`Missing required field "id" in ${familyId}.json`);
    familyCache.set(familyId, data);
    return { success: true, data };
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

export async function loadAllLanguageFamilies(): Promise<LanguageFamily[]> {
  try {
    const files = readdirSync(FAMILIES_PATH).filter(
      (f) => f.endsWith(".json") && f.startsWith("FLG_")
    );
    const families: LanguageFamily[] = [];
    for (const file of files) {
      const familyId = file.replace(".json", "");
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

export function clearLanguageFamilyCache(): void {
  familyCache.clear();
}
