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

import type {
  SearchEntityType,
  SearchLead,
  SearchResult,
} from "@/types/afrik-frontend";
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

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A patronyme fiche's declared associations (ETNI-1804), read off
 * `content.peoples`/`content.countries` (`modele-nom-patronyme.json`), which
 * the search RPC forwards untouched — the same posture as `appellationsOf`
 * above. A country counts only when the fiche marks it `attested`, not
 * `supposed`: `DominantAnswerPanel` (ETNI-1806) must not present a guess as
 * a fact.
 */
function patronymeAssociationsOf(content: unknown): {
  associatedPeopleIds?: string[];
  attestedCountryIds?: string[];
} {
  const bag = content as { peoples?: unknown; countries?: unknown };

  const associatedPeopleIds = Array.isArray(bag?.peoples)
    ? bag.peoples
        .map((entry) =>
          entry && typeof entry === "object"
            ? (entry as Record<string, unknown>).peopleId
            : undefined
        )
        .filter((id): id is string => typeof id === "string")
    : undefined;

  const attestedCountryIds = Array.isArray(bag?.countries)
    ? bag.countries
        .filter(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            (entry as Record<string, unknown>).status === "attested"
        )
        .map((entry) => (entry as Record<string, unknown>).countryId)
        .filter((id): id is string => typeof id === "string")
    : undefined;

  return { associatedPeopleIds, attestedCountryIds };
}

/**
 * The speaker peoples a language fiche declares (ETNI-1804), read off
 * `content.peoples` (`persistedContent` in `languageProvenanceLoader.ts`).
 * Only entries with a resolved `peopleId` count: the corpus also lists a
 * speaker people by bare name before its own fiche exists.
 */
function speakerPeopleIdsOf(content: unknown): string[] | undefined {
  const peoples = (content as { peoples?: unknown })?.peoples;
  return Array.isArray(peoples)
    ? peoples
        .map((entry) =>
          entry && typeof entry === "object"
            ? (entry as Record<string, unknown>).peopleId
            : undefined
        )
        .filter((id): id is string => typeof id === "string")
    : undefined;
}

/** Number of source entries declared by the fiche (people or patronyme content, both share the `sources` shape). */
function sourceMetadataOf(
  content: unknown
): Pick<SearchResult, "sourceCount" | "externalLinks"> {
  if (
    typeof content !== "object" ||
    content === null ||
    Array.isArray(content)
  ) {
    return {};
  }

  const sources = (content as Record<string, unknown>).sources;
  if (!Array.isArray(sources)) return {};

  const externalLinks = sources.flatMap(
    (source): NonNullable<SearchResult["externalLinks"]> => {
      if (
        typeof source !== "object" ||
        source === null ||
        Array.isArray(source)
      ) {
        return [];
      }

      const { title, url } = source as Record<string, unknown>;
      if (
        typeof title !== "string" ||
        title.trim().length === 0 ||
        typeof url !== "string" ||
        !isHttpUrl(url)
      ) {
        return [];
      }

      return [{ title, url }];
    }
  );

  return { sourceCount: sources.length, externalLinks };
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
    ...asRows(peoples).map((row): SearchResult => ({
      type: "people",
      id: String(row.id),
      name: String(row.nameMain ?? ""),
      languageFamilyId:
        row.languageFamilyId as SearchResult["languageFamilyId"],
      languageFamilyName: (row.languageFamilyName as string) || undefined,
      countryIds: row.currentCountries as SearchResult["countryIds"],
      population: totalPopulationOf(row.content),
      ...appellationsOf(row.content),
      ...sourceMetadataOf(row.content),
      snippet: (row.snippet as string) || undefined,
      relevance: numberOrUndefined(row.relevance),
      exactMatch: row.exactMatch === true,
      classificationStatus:
        row.classificationStatus as SearchResult["classificationStatus"],
      confidence: numberOrUndefined(row.confidence),
    })),
    ...asRows(countries).map((row): SearchResult => ({
      type: "country",
      id: String(row.id),
      name: String(row.nameFr ?? ""),
      // The match excerpt says why this row surfaced; the etymology only
      // says what the country is. Prefer the former when the API sends it.
      snippet:
        (row.snippet as string) || (row.etymology as string) || undefined,
      relevance: numberOrUndefined(row.relevance),
      exactMatch: row.exactMatch === true,
    })),
    ...asRows(families).map((row): SearchResult => ({
      type: "languageFamily",
      id: String(row.id),
      name: String(row.nameFr ?? ""),
      relevance: numberOrUndefined(row.relevance),
      exactMatch: row.exactMatch === true,
    })),
    // REQ-126: roleCategory and peopleLinks are carried through untouched —
    // an `observation` relation must never be coerced to `membership`, which
    // is what would make an ethnographer read as a member of the people they
    // studied.
    ...asRows(persons).map((row): SearchResult => ({
      type: "person",
      id: String(row.id),
      name: String(row.fullName ?? ""),
      roleCategory: String(row.roleCategory ?? ""),
      peopleLinks: (row.peopleLinks as PersonPeopleLink[] | undefined) ?? [],
      snippet: (row.snippet as string) || undefined,
      relevance: numberOrUndefined(row.relevance),
      exactMatch: row.exactMatch === true,
    })),
    // ETNI-1463: the name (patronyme) reaches the unified surface as its own
    // kind — a query that resolves to a lineage name rather than a people,
    // country or family must still return something.
    ...asRows(patronymes).map((row): SearchResult => ({
      type: "patronyme",
      id: String(row.id),
      name: String(row.nameMain ?? ""),
      nameSystem: row.nameSystem as SearchResult["nameSystem"],
      casteOrSocialFunction:
        row.casteOrSocialFunction as SearchResult["casteOrSocialFunction"],
      ...patronymeAssociationsOf(row.content),
      ...sourceMetadataOf(row.content),
      snippet: (row.snippet as string) || undefined,
      relevance: numberOrUndefined(row.relevance),
      exactMatch: row.exactMatch === true,
    })),
    // REQ-136: a language reaches the unified surface as its own kind, not
    // only through the peoples that mention it.
    ...asRows(languages).map((row): SearchResult => ({
      type: "language",
      id: String(row.id),
      name: String(row.name ?? ""),
      languageFamilyId: row.familyId as SearchResult["languageFamilyId"],
      languageFamilyName: (row.familyName as string) || undefined,
      // `id` already is the ISO 639-3 code (afrik_languages is keyed on
      // it); duplicated under its own name so a consumer never has to know
      // that.
      isoCode639_3: (row.id as string) || undefined,
      speakerPeopleIds: speakerPeopleIdsOf(row.content),
      ...sourceMetadataOf(row.content),
      snippet: (row.snippet as string) || undefined,
      relevance: numberOrUndefined(row.relevance),
      exactMatch: row.exactMatch === true,
    })),
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

/** Per-type match counts (REQ-124) for the named-lens chips. */
export type SearchLensCounts = Record<SearchEntityType | "all", number>;

// @req REQ-124
export const EMPTY_SEARCH_LENS_COUNTS: SearchLensCounts = {
  all: 0,
  people: 0,
  country: 0,
  languageFamily: 0,
  language: 0,
  person: 0,
  patronyme: 0,
};

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Corpus-wide match counts, one per lens (REQ-124). Read straight off the
 * totals `shapeSearchData` (handlers/search.ts) already computes. `all` is
 * the sum of the six lenses shown here (ETNI-1463 added the patronyme lens),
 * not `data.total`, which can carry totals for kinds that have no lens.
 */
// @req REQ-124
export function mapSearchCounts(envelope: unknown): SearchLensCounts {
  const data = (envelope as { data?: unknown })?.data;
  if (!data || Array.isArray(data)) return { ...EMPTY_SEARCH_LENS_COUNTS };

  const row = data as Record<string, unknown>;
  const people = numberOrZero(row.peoplesTotal);
  const country = numberOrZero(row.countriesTotal);
  const languageFamily = numberOrZero(row.familiesTotal);
  const language = numberOrZero(row.languagesTotal);
  const person = numberOrZero(row.personsTotal);
  const patronyme = numberOrZero(row.patronymesTotal);
  return {
    all: people + country + languageFamily + language + person + patronyme,
    people,
    country,
    languageFamily,
    language,
    person,
    patronyme,
  };
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
