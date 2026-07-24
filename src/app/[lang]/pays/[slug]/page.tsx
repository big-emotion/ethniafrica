import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import {
  getLatestEntityRevisionVersion,
  getRevisionSnapshot,
  type FrozenDoctrineReference,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { CountryDetailViewV2 } from "@/components/detail/CountryDetailViewV2";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import {
  DoctrineLinkCard,
  isDoctrineSlug,
} from "@/components/source-transparency/DoctrineLinkCard";

export const revalidate = 3600;

interface PageParams {
  lang: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Snapshot view (pinned URLs — data is immutable, read from revisions only)
// ---------------------------------------------------------------------------

interface CountrySnapshotViewProps {
  entityId: string;
  version: number;
  publishedAt: string | null;
  confidence: number | null;
  snapshotData: Record<string, unknown>;
  doctrine: FrozenDoctrineReference | null;
  lang: string;
}

function CountrySnapshotFicheView({
  entityId,
  version,
  publishedAt,
  confidence,
  snapshotData,
  doctrine,
  lang,
}: CountrySnapshotViewProps) {
  const nameFr =
    typeof snapshotData.name_fr === "string"
      ? snapshotData.name_fr
      : typeof snapshotData.nameFr === "string"
        ? snapshotData.nameFr
        : entityId;

  const publishedLabel = publishedAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(publishedAt)
      )
    : null;

  return (
    <div data-testid="country-snapshot-view" className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-medium">Version archivée&nbsp;v{version}</span>
        {publishedLabel && (
          <span className="ml-2 text-amber-700">
            · publiée le {publishedLabel}
          </span>
        )}
        <span className="mx-2 text-amber-400">·</span>
        <a
          href={`/${lang}/pays/${entityId}`}
          className="underline hover:no-underline"
        >
          Voir la version actuelle
        </a>
      </div>

      {confidence !== null && (
        <div className="px-1">
          <ConfidenceChip
            confidenceScore={confidence}
            sourceCount={null}
            lastHumanAuditAt={publishedAt}
            variant="hero"
          />
        </div>
      )}

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{nameFr}</h1>
        <p className="text-sm text-muted-foreground font-mono">{entityId}</p>
      </div>

      <div className="prose prose-neutral max-w-none text-sm text-muted-foreground">
        <p>
          Ce contenu est une capture archivée&nbsp;(v{version}) et ne sera
          jamais modifié.
        </p>
      </div>

      {doctrine && isDoctrineSlug(doctrine.slug) && (
        <DoctrineLinkCard slug={doctrine.slug} version={doctrine.version} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PaysSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang, slug } = await params;

  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  if (!parsed) {
    notFound();
  }

  if (parsed.mode === "latest") {
    const latestVersion = await getLatestEntityRevisionVersion(
      "country",
      parsed.slug
    );
    if (!latestVersion) {
      notFound();
    }
    redirect(`/${lang}/pays/${parsed.slug}@v${latestVersion}`);
  }

  if (parsed.mode === "pinned") {
    const snapshot = await getRevisionSnapshot(
      "country",
      parsed.slug,
      parsed.version
    );
    if (!snapshot) {
      notFound();
    }

    return (
      <PageLayout language="fr" onLanguageChange={() => {}} sectionName="Pays">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <CountrySnapshotFicheView
            entityId={parsed.slug}
            version={parsed.version}
            publishedAt={snapshot.published_at}
            confidence={snapshot.confidence}
            snapshotData={snapshot.data}
            doctrine={snapshot.doctrine}
            lang={lang}
          />
        </div>
      </PageLayout>
    );
  }

  // Live version (revalidate = 3600 at segment level)
  return (
    <PageLayout language="fr" onLanguageChange={() => {}} sectionName="Pays">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          }
        >
          <CountryDetailViewV2 countryId={parsed.slug} language="fr" />
        </Suspense>
      </div>
    </PageLayout>
  );
}
