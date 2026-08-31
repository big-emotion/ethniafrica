/**
 * Supabase queries for AFRIK search (multi-entity).
 *
 * ftsSearchEntities delegates ranking to the afrik_search_peoples /
 * afrik_search_countries functions (migration 044), which rank over the
 * weighted tsvectors of migration 043. This module maps their rows; it does
 * not order them.
 */

import { searchAfrikLanguageFamilies } from "./languageFamilies";
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
} from "@/types/afrik";

/**
 * Ranked search across the three atlas entities.
 *
 * Ordering happens in Postgres, in the same statement as the LIMIT, because
 * that is the only place it can be correct. This function used to page in SQL
 * and then sort the page in JavaScript by confidence score, which meant the
 * order was per-page, the reported total was the page size, and no lexical
 * relevance was computed at all — the route swagger described a ts_rank_cd
 * ranking that nothing executed. Migrations 043/044 moved both the weighting
 * and the ranking into the database; this layer now only shapes the rows.
 *
 * Language families keep the ilike query: they have no tsvector, and at two
 * dozen rows a match tier computed here is smaller than the migration an
 * index would cost. Their `relevance` is a tier, so it is comparable between
 * families and not with the other two kinds — `exactMatch` is what callers
 * sort on across kinds.
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

  const [peopleResult, countryResult, familyRows] = await Promise.all([
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
    text ? searchAfrikLanguageFamilies(text) : Promise.resolve([]),
  ]);

  if (peopleResult.error) {
    logger.error("Error in ranked peoples search", peopleResult.error);
    throw peopleResult.error;
  }
  if (countryResult.error) {
    logger.error("Error in ranked countries search", countryResult.error);
    throw countryResult.error;
  }

  const peoplePayload = asRankedPayload(peopleResult.data);
  const countryPayload = asRankedPayload(countryResult.data);

  const peoples = peoplePayload.rows.map(toRankedPeople);
  const countries = countryPayload.rows.map(toRankedCountry);
  const families = rankLanguageFamilies(familyRows, text);

  return {
    peoples,
    countries,
    families,
    peoplesTotal: peoplePayload.total,
    countriesTotal: countryPayload.total,
    familiesTotal: families.length,
    total: peoplePayload.total + countryPayload.total + families.length,
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

/** Exact name, then prefix, then anywhere. Accents and case are folded away. */
const FAMILY_TIER_EXACT = 1;
const FAMILY_TIER_PREFIX = 0.6;
const FAMILY_TIER_SUBSTRING = 0.3;

function rankLanguageFamilies(
  families: LanguageFamily[],
  query: string
): RankedLanguageFamily[] {
  const wanted = normalizeString(query);
  if (!wanted) return [];

  return families
    .map((family) => {
      const name = normalizeString(family.nameFr);
      const exactMatch = name === wanted;
      const relevance = exactMatch
        ? FAMILY_TIER_EXACT
        : name.startsWith(wanted)
          ? FAMILY_TIER_PREFIX
          : FAMILY_TIER_SUBSTRING;
      return { ...family, relevance, exactMatch };
    })
    .sort(
      (a, b) =>
        Number(b.exactMatch) - Number(a.exactMatch) ||
        b.relevance - a.relevance ||
        a.nameFr.localeCompare(b.nameFr, "fr")
    );
}
