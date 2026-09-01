/**
 * The tiles read the same class list as the headline, so the band cannot count
 * one set of classes while naming another.
 *
 * `migrations` is counted alongside these but is not in that list, and so is
 * not shown: it is an event count, not a class of entity, and a sixth tile of
 * a different nature would blur what this band asserts.
 */
import { CORPUS_CLASSES } from "@/lib/home/corpusClasses";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

export interface HomeCorpusCountsProps {
  /** Live server totals, or null when the corpus could not be read. */
  counts: CorpusCounts | null;
}

const formatCount = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

/**
 * The five corpus totals shown beside the home search.
 *
 * This component receives data from the server page and never opens a second
 * data path in the browser. A failed read is explicitly unavailable: zero is
 * a valid total, so using it as a fallback would make a false corpus claim.
 * Each figure fails on its own, so four numbers and one absence is a state the
 * band has to render.
 *
 * The tiles are not links. `routing.ts` declares `atlas/langues`, but no index
 * page answers it — nor `atlas/noms` — so a clickable Langues tile would send
 * the reader to a 404.
 */
// @req REQ-113
export function HomeCorpusCounts({ counts }: HomeCorpusCountsProps) {
  return (
    <dl className="home-corpus-counts" aria-label="Le corpus en chiffres">
      {CORPUS_CLASSES.map(({ key, tileLabel }) => {
        const value = counts?.[key];
        const available = typeof value === "number" && Number.isFinite(value);

        return (
          <div
            key={key}
            className="home-corpus-count"
            data-state={available ? "available" : "unavailable"}
            data-testid={`home-count-${key}`}
          >
            <dt>{tileLabel}</dt>
            <dd className={available ? undefined : "is-unavailable"}>
              {available ? formatCount.format(value) : "Indisponible"}
            </dd>
          </div>
        );
      })}

      <style>{`
        /* Six columns for five tiles, on phones only.

           At 430px the band has 406px to spend: five tiles in one row leave
           71px each, and "3 134" at --afh-text-h2 does not fit in that. Six
           columns let the first three take two apiece and the last two take
           three, which folds the band into two *full* rows — a five-column
           grid would wrap to a second row with a hole in it, and a two-column
           one would cost a third row on the surface whose whole contract is
           that the search field stays above the fold. */
        .home-corpus-counts {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          margin: 0;
        }
        .home-corpus-count {
          grid-column: span 2;
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 82px;
          padding: 10px 6px;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-md);
          background: var(--afh-bg-warm);
          text-align: center;
        }
        .home-corpus-count dt {
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
        }
        .home-corpus-count dd {
          order: -1;
          margin: 0;
          font-family: var(--afh-font-display);
          font-size: var(--afh-text-h2);
          font-weight: 900;
          line-height: 1;
          color: var(--afh-text);
          font-variant-numeric: tabular-nums;
        }
        .home-corpus-count dd.is-unavailable {
          font-family: var(--afh-font-body);
          font-size: var(--afh-text-caption);
          font-weight: 600;
          color: var(--afh-text-soft);
        }

        /* nth-of-type, not nth-child: the style element below is a child of the
           list too, and counting the tiles is what this rule means. */
        .home-corpus-count:nth-of-type(n + 4) {
          grid-column: span 3;
        }

        @media (min-width: 768px) {
          .home-corpus-counts {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
          }
          .home-corpus-count,
          .home-corpus-count:nth-of-type(n + 4) {
            grid-column: auto;
          }
          .home-corpus-count {
            min-height: 94px;
            padding: 14px 10px;
          }
        }

        @media (min-width: 1200px) {
          .home-corpus-count { align-items: flex-start; text-align: left; }
        }
      `}</style>
    </dl>
  );
}

export default HomeCorpusCounts;
