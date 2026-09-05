import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { sourceIdParamSchema } from "@/api/v2/schemas/sources";
import { getSourceCitations } from "@/api/v2/services/sourceCitations";
import { getSourceById } from "@/api/v2/services/sources";
import { PageLayout } from "@/components/layout/PageLayout";
import { SourceStandingBadge } from "@/components/sources/SourceStandingBadge";
import { getLocalizedRoute, getSourceRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { isSourceTier } from "@/types/sources";

/**
 * One source of the corpus, and what rests on it.
 *
 * The page a note callout will point at, which is why it exists before there
 * are any: a citation needs a destination that outlives the fiche quoting it.
 *
 * Addressed by UUID. The identifier is ugly and it is the only stable one —
 * the title is the conflict target of four loaders' upserts, so it is exactly
 * the value a re-sourcing rewrites, and no redirect table would catch the
 * links that broke. The page is kept out of the index rather than dressed up:
 * 4 395 thin pages would dilute the crawl budget of the corpus itself, and
 * this address exists to be pasted, not to be found.
 */

type PageParams = { lang: string; id: string };

const countFormat = new Intl.NumberFormat("fr-FR");

/** "www.ethnologue.com/..." — the host first, which is what a reader recognises. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// @req REQ-092
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, id } = await params;
  const parsed = sourceIdParamSchema.safeParse({ id });
  const source = parsed.success ? await getSourceById(id) : null;

  return {
    title: source ? `${source.title} — Source` : "Source",
    robots: { index: false, follow: true },
    alternates: { canonical: getSourceRoute(lang as Language, id) },
  };
}

// @req REQ-092
export default async function SourcePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang, id } = await params;
  const language = lang as Language;

  // A malformed segment is not a missing source: it is not an identifier at
  // all, and asking the database about it spends a round trip to learn what
  // the string already said.
  if (!sourceIdParamSchema.safeParse({ id }).success) notFound();

  const source = await getSourceById(id);
  if (!source) notFound();

  const citations = await getSourceCitations(source.id);
  const standing = isSourceTier(source.tier) ? source.tier : "needs_review";
  const attribution = [source.author, source.year ? String(source.year) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageLayout language={language} title={source.title}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-baseline gap-2">
          <SourceStandingBadge standing={standing} />
          {attribution && (
            <span className="text-afh-small text-afh-text-soft">
              {attribution}
            </span>
          )}
          {source.page && (
            <span className="text-afh-small text-afh-text-soft">
              {source.page}
            </span>
          )}
        </div>

        {source.notes && (
          <p className="mt-4 text-afh-body text-afh-text-soft">
            {source.notes}
          </p>
        )}

        {source.url && (
          <p className="mt-4">
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-afh-body underline underline-offset-2"
            >
              {displayUrl(source.url)}
            </a>
          </p>
        )}

        <section className="mt-10 border-t border-afh-border pt-6">
          <h2 className="text-afh-h3 text-afh-text">
            Ce qui repose sur cette source
          </h2>

          {citations.entities.length === 0 ? (
            <p
              data-testid="source-citations-empty"
              className="mt-2 text-afh-body text-afh-text-soft"
            >
              Aucune fiche du corpus ne cite cette source pour l&apos;instant.
            </p>
          ) : (
            <>
              <p className="mt-2 text-afh-small text-afh-text-soft">
                {`${countFormat.format(citations.entities.length)} ` +
                  `${citations.entities.length === 1 ? "fiche" : "fiches"}, ` +
                  `${countFormat.format(citations.total)} ` +
                  `${citations.total === 1 ? "affirmation" : "affirmations"}.`}
              </p>
              <ul className="mt-4 flex flex-col p-0">
                {citations.entities.map((entity) => (
                  <li
                    key={`${entity.entityType}:${entity.entityId}`}
                    className="list-none border-b border-afh-border py-3"
                  >
                    {/* An entity type the app cannot route reads as a line
                        without a link, never as a link that 404s. */}
                    {entity.href ? (
                      <Link href={entity.href} prefetch={false}>
                        {entity.label}
                      </Link>
                    ) : (
                      <span>{entity.label}</span>
                    )}
                  </li>
                ))}
              </ul>
              {citations.truncated && (
                <p className="mt-2 text-afh-caption text-afh-text-soft">
                  Les fiches les plus liées à cette source, et non la liste
                  entière.
                </p>
              )}
            </>
          )}
        </section>

        <p className="mt-8">
          <Link href={getLocalizedRoute(language, "sources")}>
            Retour à la bibliographie
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
