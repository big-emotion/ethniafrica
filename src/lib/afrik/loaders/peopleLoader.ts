/**
 * People Loader - Load people files from filesystem
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { People, ParsedFile } from "@/types/afrik";
import { parsePeopleFile } from "../parsers/peopleParser";

// Cache for loaded peoples
const peopleCache = new Map<string, People>();

// Base path for people files
const PEOPLES_PATH = join(process.cwd(), "dataset/source/afrik/peuples");

/**
 * Load a single people by PPL_ ID
 */
export async function loadPeople(
  peopleId: string
): Promise<ParsedFile<People>> {
  // Check cache first
  if (peopleCache.has(peopleId)) {
    return {
      success: true,
      data: peopleCache.get(peopleId)!,
    };
  }

  try {
    // Find the file - it could be in any FLG_ directory
    const languageFamilies = readdirSync(PEOPLES_PATH).filter((f) =>
      f.startsWith("FLG_")
    );

    for (const family of languageFamilies) {
      const familyPath = join(PEOPLES_PATH, family);
      const filePath = join(familyPath, `${peopleId}.txt`);

      try {
        const content = readFileSync(filePath, "utf-8");
        const result = parsePeopleFile(content);

        if (result.success && result.data) {
          // Cache the parsed people
          peopleCache.set(peopleId, result.data);
          return result;
        }
      } catch {
        // File not found in this directory, continue searching
        continue;
      }
    }

    // Not found
    return {
      success: false,
      errors: [
        {
          type: "parse_failure",
          message: `People ${peopleId} not found`,
        },
      ],
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
              : `Failed to load people ${peopleId}`,
        },
      ],
    };
  }
}

/**
 * Load all peoples from the filesystem
 */
export async function loadAllPeoples(): Promise<People[]> {
  try {
    const languageFamilies = readdirSync(PEOPLES_PATH).filter((f) =>
      f.startsWith("FLG_")
    );
    const peoples: People[] = [];

    for (const family of languageFamilies) {
      const familyPath = join(PEOPLES_PATH, family);
      const files = readdirSync(familyPath).filter(
        (f) => f.endsWith(".txt") && f.startsWith("PPL_")
      );

      for (const file of files) {
        const peopleId = file.replace(".txt", "");
        const result = await loadPeople(peopleId);

        if (result.success && result.data) {
          peoples.push(result.data);
        }
      }
    }

    return peoples;
  } catch (error) {
    console.error("Failed to load peoples:", error);
    return [];
  }
}

/**
 * Load peoples by language family
 */
export async function loadPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  try {
    const familyPath = join(PEOPLES_PATH, familyId);
    const files = readdirSync(familyPath).filter(
      (f) => f.endsWith(".txt") && f.startsWith("PPL_")
    );

    const peoples: People[] = [];

    for (const file of files) {
      const peopleId = file.replace(".txt", "");
      const result = await loadPeople(peopleId);

      if (result.success && result.data) {
        peoples.push(result.data);
      }
    }

    return peoples;
  } catch (error) {
    console.error(`Failed to load peoples for family ${familyId}:`, error);
    return [];
  }
}

/**
 * Clear the people cache
 */
export function clearPeopleCache(): void {
  peopleCache.clear();
}
