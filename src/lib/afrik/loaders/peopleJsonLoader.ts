/**
 * People JSON Loader — reads pre-converted .json files from dataset/source/afrik/peuples/
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import type { People, ParsedFile } from "@/types/afrik";

const PEOPLES_PATH = join(process.cwd(), "dataset/source/afrik/peuples");
const peopleCache = new Map<string, People>();

export async function loadPeople(
  peopleId: string
): Promise<ParsedFile<People>> {
  if (peopleCache.has(peopleId)) {
    return { success: true, data: peopleCache.get(peopleId)! };
  }
  try {
    const dirs = readdirSync(PEOPLES_PATH).filter((d) =>
      statSync(join(PEOPLES_PATH, d)).isDirectory()
    );
    for (const dir of dirs) {
      const filePath = join(PEOPLES_PATH, dir, `${peopleId}.json`);
      try {
        const raw = readFileSync(filePath, "utf-8");
        const data: People = JSON.parse(raw);
        if (!data.id)
          throw new Error(`Missing required field "id" in ${peopleId}.json`);
        peopleCache.set(peopleId, data);
        return { success: true, data };
      } catch {
        continue;
      }
    }
    return {
      success: false,
      errors: [
        { type: "parse_failure", message: `People ${peopleId} not found` },
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

export async function loadAllPeoples(): Promise<People[]> {
  try {
    const dirs = readdirSync(PEOPLES_PATH).filter((d) =>
      statSync(join(PEOPLES_PATH, d)).isDirectory()
    );
    const peoples: People[] = [];
    for (const dir of dirs) {
      const dirPath = join(PEOPLES_PATH, dir);
      const files = readdirSync(dirPath).filter(
        (f) => f.endsWith(".json") && f.startsWith("PPL_")
      );
      for (const file of files) {
        const peopleId = file.replace(".json", "");
        const result = await loadPeople(peopleId);
        if (result.success && result.data) peoples.push(result.data);
      }
    }
    return peoples;
  } catch (error) {
    console.error("Failed to load peoples:", error);
    return [];
  }
}

export async function loadPeoplesByLanguageFamily(
  familyId: string
): Promise<People[]> {
  try {
    const familyPath = join(PEOPLES_PATH, familyId);
    const files = readdirSync(familyPath).filter(
      (f) => f.endsWith(".json") && f.startsWith("PPL_")
    );
    const peoples: People[] = [];
    for (const file of files) {
      const peopleId = file.replace(".json", "");
      const result = await loadPeople(peopleId);
      if (result.success && result.data) peoples.push(result.data);
    }
    return peoples;
  } catch (error) {
    console.error(`Failed to load peoples for family ${familyId}:`, error);
    return [];
  }
}

export function clearPeopleCache(): void {
  peopleCache.clear();
}
