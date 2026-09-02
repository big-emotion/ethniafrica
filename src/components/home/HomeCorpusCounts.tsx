/**
 * The tiles read the class list in `corpusClasses`, so the band cannot count
 * one set of classes while the charter test names another.
 *
 * `migrations`, `families` and `nameForms` are counted alongside these and are
 * not in that list, so they are not shown — see `corpusClasses` for why three
 * and what the third-of-five omission costs.
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
 * What the atlas documents, in three figures, under the home search.
 *
 * This component receives data from the server page and never opens a second
 * data path in the browser. A failed read is explicitly unavailable: zero is
 * a valid total, so using it as a fallback would make a false corpus claim.
 * Each figure fails on its own, so two numbers and one absence is a state the
 * band has to render.
 *
 * The tiles are not links, and uniformly so. `routing.ts` declares
 * `atlas/langues`, but no index page answers it, so a clickable Langues tile
 * would send the reader to a 404 — and a band where one tile of three is inert
 * is worse than a band where none is, because only the first teaches the
 * reader the wrong rule.
 */
// @req REQ-113
export function HomeCorpusCounts({ counts }: HomeCorpusCountsProps) {
  return (
    <dl
      className="home-corpus-counts"
      data-testid="home-corpus-counts"
      aria-label="Ce que l'atlas documente"
    >
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
        /* Three columns, at every width. Five tiles needed a six-column grid
           to fold into two full rows on a phone; three fit one row at 430px
           with 130px each, which is room for « 3 134 » at --afh-text-h2 and
           for a two-line label under it. One row is also what keeps the band
           from pushing the globe below the fold (brand charter §8.3). */
        .home-corpus-counts {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
          margin: 0;
        }
        .home-corpus-count {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 92px;
          padding: 12px 6px;
          border: 1px solid var(--afh-border);
          border-radius: var(--afh-radius-md);
          background: var(--afh-bg-warm);
          text-align: center;
        }
        .home-corpus-count dt {
          font-size: var(--afh-text-caption);
          line-height: var(--afh-leading-caption);
          color: var(--afh-text-soft);
          text-wrap: balance;
        }
        /* One alignment per tile, declared rather than inherited (brand
           charter §8.1). mobile-text.css left-aligns every dt and dd below
           768px, and the .afh-phone-centred opt-in list this band sits inside
           does not carry the pair — so the figure, a shrink-to-fit flex item,
           centred itself while its two-line label went ragged-left. Measured
           at 430px: « 790 » on the tile's centre line, « peuples / documentés »
           starting 36px to its left, three times across the band. Nothing
           declared two alignments; one declaration produced them. */
        .home-corpus-count dt,
        .home-corpus-count dd {
          text-align: center;
        }
        /* order: -1 puts the figure above its label while the DOM keeps the
           definition-list pair in its own order, which is what a screen reader
           reads and what the term role resolves against. */
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
        /* A total the server could not read drops to body type, book weight
           and the soft ink, so it reads as visibly not a figure and can never
           be mistaken for one. */
        .home-corpus-count dd.is-unavailable {
          font-family: var(--afh-font-body);
          font-size: var(--afh-text-caption);
          font-weight: 600;
          color: var(--afh-text-soft);
        }

        @media (min-width: 768px) {
          .home-corpus-counts {
            gap: 12px;
          }
          .home-corpus-count {
            min-height: 104px;
            padding: 16px 10px;
          }
        }

        /* Flush left from the width at which the copy column goes flush left.
           Alignment is a property of the block it sits in, not of the tile
           (brand charter §8.1): tiles that stayed centred inside a ragged-right
           column would put a second left edge in one block. */
        @media (min-width: 1200px) {
          .home-corpus-count {
            align-items: flex-start;
            text-align: left;
          }
          /* The pair switches with the block. A direct declaration always
             beats an inherited one, so the centre above would otherwise
             survive into the ragged-right column and reinstate the same two
             alignments the other way round. */
          .home-corpus-count dt,
          .home-corpus-count dd {
            text-align: left;
          }
        }
      `}</style>
    </dl>
  );
}
