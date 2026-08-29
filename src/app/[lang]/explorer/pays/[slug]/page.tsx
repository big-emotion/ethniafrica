import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import { getCountryRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import {
  getLatestEntityRevisionVersion,
  getRevisionSnapshot,
  type FrozenDoctrineReference,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheHeroBand } from "@/components/fiche/FicheHeroBand";
import { CountryRecordView } from "@/components/country/CountryRecordView";
import { CountrySynthesisBrief } from "@/components/fiche/CountrySynthesisBrief";
import { deriveCountrySynthesisFromDetail } from "@/lib/home/countrySynthesis";
import { buildCountryAtlasFacts } from "@/components/country/countryTargetFacts";
import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildCountryOutlineOverlay } from "@/lib/atlas/overlays";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";
import { getContinentPeopleCounts } from "@/api/v2/services/continentPeopleCounts";
import {
  getCountryById,
  getCountryIndex,
} from "@/api/v2/services/countryService";
import { mapCountryDetail } from "@/lib/afrikDetailMapper";
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

// @req REQ-091
export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  return ficheCanonical("country", lang as Language, slug);
}

interface PageSearchParams {
  fromPeopleName?: string;
  fromPeopleId?: string;
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

  return (
    <div data-testid="country-snapshot-view" className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-afh-h2 font-semibold">{nameFr}</h1>
        <p className="text-afh-small text-muted-foreground font-mono">
          {entityId}
        </p>
      </div>

      <PinnedVersionBanner
        pinnedAt={publishedAt}
        versionTag={String(version)}
        liveUrl={getCountryRoute(lang as Language, entityId)}
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

  const [country, sourceFlags, allCountries, peopleCounts] = await Promise.all([
    getCountryById(parsed.slug),
    getActiveSourceFlags("country", parsed.slug),
    getCountryIndex(),
    // The globe can now be aimed at any country, so the panel has to answer
    // for any country. A failed count costs the other countries' subtitle,
    // never the fiche.
    getContinentPeopleCounts().catch(() => ({}) as Record<string, number>),
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
  // alias in overlays.ts is what makes SSD find the shape filed as SDS.
  const pickerTargets = buildCountryPickerTargets(
    allCountries.map((entry) => entry.id)
  );

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
    <PageLayout language="fr" sectionName="Pays" hideHeader flushTop>
      <FicheSequence
        context={{ entityType: "country", payload: countryDetail }}
        recordPlacement="body"
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
            <CountrySynthesisBrief
              language="fr"
              synthesis={deriveCountrySynthesisFromDetail(countryDetail)}
            />
            <CountryRecordView
              country={countryDetail}
              hasSourceFlag={sourceFlags.length > 0}
              fromPeopleName={navigationContext.fromPeopleName}
              fromPeopleId={navigationContext.fromPeopleId}
            />
          </>
        }
      />
    </PageLayout>
  );
}
