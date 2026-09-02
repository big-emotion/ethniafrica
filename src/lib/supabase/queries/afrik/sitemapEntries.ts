import { logger } from "@/lib/api/logger";

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

/**
 * How long one page of ids may take before the walk abandons the table.
 *
 * An unreachable database is not the same failure as a broken one: a wrong
 * host accepts the connection and then says nothing, so the query neither
 * resolves nor rejects. Next allows a static route 60s before it kills the
 * build, and five tables are walked at once — so the bound has to be well
 * under that. A real page of 500 ids comes back in tens of milliseconds.
 */
// @req REQ-110
export const SITEMAP_QUERY_TIMEOUT_MS = 10_000;

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

/**
 * One page of ids, or an error — never a promise that outlives the build.
 */
async function pageOfIds(
  supabase: SupabaseClient,
  table: string,
  start: number
): Promise<{ data: { id: string }[] | null; error: unknown }> {
  const giveUp = new AbortController();
  const timer = setTimeout(() => giveUp.abort(), SITEMAP_QUERY_TIMEOUT_MS);

  try {
    return await supabase
      .from(table)
      .select("id")
      .abortSignal(giveUp.signal)
      .range(start, start + SITEMAP_ID_PAGE_SIZE - 1);
  } catch (error) {
    return { data: null, error };
  } finally {
    clearTimeout(timer);
  }
}

async function idsInTable(
  supabase: SupabaseClient,
  table: string
): Promise<string[]> {
  const found: string[] = [];

  for (let page = 0; page < SITEMAP_MAX_PAGES; page++) {
    const start = page * SITEMAP_ID_PAGE_SIZE;
    const { data, error } = await pageOfIds(supabase, table, start);

    if (error) {
      logger.error(`Sitemap: could not read ids from ${table}`, error);
      return [];
    }

    const rows = data || [];
    for (const row of rows) found.push(row.id as string);
    if (rows.length < SITEMAP_ID_PAGE_SIZE) return found;
  }

  logger.error(
    `Sitemap: ${table} exceeded ${SITEMAP_MAX_PAGES} pages — ids are truncated`
  );
  return found;
}

/**
 * Every people, country, language-family, language and patronyme identifier,
 * walked page by page.
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
      idsInTable(supabase, TABLES.patronymes),
    ]);

  return { peoples, countries, families, languages, patronymes };
}
