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

export interface FacetFilterBarProps {
  /** Where the form submits — the facet's own path, composed through the route helpers. */
  action: string;
  fields: readonly FacetFilterField[];
  submitLabel?: string;
  className?: string;
}

/**
 * The facet's filters, as a plain `GET` form.
 *
 * A server component on purpose, and therefore native `<select name>` rather
 * than a shadcn `Select`: the shadcn one renders a button and a listbox and no
 * form control at all, so it submits nothing — the filter would only ever work
 * once JavaScript had run, and never for a crawler. Submitting is a
 * navigation, which is also what makes a filtered view addressable: the result
 * a reader is looking at has a URL they can send.
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
  fields,
  submitLabel = "Filtrer",
  className,
}: FacetFilterBarProps) {
  const fieldClass =
    "min-h-11 w-full rounded-afh-lg border border-afh-border bg-afh-surface px-3 py-2 text-afh-body text-afh-text";

  return (
    <form
      method="get"
      action={action}
      data-testid="facet-filter-bar"
      className={cn(
        "flex flex-col gap-3 rounded-afh-lg border border-afh-border bg-afh-surface p-4 md:flex-row md:items-end",
        className
      )}
    >
      {fields.map((field) => {
        const id = `facet-filter-${field.name}`;
        return (
          <div key={field.name} className="flex flex-1 flex-col gap-1">
            <label
              htmlFor={id}
              className="text-afh-small font-medium text-afh-text-soft"
            >
              {field.label}
            </label>
            <select
              id={id}
              name={field.name}
              defaultValue={field.value ?? ""}
              className={fieldClass}
            >
              <option value="">{field.anyLabel}</option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <button
        type="submit"
        className="min-h-11 rounded-afh-lg px-4 py-2 font-medium md:w-auto"
        style={{
          backgroundColor: "var(--accent)",
          color: "var(--accent-foreground)",
        }}
      >
        {submitLabel}
      </button>
    </form>
  );
}

export default FacetFilterBar;
