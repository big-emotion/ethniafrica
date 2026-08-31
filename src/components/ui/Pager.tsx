import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface PagerProps {
  /** What the sequence is, in the reader's words — "Pages de familles". */
  label: string;
  pageNumber: number;
  pageCount: number;
  /** The address of a given page, composed by the caller with its own filters kept. */
  hrefForPage: (page: number) => string;
  className?: string;
}

/**
 * The site's pager — every paged list uses this one.
 *
 * Real links to real URLs, not buttons over client state: a page of a listing
 * has to be shareable, bookmarkable and crawlable, and the pager then works
 * with scripting off. Composing the address is the caller's job, because only
 * the caller knows which filters have to survive the step; here it is one
 * function call.
 *
 * The sequence is windowed rather than printed whole. The peoples facet runs
 * to 41 pages, and printing 41 pills is exactly why the two facet pages had
 * printed none — they shipped a bare "Page suivante" instead, which left page
 * 30 unreachable in anything under thirty clicks.
 *
 * The current page is marked with the page's own ink rather than the surface
 * accent. The charter scopes an accent to what a surface is *about* — the
 * facet switcher, the letter rail — and a pager is chrome over a reading, not
 * a choice of subject. It also keeps the control correct outside an accent
 * scope, where `--accent` is still the shadcn HSL triplet and would paint
 * nothing at all.
 */
// @req REQ-114
export function Pager({
  label,
  pageNumber,
  pageCount,
  hrefForPage,
  className,
}: PagerProps) {
  // One page is not a sequence. A pager over it would be dead controls
  // telling the reader there is more.
  if (pageCount <= 1) return null;

  const shown = windowedPages(pageNumber, pageCount);

  return (
    <nav aria-label={label} className={cn("afh-pager", className)}>
      {pageNumber > 1 ? (
        <Link
          className="afh-pager-step"
          href={hrefForPage(pageNumber - 1)}
          rel="prev"
          aria-label="Page précédente"
        >
          <ChevronLeft aria-hidden className="afh-pager-chevron" />
          <span className="afh-pager-step-label">Précédent</span>
        </Link>
      ) : null}

      <ul className="afh-pager-list">
        {shown.map((page, index) =>
          page === GAP ? (
            <li key={`gap-${index}`} aria-hidden className="afh-pager-gap">
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                className="afh-pager-page"
                href={hrefForPage(page)}
                aria-current={page === pageNumber ? "page" : undefined}
                aria-label={`Page ${page} sur ${pageCount}`}
              >
                {page}
              </Link>
            </li>
          )
        )}
      </ul>

      {pageNumber < pageCount ? (
        <Link
          className="afh-pager-step"
          href={hrefForPage(pageNumber + 1)}
          rel="next"
          aria-label="Page suivante"
        >
          <span className="afh-pager-step-label">Suivant</span>
          <ChevronRight aria-hidden className="afh-pager-chevron" />
        </Link>
      ) : null}
    </nav>
  );
}

/** Stands for the pages the window leaves out, never for a page. */
const GAP = "gap" as const;

type PagerSlot = number | typeof GAP;

/**
 * Seven slots, so the rail fits one line at 430px — the width the whole
 * surface is designed from. A sequence that already fits is printed whole:
 * eliding one page out of five buys nothing and costs the reader the only
 * two-click route to it.
 */
const MAX_SLOTS = 7;

/**
 * The pages worth printing: the two ends, the reader's neighbourhood, and a
 * mark wherever the two are not contiguous.
 */
function windowedPages(pageNumber: number, pageCount: number): PagerSlot[] {
  if (pageCount <= MAX_SLOTS) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const near = new Set<number>([
    1,
    pageCount,
    pageNumber - 1,
    pageNumber,
    pageNumber + 1,
  ]);

  const pages = [...near]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((left, right) => left - right);

  const slots: PagerSlot[] = [];
  for (const [index, page] of pages.entries()) {
    const previous = pages[index - 1];
    if (previous !== undefined && page - previous > 1) slots.push(GAP);
    slots.push(page);
  }
  return slots;
}

export default Pager;
