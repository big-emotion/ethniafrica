/**
 * The Appellations nomenclature (REQ-054) — one entry per name, not per link.
 *
 * It replaces `NamesAtlasView`, whose row was a link to a people fiche. That
 * made the surface a second index onto the peoples directory: a name borne by
 * four peoples appeared as four identical lines, because the only thing
 * telling them apart — the people's name — was rendered `sr-only`. Here the
 * name is the entry and its bearers are an attribute of it, which is the one
 * thing the peoples directory cannot show: that "Pangwe" names six peoples,
 * or "AmaNdebele" eight.
 *
 * No `"use client"`, deliberately. Search, filters and paging are all a `GET`
 * form and plain anchors, so the surface works with no JavaScript, a crawler
 * can walk every page, and the URL is the whole state. The previous island
 * fetched page 1 forever and reconciled nothing with the count it printed.
 */

import Link from "next/link";

import { NameTypeBadge } from "@/components/names/NameTypeBadge";
import { getPeopleRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";
import type { NameForm } from "@/api/v2/schemas/names";
import type { NameRecordType } from "@/types/names";

const t = translations.fr.names;

/** Filter chips, in corpus order. A type with no record is never rendered. */
const TYPE_ORDER: NameRecordType[] = [
  "endonym",
  "exonym",
  "historical_spelling",
  "surname",
];

export interface NameNomenclatureProps {
  forms: NameForm[];
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
  query?: string;
  nameType?: NameRecordType;
  imposedOnly: boolean;
  /** Record count per type, and the imposed total. Absent type ⇒ no chip. */
  typeCounts: Partial<Record<NameRecordType, number>>;
  imposedCount: number;
}

function hrefFor(params: {
  query?: string;
  nameType?: NameRecordType;
  imposedOnly?: boolean;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.nameType) search.set("nameType", params.nameType);
  if (params.imposedOnly) search.set("imposedOnly", "true");
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "?";
}

const CHIP_CLASS =
  "rounded-full border px-3 py-1 text-afh-small transition-colors data-[active=true]:border-transparent data-[active=true]:bg-foreground data-[active=true]:text-background";

// @req REQ-054
export function NameNomenclature({
  forms,
  total,
  page,
  pageCount,
  perPage,
  query,
  nameType,
  imposedOnly,
  typeCounts,
  imposedCount,
}: NameNomenclatureProps) {
  const firstOnPage = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastOnPage = Math.min(page * perPage, total);
  const filtered = Boolean(query || nameType || imposedOnly);

  return (
    <div className="space-y-6 min-[720px]:space-y-8">
      <form
        method="get"
        role="search"
        aria-label={t.searchLabel}
        className="flex flex-col gap-2 min-[720px]:flex-row"
      >
        {/* The filters are part of the query the reader is refining, so a
            search must not silently drop them. */}
        {nameType && <input type="hidden" name="nameType" value={nameType} />}
        {imposedOnly && <input type="hidden" name="imposedOnly" value="true" />}
        <input
          id="names-search"
          type="search"
          name="q"
          defaultValue={query ?? ""}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          className="h-11 flex-1 rounded-md border px-3 text-afh-small"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-md bg-primary px-5 text-afh-small font-semibold text-primary-foreground"
        >
          {t.searchSubmit}
        </button>
      </form>

      <div className="flex flex-wrap gap-2" aria-label={t.filtersLabel}>
        <Link
          href={hrefFor({ query })}
          className={CHIP_CLASS}
          data-active={!nameType && !imposedOnly ? true : undefined}
          aria-current={!nameType && !imposedOnly ? "page" : undefined}
        >
          {t.filters.all}
        </Link>

        {TYPE_ORDER.filter((type) => (typeCounts[type] ?? 0) > 0).map(
          (type) => (
            <Link
              key={type}
              href={hrefFor({
                query,
                nameType: nameType === type ? undefined : type,
              })}
              className={CHIP_CLASS}
              data-active={nameType === type ? true : undefined}
              aria-current={nameType === type ? "page" : undefined}
            >
              {t.filters[type]}{" "}
              <span className="tabular-nums opacity-70">
                {typeCounts[type]}
              </span>
            </Link>
          )
        )}

        {imposedCount > 0 && (
          <Link
            href={hrefFor({ query, imposedOnly: !imposedOnly })}
            className={CHIP_CLASS}
            data-active={imposedOnly ? true : undefined}
            aria-current={imposedOnly ? "page" : undefined}
          >
            {t.filters.imposed}{" "}
            <span className="tabular-nums opacity-70">{imposedCount}</span>
          </Link>
        )}
      </div>

      {/* The range, not just the total: the count and the list used to name
          different things — "3679 résultats" above 100 rendered rows. */}
      <p aria-live="polite" className="text-afh-small text-muted-foreground">
        {total === 0
          ? t.range.none
          : `${firstOnPage}–${lastOnPage} ${t.range.of} ${total} ${
              total > 1 ? t.range.formsPlural : t.range.formsSingular
            }`}
      </p>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-md bg-muted px-6 py-10 text-center">
          <p className="max-w-sm text-afh-small">
            {t.emptyState.spellingGuidance}
          </p>
          {filtered && (
            <Link
              href="?"
              className="text-afh-small underline underline-offset-2"
            >
              {t.emptyState.clearFilters}
            </Link>
          )}
          <Link
            href={`/fr/contribute?q=${encodeURIComponent(query ?? "")}`}
            className="text-afh-small underline underline-offset-2"
          >
            {t.emptyState.reportMissing}
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[800px]:grid-cols-3">
          {forms.map((form) => (
            <li
              key={form.formKey}
              className="flex flex-col gap-2 rounded-md border p-4"
            >
              <p className="text-afh-body font-semibold">{form.displayName}</p>

              {form.spellings.length > 1 && (
                <p className="text-afh-small text-muted-foreground">
                  {t.alsoWritten} {form.spellings.join(" · ")}
                </p>
              )}

              <div className="flex flex-wrap gap-1">
                {form.nameTypes.map((type) => (
                  <NameTypeBadge
                    key={type}
                    nameType={type}
                    imposed={form.hasImposed}
                  />
                ))}
              </div>

              {/* The bearers, visible. This is the whole reason a name-first
                  listing is not a duplicate of the peoples directory. */}
              <p className="text-afh-small text-muted-foreground">
                {form.bearerCount > 1
                  ? `${t.bornBy} ${form.bearerCount} ${t.peoplesPlural}`
                  : t.bornByOne}
              </p>
              <ul className="flex flex-wrap gap-x-2 gap-y-1">
                {form.bearers.map((bearer) => (
                  <li key={bearer.id} className="text-afh-small">
                    <Link
                      href={`${getPeopleRoute("fr", bearer.id)}#noms`}
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      {bearer.name}
                    </Link>
                  </li>
                ))}
              </ul>

              {form.whyProblematic && (
                <p className="text-afh-small text-muted-foreground">
                  <span className="font-semibold">{t.problematicLabel}</span>{" "}
                  {form.whyProblematic}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label={t.pagination.label}
          className="flex items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Link
              href={hrefFor({ query, nameType, imposedOnly, page: page - 1 })}
              rel="prev"
              className="rounded-md border px-3 py-2 text-afh-small"
            >
              {t.pagination.previous}
            </Link>
          ) : (
            <span />
          )}

          <p className="text-afh-small text-muted-foreground tabular-nums">
            {t.pagination.page} {page} / {pageCount}
          </p>

          {page < pageCount ? (
            <Link
              href={hrefFor({ query, nameType, imposedOnly, page: page + 1 })}
              rel="next"
              className="rounded-md border px-3 py-2 text-afh-small"
            >
              {t.pagination.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

export default NameNomenclature;
