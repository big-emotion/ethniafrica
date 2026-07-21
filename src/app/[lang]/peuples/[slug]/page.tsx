import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import {
  getPeopleRevisionSnapshot,
  getLatestEntityRevisionVersion,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { PeopleDetailView } from "@/components/detail/PeopleDetailView";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";

export const revalidate = 3600;

interface PageParams {
  lang: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Snapshot view (pinned URLs — data is immutable, read from revisions only)
// ---------------------------------------------------------------------------

interface SnapshotViewProps {
  entityId: string;
  version: number;
  publishedAt: string | null;
  confidence: number | null;
  snapshotData: Record<string, unknown>;
  lang: string;
}

function SnapshotFicheView({
  entityId,
  version,
  publishedAt,
  confidence,
  snapshotData,
  lang,
}: SnapshotViewProps) {
  const nameMain =
    typeof snapshotData.nameMain === "string"
      ? snapshotData.nameMain
      : typeof snapshotData.name_main === "string"
        ? snapshotData.name_main
        : entityId;

  const publishedLabel = publishedAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(publishedAt)
      )
    : null;

  return (
    <div data-testid="people-snapshot-view" className="space-y-4">
      {/* Pinned-version banner */}
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-medium">Version archivée&nbsp;v{version}</span>
        {publishedLabel && (
          <span className="ml-2 text-amber-700">
            · publiée le {publishedLabel}
          </span>
        )}
        <span className="mx-2 text-amber-400">·</span>
        <a
          href={`/${lang}/peuples/${entityId}`}
          className="underline hover:no-underline"
        >
          Voir la version actuelle
        </a>
      </div>

      {/* Frozen confidence chip (AR14) */}
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

      {/* Snapshot content */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{nameMain}</h1>
        <p className="text-sm text-muted-foreground font-mono">{entityId}</p>
      </div>

      {/* "Version introuvable" copy is rendered by notFound() — this component
          is only reached when the version exists */}
      <div className="prose prose-neutral max-w-none text-sm text-muted-foreground">
        <p>
          Ce contenu est une capture archivée&nbsp;(v{version}) et ne sera
          jamais modifié.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PeoplesSlugPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { lang, slug } = await params;

  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  if (!parsed) {
    notFound();
  }

  // @latest → resolve max version, then redirect
  if (parsed.mode === "latest") {
    const latestVersion = await getLatestEntityRevisionVersion(
      "people",
      parsed.slug
    );
    if (!latestVersion) {
      notFound();
    }
    redirect(`/${lang}/peuples/${parsed.slug}@v${latestVersion}`);
  }

  // Pinned version
  if (parsed.mode === "pinned") {
    const snapshot = await getPeopleRevisionSnapshot(
      parsed.slug,
      parsed.version
    );
    if (!snapshot) {
      notFound();
    }

    return (
      <PageLayout
        language="fr"
        onLanguageChange={() => {}}
        sectionName="Peuples"
      >
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <SnapshotFicheView
            entityId={parsed.slug}
            version={parsed.version}
            publishedAt={snapshot.published_at}
            confidence={snapshot.confidence}
            snapshotData={snapshot.data}
            lang={lang}
          />
        </div>
      </PageLayout>
    );
  }

  // Live version (revalidate = 3600 at segment level)
  return (
    <PageLayout language="fr" onLanguageChange={() => {}} sectionName="Peuples">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          }
        >
          <PeopleDetailView peopleId={parsed.slug} language="fr" />
        </Suspense>
      </div>
    </PageLayout>
  );
}
