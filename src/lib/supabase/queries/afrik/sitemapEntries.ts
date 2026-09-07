import { logger } from "@/lib/api/logger";
import { readNameStanding } from "@/lib/patronymes/content";
import type { SourceTier } from "@/types/sources";

import { createServerClient } from "../../server";

/**
 * The identifiers `src/app/sitemap.ts` needs, and nothing else.
 *
 * Its own module rather than a call to `getAllAfrikPeoples()`: that reader
 * hydrates the whole fiche payload for every row, and — more to the point —
 * its unpaginated path is silently capped at PostgREST's 1000-row ceiling.
 * The corpus stands at 789 peoples, so that path returns the right answer
 * today and will start dropping fiches from the sitemap, with no error
 * anywhere, on the day the 1001st is loaded.
 */

/**
 * Rows per page. Well under PostgREST's default ceiling, so a page the server
 * truncated comes back short — and a short page is how the walk knows it has
 * reached the end.
 */
// @req REQ-110
export const SITEMAP_ID_PAGE_SIZE = 500;

/**
 * A corpus of ~890 fiches cannot fill this many pages. Reaching the bound
 * means the server is ignoring `.range()`, and looping against a server that
 * ignores it would never terminate.
 */
const SITEMAP_MAX_PAGES = 40;

const TABLES = {
  peoples: "afrik_peoples",
  countries: "afrik_countries",
  families: "afrik_language_families",
  languages: "afrik_languages",
  patronymes: "afrik_patronymes",
} as const;

export interface SitemapEntityIds {
  peoples: string[];
  countries: string[];
  families: string[];
  languages: string[];
  patronymes: string[];
}

const EMPTY: SitemapEntityIds = {
  peoples: [],
  countries: [],
  families: [],
  languages: [],
  patronymes: [],
};

type SupabaseClient = ReturnType<typeof createServerClient>;

/** A row as the walk reads it: an id, plus whatever the caller selected. */
interface SitemapRow {
  id: string;
  content?: unknown;
}

/**
 * One page of rows, as an `{ error }` either way.
 *
 * The walk below reads errors, not exceptions. A query that throws — the
 * deadline in `requestDeadline.ts` firing on a database that never answers,
 * or the socket dropping — is the same outcome for a sitemap as PostgREST
 * replying with one, so it arrives by the same door.
 */
async function pageOfIds(
  supabase: SupabaseClient,
  table: string,
  start: number,
  columns: string
): Promise<{ data: SitemapRow[] | null; error: unknown }> {
  try {
    // `select()` infers its row shape by parsing a *literal* column list; a
    // parameter degrades that inference to `GenericStringError[]`. The shape is
    // restated here rather than dropping the parameter, which would mean two
    // near-identical walks.
    return (await supabase
      .from(table)
      .select(columns)
      .range(start, start + SITEMAP_ID_PAGE_SIZE - 1)) as unknown as {
      data: SitemapRow[] | null;
      error: unknown;
    };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * `columns` widens the select for a table whose rule needs more than the id;
 * `keeps` decides, per page, which of the rows fetched are retained. A table
 * that names neither is walked exactly as before.
 *
 * The retired source vocabulary is banned from this repository down to its
 * comments (`sourceTierVocabulary.test.ts`), so the verb here is deliberately
 * not the one that reads most naturally for a filter.
 */
interface TableWalk {
  columns?: string;
  keeps?: (row: SitemapRow) => boolean;
}

async function idsInTable(
  supabase: SupabaseClient,
  table: string,
  { columns = "id", keeps }: TableWalk = {}
): Promise<string[]> {
  const found: string[] = [];

  for (let page = 0; page < SITEMAP_MAX_PAGES; page++) {
    const start = page * SITEMAP_ID_PAGE_SIZE;
    const { data, error } = await pageOfIds(supabase, table, start, columns);

    if (error) {
      logger.error(`Sitemap: could not read ids from ${table}`, error);
      return [];
    }

    const rows = data || [];
    for (const row of rows) {
      if (!keeps || keeps(row)) found.push(row.id as string);
    }
    // The page is measured before the filter: a full page every row of which
    // was dropped is still a full page, and the walk must ask for the next one.
    if (rows.length < SITEMAP_ID_PAGE_SIZE) return found;
  }

  logger.error(
    `Sitemap: ${table} exceeded ${SITEMAP_MAX_PAGES} pages — ids are truncated`
  );
  return found;
}

const INDEXABLE_NAME_TIERS: readonly SourceTier[] = ["referenced", "official"];

/**
 * A name fiche is submitted to search engines only when its best citation is
 * `referenced` or `official`. One resting solely on unverified sources — or
 * citing nothing readable — stays published and reachable, but the sitemap
 * stops vouching for it.
 *
 * The tier is decided here, in TypeScript, over the rows already fetched. As a
 * PostgREST filter it would be a JSON path over `content -> sources[]`, an
 * unindexed array walk expressed as an opaque query string — a sequential scan
 * that reads as line noise, for a table of ~800 rows. The price is `content`
 * on the name select instead of `id` alone, which is a heavier payload than
 * the other four walks pull; it is paid once per sitemap build, and no other
 * table pays it.
 */
function nameCarriesIndexableStanding(row: SitemapRow): boolean {
  const content = row.content;
  if (typeof content !== "object" || content === null || Array.isArray(content))
    return false;

  const standing = readNameStanding(content as Record<string, unknown>);
  return standing !== null && INDEXABLE_NAME_TIERS.includes(standing.tier);
}

/**
 * Every people, country, language-family and language identifier, plus the
 * name identifiers whose dossier carries indexable standing, walked page by
 * page.
 *
 * Never throws. `sitemap.xml` is served from a route that must answer, and a
 * database that is unreachable should cost the entity URLs — the static
 * rubrics still ship — rather than the whole file.
 */
// @req REQ-110
export async function getSitemapEntityIds(): Promise<SitemapEntityIds> {
  let supabase: SupabaseClient;
  try {
    supabase = createServerClient();
  } catch (error) {
    logger.error("Sitemap: no Supabase client available", error);
    return EMPTY;
  }

  const [peoples, countries, families, languages, patronymes] =
    await Promise.all([
      idsInTable(supabase, TABLES.peoples),
      idsInTable(supabase, TABLES.countries),
      idsInTable(supabase, TABLES.families),
      idsInTable(supabase, TABLES.languages),
      idsInTable(supabase, TABLES.patronymes, {
        columns: "id, content",
        keeps: nameCarriesIndexableStanding,
      }),
    ]);

  return { peoples, countries, families, languages, patronymes };
}
