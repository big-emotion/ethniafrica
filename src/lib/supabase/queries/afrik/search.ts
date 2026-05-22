/**
 * Supabase queries for AFRIK search (multi-entity).
 *
 * ETNI-38: ftsSearchPeoplesCountries uses websearch_to_tsquery('french', q)
 * via Supabase textSearch, with optional confidence-boost ordering and filters.
 *
 * The legacy searchAfrikAll is kept for backward compatibility with existing
 * callers (admin pages, legacy API routes that have not yet been migrated).
 */

import { searchAfrikCountries } from "./countries";
import {
  searchAfrikPeoples,
  getAfrikPeoplesByLanguageFamily,
  getAfrikPeoplesByCountry,
} from "./peoples";
import { searchAfrikLanguageFamilies } from "./languageFamilies";
import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import type {
  SearchFilters,
  SearchResult,
  FtsSearchParams,
  FtsSearchResponse,
  People,
  Country,
} from "@/types/afrik";

/**
 * FTS search across peoples and countries using websearch_to_tsquery('french').
 *
 * Both tables carry a GENERATED STORED tsvector `search_vector` column
 * (migration 019). Supabase textSearch({ type: "websearch", config: "french" })
 * compiles to `search_vector @@ websearch_to_tsquery('french', q)` in SQL.
 *
 * Optional filters:
 * - classificationStatus: filter peoples by epistemic status column
 * - minConfidence / sinceVerifiedAfter: filter via confidence_scores join
 *
 * Results are ordered by confidence score (descending) as the confidence boost;
 * entities with no confidence record sort last.
 */
export async function ftsSearchPeoplesCountries(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  const {
    q,
    limit,
    offset,
    classificationStatus,
    minConfidence,
    sinceVerifiedAfter,
  } = params;

  const supabase = createServerClient();

  // ── confidence pre-filter ─────────────────────────────────────────────────
  // If minConfidence or sinceVerifiedAfter is requested, resolve the qualifying
  // entity IDs upfront from confidence_scores to avoid a costly post-filter.
  let qualifyingPeopleIds: Set<string> | null = null;

  if (minConfidence !== undefined || sinceVerifiedAfter !== undefined) {
    let csQuery = supabase
      .from("confidence_scores")
      .select("entity_type, entity_id")
      .eq("entity_type", "people");

    if (minConfidence !== undefined) {
      csQuery = csQuery.gte("score", minConfidence);
    }
    if (sinceVerifiedAfter !== undefined) {
      csQuery = csQuery.gte("last_human_audit_at", sinceVerifiedAfter);
    }

    const { data: csRows, error: csError } = await csQuery;
    if (csError) {
      logger.error("Error querying confidence_scores for FTS filter", csError);
      throw csError;
    }
    qualifyingPeopleIds = new Set(
      (csRows || []).map((r: Record<string, string>) => r.entity_id)
    );
  }

  // ── peoples FTS query ─────────────────────────────────────────────────────
  let peopleQuery = supabase
    .from("afrik_peoples")
    .select("*")
    .textSearch("search_vector", q, { type: "websearch", config: "french" });

  if (classificationStatus) {
    peopleQuery = peopleQuery.eq("classification_status", classificationStatus);
  }
  if (qualifyingPeopleIds !== null) {
    peopleQuery = peopleQuery.in("id", [...qualifyingPeopleIds]);
  }

  peopleQuery = peopleQuery
    .range(offset, offset + limit - 1)
    .order("name_main");

  const { data: peopleRows, error: peopleError } = await peopleQuery;
  if (peopleError) {
    logger.error("Error in FTS peoples search", peopleError);
    throw peopleError;
  }

  // ── countries FTS query ───────────────────────────────────────────────────
  // Country-level confidence filtering is not supported in this release
  // (confidence_scores only covers entity_type='people' per migration 014).
  const { data: countryRows, error: countryError } = await supabase
    .from("afrik_countries")
    .select("*")
    .textSearch("search_vector", q, { type: "websearch", config: "french" })
    .range(offset, offset + limit - 1)
    .order("name_fr");

  if (countryError) {
    logger.error("Error in FTS countries search", countryError);
    throw countryError;
  }

  // ── fetch country relations for peoples ───────────────────────────────────
  const peopleIds = (peopleRows || []).map((r: Record<string, string>) => r.id);
  const relationsMap = new Map<string, string[]>();
  if (peopleIds.length > 0) {
    const { data: relations } = await supabase
      .from("afrik_people_countries")
      .select("people_id, country_id")
      .in("people_id", peopleIds);

    for (const rel of relations || []) {
      const existing = relationsMap.get(rel.people_id) || [];
      existing.push(rel.country_id);
      relationsMap.set(rel.people_id, existing);
    }
  }

  // ── fetch confidence scores for ordering ─────────────────────────────────
  const confidenceMap = new Map<string, number>();
  if (peopleIds.length > 0) {
    const { data: scores } = await supabase
      .from("confidence_scores")
      .select("entity_id, score")
      .eq("entity_type", "people")
      .in("entity_id", peopleIds);

    for (const row of scores || []) {
      if (row.score !== null) confidenceMap.set(row.entity_id, row.score);
    }
  }

  // ── map rows to domain objects ────────────────────────────────────────────
  const peoples: People[] = (peopleRows || [])
    .map((row: Record<string, unknown>) => ({
      id: row.id as string,
      nameMain: row.name_main as string,
      languageFamilyId: row.language_family_id as string,
      currentCountries: relationsMap.get(row.id as string) || [],
      classificationStatus:
        (row.classification_status as People["classificationStatus"]) ?? null,
      content: (row.content as Record<string, unknown>) || {},
      createdAt: row.created_at
        ? new Date(row.created_at as string)
        : undefined,
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string)
        : undefined,
    }))
    // Sort by confidence score descending (confidence boost); unknowns go last
    .sort(
      (a: People, b: People) =>
        (confidenceMap.get(b.id) ?? -1) - (confidenceMap.get(a.id) ?? -1)
    );

  const countries: Country[] = (countryRows || []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      nameFr: row.name_fr as string,
      etymology: (row.etymology as string) || undefined,
      nameOriginActor: (row.name_origin_actor as string) || undefined,
      content: (row.content as Record<string, unknown>) || {},
      createdAt: row.created_at
        ? new Date(row.created_at as string)
        : undefined,
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string)
        : undefined,
    })
  );

  const total = peoples.length + countries.length;
  return { peoples, countries, total };
}

/**
 * Legacy multi-entity search (kept for backward compatibility).
 * New callers should use ftsSearchPeoplesCountries.
 */
export async function searchAfrikAll(
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  if (!filters.type || filters.type === "country") {
    if (filters.query) {
      const countries = await searchAfrikCountries(filters.query);
      for (const country of countries) {
        if (filters.countryId && country.id !== filters.countryId) continue;
        results.push({
          type: "country",
          id: country.id,
          name: country.nameFr,
          data: country,
        });
      }
    } else if (filters.countryId) {
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

  if (!filters.type || filters.type === "people") {
    let peoples: Awaited<ReturnType<typeof searchAfrikPeoples>> = [];

    if (filters.languageFamilyId) {
      peoples = await getAfrikPeoplesByLanguageFamily(filters.languageFamilyId);
    } else if (filters.countryId) {
      peoples = await getAfrikPeoplesByCountry(filters.countryId);
    } else if (filters.query) {
      peoples = await searchAfrikPeoples(filters.query);
    }

    for (const people of peoples) {
      if (
        filters.countryId &&
        !people.currentCountries.includes(filters.countryId)
      )
        continue;
      if (
        filters.languageFamilyId &&
        people.languageFamilyId !== filters.languageFamilyId
      )
        continue;
      results.push({
        type: "people",
        id: people.id,
        name: people.nameMain,
        data: people,
      });
    }
  }

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
