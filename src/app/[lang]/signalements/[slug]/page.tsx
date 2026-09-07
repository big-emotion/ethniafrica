import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { FlagPublicStatus } from "@/components/flags/FlagPublicStatus";
import {
  getContributorAttribution,
  getFlagBySlug,
} from "@/lib/supabase/queries/flags/getFlagBySlug";
import { PRODUCT_NAME } from "@/lib/brand";
import { getStaticPageRoute } from "@/lib/routing";
import { surfaceHead } from "@/lib/seo/localeAlternates";
import { formatDate } from "@/lib/languageTag";
import { reportsCopy } from "@/lib/i18n/copy/reports";
import type { Language } from "@/types/shared";

/**
 * ISR: revalidate on every request in dev; in production the pg_notify →
 * Edge Function → /api/internal/revalidate pipeline handles on-demand
 * invalidation when a flag transitions state (Story 3.3 / ETNI-364).
 * The 60 s fallback ensures stale data is never served for more than 1 min.
 */
// @req REQ-042
export const revalidate = 60;

interface PageParams {
  lang: string;
  slug: string;
}

// @req REQ-042
// @req REQ-141
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const language = lang as Language;
  const detailCopy = reportsCopy[language].detail;
  const metadataCopy = {
    title: `${detailCopy.report} ${slug} — ${PRODUCT_NAME}`,
    description: detailCopy.metadataDescription,
  };
  return {
    title: metadataCopy.title,
    ...surfaceHead(
      lang as Language,
      "reports",
      (locale) => `${getStaticPageRoute(locale, "reports")}/${slug}`,
      metadataCopy
    ),
  };
}

// UTC, because the stamp is shown to whoever opens the public record and a
// moderation timeline must read the same from every time zone.
const FLAG_TIMESTAMP: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

function formatFlagTimestamp(language: Language, iso: string | null): string {
  if (!iso) return "—";
  return formatDate(language, new Date(iso), FLAG_TIMESTAMP);
}

// @req REQ-042
export default async function SignalementsSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang, slug } = await params;
  const language = lang as Language;
  const copy = reportsCopy[language].detail;
  const record = await getFlagBySlug(slug);

  if (!record) {
    notFound();
  }

  const { flag, contributor, assertion } = record;

  const contributorName = getContributorAttribution(contributor);

  const fieldPath = assertion?.field_path ?? flag.assertion_field_path;
  const snapshotQuote = assertion?.statement ?? null;

  return (
    <PageLayout
      language={language}
      title={`${copy.report} ${slug}`}
      sectionName={copy.sectionName}
      trailLabel={`${copy.report} ${slug}`}
    >
      <article
        className="container mx-auto max-w-3xl px-4 py-8 space-y-8"
        data-testid="signalement-page"
      >
        <header className="space-y-3 border-b pb-4">
          <h1 className="text-afh-h2 font-bold">
            {copy.report} {slug}
          </h1>
          <FlagPublicStatus
            status={flag.status}
            moderatorNotes={flag.moderator_notes}
          />
        </header>

        {/* Target */}
        <section className="space-y-2">
          <h2 className="text-afh-h3 font-semibold">{copy.targetTitle}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-afh-small">
            {flag.entity_type && (
              <>
                <dt className="text-muted-foreground">{copy.type}</dt>
                <dd data-testid="entity-type">{flag.entity_type}</dd>
              </>
            )}
            {flag.entity_id && (
              <>
                <dt className="text-muted-foreground">{copy.identifier}</dt>
                <dd data-testid="entity-id">{flag.entity_id}</dd>
              </>
            )}
            {fieldPath && (
              <>
                <dt className="text-muted-foreground">{copy.field}</dt>
                <dd data-testid="field-path">{fieldPath}</dd>
              </>
            )}
          </dl>
          {snapshotQuote && (
            <blockquote
              className="mt-3 border-l-4 border-muted pl-4 text-afh-small italic text-muted-foreground"
              data-testid="snapshot-quote"
            >
              {snapshotQuote}
            </blockquote>
          )}
        </section>

        {/* Flag details */}
        <section className="space-y-2">
          <h2 className="text-afh-h3 font-semibold">{copy.detailsTitle}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-afh-small">
            <dt className="text-muted-foreground">{copy.type}</dt>
            <dd data-testid="flag-kind">
              {{
                inaccurate: copy.kind.inaccurate,
                "missing-source": copy.kind.missingSource,
                "broken-url": copy.kind.brokenUrl,
                offensive: copy.kind.offensive,
                "correction-proposal": copy.kind.correctionProposal,
                other: copy.kind.other,
              }[flag.flag_kind] ?? flag.flag_kind}
            </dd>
          </dl>
          {flag.reason_text && (
            <p className="text-afh-small mt-2" data-testid="reason-text">
              {flag.reason_text}
            </p>
          )}
        </section>

        {/* Counter source */}
        {flag.counter_source_url && (
          <section className="space-y-2">
            <h2 className="text-afh-h3 font-semibold">{copy.counterSource}</h2>
            <a
              href={flag.counter_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-afh-small underline hover:no-underline break-all"
              data-testid="counter-source-url"
            >
              {flag.counter_source_url}
            </a>
            {flag.counter_source_citation && (
              <p
                className="text-afh-small text-muted-foreground"
                data-testid="counter-source-citation"
              >
                {flag.counter_source_citation}
              </p>
            )}
          </section>
        )}

        {/* Proposed rewrite */}
        {flag.proposed_rewrite && (
          <section className="space-y-2">
            <h2 className="text-afh-h3 font-semibold">
              {copy.proposedRewrite}
            </h2>
            <blockquote
              className="border-l-4 border-muted pl-4 text-afh-small italic"
              data-testid="proposed-rewrite"
            >
              {flag.proposed_rewrite}
            </blockquote>
          </section>
        )}

        {/* Timestamps + contributor */}
        <footer className="border-t pt-4 space-y-1 text-afh-small text-muted-foreground">
          <p>
            <span>{copy.reportedOn} </span>
            <time dateTime={flag.created_at} data-testid="created-at">
              {formatFlagTimestamp(language, flag.created_at)}
            </time>
          </p>
          {flag.resolved_at && (
            <p>
              <span>{copy.resolvedOn} </span>
              <time dateTime={flag.resolved_at} data-testid="resolved-at">
                {formatFlagTimestamp(language, flag.resolved_at)}
              </time>
            </p>
          )}
          <p data-testid="contributor-name">
            {copy.by} <span className="font-medium">{contributorName}</span>
          </p>
        </footer>
      </article>
    </PageLayout>
  );
}
