import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";

import { buildPageWindow } from "@/lib/hubs/pagination";
import { cn } from "@/lib/utils";

export interface FacetPaginationProps {
  /**
   * Where on the page this pager sits. The head carries the reading's extent
   * and how much of it is shown at a time; the foot carries the pages alone,
   * because a reader who has come down the list wants the next one and not a
   * second copy of every control.
   */
  position: "top" | "bottom";
  page: number;
  pageCount: number;
  /** Rows in the current selection, not in the corpus behind it. */
  total: number;
  pageSize: number;
  /** The sizes this facet offers, smallest first. The first is its default. */
  pageSizes: readonly number[];
  /** The facet's own address composer — routes are never typed out here. */
  buildHref: (page: number, pageSize: number) => string;
  /**
   * What the facet is paging through, plural, for the landmark's name. It is
   * not repeated in the row: the header above already states how many the
   * selection holds, and a page that says its total twice has two places to
   * keep in step.
   */
  unitLabel: string;
  className?: string;
}

/**
 * The pager the three facets share.
 *
 * It replaces a "Page 1 sur 41 · Page suivante" that was a page number and one
 * step: reaching page thirty of forty-one meant twenty-nine clicks, and the
 * reader was never told how far into the selection they were. So the shape
 * here is a numbered window with both ends always reachable, a statement of
 * the slice on screen, and a choice of how much to show at once.
 *
 * A server component, and therefore anchors rather than buttons throughout —
 * the same reason the letter rail is anchors. A page of a reading is a reading
 * that has an address: it works before hydration, a crawler can follow it, and
 * a reader can send it.
 *
 * Not built on `components/ui/pagination`: that one is unused shadcn scaffold
 * whose labels are in English on a French-only site, whose links are raw `<a>`
 * that reload the document, and whose targets are 36px.
 */
// @req REQ-108
export function FacetPagination({
  position,
  page,
  pageCount,
  total,
  pageSize,
  pageSizes,
  buildHref,
  unitLabel,
  className,
}: FacetPaginationProps) {
  const lastPage = Math.max(1, pageCount);
  const current = Math.min(Math.max(page, 1), lastPage);
  // Nothing to page through is nothing to say: with one page there is no
  // position to report and no step to offer, and the header above has already
  // said how large the selection is.
  if (lastPage <= 1) return null;

  const format = new Intl.NumberFormat("fr-FR");
  const controlClass =
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-afh-lg px-3 text-afh-small focus-visible:outline-none focus-visible:shadow-[var(--afh-ring-focus)]";
  const restingStyle = { backgroundColor: "var(--accent-tint)" };
  const currentStyle = {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  };

  // Position, not quantity. The header owns the count.
  const extent =
    `${format.format((current - 1) * pageSize + 1)} à ` +
    `${format.format(Math.min(current * pageSize, total))} sur ` +
    `${format.format(total)}`;

  const pages = (
    <ul className="flex flex-wrap items-center justify-center gap-1 p-0">
      {current > 1 && (
        <li className="list-none">
          <Link
            href={buildHref(current - 1, pageSize)}
            rel="prev"
            className={controlClass}
            style={restingStyle}
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            <span className="sr-only">Page précédente</span>
          </Link>
        </li>
      )}

      {buildPageWindow(current, lastPage).map((slot, index) =>
        slot === "gap" ? (
          <li
            key={`gap-${index}`}
            aria-hidden
            className="inline-flex min-h-11 min-w-11 list-none items-center justify-center text-afh-text-soft"
          >
            <MoreHorizontal className="h-4 w-4" />
          </li>
        ) : (
          <li key={slot} className="list-none">
            <Link
              href={buildHref(slot, pageSize)}
              aria-current={slot === current ? "page" : undefined}
              aria-label={`Page ${slot}`}
              className={controlClass}
              style={slot === current ? currentStyle : restingStyle}
            >
              {format.format(slot)}
            </Link>
          </li>
        )
      )}

      {current < lastPage && (
        <li className="list-none">
          <Link
            href={buildHref(current + 1, pageSize)}
            rel="next"
            className={controlClass}
            style={restingStyle}
          >
            <span className="sr-only">Page suivante</span>
            <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        </li>
      )}
    </ul>
  );

  if (position === "bottom") {
    return (
      <nav
        aria-label={`Pagination des ${unitLabel}, en pied de liste`}
        data-testid="facet-pagination-bottom"
        className={cn("mt-6 flex justify-center", className)}
      >
        {pages}
      </nav>
    );
  }

  return (
    <nav
      aria-label={`Pagination des ${unitLabel}, en tête de liste`}
      data-testid="facet-pagination-top"
      className={cn(
        "mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <p
        data-testid="facet-pagination-count"
        className="text-afh-small text-afh-text-soft"
      >
        {extent}
      </p>

      {pages}

      {/* Always shown: more than one page means the selection is larger than
          the smallest size, so every choice here changes something. The label
          sits outside the list — it is not one of the choices. */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-afh-small text-afh-text-soft">Par page</span>
        <ul
          aria-label="Résultats par page"
          className="flex flex-wrap items-center gap-1 p-0"
        >
          {pageSizes.map((size) => (
            <li key={size} className="list-none">
              {/* Back to page one: page 41 of a twenty-row reading is past the
                  end of a hundred-row one. */}
              <Link
                href={buildHref(1, size)}
                aria-current={size === pageSize ? true : undefined}
                aria-label={`${size} par page`}
                className={controlClass}
                style={size === pageSize ? currentStyle : restingStyle}
              >
                {size}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default FacetPagination;
