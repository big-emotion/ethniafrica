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
        countryIds: row.currentCountries as SearchResult["countryIds"],
        population: totalPopulationOf(row.content),
      })
    ),
    ...asRows(countries).map(
      (row): SearchResult => ({
        type: "country",
        id: String(row.id),
        name: String(row.nameFr ?? ""),
        snippet: (row.etymology as string) || undefined,
      })
    ),
    ...asRows(families).map(
      (row): SearchResult => ({
        type: "languageFamily",
        id: String(row.id),
        name: String(row.nameFr ?? ""),
      })
    ),
  ];
}
