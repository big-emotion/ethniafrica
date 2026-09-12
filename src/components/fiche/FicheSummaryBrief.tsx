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

interface FigureRow {
  label: string;
  value: string | null;
  referenceYear?: string;
}

function count(
  value: number | null | undefined,
  language: Language
): string | null {
  return value == null || !Number.isFinite(value)
    ? null
    : new Intl.NumberFormat(language).format(value);
}

function countryRows(
  figures: CountrySummaryFigures,
  language: Language
): FigureRow[] {
  const copy = countryCopy[language].summary;
  return [
    {
      label: copy.population,
      value: count(figures.population?.value, language),
      referenceYear: figures.population?.referenceYear
        ? copy.referenceYear(figures.population.referenceYear)
        : undefined,
    },
    {
      label: copy.peoplesDocumentedHere,
      value: count(figures.peoples, language),
    },
    {
      label: copy.languagesDocumentedHere,
      value: count(figures.languages, language),
    },
    {
      label: copy.familiesDocumentedHere,
      value: count(figures.families, language),
    },
    { label: copy.namesReferencedHere, value: count(figures.names, language) },
  ];
}

function peopleRows(
  figures: PeopleSummaryFigures,
  language: Language
): FigureRow[] {
  const copy = peopleCopy[language].summary;
  return [
    {
      label: copy.persons,
      value: count(figures.persons?.value, language),
      referenceYear: figures.persons?.referenceYear
        ? copy.referenceYear(figures.persons.referenceYear)
        : undefined,
    },
    {
      label: copy.countriesOfPresence,
      value: count(figures.countries, language),
    },
    { label: copy.mainLanguage, value: figures.mainLanguage?.trim() || null },
    { label: copy.linguisticFamily, value: figures.family?.trim() || null },
    { label: copy.namesReferencedHere, value: count(figures.names, language) },
  ];
}

// @req REQ-151
export function FicheSummaryBrief({
  kind,
  entityId,
  name,
  language = FALLBACK_LOCALE,
  figures,
  embedded = false,
}: FicheSummaryBriefProps) {
  const copy =
    kind === "country"
      ? countryCopy[language].summary
      : peopleCopy[language].summary;
  const rows =
    kind === "country"
      ? countryRows(figures, language)
      : peopleRows(figures, language);

  // Reviewed rendering (gabarit parity): the people variant leads with one
  // headline figure, then four tiles. Country keeps its original uniform
  // grid, so the modifier only ever lands on the people dl.
  const figuresClassName =
    kind === "people"
      ? "fiche-summary-brief__figures fiche-summary-brief__figures--people"
      : "fiche-summary-brief__figures";

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

      <dl className={figuresClassName}>
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={
              kind === "people"
                ? index === 0
                  ? "fiche-summary-brief__figure--headline"
                  : "fiche-summary-brief__figure--tile"
                : undefined
            }
          >
            <dt>{row.label}</dt>
            <dd>
              {row.value ?? copy.missingData}
              {row.value !== null && row.referenceYear ? (
                <small>{row.referenceYear}</small>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

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

      <style>{`
        .fiche-summary-brief {
          box-sizing: border-box;
          width: min(calc(100% - 1rem), 44rem);
          max-width: 100%;
          min-width: 0;
          margin: 0 auto 28px;
          padding: 20px 18px;
          border: 1px solid var(--afh-border);
          border-left: 3px solid var(--accent);
          border-radius: 6px;
          background: var(--afh-bg-warm);
          overflow-wrap: anywhere;
        }
        .fiche-summary-brief__eyebrow,
        .fiche-summary-brief__figures dt {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--afh-text-eyebrow);
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--afh-fg-muted);
        }
        .fiche-summary-brief__eyebrow { margin: 0; }
        .fiche-summary-brief h2 {
          margin: 10px 0 18px;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h3);
          line-height: 1.18;
          color: var(--afh-text);
        }
        .fiche-summary-brief__figures {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin: 0;
        }
        .fiche-summary-brief__figures div { min-width: 0; }
        .fiche-summary-brief__figures dd {
          margin: 5px 0 0;
          font-size: var(--afh-text-body);
          line-height: 1.4;
          color: var(--afh-text);
        }
        .fiche-summary-brief__figures small {
          display: block;
          font-size: var(--afh-text-small);
          color: var(--afh-fg-muted);
        }
        .fiche-summary-brief__figures--people .fiche-summary-brief__figure--headline {
          grid-column: 1 / -1;
        }
        /* Fraunces is loaded at 300/500/700/900 only (app/layout.tsx). 600 is
           not among them and silently resolves to 700 in the browser —
           displayWeightCharter.test.ts holds every display declaration to
           [700, 900], so both rules below ask for 700 directly rather than
           relying on that fallback. */
        .fiche-summary-brief__figure--headline dd {
          font-family: var(--afh-font-display);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          font-size: var(--afh-text-h2);
        }
        .fiche-summary-brief__figure--tile dd {
          font-family: var(--afh-font-display);
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .fiche-summary-brief__fact {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--afh-border);
        }
        .fiche-summary-brief__fact p { margin: 0 0 8px; line-height: 1.5; }
        .fiche-summary-brief__tier {
          display: inline-block;
          padding: 3px 7px;
          border: 1px solid var(--afh-border);
          border-radius: 4px;
          font-size: var(--afh-text-small);
          color: var(--afh-fg-muted);
        }
        .fiche-summary-brief__source {
          margin: 8px 0 0;
          font-size: var(--afh-text-small);
          color: var(--afh-fg-muted);
        }
        @media (min-width: 768px) {
          .fiche-summary-brief { padding: 28px 30px; }
        }
      `}</style>
    </section>
  );
}
