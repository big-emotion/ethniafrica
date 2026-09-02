import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";

import { loadLanguageFamilyFiche } from "@/lib/fiche/ficheExistence";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import { getFamilyRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import {
  getLatestEntityRevisionVersion,
  getRevisionSnapshot,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheSnapshotView } from "@/components/fiche/FicheSnapshotView";
import { FicheHeroHead } from "@/components/fiche/FicheHeroHead";
import { FicheHeroBand } from "@/components/fiche/FicheHeroBand";
import { FamilyFicheTitle } from "@/components/family/FamilyFicheTitle";
import { FamilyFootprintLegend } from "@/components/family/FamilyFootprintLegend";
import { buildFamilyTargetFacts } from "@/components/family/familyTargetFacts";
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
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

// @req REQ-019
export const revalidate = 3600;

/**
 * ETNI-1378/ETNI-1478 — statically importing AtlasGlobe put its whole client
 * bundle (marker placement, camera hooks, target picker, facts panel, SVG
 * fallback) into this page's own hydration task, which is what blew the
 * mobile Total Blocking Time budget on this route (2.9-3.7s against 300ms).
 * `dynamic()` code-splits it, the same mechanism the explorer hub already
 * uses (ExplorerContinent, FacetGlobeIsland) — `ssr: false` is not used here
 * because the globe is this fiche's hero and still has to reach first paint.
 */
const AtlasGlobe = dynamic(() =>
  import("@/components/atlas/AtlasGlobe").then((m) => m.AtlasGlobe)
);

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

  // The existence check lives here, not in the page body, because `loading.tsx`
  // makes this segment a Suspense boundary: the shell — and a `200` — is
  // flushed before the body runs, so the page's own `notFound()` arrives too
  // late to change the status. `generateMetadata` runs before the flush, and
  // `loadLanguageFamilyFiche` is request-cached so the page reuses this load.
  const parsedForExistence = parseVersionedSlug(decodeURIComponent(slug));
  if (
    parsedForExistence?.mode === "live" &&
    !(await loadLanguageFamilyFiche(parsedForExistence.slug))
  ) {
    {
      notFound();
    }
  }
  return ficheCanonical("family", lang as Language, slug);
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
          <FicheSnapshotView
            kind="languageFamily"
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

  const family = await loadLanguageFamilyFiche(parsed.slug);
  if (!family) {
    notFound();
  }

  const familyMemberPeoples = await getPeoplesByLanguageFamily(parsed.slug);

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
      flushTop
      trailLabel={family.nameFr}
      heroHead={
        <FicheHeroHead entityType="language-family">
          <FamilyFicheTitle family={family} />
        </FicheHeroHead>
      }
    >
      <FicheSequence
        entityType="language-family"
        entityId={parsed.slug}
        entityName={familyDetail.nameFr}
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
