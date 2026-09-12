/**
 * How long a corpus-wide aggregate is served from `unstable_cache` before it
 * is recomputed.
 *
 * An hour, because these aggregates move only when the corpus is loaded,
 * which happens on a deploy or a manual sync — never per request. Stated once
 * so the continent counts, the country index, the family atlas and the
 * language footprint cannot drift to four different freshness promises.
 *
 * Not for `export const revalidate` in a page or route: Next reads that
 * segment config at build time and requires a literal it can analyse
 * statically, so an imported constant there is silently ignored.
 */
// @req REQ-110
export const CORPUS_AGGREGATE_REVALIDATE_SECONDS = 3600;
