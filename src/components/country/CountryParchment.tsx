import { DossierLinks } from "@/components/dossiers/DossierLinks";
import type { ReactNode } from "react";

import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import { countryLanguageTiles } from "@/lib/fiche/languages";
import { PeoplesSection } from "@/components/country/PeoplesSection";
import { FicheSources } from "@/components/fiche/FicheSources";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  FicheSummaryBrief,
  type CountrySummaryFigures,
} from "@/components/fiche/FicheSummaryBrief";
import { FicheChronologyChapter } from "@/components/fiche/FicheChronologyChapter";
import { countryChronology } from "@/lib/fiche/chronology";
import { FicheAmendBand } from "@/components/fiche/FicheAmendBand";
import { FicheTile } from "@/components/fiche/FicheTile";
import { splitLeadSentence } from "@/lib/fiche/prose";
import { chapterAnchorId } from "@/lib/ficheChapters";
import type { ProvenanceState } from "@/lib/fieldProvenance";
import type { CountryPageData } from "@/lib/countryDataTransformer";
import type { LanguageReference } from "@/types/afrik";
import type { CountryDetail } from "@/types/afrik-frontend";
import type { Language } from "@/types/shared";
import { countryCopy } from "@/lib/i18n/copy/country";
import { ficheCopy } from "@/lib/i18n/copy/fiche";

/** The country chapters, ordered for reading after the globe. */

export interface CountryParchmentProps {
  data: CountryPageData;
  language: Language;
  country: CountryDetail;
  summaryFigures?: CountrySummaryFigures;
  languagesState?: ProvenanceState | "unavailable";
  hasSourceFlag?: boolean;
  /**
   * The languages the record shows — declared, or derived from its peoples by
   * the route. Absent, the record falls back to the ones it declares.
   */
  languages?: readonly LanguageReference[];
  /** Name and culture chapters supplied by CountryRecordView. */
  children?: ReactNode;
  /**
   * The way out of the fiche — `FicheOnward`, composed by the route.
   *
   * Its own slot rather than one more thing in `children`: the chapters that
   * arrive through `children` are the fiche's own, and this one is not about
   * the country at all. It also has to sit last among them, which `children`
   * cannot promise.
   *
   * A node rather than the links themselves, because the block reads relations
   * off awaited services. Resolved here instead, this parchment would become
   * async, and an async node in the fiche tree resolves every synchronous
   * render of it to an empty div — see `FicheJsonLd`.
   */
  onward?: ReactNode;
}

// @req REQ-115
export function CountryParchment({
  data,
  language,
  country,
  summaryFigures,
  languagesState,
  hasSourceFlag,
  languages,
  children,
  onward,
}: CountryParchmentProps) {
  const copy = countryCopy[language];
  const languageReferences = languages ?? country.culture?.mainLanguages ?? [];
  const hasPeoples =
    data.peoples.rows.length > 0 ||
    Boolean(data.peoples.totalPopulationFormatted);
  const chronology = countryChronology(country, language);
  const hasHistory =
    chronology.stations.length > 0 || Boolean(chronology.etymology);
  const figures: CountrySummaryFigures = summaryFigures ?? {
    population:
      country.demographics?.totalPopulation &&
      country.demographics.referenceYear
        ? {
            value: country.demographics.totalPopulation,
            referenceYear: country.demographics.referenceYear,
          }
        : null,
    peoples: country.demographics?.peoples?.length,
    languages: languageReferences.length || null,
  };

  return (
    <div className="afh-parchment" id="fiche">
      <section
        className="afh-parchment-section"
        data-fiche-section={copy.summary.title}
        id={chapterAnchorId(copy.summary.title)}
        aria-label={copy.summary.title}
      >
        <FicheSummaryBrief
          kind="country"
          entityId={country.id}
          name={country.nameCommonFr || country.nameFr}
          language={language}
          figures={figures}
        />
        {country.summary?.trim() ? (
          <FicheTile
            language={language}
            title={copy.summary.portrait}
            closedFact={splitLeadSentence(country.summary).lead}
            detailText={country.summary}
            bodyRestatesPreview
          >
            <p className="afh-tile-prose">{country.summary.trim()}</p>
          </FicheTile>
        ) : null}
      </section>

      <Section title={copy.sections.peoples}>
        {!hasPeoples ? (
          <FieldProvenanceMarker state="missing" language={language} />
        ) : (
          <PeoplesSection data={data.peoples} language={language} />
        )}
      </Section>

      <Section
        title={copy.sections.languages}
        note={
          languagesState === "derived" ? copy.languagesDerivedNote : undefined
        }
      >
        {languagesState === "unavailable" ? (
          <FieldProvenanceMarker
            state="documented-gap"
            reason={copy.languagesUnavailable}
            language={language}
          />
        ) : languageReferences.length > 0 ? (
          <FicheTileChapter
            tiles={countryLanguageTiles(languageReferences, language)}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>

      <Section title={copy.sections.history}>
        {hasHistory ? (
          <FicheChronologyChapter
            stations={chronology.stations}
            etymology={chronology.etymology}
            etymologyAnchorId={chapterAnchorId(copy.sections.nameAndHistory)}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
        <DossierLinks
          language={language}
          kind="country"
          id={country.id}
          section="etymology"
        />
      </Section>

      {children}

      {/* After the chapters, before the way onward: the reader who has just
          finished a thin chapter is the one who knows what is missing from
          it, and asking once they have gone is asking nobody. */}
      <FicheAmendBand language={language} />

      {/* Before the bibliography, not after it: the reader this block exists
          for is the one who finished the reading, and almost none of them
          scroll past a source list to find out what to read next. */}
      {onward}

      <Section
        title={copy.sections.sources}
        note={ficheCopy[language].sourceTierNote}
        as="footer"
        id="sources"
      >
        {data.sources.length > 0 ? (
          <FicheSources
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>
    </div>
  );
}
