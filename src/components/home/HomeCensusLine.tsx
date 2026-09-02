import type { CensusEntry } from "@/lib/home/corpusCensus";

export interface HomeCensusLineProps {
  /** One entry per corpus class, counted per request by `corpusCensus`. */
  entries: CensusEntry[];
}

/**
 * What the corpus holds, stated once under the band's answer.
 *
 * It replaces the headline's rotating class. That device showed one of five
 * classes at a time and none at all under `prefers-reduced-motion`, so the
 * home asserted a corpus a fifth of its real size to some readers and less to
 * others. A cartouche states all five.
 *
 * Register is deliberately not the h1's: this is a map's scale bar, in body
 * type, under the prose — the figures belong to the corpus, not to the
 * question.
 *
 * Two writing rules, both load-bearing. Every fragment of visible text is a
 * string inside an expression rather than bare JSX beside one, because SWC
 * drops the space between an expression and the text following it on the same
 * line. And every no-break space is written `\u00a0` rather than typed: the
 * two are identical on screen, so a plain one typed by mistake reads as
 * correct in review and only shows up as a line breaking in the wrong place.
 */
// @req REQ-113
export function HomeCensusLine({ entries }: HomeCensusLineProps) {
  return (
    <p className="home-hero-census" data-testid="home-hero-census">
      {entries.map((entry, index) => (
        <span className="home-hero-census-entry" key={entry.word}>
          {entry.figure === null ? (
            <span className="home-hero-census-figure is-unavailable">
              <span aria-hidden="true">{"—"}</span>
              <span className="sr-only">{"Indisponible"}</span>
            </span>
          ) : (
            <b className="home-hero-census-figure">{entry.figure}</b>
          )}
          {/* A figure and the thing it counts never break apart. */}
          {`\u00a0${entry.word}`}
          {index === entries.length - 1 ? null : (
            /* The separator closes the entry it follows: a no-break space
               before it so it can never start a line on its own, a plain
               space after it so the line has somewhere to break. Those
               trailing spaces are the only break opportunities in the line —
               without them the five entries are one unbreakable run, which at
               430px measured 499px and pushed the copy column past the
               viewport. */
            <span className="home-hero-census-sep" aria-hidden="true">
              {"\u00a0· "}
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
