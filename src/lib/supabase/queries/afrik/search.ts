/**
 * Supabase queries for AFRIK search (multi-entity)
 */

import { searchAfrikCountries } from "./countries";
import {
  searchAfrikPeoples,
  getAfrikPeoplesByLanguageFamily,
  getAfrikPeoplesByCountry,
} from "./peoples";
import { searchAfrikLanguageFamilies } from "./languageFamilies";
import type { SearchFilters, SearchResult } from "@/types/afrik";

/**
 * Search across all AFRIK entities
 */
export async function searchAfrikAll(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Search in countries
  if (!filters.type || filters.type === "country") {
    if (filters.query) {
      const countries = await searchAfrikCountries(filters.query);
      for (const country of countries) {
        // Filter by countryId if specified
        if (filters.countryId && country.id !== filters.countryId) {
          continue;
        }

        results.push({
          type: "country",
          id: country.id,
          name: country.nameFr,
          data: country,
        });
      }
    } else if (filters.countryId) {
      // Get specific country
      const { getAfrikCountryById } = await import("./countries");
      const country = await getAfrikCountryById(filters.countryId);
      if (country) {
        results.push({
          type: "country",
          id: country.id,
          name: country.nameFr,
          data: country,
        });
      }
    }
  }

  // Search in peoples
  if (!filters.type || filters.type === "people") {
    let peoples: Awaited<ReturnType<typeof searchAfrikPeoples>> = [];

    if (filters.languageFamilyId) {
      peoples = await getAfrikPeoplesByLanguageFamily(filters.languageFamilyId);
    } else if (filters.countryId) {
      peoples = await getAfrikPeoplesByCountry(filters.countryId);
    } else if (filters.query) {
      peoples = await searchAfrikPeoples(filters.query);
    }

    // Apply additional filters
    for (const people of peoples) {
      if (
        filters.countryId &&
        !people.currentCountries.includes(filters.countryId)
      ) {
        continue;
      }
      if (
        filters.languageFamilyId &&
        people.languageFamilyId !== filters.languageFamilyId
      ) {
        continue;
      }

      results.push({
        type: "people",
        id: people.id,
        name: people.nameMain,
        data: people,
      });
    }
  }

  // Search in language families
  if (!filters.type || filters.type === "languageFamily") {
    if (filters.query) {
      const families = await searchAfrikLanguageFamilies(filters.query);
      for (const family of families) {
        results.push({
          type: "languageFamily",
          id: family.id,
          name: family.nameFr,
          data: family,
        });
      }
    }
  }

  return results;
}
