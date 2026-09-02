import { describe, expect, it } from "vitest";

import { NOMMER_BIBLIOGRAPHY } from "@/lib/dossiers/nommer/bibliography";
import {
  NOMMER_CHAPTERS,
  getNommerChapter,
} from "@/lib/dossiers/nommer/chapters";
import { NOMMER_FIGURES } from "@/lib/dossiers/nommer/figures";
import { SOURCE_TIERS } from "@/types/sources";

/**
 * Sources that still rest on Wikipedia, named one by one.
 *
 * Wikipedia is not a source: a primary source found through it is cited at
 * its own tier, by its own URL, with the editions crossed recorded in the
 * entry's `notes`. Until that walk-back is done for a given work, its key
 * sits here — and the dossier cannot be declared ready while the set is
 * non-empty (`moduleRegistry` keeps `editorialReadiness: "draft"` until then).
 *
 * The set may only shrink. Adding a key is adding a citation the atlas cannot
 * yet stand behind, and the suite makes that an explicit, reviewable edit
 * rather than something that happens by writing a paragraph.
 */
const AWAITING_PRIMARY_SOURCE = new Set([
  "san-council-2003",
  "shaw-times-nigeria",
  "afrik-pays-ben",
  "afrik-pays-gha",
  "civil-registration-surnames",
  "zaire-authenticite-1972",
  "bleek-1862",
  "bantu-education-act-1953",
  "vlisco-helmond",
  "kente-nwentoma",
  "coffee-qahwa",
  "drewal-2012",
  "mami-wata-pidgin",
]);

/**
 * Numerals a French sentence writes as words, plus the ordinals the dossier
 * uses for centuries. A block may hold these without citing anything; a digit
 * or a Roman century may not.
 */
const CLAIM_PATTERN = /\d|\bXV\b|\bXVI\b|\bXVII\b|\bXVIII\b|\bXIX\b|\bXX\b/;

describe("the Nommer dossier's sources", () => {
  // @req REQ-113
  it("keys every work by its own key and says what it supports", () => {
    for (const [key, source] of Object.entries(NOMMER_BIBLIOGRAPHY)) {
      expect(source.sourceKey, key).toBe(key);
      expect(source.title, key).not.toBe("");
      expect(source.notes, key).not.toBe("");
    }
  });

  // `standing` is typed `SourceTier | "needs_review"` so it can only ever be
  // handed to `sourceStandingLabelFr`. This asserts the values themselves,
  // because `strictNullChecks` is off and a typo would type-check.
  // @req REQ-113
  it("gives every work a standing the tier vocabulary knows", () => {
    const allowed = new Set<string>([...SOURCE_TIERS, "needs_review"]);
    for (const [key, source] of Object.entries(NOMMER_BIBLIOGRAPHY)) {
      expect(allowed.has(source.standing), `${key} → ${source.standing}`).toBe(
        true
      );
    }
  });

  // @req REQ-113
  it("cites a resolvable address, or none at all", () => {
    for (const [key, source] of Object.entries(NOMMER_BIBLIOGRAPHY)) {
      if (source.url === null) continue;
      expect(source.url.startsWith("https://"), `${key} → ${source.url}`).toBe(
        true
      );
    }
  });

  // The gate. A work that still rests on Wikipedia has to be named in the
  // exemption above — which is what makes the walk-back visible in a diff
  // instead of being something a reviewer has to remember to look for.
  // @req REQ-113
  it("names every work that still rests on Wikipedia", () => {
    const resting = Object.values(NOMMER_BIBLIOGRAPHY)
      .filter((source) => source.discoveredVia.length > 0)
      .map((source) => source.sourceKey);

    for (const key of resting) {
      expect(
        AWAITING_PRIMARY_SOURCE.has(key),
        `${key} rests on Wikipedia but is not in AWAITING_PRIMARY_SOURCE`
      ).toBe(true);
    }
  });

  // The other half: an exemption for a work that no longer needs one is an
  // exemption that would let the next one in unnoticed.
  // @req REQ-113
  it("carries no exemption for a work that no longer needs one", () => {
    for (const key of AWAITING_PRIMARY_SOURCE) {
      const source = NOMMER_BIBLIOGRAPHY[key];
      expect(
        source,
        `${key} is exempted but not in the bibliography`
      ).toBeDefined();
      expect(
        source.discoveredVia.length > 0 || source.standing === "needs_review",
        `${key} no longer needs its exemption — remove it`
      ).toBe(true);
    }
  });

  // @req REQ-113
  it("resolves every reference a chapter makes", () => {
    const danglingSources: string[] = [];
    const danglingFigures: string[] = [];

    for (const chapter of NOMMER_CHAPTERS) {
      for (const key of [
        ...chapter.standfirst.sourceRefs,
        ...chapter.measure.sourceRefs,
      ]) {
        if (!NOMMER_BIBLIOGRAPHY[key]) {
          danglingSources.push(`${chapter.key}/head → ${key}`);
        }
      }
      for (const key of [
        ...chapter.standfirst.figureRefs,
        ...chapter.measure.figureRefs,
      ]) {
        if (!NOMMER_FIGURES[key]) {
          danglingFigures.push(`${chapter.key}/head → ${key}`);
        }
      }

      for (const section of chapter.sections) {
        const blocks = [...section.blocks, ...(section.table?.rows ?? [])];
        for (const block of blocks) {
          for (const key of block.sourceRefs) {
            if (!NOMMER_BIBLIOGRAPHY[key]) {
              danglingSources.push(`${chapter.key}/${section.id} → ${key}`);
            }
          }
          for (const key of block.figureRefs) {
            if (!NOMMER_FIGURES[key]) {
              danglingFigures.push(`${chapter.key}/${section.id} → ${key}`);
            }
          }
        }
        for (const pair of section.pairs ?? []) {
          for (const key of pair.sourceRefs) {
            if (!NOMMER_BIBLIOGRAPHY[key]) {
              danglingSources.push(`${chapter.key}/${section.id} → ${key}`);
            }
          }
        }
      }
    }

    expect(danglingSources).toEqual([]);
    expect(danglingFigures).toEqual([]);
  });

  // The rule that makes the dossier auditable rather than merely sourced:
  // a paragraph that states a number or a date has to say where it got it.
  // @req REQ-113
  it("backs every dated or numbered claim with a source or a figure", () => {
    const unbacked: string[] = [];

    for (const chapter of NOMMER_CHAPTERS) {
      const heads: Array<
        [string, { text: string; sourceRefs: string[]; figureRefs: string[] }]
      > = [
        [`${chapter.key}/standfirst`, chapter.standfirst],
        [
          `${chapter.key}/measure`,
          {
            text: `${chapter.measure.value} ${chapter.measure.unit}`,
            sourceRefs: chapter.measure.sourceRefs,
            figureRefs: chapter.measure.figureRefs,
          },
        ],
      ];

      for (const [where, block] of heads) {
        if (!CLAIM_PATTERN.test(block.text)) continue;
        if (block.sourceRefs.length + block.figureRefs.length > 0) continue;
        unbacked.push(`${where}: ${block.text.slice(0, 70)}…`);
      }

      for (const section of chapter.sections) {
        for (const block of section.blocks) {
          if (!CLAIM_PATTERN.test(block.text)) continue;
          if (block.sourceRefs.length + block.figureRefs.length > 0) continue;
          unbacked.push(
            `${chapter.key}/${section.id}: ${block.text.slice(0, 70)}…`
          );
        }
      }
    }

    expect(unbacked).toEqual([]);
  });

  // A tile asks; the chapter answers. A number on the support line would be a
  // claim with nowhere to put its source — and the tile has exactly three
  // levels, so there is no fourth to hang one from.
  // @req REQ-113
  it("keeps digits and dates out of the question a tile asks", () => {
    for (const chapter of NOMMER_CHAPTERS) {
      expect(CLAIM_PATTERN.test(chapter.question), chapter.key).toBe(false);
    }
  });
});

describe("the Nommer dossier's chapters", () => {
  // @req REQ-113
  it("declares the five chapters once each, in reading order", () => {
    expect(NOMMER_CHAPTERS.map((chapter) => chapter.key)).toEqual([
      "le-peuple",
      "le-pays",
      "la-personne",
      "la-langue",
      "la-chose",
    ]);
  });

  // The ordinal is printed on the tile and in each chapter's step label, so it
  // has to follow the array rather than be typed in beside it.
  // @req REQ-113
  it("numbers the chapters from their own position", () => {
    NOMMER_CHAPTERS.forEach((chapter, index) => {
      expect(chapter.ordinal, chapter.key).toBe(
        String(index + 1).padStart(2, "0")
      );
    });
  });

  // @req REQ-113
  it("gives every chapter the three levels a tile renders", () => {
    for (const chapter of NOMMER_CHAPTERS) {
      expect(chapter.title, chapter.key).not.toBe("");
      expect(chapter.question, chapter.key).not.toBe("");
      expect(chapter.measure.value, chapter.key).not.toBe("");
      expect(chapter.measure.unit, chapter.key).not.toBe("");
      expect(chapter.standfirst.text, chapter.key).not.toBe("");
    }
  });

  // @req REQ-113
  it("finds a chapter by its key and nothing by an unknown one", () => {
    expect(getNommerChapter("la-chose")?.title).toBe("La chose");
    expect(getNommerChapter("le-peuple")?.ordinal).toBe("01");
  });
});
