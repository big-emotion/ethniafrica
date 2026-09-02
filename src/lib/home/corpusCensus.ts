import { CORPUS_CLASSES } from "@/lib/home/corpusClasses";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const formatFigure = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

/**
 * One class of the corpus, as the home's census line prints it.
 *
 * `figure` is nullable rather than defaulted because the two states it
 * separates are not the same claim: `"0"` says the corpus holds none of this,
 * `null` says the server could not read the total. Collapsing them would have
 * an operational failure publish a factual assertion.
 */
// @req REQ-113
export interface CensusEntry {
  /** The class's own word. Always present — a class is named even unsized. */
  word: string;
  /** The formatted total, or `null` when the server could not read it. */
  figure: string | null;
}

/**
 * The five classes the home declares, with the size of each.
 *
 * This replaces `headlineSegments`, which fed the same five entries to a
 * rotating h1 — one class visible at a time, four hidden, and none at all for
 * a reader on `prefers-reduced-motion`, whose reel never armed. The line
 * states all five at once instead, which is what the corpus actually holds.
 *
 * The figures are read per request by `getCorpusCounts` straight from the
 * service layer; nothing here is a constant. A class whose read failed keeps
 * its word and loses its number rather than claiming zero — the atlas states
 * an absence, it does not hide one.
 */
// @req REQ-113
export function corpusCensus(counts: CorpusCounts | null): CensusEntry[] {
  return CORPUS_CLASSES.map(({ key, censusWord }) => {
    const total = counts?.[key];
    const counted = typeof total === "number" && Number.isFinite(total);

    return {
      word: censusWord,
      figure: counted ? formatFigure.format(total) : null,
    };
  });
}
