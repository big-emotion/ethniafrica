import { describe, expect, it } from "vitest";

import { CORPUS_CLASSES } from "../corpusClasses";
import { corpusCensus } from "../corpusCensus";

const FULL_CORPUS = {
  peoples: 790,
  languages: 748,
  countries: 54,
  families: 24,
  nameForms: 3134,
  migrations: 6,
};

/**
 * The French thousands separator Intl emits is U+202F, a narrow no-break
 * space, not U+0020. Pinned rather than smoothed over with \s: a test that
 * accepted either would not notice the census drifting to a plain space,
 * which is where a figure starts breaking across two lines.
 */
const NARROW_NBSP = "\u202f";

describe("corpusCensus — the sizes the home declares", () => {
  // @req REQ-113
  it("prints one entry per class, in the order the corpus nests them", () => {
    expect(corpusCensus(FULL_CORPUS)).toEqual([
      { word: "peuples", figure: "790" },
      { word: "langues", figure: "748" },
      { word: "pays", figure: "54" },
      { word: "familles", figure: "24" },
      { word: "appellations", figure: `3${NARROW_NBSP}134` },
    ]);
  });

  // @req REQ-113
  it("covers every class the corpus declares and invents none", () => {
    expect(corpusCensus(FULL_CORPUS).map((entry) => entry.word)).toEqual(
      CORPUS_CLASSES.map((corpusClass) => corpusClass.censusWord)
    );
  });

  // A figure the server could not read is withheld, not printed as zero: the
  // line still names the class, it just stops claiming a size for it.
  // @req REQ-113
  it("keeps the word and withholds the figure of a class it could not count", () => {
    const census = corpusCensus({ ...FULL_CORPUS, languages: null });

    expect(census[1]).toEqual({ word: "langues", figure: null });
    expect(census[0].figure).toBe("790");
  });

  // The counterpart, and the reason `figure` is nullable rather than falsy:
  // zero is a real total. A corpus that genuinely holds none of something
  // says so, and must never be mistaken for one that could not be read.
  // @req REQ-113
  it("prints a genuine zero instead of withholding it", () => {
    expect(corpusCensus({ ...FULL_CORPUS, families: 0 })[3]).toEqual({
      word: "familles",
      figure: "0",
    });
  });

  // @req REQ-113
  it("names every class without a figure when the corpus is unreadable", () => {
    const census = corpusCensus(null);

    expect(census).toHaveLength(CORPUS_CLASSES.length);
    expect(census.every((entry) => entry.figure === null)).toBe(true);
    expect(census[0].word).toBe("peuples");
  });
});
