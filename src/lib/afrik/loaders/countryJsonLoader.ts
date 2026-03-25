/**
 * Country JSON Loader — reads pre-converted .json files from dataset/source/afrik/pays/
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Country, ParsedFile } from "@/types/afrik";

const COUNTRIES_PATH = join(process.cwd(), "dataset/source/afrik/pays");
const countryCache = new Map<string, Country>();

export async function loadCountry(
  isoCode: string
): Promise<ParsedFile<Country>> {
  if (countryCache.has(isoCode)) {
    return { success: true, data: countryCache.get(isoCode)! };
  }
  try {
    const filePath = join(COUNTRIES_PATH, `${isoCode}.json`);
    const raw = readFileSync(filePath, "utf-8");
    const data: Country = JSON.parse(raw);
    if (!data.id)
      throw new Error(`Missing required field "id" in ${isoCode}.json`);
    countryCache.set(isoCode, data);
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
              : `Failed to load country ${isoCode}`,
        },
      ],
    };
  }
}

export async function loadAllCountries(): Promise<Country[]> {
  try {
    const files = readdirSync(COUNTRIES_PATH).filter((f) =>
      f.endsWith(".json")
    );
    const countries: Country[] = [];
    for (const file of files) {
      const isoCode = file.replace(".json", "");
      const result = await loadCountry(isoCode);
      if (result.success && result.data) countries.push(result.data);
    }
    return countries;
  } catch (error) {
    console.error("Failed to load countries:", error);
    return [];
  }
}

export function clearCountryCache(): void {
  countryCache.clear();
}
