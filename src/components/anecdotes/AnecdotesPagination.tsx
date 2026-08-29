import { Pager } from "@/components/ui/Pager";

export interface AnecdotesPaginationProps {
  /** Path the page numbers hang off, without a query string. */
  basePath: string;
  pageNumber: number;
  pageCount: number;
}

/**
 * The feed's pager — the site's `Pager`, given the feed's addresses.
 *
 * Page 1 is addressed as the bare path rather than `?page=1`, so the module
 * has one canonical URL instead of two that serve the same eight facts. That
 * rule is the feed's own, which is why the address is composed here and not
 * in the shared control.
 *
 * What used to live here — pill styles, the numbered rail, the two steps —
 * moved into `Pager` when the explorer facets needed the same control. One
 * pager, three surfaces.
 */

function hrefForPage(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

// @req REQ-113
export function AnecdotesPagination({
  basePath,
  pageNumber,
  pageCount,
}: AnecdotesPaginationProps) {
  return (
    <Pager
      label="Pages d'anecdotes"
      pageNumber={pageNumber}
      pageCount={pageCount}
      hrefForPage={(page) => hrefForPage(basePath, page)}
    />
  );
}

export default AnecdotesPagination;
