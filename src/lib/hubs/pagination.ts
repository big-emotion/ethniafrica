/**
 * The arithmetic behind the facet pager.
 *
 * Kept apart from the component because it is the half that gets edge cases
 * wrong, and the half a render test is bad at pinning down. The component
 * decides how a page reads; this decides which pages there are to read.
 */

/** A page number, or the run of pages the pager is not listing. */
export type PageSlot = number | "gap";

/** How many pages flank the current one. Three abreast is the reference's own shape. */
const SIBLINGS = 1;

/** The query parameter the reader sees in the address bar for the page size. */
// @req REQ-108
export const PAGE_SIZE_PARAM = "taille";

/**
 * The pages the pager lists, first and last always among them.
 *
 * The run around the current page keeps its length against either end rather
 * than shrinking: a pager that offers two pages on the last page and three
 * everywhere else moves its own controls under the reader's cursor.
 */
// @req REQ-108
export function buildPageWindow(
  currentPage: number,
  pageCount: number
): PageSlot[] {
  const lastPage = Math.max(1, Math.floor(pageCount) || 1);
  const current = Number.isFinite(currentPage)
    ? Math.min(Math.max(Math.floor(currentPage), 1), lastPage)
    : 1;

  const runLength = SIBLINGS * 2 + 1;
  if (lastPage <= runLength + 2) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  // Clamped rather than centred, so the run stays `runLength` long at the ends.
  const runStart = Math.min(
    Math.max(current - SIBLINGS, 1),
    lastPage - runLength + 1
  );
  const runEnd = runStart + runLength - 1;

  const slots: PageSlot[] = [];
  if (runStart > 1) {
    slots.push(1);
    // A gap only where pages are actually skipped: an ellipsis standing for
    // nothing claims there is more to see than there is.
    if (runStart > 2) slots.push("gap");
  }
  for (let page = runStart; page <= runEnd; page += 1) slots.push(page);
  if (runEnd < lastPage) {
    if (runEnd < lastPage - 1) slots.push("gap");
    slots.push(lastPage);
  }
  return slots;
}

/**
 * The page size the reader asked for, or the facet's default.
 *
 * An allowlist, not a parse. The size is a range on a database query, so a
 * number arriving from the address bar decides how much work an anonymous
 * request costs — and the default has to be the facet's own, because the page
 * number lives in the URL and an address already sent must keep addressing the
 * same rows.
 */
// @req REQ-108
export function resolvePageSize(
  requested: string | null | undefined,
  offered: readonly number[]
): number {
  const fallback = offered[0];
  if (!requested) return fallback;
  const size = Number.parseInt(requested, 10);
  return offered.includes(size) ? size : fallback;
}
