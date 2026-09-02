import { logger } from "@/lib/api/logger";
import {
  listPatronymes,
  getPatronymeCountryIndex,
  PATRONYME_FACET_WALK_SIZE,
  type PatronymeCountryIndexRow,
  type PatronymeListItem,
  type PatronymeQueryFilters,
} from "@/api/v2/services/patronymes";
import { patronymeNameSystemSchema } from "@/api/v2/schemas/patronymes";
import type { PatronymeNameSystem } from "@/api/v2/schemas/patronymes";
import { createServerClient } from "@/lib/supabase/server";
import { translations } from "@/lib/translations";

/**
 * What the name facet of the atlas hub reads.
 *
 * Its own service rather than a tail on `patronymes`: that one answers "give
 * me a name" for the public API, while this one answers the three questions
 * one screen asks together — the page being read, the filters it may be
 * narrowed by, and what the shared map should say about each country under
 * those filters. Keeping them together is what stops the list and the globe
 * panel being narrowed by two different notions of "the current selection".
 *
 * Modelled on `peoplesFacet` deliberately, down to the clamp and the
 * choices doctrine: five facets reading five different ways is how a hub
 * stops being one surface.
 */

/** The reader's narrowing, as it arrives from the query string: null is "no filter". */
export interface PatronymesFacetFilters {
  nameSystem: PatronymeNameSystem | null;
  peopleId: string | null;
  countryId: string | null;
  letter: string | null;
  search?: string | null;
}

export interface PatronymesFacetOption {
  id: string;
  label: string;
}

export interface PatronymesFacetChoices {
  peoples: PatronymesFacetOption[];
  countries: PatronymesFacetOption[];
  nameSystems: PatronymesFacetOption[];
}

export interface PatronymesFacetPage {
  patronymes: PatronymeListItem[];
  page: number;
  total: number;
  totalPages: number;
}

/**
 * Twenty-four on a corpus of thirty: the whole axis is two pages, which is
 * what a reader can walk without the pager becoming the interface. It rises
 * with the corpus rather than being sized for it — the page number is in the
 * URL, so an address already sent has to keep addressing the same rows.
 */
// @req REQ-139
export const PATRONYMES_FACET_PER_PAGE = 24;

/**
 * The sizes the facet offers, default first. An allowlist because the size is
 * a range on a database query: an arbitrary number from the address bar would
 * let an anonymous request ask for the whole corpus in one page.
 */
// @req REQ-139
export const PATRONYMES_FACET_PAGE_SIZES = [24, 48] as const;

/** The facet's filters in the shape the query layer names them. */
function toQueryFilters(
  filters: PatronymesFacetFilters
): PatronymeQueryFilters {
  const query: PatronymeQueryFilters = {};
  const search = filters.search?.trim();
  if (search) query.search = search;
  if (filters.letter) query.initialLetter = filters.letter;
  if (filters.nameSystem) query.nameSystem = filters.nameSystem;
  if (filters.peopleId) query.peopleId = filters.peopleId;
  if (filters.countryId) query.countryId = filters.countryId;
  return query;
}

/**
 * One page of the facet, narrowed at the database.
 *
 * The total comes back from the same narrowed query, so the pager describes
 * the filtered set. A page past the end is answered with the last one rather
 * than with nothing: addresses outlive the selection they were taken from.
 */
// @req REQ-139
export async function getPatronymesFacetPage(
  page: number,
  filters: PatronymesFacetFilters,
  perPage: number = PATRONYMES_FACET_PER_PAGE
): Promise<PatronymesFacetPage> {
  // The page number is typed into an address bar as readily as it is clicked.
  const requested = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const query = toQueryFilters(filters);

  const firstRead = await listPatronymes({
    page: requested,
    perPage,
    filters: query,
  });
  // The count belongs to the selection, not to the page: clamping an
  // out-of-range page number below re-reads `data` but must not move `total`.
  const total = firstRead.total;
  let data = firstRead.data;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  let resolved = requested;
  if (requested > totalPages) {
    resolved = totalPages;
    ({ data } = await listPatronymes({
      page: resolved,
      perPage,
      filters: query,
    }));
  }

  return { patronymes: data, page: resolved, total, totalPages };
}

/**
 * Every name of the current selection, with the countries it touches.
 *
 * Same filters as the list, deliberately: the panel the map opens is meant to
 * read as "what the page you are on has here", and it can only mean that if
 * both are narrowed by one description of the selection.
 */
// @req REQ-117
export async function getPatronymesFacetCountryIndex(
  filters: PatronymesFacetFilters
): Promise<PatronymeCountryIndexRow[]> {
  return getPatronymeCountryIndex(toQueryFilters(filters));
}

/** One walked read of a join table's distinct values. */
async function distinctLinkValues(
  table: "afrik_patronyme_peoples" | "afrik_patronyme_countries",
  column: "people_id" | "country_id"
): Promise<string[]> {
  const supabase = createServerClient();
  const seen = new Set<string>();

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .range(0, PATRONYME_FACET_WALK_SIZE - 1);

  if (error) {
    logger.error(`Error reading ${table} for the name facet choices`, error);
    throw error;
  }

  for (const row of (data ?? []) as Array<Record<string, string>>) {
    if (row[column]) seen.add(row[column]);
  }
  return [...seen];
}

/**
 * What the reader may narrow to.
 *
 * Only the peoples, countries and naming systems the corpus actually links a
 * name to. An option that can only ever return nothing reads as a claim that
 * the corpus holds that people, and answers "aucun nom" when the reader takes
 * the claim up — the emptiest possible way to describe a gap the dossiers
 * state properly elsewhere.
 *
 * Four small reads rather than a join: the link tables hold tens of rows on
 * this axis, and hydrating their distinct ids is one `.in()` each.
 */
// @req REQ-139
export async function getPatronymesFacetChoices(): Promise<PatronymesFacetChoices> {
  const supabase = createServerClient();

  const [peopleIds, countryIds] = await Promise.all([
    distinctLinkValues("afrik_patronyme_peoples", "people_id"),
    distinctLinkValues("afrik_patronyme_countries", "country_id"),
  ]);

  const [peopleRows, countryRows, systemRows] = await Promise.all([
    peopleIds.length > 0
      ? supabase.from("afrik_peoples").select("id, content").in("id", peopleIds)
      : Promise.resolve({ data: [], error: null }),
    countryIds.length > 0
      ? supabase
          .from("afrik_countries")
          .select("id, name_fr")
          .in("id", countryIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("afrik_patronymes")
      .select("name_system")
      .range(0, PATRONYME_FACET_WALK_SIZE - 1),
  ]);

  const byFrenchLabel = (a: PatronymesFacetOption, b: PatronymesFacetOption) =>
    a.label.localeCompare(b.label, "fr");

  const nameSystemLabels = translations.fr.patronymes.nameSystemLabels;
  const documented = new Set(
    (
      (systemRows.data ?? []) as Array<{ name_system: PatronymeNameSystem }>
    ).map((row) => row.name_system)
  );

  return {
    peoples: (
      (peopleRows.data ?? []) as Array<{
        id: string;
        content: Record<string, unknown> | null;
      }>
    )
      .map((row) => ({
        id: row.id,
        label:
          typeof row.content?.nameMain === "string"
            ? (row.content.nameMain as string)
            : row.id,
      }))
      .sort(byFrenchLabel),
    countries: (
      (countryRows.data ?? []) as Array<{ id: string; name_fr: string }>
    )
      .map((row) => ({ id: row.id, label: row.name_fr }))
      .sort(byFrenchLabel),
    // Declaration order of the schema, not alphabetical: the five systems are
    // a taxonomy the fiche also prints, and two orderings of one closed set
    // read as two different sets.
    nameSystems: patronymeNameSystemSchema.options
      .filter((system) => documented.has(system))
      .map((system) => ({ id: system, label: nameSystemLabels[system] })),
  };
}
