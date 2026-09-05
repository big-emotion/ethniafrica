import { describe, expect, it } from "vitest";

import { revealProvenanceFr } from "@/lib/games/revealProvenance";
import {
  REVEAL_PROVENANCE_EN,
  revealProvenanceEn,
} from "@/lib/games/revealProvenance.en";
import { LANDMARK_PROVENANCE_PATH } from "@/lib/games/landmarks";
import { MERCATOR_PROVENANCE_PATH } from "@/lib/games/rounds/mercatorRound";
import { WORLD_COMPARE_PROVENANCE_PATH } from "@/lib/games/rounds/scaleEstimateRound";
import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";
import { frenchResidue, readsAsUntranslated } from "@/test/englishBankParity";

/** Every provenance a round can carry: the quiz templates' and the three measured assets'. */
const EMITTED_FIELD_PATHS = [
  ...Object.values(TEMPLATE_FIELD_PATHS),
  MERCATOR_PROVENANCE_PATH,
  WORLD_COMPARE_PROVENANCE_PATH,
  LANDMARK_PROVENANCE_PATH,
];

describe("revealProvenanceEn", () => {
  // @req REQ-145
  it("words every field path a round can emit", () => {
    const unworded = EMITTED_FIELD_PATHS.filter(
      (fieldPath) => revealProvenanceEn(fieldPath) === null
    );
    expect(unworded).toEqual([]);
  });

  /**
   * The English bank is keyed by the French one's paths and may not invent a
   * path of its own: a wording with no French twin is a wording no round
   * reaches, and the gate above cannot see it.
   */
  // @req REQ-145
  it("words no path the French reveal does not word", () => {
    for (const fieldPath of Object.keys(
      REVEAL_PROVENANCE_EN.wordingByFieldPath
    )) {
      expect(revealProvenanceFr(fieldPath)).not.toBeNull();
    }
  });

  // @req REQ-145
  it("translates every wording rather than leaving the French in place", () => {
    for (const [fieldPath, wording] of Object.entries(
      REVEAL_PROVENANCE_EN.wordingByFieldPath
    )) {
      expect(readsAsUntranslated(revealProvenanceFr(fieldPath), wording)).toBe(
        false
      );
      expect(frenchResidue(wording)).toBeNull();
    }
  });

  // @req REQ-142
  it("declares machine provenance", () => {
    expect(REVEAL_PROVENANCE_EN.provenance).toBe("machine");
  });

  // @req REQ-145
  it("returns nothing at all for a path it cannot word", () => {
    expect(revealProvenanceEn("content.somethingNobodyWorded")).toBeNull();
  });

  // @req REQ-145
  it("reads as the tail of a sentence, so the reveal can introduce it", () => {
    expect(revealProvenanceEn("content.appellations.selfAppellation")).toBe(
      "the autonym the fiche declares"
    );
    expect(revealProvenanceEn(MERCATOR_PROVENANCE_PATH)).toBe(
      "the boundary outlines published by the atlas"
    );
  });
});
