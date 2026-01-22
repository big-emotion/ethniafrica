/**
 * Country Loader - Load country files from filesystem
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Country, ParsedFile } from "@/types/afrik";
import { parseCountryFile } from "../parsers/countryParser";

// Cache for loaded countries
const countryCache = new Map<string, Country>();

// Base path for country files
const COUNTRIES_PATH = join(process.cwd(), "dataset/source/afrik/pays");

/**
 * Load a single country by ISO code
 */
export async function loadCountry(
  isoCode: string
): Promise<ParsedFile<Country>> {
  // Check cache first
  if (countryCache.has(isoCode)) {
    return {
      success: true,
      data: countryCache.get(isoCode)!,
    };
  }

  try {
    const filePath = join(COUNTRIES_PATH, `${isoCode}.txt`);
    const content = readFileSync(filePath, "utf-8");

    const result = parseCountryFile(content);

    if (result.success && result.data) {
      // Cache the parsed country
      countryCache.set(isoCode, result.data);
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
              : `Failed to load country ${isoCode}`,
        },
      ],
    };
  }
}

/**
 * Load all countries from the filesystem
 */
export async function loadAllCountries(): Promise<Country[]> {
  try {
    const files = readdirSync(COUNTRIES_PATH);
    const countryFiles = files.filter((f) => f.endsWith(".txt"));

    const countries: Country[] = [];

    for (const file of countryFiles) {
      const isoCode = file.replace(".txt", "");
      const result = await loadCountry(isoCode);

      if (result.success && result.data) {
        countries.push(result.data);
      }
    }

    return countries;
  } catch (error) {
    console.error("Failed to load countries:", error);
    return [];
  }
}

/**
 * Clear the country cache
 */
export function clearCountryCache(): void {
  countryCache.clear();
}
