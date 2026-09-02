/**
 * Patronyme dossier service (ETNI-1462, REQ-133 — DEC-038's fifth corpus
 * dimension). Batches its joins per AR17 (map pattern, one query per
 * relation set, no per-record queries):
 *   1) one `afrik_patronymes` query for the name row
 *   2) one `afrik_patronyme_peoples` + one `afrik_peoples` query for its
 *      associated peoples
 *   3) one `afrik_patronyme_countries` + one `afrik_countries` query for its
 *      associated countries
 *   4) one `afrik_patronyme_persons` + one `persons` query for its bearers
 *
 * Bearer projection is deliberately narrow (id, fullName, roleCategory) —
 * DEC-040 forbids a code path that takes a family name and returns an
 * ethnic origin for a named living person, so a bearer row never selects
 * `person_peoples`/`person_countries` or `content`.
 */

import { logger } from "@/lib/api/logger";
import { createServerClient } from "@/lib/supabase/server";
import type {
  PatronymeBearerSummary,
  PatronymeCountrySummary,
  PatronymeNameSystem,
  PatronymePeopleSummary,
} from "@/api/v2/schemas/patronymes";

export interface PatronymeAggregate {
  id: string;
  nameMain: string;
  nameSystem: PatronymeNameSystem;
  casteOrSocialFunction: string | null;
  content: Record<string, unknown>;
  associatedPeoples: PatronymePeopleSummary[];
  associatedCountries: PatronymeCountrySummary[];
  bearers: PatronymeBearerSummary[];
}

export interface PatronymeListItem {
  id: string;
  nameMain: string;
  nameSystem: PatronymeNameSystem;
}

/** The reader's narrowing, as the query layer names it. */
export interface PatronymeQueryFilters {
  search?: string;
  initialLetter?: string;
  nameSystem?: PatronymeNameSystem;
  /** Resolved against the join table *before* the names query — see resolveRelationScope. */
  peopleId?: string;
  /** Same, against afrik_patronyme_countries. */
  countryId?: string;
}

export interface ListPatronymesQuery {
  page: number;
  perPage: number;
  /** Absent means the whole corpus, which is what every caller asked for until REQ-139. */
  filters?: PatronymeQueryFilters;
}

export interface ListPatronymesResult {
  data: PatronymeListItem[];
  total: number;
}

/** One name of the selection and the countries the corpus attests it in. */
export interface PatronymeCountryIndexRow {
  id: string;
  nameMain: string;
  countryIds: string[];
}

/**
 * Rows per request when walking a name's relations.
 *
 * Well under PostgREST's 1000-row ceiling for the reason `peoples.ts` keeps
 * its own: a page the server truncated comes back short, and a short page is
 * how the walk knows it has reached the end. At the ceiling the two are
 * indistinguishable.
 */
// @req REQ-139
export const PATRONYME_FACET_WALK_SIZE = 500;

/**
 * Thirty dossiers over fifty-four countries cannot fill this many pages;
 * reaching it means the range is being ignored, and a loop against a server
 * that ignores it would never end.
 */
const PATRONYME_FACET_MAX_PAGES = 40;

/**
 * The subset of the PostgREST builder the shared filters need.
 *
 * Restated rather than imported, exactly as `peoples.ts` restates its own:
 * constraining the helper's generic to the real builder makes the compiler
 * unfold supabase-js's column-string inference once per filter and give up
 * ("type instantiation is excessively deep"). The two casts below buy one
 * filter definition instead of two copies drifting apart.
 */
interface FilterablePatronymeQuery {
  textSearch(
    column: string,
    query: string,
    options: { type: "websearch"; config: string }
  ): FilterablePatronymeQuery;
  ilike(column: string, pattern: string): FilterablePatronymeQuery;
  eq(column: string, value: string): FilterablePatronymeQuery;
  in(column: string, values: string[]): FilterablePatronymeQuery;
}

/**
 * The reader's narrowing, applied to whichever names query is being built.
 *
 * One place rather than two: the list and the map index answer the same
 * question about the same selection, and a filter that drifted between them
 * would show a globe panel naming names the list beside it does not.
 *
 * `search` goes to `search_vector` (migration 066), so it matches the same
 * index `/recherche` already uses. Its D tier is `content::text`, so a query
 * can match a dossier's prose and return a row whose *name* does not match —
 * the cheap upgrade, if that proves noisy on a control labelled "rechercher un
 * nom", is `name_unaccent_vector`, which requires folding the query text
 * client-side to match `public.afrik_unaccent`.
 */
function withPatronymeFilters<Query>(
  query: Query,
  filters: PatronymeQueryFilters,
  scopedIds: string[] | null
): Query {
  let scoped = query as unknown as FilterablePatronymeQuery;

  if (filters.search) {
    scoped = scoped.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "french",
    });
  }
  if (filters.initialLetter) {
    scoped = scoped.ilike("name_main", `${filters.initialLetter}%`);
  }
  if (filters.nameSystem) {
    scoped = scoped.eq("name_system", filters.nameSystem);
  }
  if (scopedIds) {
    scoped = scoped.in("id", scopedIds);
  }

  return scoped as unknown as Query;
}

/**
 * The names a join table links to one entity, walked with an explicit range.
 *
 * An unranged select is capped server-side by PostgREST's max-rows, which here
 * would quietly drop the names of the best-documented countries — the ones the
 * filter is most used on.
 */
async function getPatronymeIdsLinkedTo(
  table: "afrik_patronyme_peoples" | "afrik_patronyme_countries",
  column: "people_id" | "country_id",
  value: string
): Promise<string[]> {
  const supabase = createServerClient();
  const patronymeIds: string[] = [];

  for (let page = 0; page < PATRONYME_FACET_MAX_PAGES; page++) {
    const start = page * PATRONYME_FACET_WALK_SIZE;
    const { data, error } = await supabase
      .from(table)
      .select("patronyme_id")
      .eq(column, value)
      .range(start, start + PATRONYME_FACET_WALK_SIZE - 1);

    if (error) {
      logger.error(
        `Error fetching patronyme ids for ${column} ${value}`,
        error
      );
      throw error;
    }

    const rows = (data ?? []) as Array<{ patronyme_id: string }>;
    for (const row of rows) patronymeIds.push(row.patronyme_id);
    if (rows.length < PATRONYME_FACET_WALK_SIZE) return patronymeIds;
  }

  logger.error(
    `Patronyme ids for ${column} ${value} exceeded ${PATRONYME_FACET_MAX_PAGES} pages — the list is truncated`
  );
  return patronymeIds;
}

/**
 * Resolves the relation filters, or reports that nothing can match them.
 *
 * `null` means "no relation filter"; an empty array means "a filter the corpus
 * satisfies with nothing", and the two must not collapse — PostgREST rejects
 * `in.()`, and falling through to the unfiltered query would serve all thirty
 * names under that country's name.
 *
 * Two filters intersect rather than the last one winning. `peoples.ts` never
 * had to answer this, because a people carries one country filter and no
 * second relation; a name carries both, and "which names do the Bamana carry
 * in Mali" is the question the axis exists for.
 */
async function resolveRelationScope(
  filters: PatronymeQueryFilters
): Promise<string[] | null> {
  const scopes: string[][] = [];

  if (filters.peopleId) {
    scopes.push(
      await getPatronymeIdsLinkedTo(
        "afrik_patronyme_peoples",
        "people_id",
        filters.peopleId
      )
    );
  }
  if (filters.countryId) {
    scopes.push(
      await getPatronymeIdsLinkedTo(
        "afrik_patronyme_countries",
        "country_id",
        filters.countryId
      )
    );
  }

  if (scopes.length === 0) return null;

  return scopes.reduce((intersection, scope) => {
    const held = new Set(scope);
    return intersection.filter((id) => held.has(id));
  });
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function mapPeopleRowToSummary(
  row: Record<string, unknown>
): PatronymePeopleSummary {
  const content = (row.content as Record<string, unknown>) ?? {};
  const appellations = content.appellations as
    | Record<string, unknown>
    | undefined;
  const autonym =
    typeof appellations?.selfAppellation === "string"
      ? appellations.selfAppellation
      : null;

  return {
    id: row.id as string,
    nameMain: row.name_main as string,
    autonym,
    slug: row.id as string,
  };
}

async function getAssociatedPeoples(
  supabase: ReturnType<typeof createServerClient>,
  patronymeId: string
): Promise<PatronymePeopleSummary[]> {
  const { data: links, error: linksError } = await supabase
    .from("afrik_patronyme_peoples")
    .select("people_id")
    .eq("patronyme_id", patronymeId);

  if (linksError) {
    throw new Error(
      `Failed to load patronyme-peoples links: ${linksError.message}`
    );
  }

  const peopleIds = uniqueStrings(
    ((links ?? []) as Array<{ people_id: string }>).map((l) => l.people_id)
  );
  if (peopleIds.length === 0) return [];

  const { data: peopleRows, error: peopleError } = await supabase
    .from("afrik_peoples")
    .select("id, name_main, content")
    .in("id", peopleIds);

  if (peopleError) {
    throw new Error(`Failed to load peoples: ${peopleError.message}`);
  }

  return ((peopleRows ?? []) as Array<Record<string, unknown>>).map(
    mapPeopleRowToSummary
  );
}

async function getAssociatedCountries(
  supabase: ReturnType<typeof createServerClient>,
  patronymeId: string
): Promise<PatronymeCountrySummary[]> {
  const { data: links, error: linksError } = await supabase
    .from("afrik_patronyme_countries")
    .select("country_id")
    .eq("patronyme_id", patronymeId);

  if (linksError) {
    throw new Error(
      `Failed to load patronyme-countries links: ${linksError.message}`
    );
  }

  const countryIds = uniqueStrings(
    ((links ?? []) as Array<{ country_id: string }>).map((l) => l.country_id)
  );
  if (countryIds.length === 0) return [];

  const { data: countryRows, error: countryError } = await supabase
    .from("afrik_countries")
    .select("id, name_fr")
    .in("id", countryIds);

  if (countryError) {
    throw new Error(`Failed to load countries: ${countryError.message}`);
  }

  return ((countryRows ?? []) as Array<{ id: string; name_fr: string }>).map(
    (row) => ({ id: row.id, nameFr: row.name_fr })
  );
}

async function getBearers(
  supabase: ReturnType<typeof createServerClient>,
  patronymeId: string
): Promise<PatronymeBearerSummary[]> {
  const { data: links, error: linksError } = await supabase
    .from("afrik_patronyme_persons")
    .select("person_id")
    .eq("patronyme_id", patronymeId);

  if (linksError) {
    throw new Error(
      `Failed to load patronyme-persons links: ${linksError.message}`
    );
  }

  const personIds = uniqueStrings(
    ((links ?? []) as Array<{ person_id: string }>).map((l) => l.person_id)
  );
  if (personIds.length === 0) return [];

  // DEC-040: select only the fields a bearer entry is allowed to carry.
  // Never select person_peoples/person_countries/content here.
  const { data: personRows, error: personError } = await supabase
    .from("persons")
    .select("id, full_name, role_category")
    .in("id", personIds);

  if (personError) {
    throw new Error(`Failed to load persons: ${personError.message}`);
  }

  return (
    (personRows ?? []) as Array<{
      id: string;
      full_name: string;
      role_category: string;
    }>
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    roleCategory: row.role_category,
  }));
}

const PATRONYME_LIST_SELECT = "id, content, name_system";

// Index-row query for the noms hub (ETNI-1799). Selects only the
// afrik_patronymes columns a list entry needs — no peoples/countries/bearers
// joins, unlike getPatronymeById's full aggregate.
// @req REQ-133
export async function listPatronymes(
  query: ListPatronymesQuery
): Promise<ListPatronymesResult> {
  const filters = query.filters ?? {};
  const scopedIds = await resolveRelationScope(filters);
  if (scopedIds && scopedIds.length === 0) return { data: [], total: 0 };

  const supabase = createServerClient();
  const from = (query.page - 1) * query.perPage;
  const to = from + query.perPage - 1;

  // Ordered by the name a reader reads, not by the corpus identifier. `id`
  // is only accidentally alphabetical: PAT_ABIKAN_PRAISE sorts on its
  // naming-system suffix, so « Abikan » landed between two unrelated names.
  const { data, error, count } = await withPatronymeFilters(
    supabase
      .from("afrik_patronymes")
      .select(PATRONYME_LIST_SELECT, { count: "exact" }),
    filters,
    scopedIds
  )
    .order("name_main")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list patronymes: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    content: Record<string, unknown> | null;
    name_system: PatronymeNameSystem;
  }>;

  return {
    data: rows.map((row) => {
      const content = row.content ?? {};
      return {
        id: row.id,
        nameMain: typeof content.nameMain === "string" ? content.nameMain : "",
        nameSystem: row.name_system,
      };
    }),
    total: count ?? rows.length,
  };
}

/**
 * Every name of the current selection, with the countries it reaches.
 *
 * The whole selection, never the page being read: publishing only the current
 * page would make the globe panel's answer depend on where the reader had
 * paged to, which is not a property of the corpus — the same rule
 * `getAfrikPeopleCountryIndex` states for peoples.
 *
 * One query, no N+1: the foreign key on `afrik_patronyme_countries` lets
 * PostgREST embed the join, so a name and its countries arrive together.
 */
// @req REQ-117
export async function getPatronymeCountryIndex(
  filters: PatronymeQueryFilters = {}
): Promise<PatronymeCountryIndexRow[]> {
  const scopedIds = await resolveRelationScope(filters);
  if (scopedIds && scopedIds.length === 0) return [];

  const supabase = createServerClient();
  const rows: PatronymeCountryIndexRow[] = [];

  for (let page = 0; page < PATRONYME_FACET_MAX_PAGES; page++) {
    const start = page * PATRONYME_FACET_WALK_SIZE;
    const { data, error } = await withPatronymeFilters(
      supabase
        .from("afrik_patronymes")
        .select("id, name_main, afrik_patronyme_countries(country_id)"),
      filters,
      scopedIds
    ).range(start, start + PATRONYME_FACET_WALK_SIZE - 1);

    if (error) {
      logger.error("Error fetching the patronyme country index", error);
      throw error;
    }

    const page_ = (data ?? []) as Array<{
      id: string;
      name_main: string | null;
      afrik_patronyme_countries: Array<{ country_id: string }> | null;
    }>;

    for (const row of page_) {
      rows.push({
        id: row.id,
        nameMain: row.name_main ?? "",
        countryIds: (row.afrik_patronyme_countries ?? []).map(
          (link) => link.country_id
        ),
      });
    }
    if (page_.length < PATRONYME_FACET_WALK_SIZE) return rows;
  }

  logger.error(
    `The patronyme country index exceeded ${PATRONYME_FACET_MAX_PAGES} pages — the list is truncated`
  );
  return rows;
}

// @req REQ-133
export async function getPatronymeById(
  id: string
): Promise<PatronymeAggregate | null> {
  const supabase = createServerClient();

  const { data: patronymeRow, error: patronymeError } = await supabase
    .from("afrik_patronymes")
    .select("id, name_system, caste_or_social_function, content")
    .eq("id", id)
    .maybeSingle();

  if (patronymeError) {
    throw new Error(
      `Failed to load patronyme ${id}: ${patronymeError.message}`
    );
  }
  if (!patronymeRow) return null;

  const row = patronymeRow as {
    id: string;
    name_system: PatronymeNameSystem;
    caste_or_social_function: string | null;
    content: Record<string, unknown> | null;
  };
  const content = row.content ?? {};

  const [associatedPeoples, associatedCountries, bearers] = await Promise.all([
    getAssociatedPeoples(supabase, id),
    getAssociatedCountries(supabase, id),
    getBearers(supabase, id),
  ]);

  return {
    id: row.id,
    nameMain: typeof content.nameMain === "string" ? content.nameMain : "",
    nameSystem: row.name_system,
    casteOrSocialFunction: row.caste_or_social_function,
    content,
    associatedPeoples,
    associatedCountries,
    bearers,
  };
}
