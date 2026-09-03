import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";

import {
  isFicheKnownAbsent,
  loadPeopleFiche,
} from "@/lib/fiche/ficheExistence";
import { parseVersionedSlug } from "@/lib/versioned-slug";
import { ficheCanonical } from "@/lib/seo/ficheCanonical";
import { getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import {
  getPeopleRevisionSnapshot,
  getLatestEntityRevisionVersion,
} from "@/api/v2/services/revisions";
import { PageLayout } from "@/components/layout/PageLayout";
import { PeopleDetailViewV2 } from "@/components/people/PeopleDetailViewV2";
import { buildPeopleFicheNotes } from "@/components/people/peopleFicheNotes";
import { buildFicheSourceRegister } from "@/lib/fiche/ficheSourceRegister";
import { ficheSourceEntries } from "@/lib/afrik/ficheSourceLabel";
import { getFieldNotes } from "@/lib/supabase/queries/afrik/module-zero-batch";
import { FicheSequence } from "@/components/fiche/FicheSequence";
import { FicheSnapshotView } from "@/components/fiche/FicheSnapshotView";
import { FicheHeroHead } from "@/components/fiche/FicheHeroHead";
import { FicheHeroBand } from "@/components/fiche/FicheHeroBand";
import { PeopleFicheTitle } from "@/components/people/PeopleFicheTitle";
import { buildPeopleFieldOverlay } from "@/lib/atlas/overlays";
import { buildPeoplePresenceFacts } from "@/components/people/peoplePresenceFacts";
import { peopleFallbackNote } from "@/components/people/peopleFallbackNote";
import { getPeopleById } from "@/api/v2/services/peopleService";
import { getPeopleNamesDossier } from "@/api/v2/services/names";
import { getPatronymesBorneByPeople } from "@/api/v2/services/patronymeFicheLinks";
import { getPeopleFragmentation } from "@/api/v2/services/peopleFragmentation";
import { getEgoNetwork } from "@/api/v2/services/relations";
import { mapPeopleDetail } from "@/lib/afrikDetailMapper";
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
  // late to change the status. `generateMetadata` runs before the flush, and
  // `loadPeopleFiche` is request-cached so the page reuses this load.
  const parsedForExistence = parseVersionedSlug(decodeURIComponent(slug));
  if (
    parsedForExistence?.mode === "live" &&
    (await isFicheKnownAbsent(loadPeopleFiche, parsedForExistence.slug))
  ) {
    notFound();
  }
  return ficheCanonical("people", lang as Language, slug);
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
    redirect(
      getPeopleRoute(lang as Language, `${parsed.slug}@v${latestVersion}`)
    );
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
          <FicheSnapshotView
            kind="people"
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

  // The parchment's corpora are side-loaded alongside the fiche itself, so a
  // cold render does not pay for them one after the other even with
  // revalidate = 3600 amortising the cost.
  //
  // A people with no names dossier and a people confined to a single country
  // are ordinary states of the corpus, and both services signal them by
  // throwing. Each rejection is caught on its own promise so the degradation
  // stays local — an absent dossier must not also cost the fragmentation
  // section — and so an optional section can never turn the fiche into a 500.
  //
  // The narratives are not counted here: OralNarrativesSection fetches them
  // itself from the browser, and the count only ever existed to decide whether
  // the voices chapter got an anchor before hydration. The parchment has no
  // such chapter to gate.
  const [
    people,
    sourceFlags,
    namesDossier,
    fragmentation,
    egoNetwork,
    fieldNotes,
    borneNames,
  ] = await Promise.all([
    loadPeopleFiche(parsed.slug),
    getActiveSourceFlags("people", parsed.slug),
    getPeopleNamesDossier(parsed.slug).catch(() => null),
    getPeopleFragmentation(parsed.slug).catch(() => null),
    getEgoNetwork(parsed.slug),
    // Alongside its neighbours rather than after them, and caught like them:
    // the citation apparatus must never be able to cost the fiche.
    getFieldNotes("people", parsed.slug).catch(() => []),
    // Caught to `null` rather than to `[]`: an empty list is the corpus
    // saying this people carries no name, which is the ordinary answer and
    // one the chapter prints. A failed read must not be able to say that.
    getPatronymesBorneByPeople(parsed.slug).catch(() => null),
  ]);
  if (!people) {
    notFound();
  }

  const peopleDetail = mapPeopleDetail(people);

  /**
   * The fiche's bibliography, and the callouts that index it.
   *
   * The register is built from both lists — what the fiche declares and what
   * its assertions cite — because a callout must never point at an unnumbered
   * source, and a declared source must never disappear for want of a citation.
   */
  const register = buildFicheSourceRegister(
    ficheSourceEntries(people.content?.sources),
    fieldNotes.flatMap((note) => note.sources)
  );
  const notes = buildPeopleFicheNotes(fieldNotes, register.numberBySourceId);
  const peopleFieldOverlay = buildPeopleFieldOverlay(
    peopleDetail.demography?.distributionByCountry
  );

  // Live version (revalidate = 3600 at segment level)
  //
  // No container: the night band runs to both edges of the viewport and the
  // parchment carries its own reading measure, exactly as the mockup has it.
  // `flushTop` drops the shell's top padding so the band starts under the nav
  // rather than below a strip of page background.
  return (
    <PageLayout
      language="fr"
      sectionName="Peuples"
      flushTop
      trailLabel={peopleDetail.nameMain}
      heroHead={
        <FicheHeroHead entityType="people">
          <PeopleFicheTitle people={peopleDetail} />
        </FicheHeroHead>
      }
    >
      <FicheSequence
        entityType="people"
        entityId={parsed.slug}
        entityName={peopleDetail.nameMain}
        globe={
          <FicheHeroBand>
            <AtlasGlobe
              overlay={peopleFieldOverlay}
              missingMessage={`Répartition par pays non renseignée pour ${peopleDetail.nameMain}`}
              facts={buildPeoplePresenceFacts({
                peopleName: peopleDetail.nameMain,
                peopleId: parsed.slug,
                demography: peopleDetail.demography,
              })}
              fallbackNote={peopleFallbackNote(
                peopleDetail.nameMain,
                peopleFieldOverlay
              )}
              // Markers sit on the sphere, so a country that has rotated
              // behind it has no button to click. The list names every
              // presence country instead, at any count.
              targetPicker="list"
              wholeAreaLabel="Toute l'aire"
              areaNoun="présence"
              // The mockup's own caption. The default states what the globe
              // is; a people fiche has to state what it is *not* — the one
              // fiche of the three whose subject has no line to close.
              legend={
                <p
                  data-atlas-legend=""
                  className="pointer-events-none absolute inset-x-0 top-0 hidden max-w-[22ch] p-3 text-afh-caption min-[760px]:block"
                  style={{ color: "var(--afh-night-ink-3)" }}
                >
                  Aucune frontière ici.
                  <br />
                  Une présence, et sa densité.
                </p>
              }
            />
          </FicheHeroBand>
        }
        // The mockup has no reading gate: the parchment is the fiche, not a
        // chapter filed under it.
        record={
          // Server-rendered, from what this route already awaited. The view
          // it replaces fetched the same fiche, fragmentation and names
          // dossier again from the browser, which cost the page its server
          // rendering — and with it the axe audit and the Lighthouse score.
          <PeopleDetailViewV2
            people={peopleDetail}
            namesDossier={namesDossier}
            fragmentation={fragmentation}
            hasSourceFlag={sourceFlags.length > 0}
            relations={egoNetwork.sourced}
            notes={notes}
            borneNames={borneNames}
            // Only when something cites it: a bibliography numbered for
            // nobody promises an anchor that does not exist.
            bibliography={notes.count > 0 ? register.entries : undefined}
          />
        }
      />
    </PageLayout>
  );
}
