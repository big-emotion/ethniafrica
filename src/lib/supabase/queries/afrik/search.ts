/**
 * Supabase queries for AFRIK search (multi-entity).
 *
 * ftsSearchEntities delegates ranking to the afrik_search_peoples /
 * afrik_search_countries / afrik_search_persons functions (migrations 044,
 * 064), which rank over the weighted tsvectors of migrations 043, 057. This
 * module maps their rows; it does not order them.
 */

import {
  searchAfrikLanguageFamilies,
  searchAfrikLanguageFamiliesByText,
} from "./languageFamilies";
import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";
import { normalizeString } from "@/lib/normalize";
import type {
  FtsSearchParams,
  FtsSearchResponse,
  LanguageFamily,
  RankedCountry,
  RankedLanguageFamily,
  RankedPeople,
  RankedPerson,
} from "@/types/afrik";
import type {
  PersonPeopleLink,
  PersonPeopleRelationLabel,
} from "@/types/persons";

/**
 * Ranked search across the four atlas entities (peoples, countries,
 * language families, persons).
 *
 * Ordering happens in Postgres, in the same statement as the LIMIT, because
 * that is the only place it can be correct. This function used to page in SQL
 * and then sort the page in JavaScript by confidence score, which meant the
 * order was per-page, the reported total was the page size, and no lexical
 * relevance was computed at all — the route swagger described a ts_rank_cd
 * ranking that nothing executed. Migrations 043/044 moved both the weighting
 * and the ranking into the database; this layer now only shapes the rows.
 *
 * Language families rank on two independent signals rather than one SQL
 * query. Their name still ranks with a full fetch plus an accent-insensitive
 * substring/prefix tier computed here (normalizeString — REQ-129), because
 * `search_vector`'s French-stemmed matching (migration 056) does not carry
 * that accent-insensitivity and an ilike filter cannot either (it compares
 * characters literally, so it cannot fold "Mandé" onto "mande"). Their
 * decolonial text (content->decolonialHeader) ranks separately, by asking
 * `search_vector` directly for the ids it matches (DEC-028) — this is what
 * lets a term that appears only in that prose, and nowhere in the name,
 * still surface the family. `relevance` is a tier, so it is comparable
 * between families and not with the other two kinds — `exactMatch` is what
 * callers sort on across kinds.
 *
 * A blank `q` with a relation scope (`familyId` / `countryId`) is a browse,
 * not a search: peoples are listed for that scope, and countries and families
 * are not queried, because nothing was asked of them.
 */
// @req REQ-002
export async function ftsSearchEntities(
  params: FtsSearchParams
): Promise<FtsSearchResponse> {
  const {
    q,
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

  const [
    peopleResult,
    countryResult,
    personResult,
    familyRows,
    familyProseMatchIds,
  ] = await Promise.all([
    supabase.rpc("afrik_search_peoples", {
      p_q: text || null,
      p_limit: limit,
      p_offset: offset,
      p_classification_status: classificationStatus ?? null,
      p_min_confidence: minConfidence ?? null,
      p_since_verified_after: sinceVerifiedAfter ?? null,
      p_family_id: familyId ?? null,
      p_country_id: countryId ?? null,
    }),
    text
      ? supabase.rpc("afrik_search_countries", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    text
      ? supabase.rpc("afrik_search_persons", {
          p_q: text,
          p_limit: limit,
          p_offset: offset,
        })
      : Promise.resolve({ data: EMPTY_RANKED_PAYLOAD, error: null }),
    text ? searchAfrikLanguageFamilies() : Promise.resolve([]),
    text ? searchAfrikLanguageFamiliesByText(text) : Promise.resolve([]),
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

  const peoplePayload = asRankedPayload(peopleResult.data);
  const countryPayload = asRankedPayload(countryResult.data);
  const personPayload = asRankedPayload(personResult.data);

  const peoples = peoplePayload.rows.map(toRankedPeople);
  const countries = countryPayload.rows.map(toRankedCountry);
  const families = rankLanguageFamilies(
    familyRows,
    text,
    new Set(familyProseMatchIds)
  );
  const personPeopleLinksById = await getPersonPeopleLinksByIds(
    supabase,
    personPayload.rows.map((row) => row.id as string)
  );
  const persons = personPayload.rows.map((row) =>
    toRankedPerson(row, personPeopleLinksById.get(row.id as string) ?? [])
  );

  return {
    peoples,
    countries,
    families,
    persons,
    peoplesTotal: peoplePayload.total,
    countriesTotal: countryPayload.total,
    familiesTotal: families.length,
    personsTotal: personPayload.total,
    total:
      peoplePayload.total +
      countryPayload.total +
      families.length +
      personPayload.total,
  };
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
    snippet: (row.snippet as string) ?? null,
    peopleLinks,
  };
}

/**
 * Exact name, then prefix, then anywhere in the name, then only in the
 * decolonial text (DEC-028). Name tiers fold accents and case away; the
 * prose tier is membership in `proseMatchIds`, decided by Postgres full-text
 * search over `search_vector` (searchAfrikLanguageFamiliesByText).
 */
const FAMILY_TIER_EXACT = 1;
const FAMILY_TIER_PREFIX = 0.6;
const FAMILY_TIER_SUBSTRING = 0.3;
const FAMILY_TIER_PROSE = 0.1;

function rankLanguageFamilies(
  families: LanguageFamily[],
  query: string,
  proseMatchIds: ReadonlySet<string>
): RankedLanguageFamily[] {
  const wanted = normalizeString(query);
  if (!wanted) return [];

  return families
    .filter(
      (family) =>
        normalizeString(family.nameFr).includes(wanted) ||
        proseMatchIds.has(family.id)
    )
    .map((family) => {
      const name = normalizeString(family.nameFr);
      const exactMatch = name === wanted;
      const relevance = exactMatch
        ? FAMILY_TIER_EXACT
        : name.startsWith(wanted)
          ? FAMILY_TIER_PREFIX
          : name.includes(wanted)
            ? FAMILY_TIER_SUBSTRING
            : FAMILY_TIER_PROSE;
      return { ...family, relevance, exactMatch };
    })
    .sort(
      (a, b) =>
        Number(b.exactMatch) - Number(a.exactMatch) ||
        b.relevance - a.relevance ||
        a.nameFr.localeCompare(b.nameFr, "fr")
    );
}
