import { Info } from "lucide-react";
import { DossierLinks } from "@/components/dossiers/DossierLinks";
import type { ReactNode } from "react";

import { LanguagesSection } from "@/components/country/LanguagesSection";
import { PeoplesSection } from "@/components/country/PeoplesSection";
import { SourcesFooter } from "@/components/country/SourcesFooter";
import { FicheSection as Section } from "@/components/fiche/FicheSection";
import { FieldProvenanceMarker } from "@/components/fiche/FieldProvenanceMarker";
import {
  FicheSummaryBrief,
  type CountrySummaryFigures,
} from "@/components/fiche/FicheSummaryBrief";
import { FicheTile } from "@/components/fiche/FicheTile";
import { chapterAnchorId } from "@/lib/ficheChapters";
import type { ProvenanceState } from "@/lib/fieldProvenance";
import type { CountryPageData } from "@/lib/countryDataTransformer";
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

function firstSentence(text: string): string {
  return text.match(/^.*?[.!?](?=\s|$)/u)?.[0] ?? text;
}

// @req REQ-115
export function CountryParchment({
  data,
  language,
  country,
  summaryFigures,
  languagesState,
  hasSourceFlag,
  children,
  onward,
}: CountryParchmentProps) {
  const copy = countryCopy[language];
  const etymology = country.etymology?.trim();
  const nameOriginActor = country.nameOriginActor?.trim();
  const hasPeoples =
    data.peoples.rows.length > 0 ||
    Boolean(data.peoples.totalPopulationFormatted);
  const hasHistory =
    data.kingdoms.cards.length > 0 ||
    Boolean(data.historicalFacts?.periods.length);
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
    languages: data.languages.bubbles.length || null,
  };
  const remainingFormerNames = (
    country.historicalNames?.formerNames ?? []
  ).filter((formerName) => {
    const normalized = formerName.toLocaleLowerCase(language);
    const withoutDates = normalized.replace(/\s*\([^)]*\)\s*$/u, "").trim();
    return !data.timeline.items.some(
      (item) =>
        item.name?.toLocaleLowerCase(language) === withoutDates ||
        item.prose?.toLocaleLowerCase(language).includes(normalized)
    );
  });
  const nameStations = [
    ...data.timeline.items.filter((item) => item.type !== "sovereign"),
    ...remainingFormerNames.map((name) => ({
      era: "—",
      name,
      prose: undefined,
    })),
    ...data.timeline.items.filter((item) => item.type === "sovereign"),
  ];

  return (
    <div className="afh-parchment" id="fiche">
      <section
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
        {country.summary?.trim() ? <p>{country.summary}</p> : null}
      </section>

      <Section title={copy.sections.peoples}>
        {!hasPeoples ? (
          <FieldProvenanceMarker state="missing" language={language} />
        ) : (
          <PeoplesSection data={data.peoples} language={language} />
        )}
      </Section>

      <Section title={copy.sections.nameAndHistory}>
        {etymology || nameOriginActor || nameStations.length > 0 ? (
          <>
            {etymology && <p>{etymology}</p>}
            {nameOriginActor && (
              <div className="afh-parchment-callout">
                <Info
                  className="afh-parchment-callout-icon"
                  aria-hidden="true"
                />
                {nameOriginActor}
              </div>
            )}
            {nameStations.length > 0 && (
              <ol className="afh-parchment-timeline afh-chronology-spine">
                {nameStations.map((item, index) => (
                  <li className="afh-tl-item" key={`${item.era}-${index}`}>
                    <span className="afh-tl-period">{item.era}</span>
                    <div>
                      {item.name ? <h3>{item.name}</h3> : null}
                      {item.prose ? <p>{item.prose}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </>
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
        ) : data.languages.bubbles.length > 0 ? (
          <LanguagesSection data={data.languages} language={language} />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>

      <Section title={copy.sections.history}>
        {hasHistory ? (
          <ol className="afh-parchment-timeline afh-chronology-spine">
            {data.kingdoms.cards.map((card) => (
              <li className="afh-tl-item" key={`${card.name}-${card.period}`}>
                <span className="afh-tl-period">{card.period ?? "—"}</span>
                {card.historicalRole || card.centers?.length ? (
                  <FicheTile
                    title={card.name}
                    closedFact={card.period ?? copy.historyDateMissing}
                  >
                    {card.historicalRole ? <p>{card.historicalRole}</p> : null}
                    {card.centers?.length ? (
                      <p>
                        {copy.generated.centers} · {card.centers.join(" · ")}
                      </p>
                    ) : null}
                  </FicheTile>
                ) : (
                  <h3>{card.name}</h3>
                )}
              </li>
            ))}
            {data.historicalFacts?.periods.map((period) => {
              const lead = firstSentence(period.content);
              const remainder = period.content.slice(lead.length).trim();
              return (
                <li
                  className="afh-tl-item afh-tl-item--fact"
                  key={period.label}
                >
                  {remainder ? (
                    <FicheTile title={period.label} closedFact={lead}>
                      <p>{remainder}</p>
                    </FicheTile>
                  ) : (
                    <div>
                      <h3>{period.label}</h3>
                      <p>{lead}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>

      {children}

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
          <SourcesFooter
            sources={data.sources}
            hasSourceFlag={hasSourceFlag}
            variant="parchment"
            language={language}
          />
        ) : (
          <FieldProvenanceMarker state="missing" language={language} />
        )}
      </Section>
    </div>
  );
}
