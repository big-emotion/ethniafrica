import { notFound, redirect } from "next/navigation";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import {
  getLatestEntityRevisionVersion,
  getRevisionSnapshot,
  type FrozenDoctrineReference,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheHeroBand } from "@/components/fiche/FicheHeroBand";
import { FamilyFootprintLegend } from "@/components/family/FamilyFootprintLegend";
import { buildFamilyTargetFacts } from "@/components/family/familyTargetFacts";
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
import { FamilyClassificationTreeSection } from "@/components/family/FamilyClassificationTreeSection";
import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildFamilyFootprintOverlay } from "@/lib/atlas/overlays";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import { mapLanguageFamilyDetail } from "@/lib/afrikDetailMapper";
import { getLanguageFamilyById } from "@/api/v2/services/languageFamilyService";
import { getPeoplesByLanguageFamily } from "@/api/v2/services/peopleService";
import { getFamilyTreeSkeleton } from "@/api/v2/services/languageFamilyTreeService";
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

interface FamilySnapshotViewProps {
  entityId: string;
  version: number;
  publishedAt: string | null;
  confidence: number | null;
  snapshotData: Record<string, unknown>;
  doctrine: FrozenDoctrineReference | null;
  lang: string;
}

function FamilySnapshotFicheView({
  entityId,
  version,
  publishedAt,
  confidence,
  snapshotData,
  doctrine,
  lang,
}: FamilySnapshotViewProps) {
  const nameFr =
    typeof snapshotData.name_fr === "string"
      ? snapshotData.name_fr
      : typeof snapshotData.nameFr === "string"
        ? snapshotData.nameFr
        : entityId;

  return (
    <div data-testid="family-snapshot-view" className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{nameFr}</h1>
        <p className="text-sm text-muted-foreground font-mono">{entityId}</p>
      </div>

      <PinnedVersionBanner
        pinnedAt={publishedAt}
        versionTag={String(version)}
        liveUrl={`/${lang}/familles/${entityId}`}
      />

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
    const snapshot = await getRevisionSnapshot(
      "language_family",
      parsed.slug,
      parsed.version
    );
    if (!snapshot) {
      notFound();
    }

    return (
      <PageLayout language="fr" sectionName="Familles linguistiques">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <FamilySnapshotFicheView
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

  const family = await getLanguageFamilyById(parsed.slug);
  if (!family) {
    notFound();
  }

  const [tree, memberPeoples] = await Promise.all([
    getFamilyTreeSkeleton(parsed.slug),
    getPeoplesByLanguageFamily(parsed.slug),
  ]);

  // The tongue chapter reuses the tree the record chapter already renders — a
  // second fetch would cost a round trip to restate the same three queries.
  // Branches are keyed by ISO 639-3 because that is what TonguePanel sends back
  // to the tree/branch endpoint when a visitor expands one.
  const tongueBranches = tree?.branches.map((branch) => ({
    id: branch.iso639_3,
    name: branch.name,
    peopleCount: branch.peopleCount,
  }));

  // The globe's footprint is the union of currentCountries across every
  // member people (REQ-116 AC4) — never family.distribution.distributionByCountry,
  // which every FLG_*.json declares empty (atlas-charter §4).
  const familyDetail = mapLanguageFamilyDetail(family);
  const familyOverlay = buildFamilyFootprintOverlay(
    memberPeoples.map((person) => person.currentCountries),
    memberPeoples.length
  );

  // Which member peoples each country actually carries, so the panel can name
  // them rather than only counting them — a count a reader cannot check is a
  // number they have to take on trust, which is the opposite of the posture.
  const peopleNamesByCountry: Record<string, string[]> = {};
  for (const person of memberPeoples) {
    for (const countryId of new Set(person.currentCountries)) {
      (peopleNamesByCountry[countryId] ??= []).push(person.nameMain);
    }
  }

  // Precomputed here, on the server, and handed over as data. AtlasGlobe is a
  // client component: a resolver function cannot cross that boundary.
  const familyTargetFacts = buildFamilyTargetFacts({
    familyId: parsed.slug,
    familyNameFr: familyDetail.nameFr,
    memberPeopleCount: memberPeoples.length,
    peopleNamesByCountry,
    countryNamesFr: Object.fromEntries(
      (familyOverlay?.countries ?? []).map((country) => [
        country.countryId,
        AFRICA_ADMIN0[country.countryId]?.nameFr ?? country.countryId,
      ])
    ),
  });

  const recordView = (
    <LanguageFamilyDetailViewV2
      family={family}
      footprintCountries={familyOverlay?.countries ?? []}
      memberPeoples={memberPeoples}
      memberPeopleCount={memberPeoples.length}
      classificationTree={
        tree ? (
          <FamilyClassificationTreeSection familyId={parsed.slug} tree={tree} />
        ) : undefined
      }
    />
  );

  // Live version (revalidate = 3600 at segment level)
  return (
    <PageLayout language="fr" sectionName="Familles linguistiques" flushTop>
      <FicheSequence
        context={{
          entityType: "language-family",
          payload: familyDetail,
          branches: tongueBranches,
        }}
        globe={
          <FicheHeroBand>
            <AtlasGlobe
              overlay={familyOverlay}
              targetPicker="list"
              targetFactsById={familyTargetFacts}
              legend={<FamilyFootprintLegend />}
              missingMessage={`Empreinte géographique non disponible pour ${familyDetail.nameFr}`}
            />
          </FicheHeroBand>
        }
        record={recordView}
      />
    </PageLayout>
  );
}
