import Link from "next/link";

export interface AnecdotesPaginationProps {
  /** Path the page numbers hang off, without a query string. */
  basePath: string;
  pageNumber: number;
  pageCount: number;
}

/**
 * The feed's pager.
 *
 * Real links to real URLs, not buttons over client state: each page of the
 * anecdotes has to be shareable, bookmarkable and crawlable — that is most
 * of the reason the feed exists as a page rather than as more cards in the
 * home's deck. It also means the pager works with scripting off.
 *
 * Page 1 is addressed as the bare path rather than `?page=1`, so the module
 * has one canonical URL instead of two that serve the same eight facts.
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
  // One page is not a sequence. A pager over it would be three dead
  // controls telling the reader there is more.
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav className="anecdotes-pager" aria-label="Pages d'anecdotes">
      {pageNumber > 1 ? (
        <Link
          className="anecdotes-pager-step"
          href={hrefForPage(basePath, pageNumber - 1)}
          rel="prev"
        >
          Page précédente
        </Link>
      ) : null}

      <ul className="anecdotes-pager-list">
        {pages.map((page) => (
          <li key={page}>
            <Link
              className="anecdotes-pager-page"
              href={hrefForPage(basePath, page)}
              aria-current={page === pageNumber ? "page" : undefined}
              aria-label={`Page ${page} sur ${pageCount}`}
            >
              {page}
            </Link>
          </li>
        ))}
      </ul>

      {pageNumber < pageCount ? (
        <Link
          className="anecdotes-pager-step"
          href={hrefForPage(basePath, pageNumber + 1)}
          rel="next"
        >
          Page suivante
        </Link>
      ) : null}

      <style>{`
        .anecdotes-pager {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--afh-border);
        }
        .anecdotes-pager-list {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 0;
          padding: 0;
        }
        /* 44px of tappable area on every control, whatever it looks like. */
        .anecdotes-pager-page {
          min-width: 44px;
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border: 1px solid var(--afh-border);
          border-radius: 100px;
          background: var(--afh-color-card);
          color: var(--afh-text-soft);
          font-size: var(--afh-text-caption);
          text-decoration: none;
        }
        .anecdotes-pager-page[aria-current="page"] {
          border-color: var(--afh-text-soft);
          color: var(--afh-text);
          font-weight: 600;
        }
        .anecdotes-pager-step {
          display: inline-flex;
          align-items: center;
          height: 44px;
          padding: 0 14px;
          border-radius: 100px;
          color: var(--afh-text-soft);
          font-size: var(--afh-text-caption);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .anecdotes-pager-page:hover,
        .anecdotes-pager-page:focus-visible,
        .anecdotes-pager-step:hover,
        .anecdotes-pager-step:focus-visible {
          color: var(--afh-text);
        }
      `}</style>
    </nav>
  );
}

export default AnecdotesPagination;
