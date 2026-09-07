import type { ReactNode } from "react";

import { DossierLinks } from "@/components/dossiers/DossierLinks";
import { FlagTarget } from "@/components/flags/FlagTarget";
import type { PeopleDetail } from "@/types/afrik-frontend";
import {
  hasCultureContent,
  hasOriginContent,
  hasRelatedContent,
  transformPeopleData,
  transformSourcedRelationsPreview,
} from "@/lib/peopleDataTransformer";
import type { SourcedRelation } from "@/types/relations";
import {
  PeopleOriginBlock,
  PeopleLanguageSection,
  PeopleHistoricalAffiliationBlock,
  PeopleHistoryTimeline,
  PeopleCultureGrid,
  PeopleRelatedPeoplesSection,
  PeopleCountriesSection,
} from "@/components/people";
// One sources footer for the three fiches. It lives under country/ for
// historical reasons only — it takes FicheSourceEntry[] and knows nothing
// about countries.
import { SourcesFooter } from "@/components/country/SourcesFooter";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { PeopleNamingBlock } from "@/components/people/PeopleNamingBlock";
import { PeopleFieldExplainer } from "@/components/people/PeopleFieldExplainer";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FragmentationView } from "@/components/colonization/FragmentationView";
import { OralNarrativesSection } from "@/components/people/OralNarrativesSection";
import { MediaCreditSection } from "@/components/people/MediaCreditSection";
import { ExternalRegistryLinksSection } from "@/components/people/ExternalRegistryLinksSection";
import { PeopleNamesSection } from "@/components/names/PeopleNamesSection";
import { PeopleBorneNamesSection } from "@/components/patronymes/PeopleBorneNamesSection";
import type { PatronymeLinkSummary } from "@/api/v2/services/patronymeFicheLinks";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";
import type { PeopleFicheNotes } from "@/components/people/peopleFicheNotes";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";
import type { Language } from "@/types/shared";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { ficheCopy } from "@/lib/i18n/copy/fiche";

export interface PeopleDetailViewV2Props {
  people: PeopleDetail;
  language: Language;
  namesDossier?: PeopleNamesDossier | null;
  fragmentation?: PeopleFragmentation | null;
  /** An open flag on this fiche's sourcing, resolved by the route. */
  hasSourceFlag?: boolean;
  /**
   * The fiche's sourced ego network, awaited by the route.
   *
   * The parchment is the fiche's only relations surface now that the panel
   * sequence no longer runs above it, so the neighbours section reads from
   * here instead of standing empty.
   */
  relations?: readonly SourcedRelation[];
  /**
   * The fiche's note callouts and its numbered bibliography, resolved by the
   * route. Absent, the fiche renders exactly as it did before callouts
   * existed — which is what a fiche the corpus has not sourced must do.
   */
  notes?: PeopleFicheNotes;
  bibliography?: readonly FicheSourceEntry[];
  /**
   * The names this people bears (REQ-133), resolved by the route. `null` says
   * the read failed; an empty array says the corpus holds none, which is the
   * ordinary answer today and is printed as such.
   */
  borneNames?: PatronymeLinkSummary[] | null;
  /**
   * The way out of the fiche — `FicheOnward`, composed by the route.
   *
   * A node rather than the links themselves, because the block reads relations
   * off awaited services. Resolved here instead, this parchment would become
   * async, and an async node in the fiche tree resolves every synchronous
   * render of it to an empty div — the failure `FicheJsonLd` records costing
   * thirty-three tests across five files, none of whose messages named it.
   */
  onward?: ReactNode;
}

/**
 * The people fiche's parchment — the prose half of the page, under the globe.
 *
 * It is a **server component**, fed by the route. It used to be a client one
 * that fetched its own fiche, fragmentation, names dossier and relations from
 * the browser, which cost the page its server rendering — and with it the axe
 * audit and the Lighthouse score, on a fiche that is measured on both. The
 * route already awaits every one of those, so the fetching was duplicated as
 * well as costly.
 *
 * Two sections open it, in the mockup's order, before any figure:
 *   1. "Le nom porté, les noms subis" — the fiche's editorial position.
 *   2. "Pourquoi la carte ne trace pas de frontière" — the grammar of the
 *      globe above, in the reader's terms, plus the legend for it.
 *
 * The relations preview is fed by the route, from the ego network it already
 * awaited. It briefly stood empty here while FicheSequence's links panel was
 * the fiche's relations surface; that panel no longer runs above the
 * parchment, so this is the surface.
 *
 * **Charter §4, and where it stops.** Every chapter answering a rubric of
 * `modele-peuple.json` — origines, langues, rôle historique, culture,
 * organisation, démographie, sources — is printed whether or not the corpus
 * fills it, and an unfilled one carries `FieldProvenanceMarker`: the corpus
 * being silent about a people's origins is a fact about the corpus, and
 * dropping the chapter is what deletes that fact.
 *
 * Three things on this page deliberately stay conditional, because their
 * absence is not a silence. The globe's grammar section explains a map that
 * a fiche with no distribution does not draw, colonial fragmentation only
 * exists where a people straddles a border, and filiation historique
 * (REQ-127) only applies to a people with no defensible linguistic-family
 * affiliation to an African family. None of these is a rubric anyone failed
 * to fill, and marking them would invent a gap. The same line holds one
 * level down: an optional field inside a block — an exonym, a
 * `whyProblematic` — stays absent, because the model never asked every
 * fiche for one.
 */
// @req REQ-091
export function PeopleDetailViewV2({
  people,
  language,
  namesDossier = null,
  fragmentation = null,
  hasSourceFlag = false,
  relations = [],
  notes,
  bibliography,
  borneNames = null,
  onward,
}: PeopleDetailViewV2Props) {
  const copy = peopleCopy[language];
  const data = transformPeopleData(people, namesDossier);
  /**
   * The numbered bibliography when the route resolved one, the fiche's own
   * declared list otherwise. A fiche the corpus has not sourced keeps the
   * unnumbered footer it has always had — numbering a list nothing points at
   * would promise an anchor that does not exist.
   */
  const sources = bibliography ?? data.sources;
  const distribution = people.demography?.distributionByCountry;
  const relationsPreview = transformSourcedRelationsPreview(relations);

  return (
    <div className="afh-parchment" id="fiche">
      {/* The head and the trail moved above the globe (PeopleFicheTitle), so
          a reader arriving on the fiche is told which fiche it is before the
          band fills their screen.

          The confidence chip did not go with them: it cites this document's
          sources and links to their footer, so it belongs inside the document
          that owns that anchor rather than in the band above it. */}
      <div className="afh-parchment-confidence">
        <ConfidenceChip
          language={language}
          confidenceScore={null}
          sourceCount={data.sources.length || null}
          lastHumanAuditAt={null}
          variant="hero"
          id={data.hero.peopleId}
          ariaSuffix={copy.ficheHead.sourceAria(data.hero.nameMain)}
        />
      </div>

      {/* 1. The name borne, the names imposed — first, before any figure. */}
      <FicheSection title={copy.sections.naming}>
        <PeopleNamingBlock
          nameMain={data.hero.nameMain}
          selfAppellation={people.appellations?.selfAppellation}
          exonyms={people.appellations?.exonyms}
          originOfExonyms={data.hero.originOfExonyms}
          whyProblematic={people.appellations?.whyProblematic}
          contemporaryUsage={data.hero.contemporaryUsage}
          isoCode={people.languages?.isoCodes?.[0]}
          language={language}
        />
        <DossierLinks
          language={language}
          kind="people"
          id={people.id}
          section="appellations"
        />
      </FicheSection>

      {/* 2. Why the map draws no border — the globe's grammar, in prose. */}
      {distribution && distribution.length > 0 && (
        <FicheSection
          title={copy.sections.mapGrammar}
          note={copy.sections.mapDerivation}
        >
          <PeopleFieldExplainer
            distribution={distribution}
            language={language}
          />
        </FicheSection>
      )}

      <FicheSection title={copy.sections.origins}>
        {hasOriginContent(data.origin) ? (
          <PeopleOriginBlock
            data={data.origin}
            notes={notes?.origin}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      <FicheSection title={copy.sections.language}>
        {data.language.mainLanguage ||
        data.language.isoCodes.length > 0 ||
        data.language.dialects.length > 0 ||
        data.language.vehicularRole ? (
          <PeopleLanguageSection
            data={data.language}
            notes={notes?.language}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      {/* Filiation historique (REQ-127) — only for a people with no
          defensible linguistic-family affiliation to an African family
          (e.g. Creole-speaking groups). Not a rubric of the fiche model but
          a reading that only exists where that condition holds, so its
          absence is inapplicability, not a corpus gap, and it carries no
          missing marker — same doctrine as the globe's grammar section and
          colonial fragmentation below. */}
      {people.historicalAffiliation && (
        <FicheSection title={copy.sections.historicalAffiliation}>
          <PeopleHistoricalAffiliationBlock
            data={people.historicalAffiliation}
            language={language}
          />
        </FicheSection>
      )}

      <FicheSection title={copy.sections.historicalRole}>
        {data.history.kingdomsOrChiefdoms ||
        data.history.relationsWithNeighbors ||
        data.history.conflictsOrAlliances ||
        data.history.diaspora ? (
          <PeopleHistoryTimeline
            data={data.history}
            notes={notes?.history}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
        <DossierLinks
          kind="people"
          id={people.id}
          section="history"
          language={language}
        />
      </FicheSection>

      <OralNarrativesSection
        peopleId={data.hero.peopleId}
        language={language}
      />

      <MediaCreditSection peopleId={data.hero.peopleId} language={language} />

      <ExternalRegistryLinksSection
        identifiers={people.externalIdentifiers}
        language={language}
      />

      {/* Noms & appellations (below the fold; chips hydrate second-wave, UX-DR18) */}
      <PeopleNamesSection data={data.names} language={language} />

      {/* The second naming register, next to the first: the chapter above
          holds what this people is *called* — its ethnonyms, and the exonyms
          imposed on it — and this one what its members *bear*. Reading them
          apart is how "nom" came to mean two unrelated things in this
          codebase; on the page they answer each other. */}
      <PeopleBorneNamesSection patronymes={borneNames} language={language} />

      <FicheSection title={copy.sections.culture}>
        {hasCultureContent(data.culture) ? (
          <PeopleCultureGrid
            data={data.culture}
            notes={notes?.culture}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
        <DossierLinks
          kind="people"
          id={people.id}
          section="culture"
          language={language}
        />
        {/* The same report control the country fiche's culture section
            carries. It used to live only on the legacy tabbed people view;
            retiring that view without moving it here would have taken the
            people half of the requirement with it. It stays whether or not
            the rubric is filled — an empty culture section is exactly the one
            a reader has something to say about. */}
        <div data-testid="section-flag-target-culture" className="mt-3">
          <FlagTarget
            language={language}
            target={{
              type: "fiche_section",
              id: people.id,
              fieldPath: "culture",
            }}
            triggerLabel={copy.reportSection}
            className="w-auto text-afh-caption"
          />
        </div>
      </FicheSection>

      <FicheSection title={copy.sections.neighbours}>
        {hasRelatedContent(data.relatedPeoples) ||
        relationsPreview.length > 0 ? (
          <PeopleRelatedPeoplesSection
            data={data.relatedPeoples}
            language={language}
            peopleId={data.hero.peopleId}
            relationsPreview={relationsPreview}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      <FicheSection
        title={copy.sections.distribution}
        note={copy.sections.referenceYear}
      >
        {data.countries.distributions.length > 0 ? (
          <PeopleCountriesSection
            data={data.countries}
            language={language}
            fromPeopleId={data.hero.peopleId}
            fromPeopleName={data.hero.nameMain}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      {/* Fragmentation coloniale (FR85) — absent below 2 countries.
          Not a rubric of the fiche model but a reading that only exists where
          a people straddles a border, so its absence is inapplicability, not
          a gap in the corpus, and it carries no missing marker. */}
      {fragmentation && (
        <FicheSection
          title={copy.sections.fragmentation}
          note={copy.sections.fragmentationNote}
        >
          <FragmentationView
            fragmentation={fragmentation}
            variant="fiche-section"
            language={language}
          />
        </FicheSection>
      )}

      {/* The way out sits before the bibliography, not after it. The reader
          this block exists for is the one who finished the reading, and
          almost none of them scroll past a source list to find out what to
          read next. */}
      {onward}

      {/* Deep links across the app point at #sources; until now the only such
          anchor in the tree belonged to the family fiche, so every citation
          chip on a people fiche resolved to nothing. */}
      <FicheSection
        title={copy.sections.sources}
        note={ficheCopy[language].sourceTierNote}
        as="footer"
        id="sources"
      >
        {sources.length > 0 ? (
          <SourcesFooter
            sources={[...sources]}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>
    </div>
  );
}
