import type {
  FacetCountryIndex,
  FacetCountryNarrowing,
} from "@/components/hubs/facets/FacetCountryIndex";
import type { CountryId } from "@/types/afrik";

/**
 * What the facet hubs share beneath their own copy and filters.
 *
 * The peoples, languages and names hubs each carried a copy of the two pieces
 * below, and the copies had already diverged: two wrapped their reads and said
 * "unavailable" on a failure, the third let the failure reach the error
 * boundary. One module is what keeps the next divergence from being silent.
 */

/** A row of a facet reading, as far as the globe's index needs to know it. */
interface CountryPlacedRow {
  id: string;
  countryIds: readonly string[];
}

/**
 * The index the shared globe reads, and the narrowing it offers per country.
 *
 * Both are keyed from the rows themselves, so the map can never offer a
 * narrowing that lands on an empty list: a country is addressable here exactly
 * when the current selection places a row in it.
 */
// @req REQ-117
export function buildFacetCountryIndex<Row extends CountryPlacedRow>(
  rows: readonly Row[],
  {
    label,
    href,
    narrowHref,
  }: {
    label: (row: Row) => string;
    href: (row: Row) => string;
    narrowHref: (countryId: string) => string;
  }
): { index: FacetCountryIndex; narrowing: FacetCountryNarrowing } {
  const index: FacetCountryIndex = {};
  const narrowing: FacetCountryNarrowing = {};

  for (const row of rows) {
    for (const countryId of row.countryIds) {
      const key = countryId as CountryId;
      (index[key] ??= []).push({
        id: row.id,
        label: label(row),
        href: href(row),
      });
      narrowing[key] ??= narrowHref(countryId);
    }
  }

  return { index, narrowing };
}

/**
 * Runs a hub's reads, and turns a failure into a state the page can state:
 * `null` means unavailable.
 *
 * Zero is a valid total; a failed read is not. Rendering a hub's fallback
 * values after a rejected read would publish "0 results" about a corpus
 * nobody measured, so the caller gets no values at all on that branch.
 *
 * `null` rather than a `{ unavailable }` union because this repository
 * compiles without `strictNullChecks`, where a boolean discriminant does not
 * narrow and the caller could not reach the values at all.
 */
// @req REQ-139
export async function readFacet<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}
