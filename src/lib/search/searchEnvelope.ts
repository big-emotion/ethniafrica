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

import type { SearchLead, SearchResult } from "@/types/afrik-frontend";
import type { PersonPeopleLink } from "@/types/persons";

export interface SearchQueryOptions {
  limit?: number;
  classificationStatus?: string;
  minConfidence?: string;
  /** Scope to the peoples of one language family (`FLG_*`). */
  familyId?: string;
  /** Scope to the peoples present in one country (ISO 3166-1 alpha-3). */
  countryId?: string;
}

// @req REQ-002
export function buildSearchParams(
  query: string,
  {
    limit,
    classificationStatus,
    minConfidence,
    familyId,
    countryId,
  }: SearchQueryOptions = {}
): URLSearchParams {
  const params = new URLSearchParams();

  // A relation scope is a search on its own, so an empty q is omitted rather
  // than sent blank — the route rejects `q=` but accepts no `q` at all.
  if (query) params.set("q", query);
  if (limit !== undefined) params.set("limit", String(limit));
  if (classificationStatus) {
    params.set("classificationStatus", classificationStatus);
  }
  if (minConfidence) params.set("minConfidence", minConfidence);
  if (familyId) params.set("familyId", familyId);
  if (countryId) params.set("countryId", countryId);

  return params;
}

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/**
 * The autonym and the exonyms a people carries, read off the payload the API
 * already sends. Surfacing them is the whole point of the atlas: a name
 * imposed from outside should never stand alone where the self-appellation
 * exists.
 *
 * `peopleGroupId`/`peopleGroupLabel` (ETNI-1391) travel the same way: they
 * already sit in `content.appellations` on the fiche, which the search RPCs
 * pass through untouched, so no API contract change was needed to surface
 * them here.
 */
function appellationsOf(content: unknown): {
  autonym?: string;
  exonyms?: string[];
  peopleGroupId?: string;
  peopleGroupLabel?: string;
} {
  const appellations = (
    content as {
      appellations?: {
        selfAppellation?: unknown;
        exonyms?: unknown;
        peopleGroupId?: unknown;
        peopleGroupLabel?: unknown;
      };
    }
  )?.appellations;

  const autonym =
    typeof appellations?.selfAppellation === "string"
      ? appellations.selfAppellation
      : undefined;
  const exonyms = Array.isArray(appellations?.exonyms)
    ? appellations.exonyms.filter(
        (name): name is string => typeof name === "string"
      )
    : undefined;
  const peopleGroupId =
    typeof appellations?.peopleGroupId === "string"
      ? appellations.peopleGroupId
      : undefined;
  const peopleGroupLabel =
    typeof appellations?.peopleGroupLabel === "string"
      ? appellations.peopleGroupLabel
      : undefined;

  return { autonym, exonyms, peopleGroupId, peopleGroupLabel };
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

  const { peoples, countries, families, persons, patronymes, languages } =
    data as Record<string, unknown>;

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
        ...appellationsOf(row.content),
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
    // REQ-126: roleCategory and peopleLinks are carried through untouched —
    // an `observation` relation must never be coerced to `membership`, which
    // is what would make an ethnographer read as a member of the people they
    // studied.
    ...asRows(persons).map(
      (row): SearchResult => ({
        type: "person",
        id: String(row.id),
        name: String(row.fullName ?? ""),
        roleCategory: String(row.roleCategory ?? ""),
        peopleLinks: (row.peopleLinks as PersonPeopleLink[] | undefined) ?? [],
        snippet: (row.snippet as string) || undefined,
        relevance: numberOrUndefined(row.relevance),
        exactMatch: row.exactMatch === true,
      })
    ),
    // ETNI-1463: the name (patronyme) reaches the unified surface as its own
    // kind — a query that resolves to a lineage name rather than a people,
    // country or family must still return something.
    ...asRows(patronymes).map(
      (row): SearchResult => ({
        type: "patronyme",
        id: String(row.id),
        name: String(row.nameMain ?? ""),
        snippet: (row.snippet as string) || undefined,
        relevance: numberOrUndefined(row.relevance),
        exactMatch: row.exactMatch === true,
      })
    ),
    // REQ-136: a language reaches the unified surface as its own kind, not
    // only through the peoples that mention it.
    ...asRows(languages).map(
      (row): SearchResult => ({
        type: "language",
        id: String(row.id),
        name: String(row.name ?? ""),
        languageFamilyId: row.familyId as SearchResult["languageFamilyId"],
        languageFamilyName: (row.familyName as string) || undefined,
        snippet: (row.snippet as string) || undefined,
        relevance: numberOrUndefined(row.relevance),
        exactMatch: row.exactMatch === true,
      })
    ),
  ];
}

const LEAD_KIND_TO_TYPE: Record<string, SearchLead["type"]> = {
  people: "people",
  country: "country",
  family: "languageFamily",
};

/**
 * Near-miss leads (REQ-125) — populated by the API only when `data.total`
 * is 0. An unrecognised `kind` is dropped rather than surfaced with a wrong
 * accent: this is the same defensive stance as `mapSearchEnvelope` treating
 * a non-object `data` as no results.
 */
// @req REQ-125
export function mapSearchLeads(envelope: unknown): SearchLead[] {
  const data = (envelope as { data?: unknown })?.data;
  if (!data || Array.isArray(data)) return [];

  const { leads } = data as Record<string, unknown>;

  return asRows(leads).flatMap((row): SearchLead[] => {
    const type = LEAD_KIND_TO_TYPE[row.kind as string];
    if (!type) return [];
    return [
      {
        type,
        id: String(row.id),
        name: String(row.name ?? ""),
        similarity: numberOrUndefined(row.similarity) ?? 0,
      },
    ];
  });
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
