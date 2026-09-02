/**
 * The name dimension read backwards — from a people, and from a country.
 *
 * `docs/design/name-to-country-linking.md` is the argument this module
 * implements. Its one load-bearing claim is that a country can be reached
 * along two routes that assert different things — "this name is attested
 * here", and "the people who bear this name live here" — and that neither
 * route contains the other. Measured on recette: 21 countries direct, 25 via
 * peoples, 2 reachable only directly (ERI, ETH), 6 only via peoples (BEN, DZA,
 * LBY, MAR, TGO, TUN).
 *
 * So `getCountryPatronymes` returns two lists and never one. Merging them
 * would publish an inference under the heading of a sourced fact.
 *
 * It lives beside `patronymes.ts` rather than inside it because that module
 * answers the forward question — everything one name reaches — and reuses its
 * join walk rather than copying it.
 */

import { logger } from "@/lib/api/logger";
import { createServerClient } from "@/lib/supabase/server";
import type { PatronymeNameSystem } from "@/api/v2/schemas/patronymes";
import {
  getPatronymeIdsLinkedTo,
  PATRONYME_FACET_MAX_PAGES,
  PATRONYME_FACET_WALK_SIZE,
} from "./patronymes";

/** A name as a fiche lists it: enough to name it and to link to it. */
export interface PatronymeLinkSummary {
  id: string;
  nameMain: string;
  nameSystem: PatronymeNameSystem;
}

/**
 * A name a country's peoples carry, and which of them carry it.
 *
 * The bearing peoples travel with the entry because they are what makes it
 * reach rather than attestation: they are the second half of the inference,
 * and a reader who cannot see them cannot check it.
 */
export interface PatronymeReachSummary extends PatronymeLinkSummary {
  viaPeoples: Array<{ id: string; nameMain: string }>;
}

export interface CountryPatronymes {
  /** `afrik_patronyme_countries` — what a source attests in this country. */
  attested: PatronymeLinkSummary[];
  /**
   * Reachable through this country's peoples, and *not* attested here.
   *
   * The subtraction is what keeps the two lists readable rather than what
   * merges them. On the three best-documented countries — Mali, Côte d'Ivoire,
   * Burkina Faso — every name the peoples carry is also directly attested, so
   * an unsubtracted list would print the same nine names twice under two
   * headings and read as a rendering fault. What survives the subtraction is
   * exactly what the people route contributes and the direct one does not.
   */
  borneByPeoples: PatronymeReachSummary[];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * The peoples a country holds, walked with an explicit range for the reason
 * `getPatronymeIdsLinkedTo` is: an unranged select is capped server-side, and
 * the countries that would lose rows are the best-documented ones.
 */
async function getPeopleIdsInCountry(countryId: string): Promise<string[]> {
  const supabase = createServerClient();
  const peopleIds: string[] = [];

  for (let page = 0; page < PATRONYME_FACET_MAX_PAGES; page++) {
    const start = page * PATRONYME_FACET_WALK_SIZE;
    const { data, error } = await supabase
      .from("afrik_people_countries")
      .select("people_id")
      .eq("country_id", countryId)
      .range(start, start + PATRONYME_FACET_WALK_SIZE - 1);

    if (error) {
      logger.error(`Error fetching peoples of country ${countryId}`, error);
      throw error;
    }

    const rows = (data ?? []) as Array<{ people_id: string }>;
    for (const row of rows) peopleIds.push(row.people_id);
    if (rows.length < PATRONYME_FACET_WALK_SIZE) {
      return uniqueStrings(peopleIds);
    }
  }

  logger.error(
    `Peoples of country ${countryId} exceeded ${PATRONYME_FACET_MAX_PAGES} pages — the list is truncated`
  );
  return uniqueStrings(peopleIds);
}

/**
 * The name rows behind a set of ids, alphabetically.
 *
 * `name_main` is the column the list endpoint already orders by; reading the
 * label off the same column keeps a fiche's ordering and its labels from
 * disagreeing, which they would if this read `content.nameMain` instead.
 */
async function getPatronymeSummaries(
  ids: string[]
): Promise<PatronymeLinkSummary[]> {
  if (ids.length === 0) return [];

  const supabase = createServerClient();
  const summaries: PatronymeLinkSummary[] = [];

  for (let page = 0; page < PATRONYME_FACET_MAX_PAGES; page++) {
    const start = page * PATRONYME_FACET_WALK_SIZE;
    const { data, error } = await supabase
      .from("afrik_patronymes")
      .select("id, name_main, name_system")
      .in("id", ids)
      .order("name_main")
      .range(start, start + PATRONYME_FACET_WALK_SIZE - 1);

    if (error) {
      logger.error("Error fetching patronyme summaries", error);
      throw error;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      name_main: string | null;
      name_system: PatronymeNameSystem;
    }>;
    for (const row of rows) {
      summaries.push({
        id: row.id,
        nameMain: row.name_main ?? "",
        nameSystem: row.name_system,
      });
    }
    if (rows.length < PATRONYME_FACET_WALK_SIZE) return summaries;
  }

  logger.error(
    `Patronyme summaries exceeded ${PATRONYME_FACET_MAX_PAGES} pages — the list is truncated`
  );
  return summaries;
}

/** Just the label, for the peoples named in a reach entry. */
async function getPeopleNamesByIds(
  peopleIds: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (peopleIds.length === 0) return names;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("id, name_main")
    .in("id", peopleIds)
    .order("name_main")
    .range(0, PATRONYME_FACET_WALK_SIZE - 1);

  if (error) {
    logger.error("Error fetching people names for the reach list", error);
    throw error;
  }

  for (const row of (data ?? []) as Array<{
    id: string;
    name_main: string | null;
  }>) {
    names.set(row.id, row.name_main ?? row.id);
  }
  return names;
}

/**
 * The names the corpus attaches to one people — the people fiche's own
 * chapter, and the reverse of the name fiche's « Peuples porteurs ».
 *
 * An empty list is the ordinary answer, not a failure: 13 peoples out of some
 * 800 carry a name today. The caller states that silence rather than dropping
 * the chapter, so this resolves rather than throwing the way the ethnonym
 * dossier does.
 */
// @req REQ-133
export async function getPatronymesBorneByPeople(
  peopleId: string
): Promise<PatronymeLinkSummary[]> {
  const patronymeIds = await getPatronymeIdsLinkedTo(
    "afrik_patronyme_peoples",
    "people_id",
    peopleId
  );
  return getPatronymeSummaries(uniqueStrings(patronymeIds));
}

/**
 * The two name lists a country fiche carries, kept apart.
 *
 * The peoples are resolved to their names rather than left as ids because the
 * reach list has to say *through whom* it reaches; without that the entry is
 * an assertion the reader has no way to audit.
 */
// @req REQ-133
export async function getCountryPatronymes(
  countryId: string
): Promise<CountryPatronymes> {
  const [attestedIds, peopleIds] = await Promise.all([
    getPatronymeIdsLinkedTo(
      "afrik_patronyme_countries",
      "country_id",
      countryId
    ),
    getPeopleIdsInCountry(countryId),
  ]);

  const attestedIdSet = new Set(attestedIds);
  const bearersByPatronyme = new Map<string, string[]>();

  const bearerLists = await Promise.all(
    peopleIds.map(async (peopleId) => ({
      peopleId,
      patronymeIds: await getPatronymeIdsLinkedTo(
        "afrik_patronyme_peoples",
        "people_id",
        peopleId
      ),
    }))
  );

  // Accumulated after the fan-out rather than inside it, so the bearing
  // peoples of a name land in the order the country lists them instead of in
  // whichever order the requests happened to settle.
  for (const { peopleId, patronymeIds } of bearerLists) {
    for (const patronymeId of patronymeIds) {
      // Subtracted here rather than after the projection, so a name already
      // attested in the country costs neither a row nor a people lookup.
      if (attestedIdSet.has(patronymeId)) continue;
      const bearers = bearersByPatronyme.get(patronymeId) ?? [];
      bearers.push(peopleId);
      bearersByPatronyme.set(patronymeId, bearers);
    }
  }

  const [attested, reachSummaries, peopleNames] = await Promise.all([
    getPatronymeSummaries(uniqueStrings(attestedIds)),
    getPatronymeSummaries(Array.from(bearersByPatronyme.keys())),
    getPeopleNamesByIds(
      uniqueStrings(Array.from(bearersByPatronyme.values()).flat())
    ),
  ]);

  return {
    attested,
    borneByPeoples: reachSummaries.map((summary) => ({
      ...summary,
      viaPeoples: (bearersByPatronyme.get(summary.id) ?? []).map((id) => ({
        id,
        nameMain: peopleNames.get(id) ?? id,
      })),
    })),
  };
}
