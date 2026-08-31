import {
  getAfrikCountriesByIds,
  getAfrikCountryIds,
} from "@/lib/supabase/queries/afrik/countries";
import { logger } from "@/lib/api/logger";
import {
  deriveCountrySynthesis,
  hasRenderableSynthesis,
  type CountrySynthesis,
} from "@/lib/home/countrySynthesis";

/** Three cards is what the band's width holds whole, with no scroll. */
// @req REQ-113
export const RAIL_SIZE = 3;

/**
 * Draw `count` distinct ids without shuffling the whole list.
 *
 * Partial Fisher-Yates on a copy: the corpus is 54 entries today, so the
 * saving is nominal, but drawing without replacement is the part that
 * matters — sampling with replacement would eventually render the same
 * country twice in one rail, which reads as a bug.
 */
// @req REQ-113
export function drawIds(
  ids: string[],
  count: number,
  random: () => number = Math.random
): string[] {
  const pool = [...ids];
  const drawn: string[] = [];
  const wanted = Math.min(count, pool.length);

  for (let i = 0; i < wanted; i += 1) {
    const index = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[index]] = [pool[index], pool[i]];
    drawn.push(pool[i]);
  }
  return drawn;
}

/**
 * The three syntheses the home's rail shows on this request.
 *
 * Returns an empty list rather than throwing when the corpus cannot be
 * read: the rail is one band of a page that has plenty else to say, and a
 * Supabase hiccup should cost the reader a section, not the home. The error
 * is logged so the silence is visible to us and only to us.
 */
// @req REQ-113
export async function loadSynthesisRail(
  random: () => number = Math.random
): Promise<CountrySynthesis[]> {
  try {
    const ids = await getAfrikCountryIds();
    if (ids.length === 0) return [];

    // Over-draw so that countries whose fiche is too thin to render can be
    // dropped without leaving a gap in the rail.
    const candidates = drawIds(ids, RAIL_SIZE * 2, random);
    const countries = await getAfrikCountriesByIds(candidates);

    return countries
      .map(deriveCountrySynthesis)
      .filter(hasRenderableSynthesis)
      .slice(0, RAIL_SIZE);
  } catch (error) {
    logger.error("Could not build the home synthesis rail", error);
    return [];
  }
}
