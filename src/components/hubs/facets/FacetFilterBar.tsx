import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FacetFilterOption {
  value: string;
  label: string;
}

export interface FacetFilterField {
  /** The query parameter this field submits under. */
  name: string;
  label: string;
  /** What the empty option is called — "no filter", stated in the facet's own words. */
  anyLabel: string;
  options: readonly FacetFilterOption[];
  /** The value currently in the URL, or null when the reader has set none. */
  value: string | null;
}

/** An applied narrowing, and the address that lifts it. */
export interface FacetActiveFilter {
  label: string;
  removeHref: string;
}

/**
 * A narrowing that lives in the fold without being a form field — the A–Z
 * rail, whose 27 entries are addresses rather than options. `activeCount` is
 * what it contributes to the summary's badge.
 */
export interface FacetAdvancedSlot {
  content: ReactNode;
  activeCount?: number;
}

export interface FacetFilterBarProps {
  /** Where the form submits — the facet's own path, composed through the route helpers. */
  action: string;
  /** The facet's own axis. Always on the line, never folded. */
  primaryField: FacetFilterField;
  /** The narrowings that fold away behind the disclosure. */
  advancedFields?: readonly FacetFilterField[];
  advancedSlot?: FacetAdvancedSlot;
  /** Query parameters the form must carry through a submit without owning them. */
  preservedParams?: Readonly<Record<string, string | null | undefined>>;
  activeFilters?: readonly FacetActiveFilter[];
  submitLabel?: string;
  className?: string;
}

/** The paging parameter every facet names, and the one narrowing never carries. */
const PAGE_PARAM = "page";

const FIELD_CLASS =
  "min-h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-body text-afh-text";

/**
 * The facet's filters, as a plain `GET` form on a single line.
 *
 * A server component on purpose, and therefore native `<select name>` rather
 * than a shadcn `Select`: the shadcn one renders a button and a listbox and no
 * form control at all, so it submits nothing — the filter would only ever work
 * once JavaScript had run, and never for a crawler. Submitting is a
 * navigation, which is also what makes a filtered view addressable: the result
 * a reader is looking at has a URL they can send.
 *
 * The same reasoning chooses `<details>` over a popover for the fold. It opens
 * with no script, and everything it holds stays in the document — which is the
 * only reason the A–Z rail can be folded at all without costing 27 followable
 * addresses.
 *
 * **The fold carries a count.** The atlas charter (§3) lets a surface nest what
 * it offers and forbids it to hide it, and puts the difference on exactly that:
 * a shelf carries its count, so nothing is asserted absent. A lid that swallowed
 * a country filter without saying so would leave a reader looking at 40 peoples
 * out of 803 with nothing on screen accounting for the gap. The chips below the
 * line are the other half of that debt — they name each applied narrowing while
 * the fold is shut, and each is an anchor, because lifting a narrowing is a
 * reading of the corpus and has an address.
 *
 * The panel is positioned rather than in flow so that opening it does not push
 * the line it hangs from — the trigger stays under the thumb that just tapped it.
 *
 * Two bugs the search surface has are deliberately not inherited. There is no
 * `__all__` sentinel — that exists only because a shadcn `SelectItem` may not
 * carry an empty value, and `<option value="">` may. And nothing here filters
 * rows the page has already fetched: the query goes to the database, so page 2
 * of a filtered list is the second page *of the filtered set*, not the second
 * page of everything with the filter reapplied to it.
 */
// @req REQ-114
export function FacetFilterBar({
  action,
  primaryField,
  advancedFields = [],
  advancedSlot,
  preservedParams,
  activeFilters = [],
  submitLabel = "Filtrer",
  className,
}: FacetFilterBarProps) {
  const foldedCount =
    advancedFields.filter((field) => field.value).length +
    (advancedSlot?.activeCount ?? 0);
  const hasFold = advancedFields.length > 0 || Boolean(advancedSlot);

  /**
   * Paging is dropped here rather than left to each caller to remember: a new
   * narrowing opens on its first page, and carrying page 4 into a smaller set
   * offers a page that cannot exist. The three facets all name that parameter
   * `page`, and a bar that merely *hoped* they would leave it out is one
   * copy-paste away from the defect this preservation exists to close.
   */
  const preserved = Object.entries(preservedParams ?? {}).filter(
    (entry): entry is [string, string] =>
      entry[0] !== PAGE_PARAM && Boolean(entry[1])
  );

  return (
    <form
      method="get"
      action={action}
      data-testid="facet-filter-bar"
      className={cn("flex flex-col gap-2", className)}
    >
      {preserved.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="relative flex flex-wrap items-center gap-2">
        <div className="min-w-40 flex-1">
          <FacetSelect field={primaryField} />
        </div>

        {hasFold && (
          <details
            data-testid="facet-filter-advanced"
            className="shrink-0"
            name="facet-filters"
          >
            <summary
              className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-body text-afh-text [&::-webkit-details-marker]:hidden"
              style={
                foldedCount > 0
                  ? { backgroundColor: "var(--accent-tint)" }
                  : undefined
              }
            >
              {/* The space is explicit: JSX drops the whitespace between text
                  and an expression on the next line, and the summary would be
                  announced as "Filtres2". */}
              Filtres{" "}
              {foldedCount > 0 && (
                <span
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-afh-caption"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-foreground)",
                  }}
                >
                  {foldedCount}
                </span>
              )}
            </summary>

            <div className="absolute left-0 right-0 top-full z-10 mt-2 flex flex-col gap-3 rounded-afh-lg border border-afh-border bg-afh-surface p-4 shadow-lg">
              {advancedFields.map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                  <label
                    htmlFor={`facet-filter-${field.name}`}
                    className="text-afh-small font-medium text-afh-text-soft"
                  >
                    {field.label}
                  </label>
                  <FacetSelect field={field} labelledByOwnLabel />
                </div>
              ))}
              {advancedSlot?.content}
            </div>
          </details>
        )}

        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-afh-lg px-4 py-2 font-medium"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground)",
          }}
        >
          {submitLabel}
        </button>
      </div>

      {activeFilters.length > 0 && (
        <ul
          data-testid="facet-active-filters"
          className="flex flex-wrap gap-2 p-0"
        >
          {activeFilters.map((filter) => (
            <li key={filter.label} className="list-none">
              <Link
                href={filter.removeHref}
                aria-label={`Retirer le filtre ${filter.label}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-1 text-afh-caption"
                style={{ backgroundColor: "var(--accent-tint)" }}
              >
                {filter.label}
                <span aria-hidden="true">✕</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

/**
 * The primary field carries no visible label: on one line the empty option
 * ("Toutes les familles") already says what the control narrows, and a label
 * above it was 24px of the vertical budget this bar exists to give back. The
 * accessible name survives on `aria-label`, so nothing is lost to a screen
 * reader — only to the eye that did not need it.
 */
function FacetSelect({
  field,
  labelledByOwnLabel = false,
}: {
  field: FacetFilterField;
  labelledByOwnLabel?: boolean;
}) {
  return (
    <select
      id={`facet-filter-${field.name}`}
      name={field.name}
      defaultValue={field.value ?? ""}
      aria-label={labelledByOwnLabel ? undefined : field.label}
      className={FIELD_CLASS}
    >
      <option value="">{field.anyLabel}</option>
      {field.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default FacetFilterBar;
