import { FicheStatCard } from "@/components/fiche/FicheStatCard";
import { DID_YOU_KNOW_FACTS } from "@/lib/home/didYouKnowFacts";
import { localizeDidYouKnowFact } from "@/lib/home/didYouKnowLocalization";
import { anecdotesCopy } from "@/lib/i18n/copy/anecdotes";
import { countryCopy } from "@/lib/i18n/copy/country";
import { peopleCopy } from "@/lib/i18n/copy/people";
import { FALLBACK_LOCALE } from "@/lib/locale";
import type { Language } from "@/types/shared";

interface MeasuredPopulation {
  value: number;
  referenceYear?: number;
}

export interface CountrySummaryFigures {
  population?: MeasuredPopulation | null;
  peoples?: number | null;
  languages?: number | null;
  families?: number | null;
  names?: number | null;
}

export interface PeopleSummaryFigures {
  persons?: MeasuredPopulation | null;
  countries?: number | null;
  mainLanguage?: string | null;
  family?: string | null;
  names?: number | null;
}

type FicheSummaryBriefProps = {
  entityId: string;
  name: string;
  language?: Language;
  embedded?: boolean;
} & (
  | { kind: "country"; figures: CountrySummaryFigures }
  | { kind: "people"; figures: PeopleSummaryFigures }
);

/**
 * One counted figure of a record, with the words that go around it.
 *
 * `scope` is what the count covers when there is a count, and what is absent
 * when there is not — one line, two jobs, because a reader looking under a
 * figure for its reach is looking in the same place either way.
 */
interface CountedFigure {
  id: string;
  label: string;
  value: number | string | null;
  scope: string;
  emphasis: "lead" | "tile";
}

function measured(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function countryFigures(
  figures: CountrySummaryFigures,
  language: Language
): CountedFigure[] {
  const copy = countryCopy[language].summary;
  const words = copy.figures;
  const year = figures.population?.referenceYear;

  const counted = (
    id: keyof typeof words,
    value: number | null | undefined
  ): CountedFigure => {
    const count = measured(value);
    const entry = words[id];
    // Population states its reach as a year rather than a reach, so it is the
    // one count in the dictionary with no scope of its own.
    const reach = "scope" in entry ? entry.scope : "";
    return {
      id,
      label: entry.label,
      value: count,
      scope: count !== null ? reach : entry.absent,
      emphasis: "tile",
    };
  };

  const lead = counted("population", figures.population?.value);

  return [
    {
      ...lead,
      // The reference year is this figure's whole scope line: population is
      // the one count on the panel a reader can date, and an undated
      // population is a weaker claim than a dated one.
      scope:
        lead.value !== null && year ? copy.referenceYear(year) : lead.scope,
      emphasis: "lead",
    },
    counted("peoples", figures.peoples),
    counted("languages", figures.languages),
    counted("families", figures.families),
    counted("names", figures.names),
  ];
}

function peopleFigures(
  figures: PeopleSummaryFigures,
  language: Language
): CountedFigure[] {
  const copy = peopleCopy[language].summary;
  const persons = measured(figures.persons?.value);
  const year = figures.persons?.referenceYear;
  const tile = (
    id: string,
    label: string,
    value: number | string | null
  ): CountedFigure => ({
    id,
    label,
    value,
    scope: value === null ? copy.missingData : "",
    emphasis: "tile",
  });

  return [
    {
      id: "persons",
      label: copy.persons,
      value: persons,
      scope:
        persons === null
          ? copy.missingData
          : year
            ? copy.referenceYear(year)
            : "",
      emphasis: "lead",
    },
    tile("countries", copy.countriesOfPresence, measured(figures.countries)),
    tile(
      "mainLanguage",
      copy.mainLanguage,
      figures.mainLanguage?.trim() || null
    ),
    tile("family", copy.linguisticFamily, figures.family?.trim() || null),
    tile("names", copy.namesReferencedHere, measured(figures.names)),
  ];
}

/**
 * The summary that opens both records: one lead figure across the row, four
 * tiles beside it, and a sourced fact when the bank holds one.
 *
 * One device for both records. A people's panel used to be a definition list
 * of its own because two of its slots are words — a main language, a family —
 * and the stat card took only counts. The card takes a word now, marked so
 * the stylesheet sets it a step smaller, and the second device is gone.
 *
 * Its dress lives in `fiche-parchment.css`. An inline stylesheet capped the
 * panel at min(100% − 1rem, 44rem), which is what left "En bref" narrower
 * than every chapter under it.
 */
// @req REQ-151
export function FicheSummaryBrief(props: FicheSummaryBriefProps) {
  const {
    kind,
    entityId,
    name,
    language = FALLBACK_LOCALE,
    embedded = false,
  } = props;
  const copy =
    kind === "country"
      ? countryCopy[language].summary
      : peopleCopy[language].summary;
  const counted =
    props.kind === "country"
      ? countryFigures(props.figures, language)
      : peopleFigures(props.figures, language);

  const matchingFacts = DID_YOU_KNOW_FACTS.filter((fact) =>
    fact.entities.some(
      (entity) => entity.kind === kind && entity.id === entityId
    )
  );
  const originalFact =
    matchingFacts.find((candidate) => candidate.sources?.length) ??
    matchingFacts[0];
  const fact = originalFact
    ? localizeDidYouKnowFact(originalFact, language)
    : null;

  return (
    <section
      className="fiche-summary-brief"
      aria-label={`${name} ${copy.title}`}
    >
      {!embedded && (
        <>
          <p className="fiche-summary-brief__eyebrow">{copy.title}</p>
          <h2>{name}</h2>
        </>
      )}

      <div className="fiche-summary-brief__counted">
        {counted.map((figure) => (
          <FicheStatCard
            key={figure.id}
            id={figure.id}
            label={figure.label}
            value={figure.value}
            scope={figure.scope || undefined}
            emphasis={figure.emphasis}
            language={language}
          />
        ))}
      </div>

      {fact ? (
        <aside
          className="fiche-summary-brief__fact"
          data-testid="fiche-summary-fact"
        >
          <p>{fact.headline}</p>
          <span className="fiche-summary-brief__tier">
            {copy.factTier}: {anecdotesCopy[language].tierLabels[fact.tier]}
          </span>
          {fact.sources?.length ? (
            <p className="fiche-summary-brief__source">
              {fact.sources[0].url ? (
                <a
                  href={fact.sources[0].url}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  {fact.sources[0].title}
                </a>
              ) : (
                fact.sources[0].title
              )}
            </p>
          ) : (
            <p className="fiche-summary-brief__source">
              {anecdotesCopy[language].missingProvenance}
            </p>
          )}
        </aside>
      ) : null}
    </section>
  );
}
