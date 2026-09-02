/**
 * The /fr/atlas/noms index (ETNI-1803, REQ-139) — the corpus-class listing
 * for patronymes, the naming systems persons are named under. Not the same
 * corpus dimension as `NameNomenclature` (ethnonyms of peoples): DEC-038
 * keeps the two entities separate, so this list points at
 * `getPatronymeRoute`, never `getPeopleRoute`.
 *
 * No `"use client"`, and pagination is a plain anchor: the appellations
 * index established this idiom (works with zero JS, crawlable, URL is the
 * whole state) and there is no reason for a second corpus-class index to
 * depart from it.
 */

import Link from "next/link";

import type { PatronymeListItem } from "@/api/v2/services/patronymes";
import { getPatronymeRoute } from "@/lib/routing";
import { translations } from "@/lib/translations";

const t = translations.fr.patronymes;
const tIndex = t.index;

export interface PatronymeIndexListProps {
  patronymes: PatronymeListItem[];
  total: number;
  page: number;
  pageCount: number;
}

function hrefFor(page: number): string {
  return page > 1 ? `?page=${page}` : "?";
}

// @req REQ-139
export function PatronymeIndexList({
  patronymes,
  total,
  page,
  pageCount,
}: PatronymeIndexListProps) {
  return (
    <div className="space-y-6 min-[720px]:space-y-8">
      <p aria-live="polite" className="text-afh-small text-muted-foreground">
        {total === 0
          ? tIndex.emptyState
          : `${total} ${total > 1 ? tIndex.countPlural : tIndex.countSingular}`}
      </p>

      {patronymes.length === 0 ? (
        <p className="text-afh-small text-muted-foreground">
          {tIndex.emptyState}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[800px]:grid-cols-3">
          {patronymes.map((patronyme) => (
            <li key={patronyme.id} className="rounded-md border p-4">
              <Link
                href={getPatronymeRoute("fr", patronyme.id)}
                className="flex flex-col gap-1 underline-offset-2 hover:underline"
              >
                <span className="text-afh-body font-semibold">
                  {patronyme.nameMain}
                </span>
                <span className="text-afh-small text-muted-foreground">
                  {t.nameSystemLabels[patronyme.nameSystem]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav
          aria-label={tIndex.pagination.label}
          className="flex items-center justify-between gap-3"
        >
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              className="rounded-md border px-3 py-2 text-afh-small"
            >
              {tIndex.pagination.previous}
            </Link>
          ) : (
            <span />
          )}

          <p className="text-afh-small text-muted-foreground tabular-nums">
            {tIndex.pagination.page} {page} / {pageCount}
          </p>

          {page < pageCount ? (
            <Link
              href={hrefFor(page + 1)}
              rel="next"
              className="rounded-md border px-3 py-2 text-afh-small"
            >
              {tIndex.pagination.next}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

export default PatronymeIndexList;
