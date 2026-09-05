/**
 * Supabase queries for AFRIK search (multi-entity).
 *
 * Every kind is ranked by its own SQL function — afrik_search_peoples,
 * _countries, _persons, _patronymes, _languages, _language_families and _quiz
 * (migrations 044, 052, 065, 066, 068, 069) — over the weighted tsvectors of
 * migrations 043, 056, 057, 066, 068 and 069. This module maps their rows and
 * merges the main-stream kinds; the quiz function is available only through
 * its dedicated lens. This layer ranks nothing itself.
 */

import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import { getAfrikPeoplesByIds } from "./peoples";
import type {
  FtsSearchParams,
  FtsSearchResponse,
  RankedCountry,
  RankedLanguage,
  RankedLanguageFamily,
  RankedPatronyme,
  RankedPeople,
  RankedPerson,
  RankedQuizQuestion,
  RankedSearchHit,
  SearchHitKind,
  SearchLead,
} from "@/types/afrik";
import type {
  PersonPeopleLink,
  PersonPeopleRelationLabel,
} from "@/types/persons";

/**
 * Ranked search across the main atlas stream or the dedicated quiz lens.
 *
 * Ordering happens in Postgres, in the same statement as the LIMIT, because
 * that is the only place it can be correct. This function used to page in SQL
 * and then sort the page in JavaScript by confidence score, which meant the
 * order was per-page, the reported total was the page size, and no lexical
 * relevance was computed at all — the route swagger described a ts_rank_cd
 * ranking that nothing executed. Migrations 043/044 moved both the weighting
 * and the ranking into the database; this layer now only shapes the rows.
 *
 * Language families were the last kind still ranked here: their whole roster
 * was fetched over the wire and put through a four-tier JS ladder. Migration
 * 069 reproduces that ladder in SQL — same tiers, same accent folding — so
 * families are now ranked in the same process as everything else.
 *
 * In the main stream, `results` merges the five normalized-score non-quiz
 * kinds on `normalizedScore`, the one magnitude migration 069 makes
 * comparable across them. The quiz lens instead returns only quiz hits.
 * Languages (migration 068) remain a grouped facet because their RPC does not
 * yet project that score. Grouped arrays stay beside `results` so a facet can
 * still ask what matched within one kind.
 *
 * A blank `q` with a relation scope (`familyId` / `countryId`) is a browse,
 * not a search: peoples are listed for that scope, and no other kind is
 * queried, because nothing was asked of them.
 */
// @req REQ-002
export async function ftsSearchEntities(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  const {
    q,
    lens,
    limit,
    offset,
    classificationStatus,
    minConfidence,
    sinceVerifiedAfter,
    familyId,
    countryId,
  } = params;

  const supabase = createServerClient();
  const text = q?.trim() ?? "";
  const quizOnly = lens === "quiz";

  const [
    peopleResult,
    countryResult,
    personResult,
    patronymeResult,
    familyResult,
    quizResult,
    languageResult,
  ] = await Promise.all([
    !quizOnly
      ? supabase.rpc("afrik_search_peoples", {
          p_q: text || null,
          p_limit: limit,
          p_offset: offset,
          p_classification_status: classificationStatus ?? null,
          p_min_confidence: minConfidence ?? null,
          p_since_verified_after: sinceVerifiedAfter ?? null,
          p_family_id: familyId ?? null,
          p_country_id: countryId ?? null,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    !quizOnly && text
      ? supabase.rpc("afrik_search_countries", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    !quizOnly && text
      ? supabase.rpc("afrik_search_persons", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    !quizOnly && text
      ? supabase.rpc("afrik_search_patronymes", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    !quizOnly && text
      ? supabase.rpc("afrik_search_language_families", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    quizOnly && text
      ? supabase.rpc("afrik_search_quiz", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    !quizOnly && text
      ? supabase.rpc("afrik_search_languages", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
  ]);

  if (peopleResult.error) {
    logger.error("Error in ranked peoples search", peopleResult.error);
    throw peopleResult.error;
  }
  if (countryResult.error) {
    logger.error("Error in ranked countries search", countryResult.error);
    throw countryResult.error;
  }
  if (personResult.error) {
    logger.error("Error in ranked persons search", personResult.error);
    throw personResult.error;
  }
  if (patronymeResult.error) {
    logger.error("Error in ranked patronymes search", patronymeResult.error);
    throw patronymeResult.error;
  }
  if (familyResult.error) {
    logger.error(
      "Error in ranked language families search",
      familyResult.error
    );
    throw familyResult.error;
  }
  if (quizResult.error) {
    logger.error("Error in ranked quiz search", quizResult.error);
    throw quizResult.error;
  }
  if (languageResult.error) {
    logger.error("Error in ranked languages search", languageResult.error);
    throw languageResult.error;
  }

  const peoplePayload = asRankedPayload(peopleResult.data);
  const countryPayload = asRankedPayload(countryResult.data);
  const personPayload = asRankedPayload(personResult.data);
  const patronymePayload = asRankedPayload(patronymeResult.data);
  const familyPayload = asRankedPayload(familyResult.data);
  const quizPayload = asRankedPayload(quizResult.data);
  const languagePayload = asRankedPayload(languageResult.data);

  const peoples = peoplePayload.rows.map(toRankedPeople);
  const countries = countryPayload.rows.map(toRankedCountry);
  const families = familyPayload.rows.map(toRankedLanguageFamily);
  const quizzes = quizPayload.rows.map(toRankedQuizQuestion);
  const personPeopleLinksById = await getPersonPeopleLinksByIds(
    supabase,
    personPayload.rows.map((row) => row.id as string)
  );
  const persons = personPayload.rows.map((row) =>
    toRankedPerson(row, personPeopleLinksById.get(row.id as string) ?? [])
  );
  const patronymes = await withAssociatedPeoples(
    patronymePayload.rows.map(toRankedPatronyme)
  );
  const languages = languagePayload.rows.map(toRankedLanguage);

  const total =
    peoplePayload.total +
    countryPayload.total +
    familyPayload.total +
    personPayload.total +
    patronymePayload.total +
    quizPayload.total +
    languagePayload.total;

  // Leads are only worth computing once the main search has already come up
  // empty (REQ-125) — a non-empty result set is not a dead end, so it never
  // needs a near-miss.
  const leads =
    !quizOnly && text && total === 0
      ? await fetchSearchLeads(supabase, text)
      : [];

  return {
    peoples,
    countries,
    families,
    persons,
    patronymes,
    quizzes,
    languages,
    results: mergeIntoOneRanking({
      peoples,
      countries,
      families,
      persons,
      patronymes,
      quizzes,
    }),
    peoplesTotal: peoplePayload.total,
    countriesTotal: countryPayload.total,
    familiesTotal: familyPayload.total,
    personsTotal: personPayload.total,
    patronymesTotal: patronymePayload.total,
    quizzesTotal: quizPayload.total,
    languagesTotal: languagePayload.total,
    total,
    leads,
  };
}

async function fetchSearchLeads(
  supabase: ReturnType<typeof createServerClient>,
  text: string
): Promise<SearchLead[]> {
  const { data, error } = await supabase.rpc("afrik_search_leads", {
    p_q: text,
    p_limit: 3,
  });

  if (error) {
    logger.error("Error in search leads", error);
    throw error;
  }

  const payload = data as { rows?: Record<string, unknown>[] } | null;
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];

  return rows.map((row) => ({
    kind: row.kind as SearchLead["kind"],
    id: row.id as string,
    name: row.name as string,
    similarity: typeof row.similarity === "number" ? row.similarity : 0,
  }));
}

interface RankedPayload {
  total: number;
  rows: Record<string, unknown>[];
}

const EMPTY_RANKED_PAYLOAD: RankedPayload = { total: 0, rows: [] };

function asRankedPayload(data: unknown): RankedPayload {
  const payload = data as Partial<RankedPayload> | null;
  return {
    total: typeof payload?.total === "number" ? payload.total : 0,
    rows: Array.isArray(payload?.rows) ? payload.rows : [],
  };
}

function toDate(value: unknown): Date | undefined {
  return value ? new Date(value as string) : undefined;
}

function toRankedPeople(row: Record<string, unknown>): RankedPeople {
  return {
    id: row.id as string,
    nameMain: row.nameMain as string,
    languageFamilyId: row.languageFamilyId as string,
    languageFamilyName: (row.languageFamilyName as string) ?? null,
    currentCountries: (row.currentCountries as string[]) ?? [],
    classificationStatus:
      (row.classificationStatus as RankedPeople["classificationStatus"]) ??
      null,
    content: (row.content as Record<string, unknown>) || {},
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    normalizedScore: toScore(row.normalizedScore),
    snippet: (row.snippet as string) ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function toRankedCountry(row: Record<string, unknown>): RankedCountry {
  return {
    id: row.id as string,
    nameFr: row.nameFr as string,
    etymology: (row.etymology as string) || undefined,
    nameOriginActor: (row.nameOriginActor as string) || undefined,
    content: (row.content as Record<string, unknown>) || {},
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    normalizedScore: toScore(row.normalizedScore),
    snippet: (row.snippet as string) ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

/**
 * Batched person_peoples lookup for a page of search results — one query
 * for the whole page rather than one per person. Carries relation_label
 * (membership vs observation) so a person's link to a studied people is
 * never collapsed into membership in it (REQ-126).
 */
async function getPersonPeopleLinksByIds(
  supabase: ReturnType<typeof createServerClient>,
  personIds: string[]
): Promise<Map<string, PersonPeopleLink[]>> {
  const links = new Map<string, PersonPeopleLink[]>();
  if (personIds.length === 0) return links;

  const { data, error } = await supabase
    .from("person_peoples")
    .select("person_id, people_id, relation_label")
    .in("person_id", personIds);

  if (error) {
    logger.error("Error fetching person_peoples for search results", error);
    throw error;
  }

  for (const row of data || []) {
    const personId = row.person_id as string;
    const link: PersonPeopleLink = {
      peopleId: row.people_id as string,
      relationLabel: row.relation_label as PersonPeopleRelationLabel,
    };
    links.set(personId, [...(links.get(personId) ?? []), link]);
  }

  return links;
}

function toRankedPerson(
  row: Record<string, unknown>,
  peopleLinks: PersonPeopleLink[]
): RankedPerson {
  return {
    id: row.id as RankedPerson["id"],
    fullName: row.fullName as string,
    roleCategory: row.roleCategory as string,
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    normalizedScore: toScore(row.normalizedScore),
    snippet: (row.snippet as string) ?? null,
    peopleLinks,
  };
}

function toRankedPatronyme(row: Record<string, unknown>): RankedPatronyme {
  return {
    id: row.id as string,
    nameMain: row.nameMain as string,
    nameSystem: row.nameSystem as string,
    casteOrSocialFunction: (row.casteOrSocialFunction as string) ?? null,
    content: (row.content as Record<string, unknown>) || {},
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    normalizedScore: toScore(row.normalizedScore),
    snippet: (row.snippet as string) ?? null,
  };
}

/** The `content.peoples[].peopleId` a name fiche declares, in fiche order. */
function declaredPeopleIdsOf(patronyme: RankedPatronyme): string[] {
  const peoples = patronyme.content.peoples;
  if (!Array.isArray(peoples)) return [];
  return peoples
    .map((entry) =>
      entry && typeof entry === "object"
        ? (entry as Record<string, unknown>).peopleId
        : undefined
    )
    .filter((id): id is string => typeof id === "string");
}

/**
 * Resolves the peoples each name hit declares to their main name, in one
 * batched lookup for the page (ETNI-1859), so the results surface can name a
 * people instead of printing its `PPL_*` id. The names are a decoration on
 * the hit, not the hit itself: a failing lookup is logged and the names are
 * left unresolved rather than turning a found name into a failed search.
 */
async function withAssociatedPeoples(
  patronymes: RankedPatronyme[]
): Promise<RankedPatronyme[]> {
  const declaredIds = patronymes.map(declaredPeopleIdsOf);
  const uniqueIds = [...new Set(declaredIds.flat())];
  if (uniqueIds.length === 0) return patronymes;

  let nameById: Map<string, string>;
  try {
    const peoples = await getAfrikPeoplesByIds(uniqueIds);
    nameById = new Map(peoples.map((people) => [people.id, people.nameMain]));
  } catch (error) {
    logger.error("Error resolving associated peoples of name hits", error);
    return patronymes;
  }

  return patronymes.map((patronyme, index) => {
    if (declaredIds[index].length === 0) return patronyme;
    const associatedPeoples = declaredIds[index].flatMap((id) => {
      const name = nameById.get(id);
      return name ? [{ id, name }] : [];
    });
    return { ...patronyme, associatedPeoples };
  });
}

function toRankedLanguageFamily(
  row: Record<string, unknown>
): RankedLanguageFamily {
  return {
    id: row.id as string,
    nameFr: row.nameFr as string,
    nameEn: (row.nameEn as string) || undefined,
    classificationStatus:
      (row.classificationStatus as RankedLanguageFamily["classificationStatus"]) ??
      null,
    content: (row.content as Record<string, unknown>) || {},
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    normalizedScore: toScore(row.normalizedScore),
    snippet: (row.snippet as string) ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function toRankedLanguage(row: Record<string, unknown>): RankedLanguage {
  return {
    id: row.id as string,
    name: row.name as string,
    familyId: row.familyId as string,
    familyName: (row.familyName as string) ?? null,
    content: (row.content as RankedLanguage["content"]) || {},
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    snippet: (row.snippet as string) ?? null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

/**
 * The answer key is absent by construction: this reads the keys migration 069
 * projects and nothing else, so a column added to the RPC later cannot leak
 * into the response by accident.
 */
function toRankedQuizQuestion(
  row: Record<string, unknown>
): RankedQuizQuestion {
  return {
    id: row.id as string,
    prompt: row.prompt as string,
    entityType: row.entityType as string,
    entityId: row.entityId as string,
    subjectName: (row.subjectName as string) ?? null,
    relevance: typeof row.relevance === "number" ? row.relevance : 0,
    exactMatch: row.exactMatch === true,
    normalizedScore: toScore(row.normalizedScore),
    snippet: (row.snippet as string) ?? null,
  };
}

function toScore(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

interface RankedGroups {
  peoples: RankedPeople[];
  countries: RankedCountry[];
  families: RankedLanguageFamily[];
  persons: RankedPerson[];
  patronymes: RankedPatronyme[];
  quizzes: RankedQuizQuestion[];
}

/**
 * The six grouped arrays, flattened into one list ordered on the score they
 * share (migration 069).
 *
 * Ties are frequent by design — the score bands a match class, so two exact
 * hits of different kinds routinely land on the same value — and an unstable
 * tie-break would reshuffle a result page between two identical requests.
 * Name in French collation, then id, gives one deterministic order; "fr"
 * matters because a byte comparison sorts every accented name after "Z".
 */
function mergeIntoOneRanking(groups: RankedGroups): RankedSearchHit[] {
  const hits: RankedSearchHit[] = [
    ...groups.peoples.map((hit) =>
      toSearchHit("people", hit.id, hit.nameMain, hit)
    ),
    ...groups.countries.map((hit) =>
      toSearchHit("country", hit.id, hit.nameFr, hit)
    ),
    ...groups.families.map((hit) =>
      toSearchHit("languageFamily", hit.id, hit.nameFr, hit)
    ),
    ...groups.persons.map((hit) =>
      toSearchHit("person", hit.id, hit.fullName, hit)
    ),
    ...groups.patronymes.map((hit) =>
      toSearchHit("patronyme", hit.id, hit.nameMain, hit)
    ),
    ...groups.quizzes.map((hit) =>
      toSearchHit("quiz", hit.id, hit.prompt, hit)
    ),
  ];

  return hits.sort(
    (a, b) =>
      b.normalizedScore - a.normalizedScore ||
      a.name.localeCompare(b.name, "fr") ||
      a.id.localeCompare(b.id)
  );
}

function toSearchHit(
  kind: SearchHitKind,
  id: string,
  name: string,
  hit: { normalizedScore: number; snippet: string | null }
): RankedSearchHit {
  return {
    kind,
    id,
    name,
    normalizedScore: hit.normalizedScore,
    snippet: hit.snippet,
  };
}
