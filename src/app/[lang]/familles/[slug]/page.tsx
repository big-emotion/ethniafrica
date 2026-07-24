import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { getLatestEntityRevisionVersion } from "@/api/v2/services/revisions";
import { createServerClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/PageLayout";
import { LanguageFamilyDetailView } from "@/components/detail/LanguageFamilyDetailView";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";

export const revalidate = 3600;

interface PageParams {
  lang: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Snapshot view (pinned URLs — data is immutable, read from revisions only)
// ---------------------------------------------------------------------------

interface FamilySnapshotViewProps {
  entityId: string;
  version: number;
  publishedAt: string | null;
  confidence: number | null;
  snapshotData: Record<string, unknown>;
  lang: string;
}

function FamilySnapshotFicheView({
  entityId,
  version,
  publishedAt,
  confidence,
  snapshotData,
  lang,
}: FamilySnapshotViewProps) {
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
    <div data-testid="family-snapshot-view" className="space-y-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="font-medium">Version archivée&nbsp;v{version}</span>
        {publishedLabel && (
          <span className="ml-2 text-amber-700">
            · publiée le {publishedLabel}
          </span>
        )}
        <span className="mx-2 text-amber-400">·</span>
        <a
          href={`/${lang}/familles/${entityId}`}
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
    </div>
  );
}

async function getFamilyRevisionSnapshot(
  entityId: string,
  version: number
): Promise<{
  data: Record<string, unknown>;
  version: number;
  published_at: string | null;
  confidence: number | null;
} | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("revisions")
    .select("version, snapshot_jsonb, published_at")
    .eq("entity_type", "language_family")
    .eq("entity_id", entityId)
    .eq("version", version)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load revision v${version} for ${entityId}: ${error.message}`
    );
  }

  if (!data) return null;

  const row = data as {
    version: number;
    snapshot_jsonb: Record<string, unknown>;
    published_at: string | null;
  };

  const confidence =
    typeof row.snapshot_jsonb?.confidence === "number"
      ? (row.snapshot_jsonb.confidence as number)
      : null;

  return {
    data: row.snapshot_jsonb,
    version: row.version,
    published_at: row.published_at,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FamillesSlugPage({
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
      "language_family",
      parsed.slug
    );
    if (!latestVersion) {
      notFound();
    }
    redirect(`/${lang}/familles/${parsed.slug}@v${latestVersion}`);
  }

  if (parsed.mode === "pinned") {
    const snapshot = await getFamilyRevisionSnapshot(
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
        sectionName="Familles linguistiques"
      >
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <FamilySnapshotFicheView
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
    <PageLayout
      language="fr"
      onLanguageChange={() => {}}
      sectionName="Familles linguistiques"
    >
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          }
        >
          <LanguageFamilyDetailView familyId={parsed.slug} language="fr" />
        </Suspense>
      </div>
    </PageLayout>
  );
}
