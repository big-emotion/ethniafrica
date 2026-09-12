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

interface FigureRow {
  label: string;
  value: string | null;
  /** What the record says in the value's place when it has no value. */
  absent: string;
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

/**
 * One counted figure of a country record, with the words that go around it.
 *
 * `scope` is what the count covers when there is a count, and what is absent
 * when there is not — one line, two jobs, because a reader looking under a
 * figure for its reach is looking in the same place either way.
 */
interface CountedFigure {
  id: string;
  label: string;
  value: number | null;
  scope: string;
  emphasis: "lead" | "tile";
}

function countryFigures(
  figures: CountrySummaryFigures,
  language: Language
): CountedFigure[] {
  const copy = countryCopy[language].summary;
  const words = copy.figures;
  const population = figures.population?.value ?? null;
  const year = figures.population?.referenceYear;

  const counted = (
    id: keyof typeof words,
    value: number | null | undefined
  ): CountedFigure => {
    const measured = value != null && Number.isFinite(value);
    const entry = words[id];
    // Population states its reach as a year rather than a reach, so it is the
    // one count in the dictionary with no scope of its own.
    const reach = "scope" in entry ? entry.scope : "";
    return {
      id,
      label: entry.label,
      value: measured ? value : null,
      scope: measured ? reach : entry.absent,
      emphasis: "tile",
    };
  };

  const lead = counted("population", population);

  return [
    {
      ...lead,
      // The reference year is this figure's whole scope line: population is
      // the one count on the panel a reader can date, and an undated
      // population is a weaker claim than a dated one.
      scope: lead.value != null && year ? copy.referenceYear(year) : lead.scope,
      emphasis: "lead",
    },
    counted("peoples", figures.peoples),
    counted("languages", figures.languages),
    counted("families", figures.families),
    counted("names", figures.names),
  ];
}

function peopleRows(
  figures: PeopleSummaryFigures,
  language: Language
): FigureRow[] {
  const copy = peopleCopy[language].summary;
  const rows = [
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
  // One sentence for all five slots, which is what this record still says.
  // Carried on the row rather than read off the copy at render time, so the
  // two records' wordings never have to be told apart in the markup.
  return rows.map((row) => ({ ...row, absent: copy.missingData }));
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
  /*
   * Two records, one weighting, two devices.
   *
   * Both lead with their population — the one figure a reader arrives
   * wanting — and file the rest beside it. What differs is what the rest
   * are. A country record's four are all counts, so they ride the shared
   * stat card. A people record's four include two words, its main language
   * and its family, and the shared card takes a `number | null`, so they
   * ride the definition list instead, which renders a word as naturally as
   * a figure.
   *
   * This comment used to say a people record led with nothing, because two
   * of its slots were words. The reviewed rendering answers that: the
   * population leads and a word value simply renders a step smaller. The
   * weighting follows the kind rather than a prop because there is no third
   * answer to invent — but the device should not, and widening the card to
   * carry a word is what would collapse these two branches into one.
   */
  const counted = kind === "country" ? countryFigures(figures, language) : null;
  const rows = kind === "people" ? peopleRows(figures, language) : null;

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

      {/* Two records, two shapes, and the shapes are genuinely different.

          A country record's five slots are all counts, so they all ride the
          shared stat card and the population leads.

          A people record's five include two that are words rather than
          counts — its main language and its family — and `FicheStatCard`
          takes a `number | null`, so it cannot carry them. The people panel
          therefore keeps the definition list, which renders a word as
          naturally as a figure, and takes its weighting there instead: the
          population leads across both columns, the four others become tiles.

          Unifying the two on one device means widening the shared card to
          carry a word value. That is worth doing and is not done here. */}
      {counted ? (
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
      ) : (
        <dl className={figuresClassName}>
          {rows!.map((row, index) => (
            <div
              key={row.label}
              className={
                index === 0
                  ? "fiche-summary-brief__figure--headline"
                  : "fiche-summary-brief__figure--tile"
              }
            >
              <dt>{row.label}</dt>
              <dd>
                {row.value ?? row.absent}
                {row.value !== null && row.referenceYear ? (
                  <small>{row.referenceYear}</small>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      )}

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
        .fiche-summary-brief__counted {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        /* The lead figure takes the whole row. A tile beside it would read as
           its equal, and the four tiles count what the atlas holds while the
           lead counts the country itself. */
        .fiche-summary-brief__counted > [data-emphasis="lead"] {
          grid-column: 1 / -1;
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
        /* A rule down the left rather than a line across the top. A top rule
           reads as the end of the figures; a left rule reads as a quotation,
           which is what this is — one sourced sentence, not a sixth count.
           The gold role, the same one the search surface gives a sourced
           highlight, so the device means one thing across the site. */

        .fiche-summary-brief__fact {
          margin-top: 18px;
          padding-left: 12px;
          border-left: 3px solid var(--afh-gold);
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
