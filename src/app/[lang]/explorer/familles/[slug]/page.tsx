import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import { getFamilyRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import {
  getLatestEntityRevisionVersion,
  getRevisionSnapshot,
  type FrozenDoctrineReference,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheHeroBand } from "@/components/fiche/FicheHeroBand";
import { FamilyFicheTitle } from "@/components/family/FamilyFicheTitle";
import { FamilyFootprintLegend } from "@/components/family/FamilyFootprintLegend";
import { buildFamilyTargetFacts } from "@/components/family/familyTargetFacts";
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildFamilyFootprintOverlay } from "@/lib/atlas/overlays";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import { mapLanguageFamilyDetail } from "@/lib/afrikDetailMapper";
import { getLanguageFamilyById } from "@/api/v2/services/languageFamilyService";
import {
  getPeoplesByIds,
  getPeoplesByLanguageFamily,
} from "@/api/v2/services/peopleService";
import {
  declaredAssociatedPeopleIds,
  resolveFootprintProvenance,
} from "@/lib/familyFootprintSource";
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

// @req REQ-091
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  return ficheCanonical("family", lang as Language, slug);
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
        <h1 className="text-afh-h2 font-semibold">{nameFr}</h1>
        <p className="text-afh-small text-muted-foreground font-mono">
          {entityId}
        </p>
      </div>

      <PinnedVersionBanner
        pinnedAt={publishedAt}
        versionTag={String(version)}
        liveUrl={getFamilyRoute(lang as Language, entityId)}
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

      <div className="prose prose-neutral max-w-none text-afh-small text-muted-foreground">
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
    redirect(
      getFamilyRoute(lang as Language, `${parsed.slug}@v${latestVersion}`)
    );
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

  const [tree, familyMemberPeoples] = await Promise.all([
    getFamilyTreeSkeleton(parsed.slug),
    getPeoplesByLanguageFamily(parsed.slug),
  ]);

  // Afro-asiatique is a macro-family: its peoples all carry a sub-family's id
  // (Berbère, Tchadique, Couchitique, Sémitique), so the query above returns
  // nothing and the footprint would collapse to the missing-overlay
  // placeholder. The fiche's own `associatedPeoples` is the fallback, and
  // deliberately not the union of the sub-families — see
  // src/lib/familyFootprintSource.ts for why the wider area is the wrong one.
  const footprintProvenance = resolveFootprintProvenance(
    familyMemberPeoples.length
  );
  const memberPeoples =
    footprintProvenance === "member-peoples"
      ? familyMemberPeoples
      : await getPeoplesByIds(declaredAssociatedPeopleIds(family));

  // The tongue chapter is the only consumer of the tree skeleton since the
  // Classification chapter was withdrawn: it named a family → language → people
  // hierarchy the editorial model does not carry, so its language level was
  // deduplicated ISO codes rather than a declared classification.
  // Branches are keyed by ISO 639-3 because that is what TonguePanel sends back
  // to the tree/branch endpoint when a visitor expands one.
  const tongueBranches = tree?.branches.map((branch) => ({
    id: branch.iso639_3,
    name: branch.name,
    peopleCount: branch.peopleCount,
  }));

  // The globe's footprint is the union of currentCountries across the peoples
  // resolved above (REQ-116 AC4) — never family.distribution.distributionByCountry.
  //
  // Not because that field is empty: every FLG_*.json in dataset/source
  // declares one, and the recette database reads them all empty only because
  // the loader drops the field. It is passed over because it is too thin to be
  // a footprint — Afro-asiatique declares four countries where its peoples
  // reach twenty-one — and the charter (§4) asks the atlas to reconstruct the
  // area from the peoples rather than restate an under-declared one.
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
      footprintProvenance={footprintProvenance}
    />
  );

  // Live version (revalidate = 3600 at segment level)
  return (
    <PageLayout
      language="fr"
      sectionName="Familles linguistiques"
      hideHeader
      flushTop
      trailLabel={family.nameFr}
    >
      <FicheSequence
        context={{
          entityType: "language-family",
          payload: familyDetail,
          branches: tongueBranches,
        }}
        recordPlacement="body"
        title={<FamilyFicheTitle family={family} />}
        globe={
          <FicheHeroBand>
            <AtlasGlobe
              overlay={familyOverlay}
              targetPicker="list"
              facts={familyTargetFacts}
              legend={
                <FamilyFootprintLegend provenance={footprintProvenance} />
              }
              missingMessage={`Empreinte géographique non disponible pour ${familyDetail.nameFr}`}
            />
          </FicheHeroBand>
        }
        record={recordView}
      />
    </PageLayout>
  );
}
