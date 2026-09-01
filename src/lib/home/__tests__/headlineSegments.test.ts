import { describe, expect, it } from "vitest";

import {
  HEADLINE_ACCESSIBLE_NAME,
  headlineSegments,
} from "../headlineSegments";

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
 * space, not U+0020. Pinned here rather than smoothed over with \s: the
 * headline and the tiles have to print the same character, and a test that
 * accepts either would not notice one of them drifting to a plain space.
 */
const NARROW_NBSP = " ";

describe("headlineSegments — the classes the home names (REQ-115)", () => {
  // @req REQ-115
  it("names the five classes in the order the corpus nests them", () => {
    const segments = headlineSegments(FULL_CORPUS);

    expect(segments).toEqual([
      "790 peuples",
      "748 langues",
      "54 pays",
      "24 familles",
      `3${NARROW_NBSP}134 appellations`,
    ]);
  });

  // The tile says "Familles linguistiques"; the headline says "familles". The
  // full label costs a whole line at 430px on the one element that is already
  // the tallest in the band.
  // @req REQ-115
  it("uses the short form of the family label", () => {
    expect(headlineSegments(FULL_CORPUS)[3]).toBe("24 familles");
  });

  // A figure the server could not read is dropped, not printed as zero: the
  // headline still names the class, it just stops claiming a size for it.
  // @req REQ-115
  it("drops the figure of a class it could not count", () => {
    const segments = headlineSegments({ ...FULL_CORPUS, languages: null });

    expect(segments[1]).toBe("langues");
    expect(segments[0]).toBe("790 peuples");
  });

  // @req REQ-115
  it("names every class without a figure when the corpus is unreadable", () => {
    expect(headlineSegments(null)).toEqual([
      "peuples",
      "langues",
      "pays",
      "familles",
      "appellations",
    ]);
  });

  // The h1's accessible name must not churn every three seconds: it is the
  // landmark a screen-reader user navigates by. It names all five classes at
  // once and never moves.
  // @req REQ-115
  it("offers one stable accessible name covering every class", () => {
    for (const word of [
      "peuples",
      "langues",
      "pays",
      "familles linguistiques",
      "appellations",
    ]) {
      expect(HEADLINE_ACCESSIBLE_NAME).toContain(word);
    }
    expect(HEADLINE_ACCESSIBLE_NAME.endsWith("?")).toBe(true);
  });
});
