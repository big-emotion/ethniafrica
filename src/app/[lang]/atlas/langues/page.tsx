/**
 * The languages index (REQ-139), on the appellations pattern: a Server
 * Component, a GET-form/plain-anchor A–Z filter (`FacetLetterRail`), and
 * plain-anchor pagination, so the corpus is walkable with zero JS.
 *
 * Default order is family then name (`listAfrikLanguages`), mirroring the
 * AFRIK hierarchy, with the A–Z filter layered on top — 748 languages for
 * only 532 distinct names makes a flat alphabetical listing weak on its own,
 * per the ticket's assumption (ETNI-1802).
 *
 * The letter filter has no column to push down to the query layer, so
 * `listAfrikLanguages` is called once for the whole corpus and both the
 * filter and the pagination happen here, in memory — the corpus is 748 rows,
 * small enough that this stays a single round trip rather than N.
 */

import type { Metadata } from "next";

import { PageLayout } from "@/components/layout/PageLayout";
import { LanguageIndexList } from "@/components/language/LanguageIndexList";
import { FacetLetterRail } from "@/components/hubs/facets/FacetLetterRail";
import {
  listAfrikLanguages,
  type AfrikLanguageListItem,
} from "@/lib/supabase/queries/afrik/languages";
import { translations } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";

const t = translations.fr.languages;

const PER_PAGE = 48;
// Above the corpus size (748 languages) so one call covers every letter.
const FETCH_ALL = 1000;

interface LanguesPageProps {
  searchParams: Promise<{ page?: string; lettre?: string }>;
}

function hrefFor(letter: string | null): string {
  return letter ? `?lettre=${letter}` : "?";
}

// @req REQ-139
export const metadata: Metadata = {
  title: t.pageTitle,
  description: t.pageSubtitle,
  alternates: {
    canonical: getLocalizedRoute("fr", "languages"),
  },
};

// @req REQ-139 @req REQ-136
export default async function LanguesPage({ searchParams }: LanguesPageProps) {
  const sp = await searchParams;
  const requestedPage = Number.parseInt(sp.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const letter =
    sp.lettre && /^[A-Za-z]$/.test(sp.lettre) ? sp.lettre.toUpperCase() : null;

  let languages: AfrikLanguageListItem[] = [];
  let unavailable = false;
  try {
    const result = await listAfrikLanguages({ page: 1, perPage: FETCH_ALL });
    languages = result.languages;
  } catch {
    // Zero is a valid total; a failed read is not. The unavailability state
    // below must never render as an empty (0-result) corpus.
    unavailable = true;
  }

  const filtered = letter
    ? languages.filter((language) =>
        language.name.toUpperCase().startsWith(letter)
      )
    : languages;

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = filtered.slice(start, start + PER_PAGE);

  return (
    <PageLayout language="fr" title={t.pageTitle} subtitle={t.pageSubtitle}>
      <div className="space-y-6 min-[720px]:space-y-8">
        <p className="max-w-2xl text-afh-small text-muted-foreground">
          {t.pageSubtitle}
        </p>

        {unavailable ? (
          <p
            role="status"
            className="max-w-2xl rounded-md border bg-muted/50 px-4 py-3 text-afh-small"
          >
            {t.unavailable}
          </p>
        ) : (
          <>
            <FacetLetterRail current={letter} hrefFor={hrefFor} />
            <LanguageIndexList
              languages={pageItems}
              total={total}
              page={currentPage}
              pageCount={pageCount}
              perPage={PER_PAGE}
              letter={letter}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
