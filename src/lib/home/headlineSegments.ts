import { CORPUS_CLASSES } from "@/lib/home/corpusClasses";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const formatFigure = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

/**
 * The h1's accessible name, which never changes.
 *
 * A level-one heading is a landmark a screen-reader user navigates by, and one
 * whose name changed every three seconds would be a landmark that moves. So
 * the rotation is decoration — `aria-hidden` — and this sentence is what the
 * heading is called, naming all five classes at once. It carries no figures:
 * a fixed name cannot commit to a number that turns on its own a few seconds
 * later.
 */
// @req REQ-115
export const HEADLINE_ACCESSIBLE_NAME =
  "Une question sur les peuples, les langues, les pays, " +
  "les familles linguistiques et les appellations d'Afrique ?";

/**
 * The rotating half of the headline, one entry per class.
 *
 * A class whose figure could not be read keeps its word and loses its number,
 * rather than claiming zero: the headline still names the class, it simply
 * stops asserting a size for it.
 */
// @req REQ-115
export function headlineSegments(counts: CorpusCounts | null): string[] {
  return CORPUS_CLASSES.map(({ key, headlineWord }) => {
    const figure = counts?.[key];
    const counted = typeof figure === "number" && Number.isFinite(figure);

    return counted
      ? `${formatFigure.format(figure)} ${headlineWord}`
      : headlineWord;
  });
}
