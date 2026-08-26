import { notFound, redirect } from "next/navigation";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import {
  getPeopleRevisionSnapshot,
  getLatestEntityRevisionVersion,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { PeopleDetailView } from "@/components/detail/PeopleDetailView";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildPeopleFieldOverlay } from "@/lib/atlas/overlays";
import { getPeopleById } from "@/api/v2/services/peopleService";
import { getPeopleNamesDossier } from "@/api/v2/services/names";
import { getPeopleFragmentation } from "@/api/v2/services/peopleFragmentation";
import { getEgoNetwork } from "@/api/v2/services/relations";
import { listPublicOralNarratives } from "@/api/v2/services/oralNarratives";
import { mapPeopleDetail } from "@/lib/afrikDetailMapper";
import { transformPeopleCountries } from "@/lib/peopleDataTransformer";
import { getActiveSourceFlags } from "@/lib/supabase/queries/afrik/flags";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { PinnedVersionBanner } from "@/components/source-transparency/PinnedVersionBanner";
import {
  DoctrineLinkCard,
  isDoctrineSlug,
} from "@/components/source-transparency/DoctrineLinkCard";

// @req REQ-019
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
  doctrine?: {
    slug: string;
    version: number;
  } | null;
  snapshotData: Record<string, unknown>;
  lang: string;
}

function SnapshotFicheView({
  entityId,
  version,
  publishedAt,
  confidence,
  doctrine,
  snapshotData,
  lang,
}: SnapshotViewProps) {
  const nameMain =
    typeof snapshotData.nameMain === "string"
      ? snapshotData.nameMain
      : typeof snapshotData.name_main === "string"
        ? snapshotData.name_main
        : entityId;

  return (
    <div data-testid="people-snapshot-view" className="space-y-4">
      {/* Snapshot content */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{nameMain}</h1>
        <p className="text-sm text-muted-foreground font-mono">{entityId}</p>
      </div>

      <PinnedVersionBanner
        pinnedAt={publishedAt}
        versionTag={String(version)}
        liveUrl={`/${lang}/peuples/${entityId}`}
      />

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

      {/* "Version introuvable" copy is rendered by notFound() — this component
          is only reached when the version exists */}
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

// @req REQ-019
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
      <PageLayout language="fr" sectionName="Peuples">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <SnapshotFicheView
            entityId={parsed.slug}
            version={parsed.version}
            publishedAt={snapshot.published_at}
            confidence={snapshot.confidence}
            doctrine={snapshot.doctrine}
            snapshotData={snapshot.data}
            lang={lang}
          />
        </div>
      </PageLayout>
    );
  }

  // Panel corpora are side-loaded alongside the fiche itself: they feed
  // optional chapters, so a cold render must not pay for them one after the
  // other even with revalidate = 3600 amortising the cost.
  //
  // A people with no names dossier and a people confined to a single country
  // are ordinary states of the corpus, and both services signal them by
  // throwing. Each rejection is caught on its own promise so the degradation
  // stays local — an absent dossier must not also cost the fragmentation
  // chapter — and so an optional chapter can never turn the fiche into a 500.
  const [people, sourceFlags, namesDossier, fragmentation, egoNetwork, voices] =
    await Promise.all([
      getPeopleById(parsed.slug),
      getActiveSourceFlags("people", parsed.slug),
      getPeopleNamesDossier(parsed.slug).catch(() => null),
      getPeopleFragmentation(parsed.slug).catch(() => null),
      getEgoNetwork(parsed.slug),
      // Only the count matters here — VoicesPanel refetches the narratives
      // client-side to render them. Asking for one row is what lets the
      // sequence decide the chapter's existence before the anchor is stamped.
      listPublicOralNarratives({
        entityType: "people",
        entityId: parsed.slug,
        page: 1,
        perPage: 1,
      }).catch(() => null),
    ]);
  if (!people) {
    notFound();
  }

  const peopleDetail = mapPeopleDetail(people);

  // Live version (revalidate = 3600 at segment level)
  return (
    <PageLayout language="fr" sectionName="Peuples">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <FicheSequence
          context={{
            entityType: "people",
            payload: peopleDetail,
            namesDossier,
            distributions: transformPeopleCountries(peopleDetail.demography)
              .distributions,
            fragmentation,
            relations: egoNetwork.sourced,
            hasOralNarratives: (voices?.total ?? 0) > 0,
          }}
          globe={
            <AtlasGlobe
              overlay={buildPeopleFieldOverlay(
                peopleDetail.demography?.distributionByCountry
              )}
              missingMessage={`Répartition par pays non renseignée pour ${peopleDetail.nameMain}`}
            />
          }
          record={
            <PeopleDetailView
              peopleId={parsed.slug}
              language="fr"
              initialData={peopleDetail}
              initialSourceFlag={sourceFlags.length > 0}
            />
          }
        />
      </div>
    </PageLayout>
  );
}
