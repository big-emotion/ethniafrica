import { describe, expect, it } from "vitest";

import {
  distanceEn,
  englishNumber,
  inflationEn,
  millionsKm2En,
  ratioEn,
} from "@/lib/games/format.en";
import {
  distanceFr,
  inflationFr,
  millionsKm2Fr,
  ratioFr,
} from "@/lib/games/format";
import { figuresIn } from "@/test/englishBankParity";

describe("English number formatting for the games", () => {
  // @req REQ-145
  it("groups thousands with a comma, the way a British reader expects", () => {
    expect(englishNumber.format(8_000_000)).toBe("8,000,000");
  });

  // @req REQ-145
  it("rounds a ratio the way the French helper does, past ten and below it", () => {
    expect(ratioEn(14.3)).toBe("14");
    expect(ratioEn(3.24)).toBe("3.2");
  });

  // @req REQ-145
  it("keeps the decimal on an inflation factor at every magnitude", () => {
    expect(inflationEn(14.31)).toBe("14.3");
  });

  // @req REQ-145
  it("states an area in million km² and a distance to the nearest ten km", () => {
    expect(millionsKm2En(30_100_000)).toBe("30.1 million km²");
    expect(distanceEn(7_423)).toBe("7,420 km");
  });

  /**
   * The two helpers must round identically or the English fact states a
   * figure the French one does not — the parity suite over the bank would
   * catch the drift, but this names the helper that caused it.
   */
  // @req REQ-145
  it("agrees with the French helpers on every figure", () => {
    for (const value of [1.04, 3.24, 9.96, 14.3, 27.5]) {
      expect(figuresIn(ratioEn(value), "en")).toEqual(
        figuresIn(ratioFr(value), "fr")
      );
      expect(figuresIn(inflationEn(value), "en")).toEqual(
        figuresIn(inflationFr(value), "fr")
      );
    }
    for (const value of [2_344_858, 30_065_000, 1_582]) {
      expect(figuresIn(millionsKm2En(value), "en")).toEqual(
        figuresIn(millionsKm2Fr(value), "fr")
      );
      expect(figuresIn(distanceEn(value), "en")).toEqual(
        figuresIn(distanceFr(value), "fr")
      );
    }
  });
});
