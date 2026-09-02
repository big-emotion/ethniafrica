import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";

import { loadCountryFiche } from "@/lib/fiche/ficheExistence";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import { getCountryRoute } from "@/lib/routing";
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
import { CountryFicheTitle } from "@/components/country/CountryFicheTitle";
import { CountryRecordView } from "@/components/country/CountryRecordView";
import { CountrySynthesisBrief } from "@/components/fiche/CountrySynthesisBrief";
import {
  compactCountryAtlasLanguages,
  deriveCountrySynthesisFromDetail,
} from "@/lib/home/countrySynthesis";
import { buildCountryAtlasFacts } from "@/components/country/countryTargetFacts";
import { buildCountryOutlineOverlay } from "@/lib/atlas/overlays";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import { getCountryAtlasIndex } from "@/api/v2/services/countryService";
import { getCountryPatronymes } from "@/api/v2/services/patronymeFicheLinks";
import { mapCountryDetail } from "@/lib/afrikDetailMapper";
import { getActiveSourceFlags } from "@/lib/supabase/queries/afrik/flags";

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
  // late to change the status. `generateMetadata` runs before the flush.
  // `loadCountryFiche` is request-cached, so the page's own load below reuses
  // this one rather than querying twice.
  const parsed = parseVersionedSlug(decodeURIComponent(slug));
  // Only the `live` mode is settled here. `latest` redirects and `pinned` reads
  // a revision snapshot, and both already resolve before the body streams
  // anything of their own.
  if (parsed?.mode === "live" && !(await loadCountryFiche(parsed.slug))) {
    notFound();
  }

  return ficheCanonical("country", lang as Language, slug);
}

interface PageSearchParams {
  fromPeopleName?: string;
  fromPeopleId?: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// @req REQ-019
export default async function PaysSlugPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<PageSearchParams>;
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
    redirect(
      getCountryRoute(lang as Language, `${parsed.slug}@v${latestVersion}`)
    );
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
      <PageLayout language="fr" sectionName="Pays">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <FicheSnapshotView
            kind="country"
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

  const [country, sourceFlags, countryAtlasIndex, peopleCounts, patronymes] =
    await Promise.all([
      loadCountryFiche(parsed.slug),
      getActiveSourceFlags("country", parsed.slug),
      getCountryAtlasIndex(),
      // The globe can now be aimed at any country, so the panel has to answer
      // for any country. A failed count costs the other countries' subtitle,
      // never the fiche.
      getContinentPeopleCounts().catch(() => ({}) as Record<string, number>),
      // Caught to `null` rather than to two empty lists: empty is the corpus
      // saying no name reaches this country, which the chapter prints as a
      // fact. A dropped query must not be able to make that claim.
      getCountryPatronymes(parsed.slug).catch(() => null),
    ]);
  if (!country) {
    notFound();
  }

  const navigationContext = (await searchParams) ?? {};
  const countryDetail = mapCountryDetail(country);

  // Ids from the corpus, geometry and name from the asset. The corpus decides
  // which countries have a fiche; the asset decides which can be drawn and
  // supplies the name people use - `nameFr` on a country fiche is the declared
  // one, which is how the picker came to spread one Algerian option over five
  // lines. Every corpus country resolves, South Sudan included: the ISO/asset
  // alias in overlays.ts is what makes SSD find the shape filed as SDS. The
  // atlas service returns only the compact fields that cross into the globe.
  const pickerTargets = buildCountryPickerTargets(
    countryAtlasIndex.map((entry) => entry.id)
  );
  const countryBriefs = Object.fromEntries(
    countryAtlasIndex.map(({ id, population, referenceYear, languages }) => [
      id,
      { population, referenceYear, languages },
    ])
  );
  const currentSynthesis = deriveCountrySynthesisFromDetail(countryDetail);

  // Prefer the current fiche over the parallel index so a cache boundary
  // cannot make the open country contradict itself.
  countryBriefs[countryDetail.id] = {
    population: countryDetail.demographics?.totalPopulation,
    referenceYear: countryDetail.demographics?.referenceYear,
    languages: compactCountryAtlasLanguages(currentSynthesis.languages),
  };

  // Live version (revalidate = 3600 at segment level).
  //
  // FicheSequence owns the whole composition, The Record included — the detail
  // view goes in as `record` and comes back already behind the reading gate.
  //
  // No `relations` is passed: the ego-network service is people-centred and no
  // country relation source exists, so the links chapter gates itself off. Most
  // other chapters resolve to nothing too — country counterparts of the
  // identity, territory, fragmentation and voices panels belong to stories
  // 15.3–15.8. That narrowness is the FR98 invariant, not a gap to fill here.
  return (
    <PageLayout
      language="fr"
      sectionName="Pays"
      flushTop
      trailLabel={countryDetail.nameFr}
      heroHead={
        <FicheHeroHead entityType="country">
          <CountryFicheTitle
            country={countryDetail}
            fromPeopleId={navigationContext.fromPeopleId}
            fromPeopleName={navigationContext.fromPeopleName}
          />
        </FicheHeroHead>
      }
    >
      <FicheSequence
        entityType="country"
        entityId={countryDetail.id}
        entityName={countryDetail.nameCommonFr || countryDetail.nameFr}
        globe={
          // The picker lives inside the globe now, which is what lets choosing
          // a country re-aim the camera instead of loading another fiche: the
          // camera belongs to AtlasGlobe, and a control outside it could only
          // ever navigate. It is also what centres it, against a globe that
          // reaches both edges of the viewport.
          <FicheHeroBand>
            <AtlasGlobe
              overlay={buildCountryOutlineOverlay(countryDetail.id)}
              targetPicker="list"
              pickerTargets={pickerTargets}
              areaNoun="l'atlas"
              // Clearing the choice puts the fiche's own country back under
              // the line, so the button says that rather than "toute
              // l'empreinte", which a country fiche does not have.
              wholeAreaLabel={`Revenir à ${countryDetail.nameCommonFr || countryDetail.nameFr}`}
              facts={buildCountryAtlasFacts({
                country: countryDetail,
                targets: pickerTargets,
                peopleCounts,
                countryBriefs,
              })}
              missingMessage={`Contour non disponible pour ${countryDetail.nameFr}`}
            />
          </FicheHeroBand>
        }
        record={
          <>
            {/* The chapô goes in through `record` rather than through a new
                FicheSequence slot: it is part of what the record says, and
                the sequence already knows where the record belongs. */}
            <CountrySynthesisBrief synthesis={currentSynthesis} />
            <CountryRecordView
              country={countryDetail}
              hasSourceFlag={sourceFlags.length > 0}
              fromPeopleName={navigationContext.fromPeopleName}
              fromPeopleId={navigationContext.fromPeopleId}
              patronymes={patronymes}
            />
          </>
        }
      />
    </PageLayout>
  );
}
