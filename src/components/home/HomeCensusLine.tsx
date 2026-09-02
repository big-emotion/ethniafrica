import type { CensusEntry } from "@/lib/home/corpusCensus";

export interface HomeCensusLineProps {
  /** One entry per corpus class, counted per request by `corpusCensus`. */
  entries: CensusEntry[];
}

/**
 * What the corpus holds, stated once under the band's answer.
 *
 * It replaces the headline's rotating class (ETNI · the reel). That device
 * showed one of five classes at a time and none at all under
 * `prefers-reduced-motion`, so the home asserted a corpus a fifth of its real
 * size to some readers and less to others. A cartouche states all five.
 *
 * Register is deliberately not the h1's: this is a map's scale bar, in body
 * type, under the prose — the figures belong to the corpus, not to the
 * question. Every fragment of visible text is a string inside an expression
 * rather than bare JSX beside one, because SWC drops the space between an
 * expression and the text following it on the same line.
 */
// @req REQ-113
export function HomeCensusLine({ entries }: HomeCensusLineProps) {
  return (
    <p className="home-hero-census" data-testid="home-hero-census">
      {entries.map((entry, index) => (
        <span className="home-hero-census-entry" key={entry.word}>
          {index === 0 ? null : (
            <span className="home-hero-census-sep" aria-hidden="true">
              {"·"}
            </span>
          )}
          {entry.figure === null ? (
            <span className="home-hero-census-figure is-unavailable">
              <span aria-hidden="true">{"—"}</span>
              <span className="sr-only">{"Indisponible"}</span>
            </span>
          ) : (
            <b className="home-hero-census-figure">{entry.figure}</b>
          )}
          {/* U+00A0: a figure and the thing it counts do not break apart. */}
          {` ${entry.word}`}
        </span>
      ))}
    </p>
  );
}
