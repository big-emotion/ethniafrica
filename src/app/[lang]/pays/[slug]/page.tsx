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
import { CountryRecordView } from "@/components/country/CountryRecordView";
import { CountryPicker } from "@/components/country/CountryPicker";
import { buildCountryTargetFacts } from "@/components/country/countryTargetFacts";
import { flagFromISO3 } from "@/lib/countryDataTransformer";
import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { buildCountryOutlineOverlay } from "@/lib/atlas/overlays";
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
        <h1 className="text-2xl font-semibold">{nameFr}</h1>
        <p className="text-sm text-muted-foreground font-mono">{entityId}</p>
      </div>

      <PinnedVersionBanner
        pinnedAt={publishedAt}
        versionTag={String(version)}
        liveUrl={`/${lang}/pays/${entityId}`}
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

  const [country, sourceFlags, allCountries] = await Promise.all([
    getCountryById(parsed.slug),
    getActiveSourceFlags("country", parsed.slug),
    getCountryIndex(),
  ]);
  if (!country) {
    notFound();
  }

  const navigationContext = (await searchParams) ?? {};
  const countryDetail = mapCountryDetail(country);

  // From the corpus, never from the admin-0 asset: the two sets do not
  // coincide, so a geometry-fed list would offer dead ends and hide the six
  // countries that have a fiche but no outline.
  const pickerCountries = allCountries
    .map((entry) => ({
      id: entry.id,
      nameFr: entry.nameFr,
      flag: flagFromISO3(entry.id),
    }))
    .sort((first, second) => first.nameFr.localeCompare(second.nameFr, "fr"));

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
    <PageLayout language="fr" sectionName="Pays" flushTop>
      <FicheSequence
        context={{ entityType: "country", payload: countryDetail }}
        recordPlacement="body"
        globe={
          // The band is the measure inside itself: the picker's own container
          // would have parked it off-centre against a globe that now reaches
          // both edges of the viewport.
          <FicheHeroBand>
            {/* afh-on-night rebinds the ink and surface tokens for this
                subtree, so the picker reads on the band the same way the
                home's hero reads on its own night. Sharing that rule is what
                keeps the two from drifting into different nights. */}
            <div className="afh-on-night flex w-full justify-end px-4 pt-4">
              <CountryPicker
                countries={pickerCountries}
                currentCountryId={countryDetail.id}
              />
            </div>
            <AtlasGlobe
              overlay={buildCountryOutlineOverlay(countryDetail.id)}
              facts={buildCountryTargetFacts(countryDetail)}
              missingMessage={`Contour non disponible pour ${countryDetail.nameFr}`}
            />
          </FicheHeroBand>
        }
        record={
          <CountryRecordView
            country={countryDetail}
            hasSourceFlag={sourceFlags.length > 0}
            fromPeopleName={navigationContext.fromPeopleName}
            fromPeopleId={navigationContext.fromPeopleId}
          />
        }
      />
    </PageLayout>
  );
}
