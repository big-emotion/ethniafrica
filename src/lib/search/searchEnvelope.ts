/**
 * Request and response adapter for `/api/v2/search`.
 *
 * The endpoint reads its query from `q` and answers
 * `{ data: { peoples, countries, families, total } }` — typed arrays of domain
 * objects, never one flat `results` list. Both facts used to be re-derived at
 * each call site, and each site got a different one wrong: the search modal
 * sent `query=` and got a 400 on every keystroke, the /recherche page read a
 * `results` key that is never emitted. Neither failure was visible, because
 * both were covered by tests mocking an envelope the API does not return.
 * Keeping the contract in one module is what makes that class of drift
 * impossible rather than merely fixed.
 */

import type { SearchResult } from "@/types/afrik-frontend";

export interface SearchQueryOptions {
  limit?: number;
  classificationStatus?: string;
  minConfidence?: string;
}

// @req REQ-002
export function buildSearchParams(
  query: string,
  { limit, classificationStatus, minConfidence }: SearchQueryOptions = {}
): URLSearchParams {
  const params = new URLSearchParams({ q: query });

  if (limit !== undefined) params.set("limit", String(limit));
  if (classificationStatus) {
    params.set("classificationStatus", classificationStatus);
  }
  if (minConfidence) params.set("minConfidence", minConfidence);

  return params;
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function totalPopulationOf(content: unknown): number | undefined {
  const demography = (content as { demography?: { totalPopulation?: number } })
    ?.demography;
  return typeof demography?.totalPopulation === "number"
    ? demography.totalPopulation
    : undefined;
}

// @req REQ-002
export function mapSearchEnvelope(envelope: unknown): SearchResult[] {
  const data = (envelope as { data?: unknown })?.data;
  // A flat array is the pre-FTS shape; treat it as no results rather than
  // reading `peoples` off an Array and crashing the whole modal.
  if (!data || Array.isArray(data)) return [];

  const { peoples, countries, families } = data as Record<string, unknown>;

  return [
    ...asRows(peoples).map(
      (row): SearchResult => ({
        type: "people",
        id: String(row.id),
        name: String(row.nameMain ?? ""),
        languageFamilyId:
          row.languageFamilyId as SearchResult["languageFamilyId"],
        languageFamilyName: (row.languageFamilyName as string) || undefined,
        countryIds: row.currentCountries as SearchResult["countryIds"],
        population: totalPopulationOf(row.content),
        snippet: (row.snippet as string) || undefined,
        relevance: numberOrUndefined(row.relevance),
        exactMatch: row.exactMatch === true,
        classificationStatus:
          row.classificationStatus as SearchResult["classificationStatus"],
        confidence: numberOrUndefined(row.confidence),
      })
    ),
    ...asRows(countries).map(
      (row): SearchResult => ({
        type: "country",
        id: String(row.id),
        name: String(row.nameFr ?? ""),
        // The match excerpt says why this row surfaced; the etymology only
        // says what the country is. Prefer the former when the API sends it.
        snippet:
          (row.snippet as string) || (row.etymology as string) || undefined,
        relevance: numberOrUndefined(row.relevance),
        exactMatch: row.exactMatch === true,
      })
    ),
    ...asRows(families).map(
      (row): SearchResult => ({
        type: "languageFamily",
        id: String(row.id),
        name: String(row.nameFr ?? ""),
        relevance: numberOrUndefined(row.relevance),
        exactMatch: row.exactMatch === true,
      })
    ),
  ];
}

/**
 * Orders results across entity kinds.
 *
 * `relevance` alone cannot do this: a people is scored `ts_rank × confidence`,
 * a country by bare `ts_rank`, a family by a tier — three scales that only
 * look like one number. `exactMatch` is the one signal that means the same
 * thing everywhere, so it decides first and relevance only breaks ties within
 * a kind's own range. Returning 0 for a genuine tie keeps the API's order,
 * `Array.prototype.sort` being stable.
 */
// @req REQ-002
export function compareByRelevance(a: SearchResult, b: SearchResult): number {
  if (a.exactMatch !== b.exactMatch) return a.exactMatch ? -1 : 1;
  return (b.relevance ?? 0) - (a.relevance ?? 0);
}
