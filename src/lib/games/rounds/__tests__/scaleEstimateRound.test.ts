import { describe, expect, it } from "vitest";

import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import { isCorrectAnswer } from "@/lib/games/gameKinds";
import {
  ESTIMATE_SHAPE_IDS,
  buildScaleEstimateRound,
  buildScaleEstimateRounds,
} from "@/lib/games/rounds/scaleEstimateRound";

describe("buildScaleEstimateRound", () => {
  // @req REQ-120
  it("asks how many times a shape fits in Africa, and names the shape", () => {
    const round = buildScaleEstimateRound("GRL");

    expect(round.kind).toBe("estimate");
    expect(round.subjectFr).toContain("Groenland");
    expect(round.promptFr).toContain("Groenland");
    expect(round.unitFr).toBe("fois");
  });

  /**
   * The figure the page exists for. Measured off the same outlines the globe
   * draws, so a re-simplified asset moves the answer and the reveal together
   * rather than leaving one behind.
   */
  // @req REQ-120
  it("measures Greenland at about fourteen Africas", () => {
    const round = buildScaleEstimateRound("GRL");

    expect(round.correctValue).toBeGreaterThan(13);
    expect(round.correctValue).toBeLessThan(15);
  });

  // @req REQ-120
  it("keeps the answer reachable on its own track", () => {
    for (const shapeId of ESTIMATE_SHAPE_IDS) {
      const round = buildScaleEstimateRound(shapeId);
      expect(round.correctValue).toBeGreaterThanOrEqual(round.min);
      expect(round.correctValue).toBeLessThanOrEqual(round.max);
    }
  });

  // @req REQ-120
  it("starts the reader nowhere near the answer, at both extremes", () => {
    for (const shapeId of ESTIMATE_SHAPE_IDS) {
      const round = buildScaleEstimateRound(shapeId);
      expect(isCorrectAnswer(round, round.min)).toBe(false);
      expect(isCorrectAnswer(round, round.max)).toBe(false);
    }
  });

  /**
   * Charter §7: the reveal is the product. It states the measurement and
   * what the projection did, and it leads somewhere — a non-African shape has
   * no fiche, so the way in is the atlas itself.
   */
  // @req REQ-120
  it("reveals the measurement, its provenance and a way into the atlas", () => {
    const round = buildScaleEstimateRound("GRL");

    expect(round.reveal.textFr).toMatch(/\d/);
    expect(round.reveal.fieldPath).toBe("lib/atlas/assets/worldCompare");
    expect(round.reveal.ficheHref).toBeTruthy();
  });

  // FR65/FR66: a round that cannot be filled is not generated.
  // @req REQ-120
  it("returns null for a shape the asset does not hold", () => {
    expect(buildScaleEstimateRound("ZZZ")).toBeNull();
  });

  // @req REQ-120
  it("names only shapes the asset really holds", () => {
    for (const shapeId of ESTIMATE_SHAPE_IDS) {
      expect(WORLD_COMPARE[shapeId]).toBeDefined();
    }
  });
});

describe("buildScaleEstimateRounds", () => {
  // @req REQ-120
  it("builds one round per shape, each about a different one", () => {
    const rounds = buildScaleEstimateRounds();

    expect(rounds.length).toBe(ESTIMATE_SHAPE_IDS.length);
    expect(new Set(rounds.map((round) => round.subjectId)).size).toBe(
      rounds.length
    );
  });

  // @req REQ-120
  it("gives the Mercator game enough rounds to matter", () => {
    expect(buildScaleEstimateRounds().length).toBeGreaterThanOrEqual(4);
  });
});
