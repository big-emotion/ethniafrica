import type { ReactNode } from "react";

import { DossierLinks } from "@/components/dossiers/DossierLinks";
import { FlagTarget } from "@/components/flags/FlagTarget";
import type { PeopleDetail } from "@/types/afrik-frontend";
import {
  transformPeopleData,
  transformSourcedRelationsPreview,
} from "@/lib/peopleDataTransformer";
import {
  resolveAssociatedPeoples,
  type PeopleNameIndexEntry,
} from "@/lib/people/associatedPeopleLinks";
import type { SourcedRelation } from "@/types/relations";
import {
  PeopleHistoricalAffiliationBlock,
  PeopleCountriesSection,
} from "@/components/people";
import { FicheSources } from "@/components/fiche/FicheSources";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { PeopleNamingTiles } from "@/components/people/PeopleNamingTiles";
import { FicheChronologyChapter } from "@/components/fiche/FicheChronologyChapter";
import { peopleChronology } from "@/lib/fiche/chronology";
import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import { peopleLanguageTiles } from "@/lib/fiche/languages";
import { PeopleRelatedPeoplesSection } from "@/components/people/PeopleRelatedPeoplesSection";
import { peopleCultureTiles } from "@/lib/fiche/culture";
import { FicheNamesChapter } from "@/components/fiche/FicheNamesChapter";
import { PeopleFieldExplainer } from "@/components/people/PeopleFieldExplainer";
import { FicheAmendBand } from "@/components/fiche/FicheAmendBand";
import { FicheSection } from "@/components/fiche/FicheSection";
import { FicheSummaryBrief } from "@/components/fiche/FicheSummaryBrief";
import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import { FragmentationView } from "@/components/colonization/FragmentationView";
import { OralNarrativesSection } from "@/components/people/OralNarrativesSection";
import { MediaCreditSection } from "@/components/people/MediaCreditSection";
import { ExternalRegistryLinksSection } from "@/components/people/ExternalRegistryLinksSection";
import { PeopleNamesSection } from "@/components/names/PeopleNamesSection";
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
  /**
   * Every people the corpus holds a fiche for, by name, read by the route.
   *
   * The index rather than a resolved list, so the groups this fiche links can
   * only ever be derived from the `ethnicities` it already prints — a list
   * handed in from outside could disagree with the chapter's own gate. Absent,
   * every group resolves to nothing, which is the answer for 3735 of the
   * corpus's 4050 entries anyway and is rendered as the plain chip it was.
   */
  peopleNameIndex?: readonly PeopleNameIndexEntry[];
  resolvedFamilyName?: string;
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
 * A counted summary opens the document, followed immediately by the
 * geographic distribution. The map grammar and colonial-fragmentation
 * reading live inside that second chapter as optional tiles.
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
 * absence is not a silence. The globe's grammar tile explains a map that
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
  peopleNameIndex,
  resolvedFamilyName,
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
  const chronology = peopleChronology(data.origin, data.history, language);
  // Self excluded: a fiche whose own name appears among its groups would
  // otherwise offer the reader a link back to the page they are on.
  const associatedGroups = resolveAssociatedPeoples(
    data.relatedPeoples.ethnicities,
    peopleNameIndex ?? [],
    data.hero.peopleId
  );
  const languageTiles = peopleLanguageTiles(
    data.language,
    resolvedFamilyName ?? data.language.languageFamilyName,
    language
  );
  // The family comes from the record's affiliation, not from its languages
  // rubric: a named family beside an empty rubric still leaves a gap to mark.
  const languageRubricFilled = languageTiles.some(
    (tile) => tile.key !== "family"
  );
  const cultureTiles = peopleCultureTiles(
    {
      culture: data.culture,
      related: data.relatedPeoples,
      relationsWithNeighbors: data.history.relationsWithNeighbors,
      associatedGroups,
      relationNames: relationsPreview.map((relation) => relation.neighborName),
    },
    language
  );

  return (
    <div className="afh-parchment" id="fiche">
      <FicheSection title={copy.summary.title}>
        {/* The head and the trail moved above the globe (PeopleFicheTitle).
            The confidence chip did not go with them: it cites this document's
            sources and links to their footer, so it belongs inside the
            document that owns that anchor. It rides in the first chapter
            rather than above it, so the parchment has no child off the
            chapter ground. */}
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
        <FicheSummaryBrief
          kind="people"
          entityId={data.hero.peopleId}
          name={data.hero.nameMain}
          language={language}
          embedded
          figures={{
            persons:
              data.countries.totalPopulation > 0
                ? {
                    value: data.countries.totalPopulation,
                    referenceYear: data.countries.referenceYear,
                  }
                : null,
            countries: data.countries.distributions.length,
            // The summary names the language; its gloss stays in the chapter.
            mainLanguage: data.language.mainLanguage?.split(/\s+[—–]\s+/u)[0],
            family: resolvedFamilyName ?? data.hero.languageFamilyName,
            names: borneNames?.length ? borneNames.length : null,
          }}
        />
        {data.countries.discrepancy?.value && (
          <p className="mt-afh-sm text-afh-small" role="note">
            {copy.summary.populationDisagreement(
              new Intl.NumberFormat(language).format(
                data.countries.discrepancy.value.declaredTotal
              ),
              new Intl.NumberFormat(language).format(
                data.countries.discrepancy.value.summedTotal
              )
            )}
          </p>
        )}
      </FicheSection>

      <FicheSection
        title={copy.sections.distribution}
        note={
          data.countries.referenceYear
            ? copy.summary.referenceYear(data.countries.referenceYear)
            : undefined
        }
      >
        {data.countries.distributions.length > 0 ? (
          <div className="space-y-afh-md">
            <PeopleCountriesSection
              data={data.countries}
              language={language}
              fromPeopleId={data.hero.peopleId}
              fromPeopleName={data.hero.nameMain}
            />
            <FicheTiles>
              {distribution && distribution.length > 0 && (
                <FicheTile
                  language={language}
                  title={copy.sections.mapGrammar}
                  closedFact={copy.atlas.noBoundary}
                  detailText={copy.field.explanation(distribution.length)}
                >
                  <PeopleFieldExplainer
                    distribution={distribution}
                    language={language}
                  />
                </FicheTile>
              )}
              {fragmentation &&
                fragmentation.countryCount > 1 &&
                fragmentation.countries.length > 1 && (
                  <FicheTile
                    language={language}
                    title={copy.sections.fragmentation}
                    closedFact={copy.sections.fragmentationCount(
                      fragmentation.countryCount
                    )}
                    detailText={fragmentation.countries
                      .map((country) => country.iso3)
                      .join(", ")}
                  >
                    <FragmentationView
                      fragmentation={fragmentation}
                      variant="fiche-section"
                      language={language}
                    />
                  </FicheTile>
                )}
            </FicheTiles>
          </div>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>

      <FicheSection title={copy.sections.naming}>
        <PeopleNamingTiles
          nameMain={data.hero.nameMain}
          selfAppellation={people.appellations?.selfAppellation}
          exonyms={people.appellations?.exonyms}
          originOfExonyms={data.hero.originOfExonyms}
          whyProblematic={people.appellations?.whyProblematic}
          contemporaryUsage={data.hero.contemporaryUsage}
          isoCode={people.languages?.isoCodes?.[0]}
          language={language}
        />
        <PeopleNamesSection data={data.names} language={language} embedded />
        <DossierLinks
          language={language}
          kind="people"
          id={people.id}
          section="appellations"
        />
      </FicheSection>

      <FicheSection title={copy.sections.language}>
        {languageRubricFilled ? null : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
        {languageTiles.length > 0 ? (
          <FicheTileChapter
            tiles={languageTiles}
            notes={notes?.language}
            language={language}
          />
        ) : null}
      </FicheSection>

      <FicheSection title={copy.sections.historicalRole}>
        {chronology.length > 0 ? (
          <FicheChronologyChapter
            stations={chronology}
            notes={{ ...notes?.origin, ...notes?.history }}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
        {people.historicalAffiliation && (
          <PeopleHistoricalAffiliationBlock
            data={people.historicalAffiliation}
            language={language}
          />
        )}
        <DossierLinks
          kind="people"
          id={people.id}
          section="history"
          language={language}
        />
      </FicheSection>

      <FicheNamesChapter
        scope="people"
        names={borneNames}
        language={language}
      />

      <FicheSection title={copy.sections.culture}>
        <FicheTileChapter
          tiles={cultureTiles}
          notes={notes?.culture}
          extras={
            relationsPreview.length > 0
              ? {
                  relations: (
                    <PeopleRelatedPeoplesSection
                      data={{ ethnicities: [] }}
                      language={language}
                      peopleId={data.hero.peopleId}
                      relationsPreview={relationsPreview}
                      associatedGroups={[]}
                    />
                  ),
                }
              : undefined
          }
          language={language}
        />
        <OralNarrativesSection
          peopleId={data.hero.peopleId}
          language={language}
          embedded
        />
        <DossierLinks
          kind="people"
          id={people.id}
          section="culture"
          language={language}
        />
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

      {/* After the chapters, before the way onward: the reader who has just
          finished a thin chapter is the one who knows what is missing from
          it, and asking once they have gone is asking nobody. */}
      <FicheAmendBand language={language} />

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
        <MediaCreditSection
          peopleId={data.hero.peopleId}
          language={language}
          embedded
        />
        <ExternalRegistryLinksSection
          identifiers={people.externalIdentifiers}
          language={language}
          embedded
        />
        {sources.length > 0 ? (
          <FicheSources
            sources={[...sources]}
            hasSourceFlag={hasSourceFlag}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </FicheSection>
    </div>
  );
}
