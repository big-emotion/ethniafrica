import { describe, expect, it } from "vitest";

import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import { GAME_DEFINITIONS_EN } from "@/lib/games/gameRegistry.en";
import {
  MERCATOR_ROUND_EN,
  mercatorRevealEn,
} from "@/lib/games/rounds/mercatorRound.en";
import {
  ESTIMATE_SHAPE_IDS,
  buildScaleEstimateRound,
} from "@/lib/games/rounds/scaleEstimateRound";
import {
  ESTIMATE_SUBJECT_EN,
  SCALE_ESTIMATE_ROUND_EN,
  scaleEstimatePromptEn,
  scaleEstimateRevealEn,
} from "@/lib/games/rounds/scaleEstimateRound.en";
import {
  africaAreaKm2,
  shapeAreaKm2,
  shapeInflation,
} from "@/lib/games/shapeMeasure";
import { figuresIn, frenchResidue } from "@/test/englishBankParity";

describe("the English Mercator round", () => {
  const algeria = { id: "DZA" as const, nameEn: "Algeria" };
  const tunisia = { id: "TUN" as const, nameEn: "Tunisia" };

  // @req REQ-145
  it("states both footprints with the reader's figures and no French", () => {
    const reveal = mercatorRevealEn(
      { ...algeria, trueAreaKm2: 2_316_559, inflation: 1.24 },
      { ...tunisia, trueAreaKm2: 155_360, inflation: 1.46 }
    );
    expect(reveal).toContain("Algeria: 2,316,559 km²");
    expect(reveal).toContain("Tunisia: 155,360 km²");
    expect(figuresIn(reveal, "en")).toEqual([
      "2316559",
      "1.2",
      "155360",
      "1.5",
    ]);
    expect(frenchResidue(reveal)).toBeNull();
  });

  // @req REQ-145
  it("asks the registered game's standing question in English", () => {
    expect(MERCATOR_ROUND_EN.prompt).toBe(
      GAME_DEFINITIONS_EN.mercator.promptEn
    );
    expect(MERCATOR_ROUND_EN.provenance).toBe("machine");
  });
});

describe("the English scale-estimate round", () => {
  // @req REQ-145
  it("names every shape the game compares, and no other", () => {
    expect(Object.keys(ESTIMATE_SUBJECT_EN).sort()).toEqual(
      [...ESTIMATE_SHAPE_IDS].sort()
    );
    for (const subject of Object.values(ESTIMATE_SUBJECT_EN)) {
      expect(frenchResidue(subject.subjectEn)).toBeNull();
      expect(subject.provenance).toBe("machine");
    }
  });

  // @req REQ-145
  it("asks the question as one English sentence per shape", () => {
    expect(scaleEstimatePromptEn("USA")).toBe(
      "How many times does the contiguous United States fit inside Africa?"
    );
    expect(SCALE_ESTIMATE_ROUND_EN.unitEn).toBe("times");
  });

  /**
   * Handed the same measurements the French builder took, the English reveal
   * must state the same numbers: the round's figures are measured, never
   * typed, and a locale may not change what was measured.
   */
  // @req REQ-145
  it("states exactly the figures the French reveal states", () => {
    for (const shapeId of ESTIMATE_SHAPE_IDS) {
      const french = buildScaleEstimateRound(shapeId);
      if (!french) continue;

      const shapeArea = shapeAreaKm2(WORLD_COMPARE[shapeId].rings);
      const reveal = scaleEstimateRevealEn({
        shapeId,
        ratio: french.correctValue,
        shapeAreaKm2: shapeArea,
        africaAreaKm2: africaAreaKm2(),
        inflation: shapeInflation(WORLD_COMPARE[shapeId].rings),
      });

      expect(figuresIn(reveal, "en")).toEqual(
        figuresIn(french.reveal.textFr, "fr")
      );
      expect(frenchResidue(reveal)).toBeNull();
      expect(reveal.charAt(0)).not.toBe(" ");
    }
  });

  // @req REQ-145
  it("opens the reveal on the shape's name with a capital", () => {
    const reveal = scaleEstimateRevealEn({
      shapeId: "GRL",
      ratio: 14.2,
      shapeAreaKm2: 2_130_000,
      africaAreaKm2: 30_200_000,
      inflation: 14.3,
    });
    expect(reveal).toMatch(/^14 times\. Greenland covers 2\.1 million km²/);
  });
});
