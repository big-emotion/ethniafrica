/**
 * The languages index list (REQ-139).
 *
 * A plain anchor per row and a GET-form-compatible pagination nav, on the
 * `NameNomenclature` pattern: no JavaScript required to read every page, and
 * a crawler can walk the whole corpus.
 *
 * The family + id on every row is not decoration — it is the disambiguator.
 * The corpus holds 748 languages for 532 distinct names ("Fulfulde" names
 * both `fuf` and `fuv`), so a name alone would print two identical-looking
 * rows with no way to tell them apart.
 */

import Link from "next/link";

import { getLanguageRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";
import type { AfrikLanguageListItem } from "@/lib/supabase/queries/afrik/languages";

const t = translations.fr.languages;

export interface LanguageIndexListProps {
  languages: AfrikLanguageListItem[];
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
  /** The active A–Z filter, or null — carried into pagination links. */
  letter: string | null;
}

function hrefFor(params: { letter?: string | null; page?: number }): string {
  const search = new URLSearchParams();
  if (params.letter) search.set("lettre", params.letter);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "?";
}

// @req REQ-139
export function LanguageIndexList({
  languages,
  total,
  page,
  pageCount,
  perPage,
  letter,
}: LanguageIndexListProps) {
  const firstOnPage = total === 0 ? 0 : (page - 1) * perPage + 1;
  const lastOnPage = Math.min(page * perPage, total);

  return (
    <div className="space-y-4 min-[720px]:space-y-6">
      <p aria-live="polite" className="text-afh-small text-muted-foreground">
        {total === 0
          ? t.range.none
          : `${firstOnPage}–${lastOnPage} ${t.range.of} ${total} ${
              total > 1 ? t.range.languagesPlural : t.range.languagesSingular
            }`}
      </p>

      {languages.length === 0 ? (
        <div className="rounded-md bg-muted px-6 py-10 text-center">
          <p className="text-afh-small">{t.emptyState}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[800px]:grid-cols-3">
          {languages.map((language) => (
            <li key={language.id} className="rounded-md border p-4 min-h-11">
              <Link
                href={getLanguageRoute("fr", language.id)}
                className="flex flex-col gap-1"
              >
                <span className="text-afh-body font-semibold">
                  {language.name}
                </span>
                <span className="text-afh-small text-muted-foreground">
                  {language.family.name} · {language.id}
                </span>
              </Link>
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
              href={hrefFor({ letter, page: page - 1 })}
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
              href={hrefFor({ letter, page: page + 1 })}
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
