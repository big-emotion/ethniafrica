import * as React from "react";

import { getCountryById } from "@/api/v2/services/countryService";
import { getLanguageFamilyById } from "@/api/v2/services/languageFamilyService";
import { getPeopleById } from "@/api/v2/services/peopleService";

/**
 * Whether a fiche exists, decided early enough for the HTTP status to still be
 * changeable.
 *
 * Each fiche route declares a `loading.tsx`, which turns its segment into a
 * Suspense boundary — that is what took the country fiche's TTFB from 537ms to
 * 29ms and is not worth giving up. The cost is that App Router flushes the
 * fallback, and with it a `200`, before the page body runs. By the time the
 * page's own `notFound()` fires, the status line is already on the wire, so an
 * unknown fiche answered `200` with an error page: a soft 404 that search
 * engines index as a real page.
 *
 * `generateMetadata` runs *before* the shell is flushed, so a `notFound()`
 * raised from there still produces a real 404. These loaders exist to be called
 * from both places: `cache()` makes the second call within the same request
 * free, so checking existence early costs no extra query — the page reuses
 * whatever metadata already fetched.
 *
 * Calling `notFound()` from the segment's `layout.tsx` would also come early
 * enough, and is the wrong fix: a segment's `not-found.tsx` is a child of its
 * layout, so the root not-found renders instead of the fiche's own.
 */

/**
 * React only exports `cache` under the `react-server` condition, so importing
 * it directly makes this module unloadable anywhere outside the RSC graph — the
 * test suite included, where it fails with "cache is not a function". Falling
 * back to identity is not a compromise: outside a server request there is no
 * request to scope a cache to, and the only thing lost is deduplication, never
 * correctness.
 */
const perRequest =
  (React as { cache?: <F extends (...args: never[]) => unknown>(fn: F) => F })
    .cache ?? (<F extends (...args: never[]) => unknown>(fn: F) => fn);

/** @req REQ-019 */
export const loadCountryFiche = perRequest(async (id: string) =>
  getCountryById(id)
);

/** @req REQ-019 */
export const loadPeopleFiche = perRequest(async (id: string) =>
  getPeopleById(id)
);

/** @req REQ-019 */
export const loadLanguageFamilyFiche = perRequest(async (id: string) =>
  getLanguageFamilyById(id)
);
