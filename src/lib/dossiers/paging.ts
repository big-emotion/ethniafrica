/**
 * How many readings the dossiers hub shows at a time.
 *
 * Twelve rather than the facets' twenty-five: a dossier card carries a title
 * and a sentence, where a facet row carries a name, so twelve of these is
 * already a longer page than twenty-five of those.
 */
// @req REQ-108
export const HUB_PAGE_SIZE = 12;

/**
 * One page of the hub's list.
 *
 * Clamped rather than trusted: a page number out of range returns the last
 * page's slice instead of an empty list, so a reader who deletes a search term
 * and shortens the list lands on readings rather than on nothing.
 */
// @req REQ-108
export function pageOf<T>(entries: T[], page: number): T[] {
  const pageCount = Math.max(1, Math.ceil(entries.length / HUB_PAGE_SIZE));
  const current = Math.min(Math.max(Math.floor(page) || 1, 1), pageCount);
  const start = (current - 1) * HUB_PAGE_SIZE;
  return entries.slice(start, start + HUB_PAGE_SIZE);
}
