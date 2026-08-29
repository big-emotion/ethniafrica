import { describe, expect, it } from "vitest";

import {
  isCorrectAnswer,
  isEstimateRound,
  isOptionRound,
  type BinaryRound,
  type EstimateRound,
} from "@/lib/games/gameKinds";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";

const REVEAL = {
  textFr: "peu importe",
  fieldPath: "lib/atlas/assets/africaAdmin0",
  sources: [],
  confidence: null,
  ficheHref: getAxisHubRoute("fr", "explorer"),
};

const binary: BinaryRound = {
  kind: "binary",
  gameId: "mercator",
  subjectId: "DZA",
  promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
  options: [{ labelFr: "Algérie" }, { labelFr: "Tchad" }],
  correctIndex: 0,
  reveal: REVEAL,
};

const estimate: EstimateRound = {
  kind: "estimate",
  gameId: "mercator",
  subjectId: "GRL",
  promptFr: "Combien de fois le Groenland tient-il dans l'Afrique ?",
  subjectFr: "le Groenland",
  unitFr: "fois",
  min: 1,
  max: 20,
  step: 0.5,
  correctValue: 14,
  toleranceRatio: 0.2,
  reveal: REVEAL,
};

describe("isCorrectAnswer", () => {
  // @req REQ-120
  it("judges a binary round on the index pressed", () => {
    expect(isCorrectAnswer(binary, 0)).toBe(true);
    expect(isCorrectAnswer(binary, 1)).toBe(false);
  });

  // @req REQ-120
  it("accepts an estimate inside the tolerance", () => {
    expect(isCorrectAnswer(estimate, 14)).toBe(true);
    expect(isCorrectAnswer(estimate, 12)).toBe(true);
    expect(isCorrectAnswer(estimate, 16.5)).toBe(true);
  });

  // @req REQ-120
  it("refuses an estimate outside the tolerance", () => {
    expect(isCorrectAnswer(estimate, 1)).toBe(false);
    expect(isCorrectAnswer(estimate, 20)).toBe(false);
  });

  /**
   * The tolerance is a share of the answer, not a fixed span: three out of
   * fourteen is a good estimate and three out of three is a different answer.
   */
  // @req REQ-120
  it("scales the tolerance with the magnitude being estimated", () => {
    const small: EstimateRound = { ...estimate, correctValue: 3 };
    expect(isCorrectAnswer(small, 6)).toBe(false);
    expect(isCorrectAnswer(estimate, 17)).toBe(false);
    expect(isCorrectAnswer(estimate, 16)).toBe(true);
  });

  /**
   * `strictNullChecks` is off here, so a kind the judge forgets would return
   * `undefined` — falsy, and every round of that kind silently marked wrong.
   * Both kinds are named above; this pins the non-numeric guard.
   */
  // @req REQ-120
  it("refuses a country id handed to a slider round", () => {
    expect(isCorrectAnswer(estimate, "GRL")).toBe(false);
  });
});

describe("round narrowing", () => {
  // @req REQ-120
  it("tells the two kinds apart without a cast", () => {
    expect(isOptionRound(binary)).toBe(true);
    expect(isOptionRound(estimate)).toBe(false);
    expect(isEstimateRound(estimate)).toBe(true);
    expect(isEstimateRound(binary)).toBe(false);
  });
});
