import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageLayout } from "@/components/layout/PageLayout";
import { FlagPublicStatus } from "@/components/flags/FlagPublicStatus";
import { getFlagBySlug } from "@/lib/supabase/queries/flags/getFlagBySlug";

/**
 * ISR: revalidate on every request in dev; in production the pg_notify →
 * Edge Function → /api/internal/revalidate pipeline handles on-demand
 * invalidation when a flag transitions state (Story 3.3 / ETNI-364).
 * The 60 s fallback ensures stale data is never served for more than 1 min.
 */
export const revalidate = 60;

interface PageParams {
  lang: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Signalement ${slug} — Africa History`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `Signalement ${slug} — Africa History`,
      description:
        "Consultation d'un signalement éditorial sur la plateforme Africa History.",
      type: "article",
    },
  };
}

function formatFrenchDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

const FLAG_KIND_LABELS: Record<string, string> = {
  inaccurate: "Information inexacte",
  "missing-source": "Source manquante",
  "broken-url": "URL brisée",
  offensive: "Contenu offensant",
  "correction-proposal": "Proposition de correction",
  other: "Autre",
};

export default async function SignalementsSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const record = await getFlagBySlug(slug);

  if (!record) {
    notFound();
  }

  const { flag, contributor, assertion } = record;

  const isPublicContributor = contributor?.public === true;
  const contributorName = isPublicContributor
    ? (contributor?.display_name ?? "contributeur anonyme")
    : "contributeur anonyme";

  const fieldPath = assertion?.field_path ?? flag.assertion_field_path;
  const snapshotQuote = assertion?.statement ?? null;

  return (
    <PageLayout
      language="fr"
      onLanguageChange={() => {}}
      title={`Signalement ${slug}`}
      sectionName="Signalements"
    >
      <article
        className="container mx-auto max-w-3xl px-4 py-8 space-y-8"
        data-testid="signalement-page"
      >
        <header className="space-y-3 border-b pb-4">
          <h1 className="text-2xl font-bold">Signalement {slug}</h1>
          <FlagPublicStatus
            status={flag.status}
            moderatorNotes={flag.moderator_notes}
          />
        </header>

        {/* Target */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Entité concernée</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {flag.entity_type && (
              <>
                <dt className="text-muted-foreground">Type</dt>
                <dd data-testid="entity-type">{flag.entity_type}</dd>
              </>
            )}
            {flag.entity_id && (
              <>
                <dt className="text-muted-foreground">Identifiant</dt>
                <dd data-testid="entity-id">{flag.entity_id}</dd>
              </>
            )}
            {fieldPath && (
              <>
                <dt className="text-muted-foreground">Champ</dt>
                <dd data-testid="field-path">{fieldPath}</dd>
              </>
            )}
          </dl>
          {snapshotQuote && (
            <blockquote
              className="mt-3 border-l-4 border-muted pl-4 text-sm italic text-muted-foreground"
              data-testid="snapshot-quote"
            >
              {snapshotQuote}
            </blockquote>
          )}
        </section>

        {/* Flag details */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Détails du signalement</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd data-testid="flag-kind">
              {FLAG_KIND_LABELS[flag.flag_kind] ?? flag.flag_kind}
            </dd>
          </dl>
          {flag.reason_text && (
            <p className="text-sm mt-2" data-testid="reason-text">
              {flag.reason_text}
            </p>
          )}
        </section>

        {/* Counter source */}
        {flag.counter_source_url && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Source contradictoire</h2>
            <a
              href={flag.counter_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline hover:no-underline break-all"
              data-testid="counter-source-url"
            >
              {flag.counter_source_url}
            </a>
            {flag.counter_source_citation && (
              <p
                className="text-sm text-muted-foreground"
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
            <h2 className="text-lg font-semibold">Proposition de réécriture</h2>
            <blockquote
              className="border-l-4 border-muted pl-4 text-sm italic"
              data-testid="proposed-rewrite"
            >
              {flag.proposed_rewrite}
            </blockquote>
          </section>
        )}

        {/* Timestamps + contributor */}
        <footer className="border-t pt-4 space-y-1 text-sm text-muted-foreground">
          <p>
            <span>Signalé le </span>
            <time dateTime={flag.created_at} data-testid="created-at">
              {formatFrenchDate(flag.created_at)}
            </time>
          </p>
          {flag.resolved_at && (
            <p>
              <span>Résolu le </span>
              <time dateTime={flag.resolved_at} data-testid="resolved-at">
                {formatFrenchDate(flag.resolved_at)}
              </time>
            </p>
          )}
          <p data-testid="contributor-name">
            Par <span className="font-medium">{contributorName}</span>
          </p>
        </footer>
      </article>
    </PageLayout>
  );
}
