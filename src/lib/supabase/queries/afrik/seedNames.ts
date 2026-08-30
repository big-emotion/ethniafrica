import { createServerClient } from "../../server";
import { logger } from "@/lib/api/logger";

/**
 * Every name the home's seed chips may draw from, as nothing but a string.
 *
 * The chips used to hold twelve words written into the component. Drawing
 * them from the corpus at render time is what makes the row say how much the
 * corpus holds rather than assert it — but it means reading ~870 names on
 * every home request, so this selects the one column it needs and no more.
 * `getAllAfrikCountries` and its siblings select `*`, which drags the
 * editorial `content` JSONB along; a surface that only needs to *name* things
 * has no business paying that (the same argument as getLanguageFamilyLabels).
 *
 * Degrades to an empty list per table rather than throwing: the caller has
 * curated words to fall back on, and a hero is not worth a 500.
 */
// @req REQ-002
export const SEED_NAME_PAGE_SIZE = 500;

/**
 * A corpus of ~890 fiches cannot fill this many pages. Reaching the bound
 * means the server is ignoring `.range()`, and looping against a server that
 * ignores it would never terminate.
 */
const SEED_NAME_MAX_PAGES = 40;

/**
 * The name column differs by table and there is no convention to lean on:
 * `afrik_peoples` names itself `name_main` (the autonym-first field the
 * fiches are built around), the other two `name_fr`. Selecting `name_fr`
 * everywhere costs a 42703 that this module logs and swallows — the caller
 * then serves its fallback words and the band looks perfectly fine, which is
 * how the peoples chip spent a whole review showing the curated four.
 */
const TABLES = {
  people: { table: "afrik_peoples", nameColumn: "name_main" },
  country: { table: "afrik_countries", nameColumn: "name_fr" },
  languageFamily: {
    table: "afrik_language_families",
    nameColumn: "name_fr",
  },
} as const;

export interface SeedNameCandidates {
  people: string[];
  country: string[];
  languageFamily: string[];
}

const EMPTY: SeedNameCandidates = {
  people: [],
  country: [],
  languageFamily: [],
};

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Paged, not a bare select: PostgREST caps an unbounded read at 1000 rows and
 * says nothing about it, so the peoples table would quietly stop offering its
 * tail the day the corpus passes that mark.
 */
async function namesInTable(
  supabase: SupabaseClient,
  { table, nameColumn }: { table: string; nameColumn: string }
): Promise<string[]> {
  const found: string[] = [];

  for (let page = 0; page < SEED_NAME_MAX_PAGES; page++) {
    const start = page * SEED_NAME_PAGE_SIZE;
    const { data, error } = await supabase
      .from(table)
      .select(nameColumn)
      .range(start, start + SEED_NAME_PAGE_SIZE - 1);

    if (error) {
      logger.error(`Seed chips: could not read names from ${table}`, error);
      return [];
    }

    const rows = data || [];
    for (const row of rows) {
      // Through `unknown`: the column is chosen at runtime, so the client
      // cannot type the row and infers its error shape instead.
      const name = (row as unknown as Record<string, unknown>)[nameColumn];
      if (typeof name === "string" && name) found.push(name);
    }
    if (rows.length < SEED_NAME_PAGE_SIZE) return found;
  }

  logger.error(
    `Seed chips: ${table} exceeded ${SEED_NAME_MAX_PAGES} pages — names are truncated`
  );
  return found;
}

// @req REQ-002
export async function getSeedNameCandidates(): Promise<SeedNameCandidates> {
  let supabase: SupabaseClient;
  try {
    supabase = createServerClient();
  } catch (error) {
    logger.error("Seed chips: no Supabase client available", error);
    return EMPTY;
  }

  const [people, country, languageFamily] = await Promise.all([
    namesInTable(supabase, TABLES.people),
    namesInTable(supabase, TABLES.country),
    namesInTable(supabase, TABLES.languageFamily),
  ]);

  return { people, country, languageFamily };
}
