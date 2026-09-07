import { describe, expect, it } from "vitest";

import type { GameCountryFixture } from "@/lib/games/corpus";
import type { ComparedTerritory } from "@/lib/games/territory";
import {
  MINIMUM_INFLATION_RATIO,
  buildInflationRound,
  mercatorInflationOf,
} from "../inflationRound";

function countryFixture(id: string, nameFr: string): GameCountryFixture {
  return {
    id,
    nameFr,
    etymology: null,
    nameOriginActor: null,
    historicalNames: null,
    kingdoms: [],
    sources: [],
    confidence: null,
  };
}

const tunisia = countryFixture("TUN", "Tunisie");
const kenya = countryFixture("KEN", "Kenya");
const gabon = countryFixture("GAB", "Gabon");
const morocco = countryFixture("MAR", "Maroc");
const undrawable = countryFixture("SHN", "Sainte-Hélène");

/**
 * A silhouette from outside the continent, which is what every pair the
 * handler builds now holds one of. Not a `GameCountryFixture`: the atlas has
 * no fiche for it, and that is the whole point of the destination rule below.
 */
const norway: ComparedTerritory = { id: "NOR", nameFr: "Norvège" };

describe("buildInflationRound", () => {
  /**
   * The question the page argued in its reveals for a year without ever
   * asking it. Tunisia sits near 34° N and is drawn at 1,46 times its true
   * area; Kenya straddles the equator and is drawn true.
   */
  // @req REQ-120
  it("answers with the country the projection enlarges more", () => {
    const round = buildInflationRound(tunisia, kenya);

    expect(round.kind).toBe("binary");
    expect(round.template).toBe("greater-inflation");
    expect(round.gameId).toBe("mercator");
    expect(round.options.map((option) => option.labelFr)).toEqual([
      "Tunisie",
      "Kenya",
    ]);
    expect(round.correctIndex).toBe(0);
  });

  // @req REQ-120
  it("keeps the same answer when the pair is passed the other way round", () => {
    expect(buildInflationRound(kenya, tunisia).correctIndex).toBe(1);
  });

  /**
   * The stem must not be the area question wearing a different hat: a reader
   * who answers « the bigger one » has to be able to get it wrong.
   */
  // @req REQ-120
  it("asks about the projection rather than about the ground covered", () => {
    const round = buildInflationRound(tunisia, kenya);

    expect(round.promptFr).toContain("Mercator");
    expect(round.promptFr).toContain("agrandi");
    expect(round.promptFr).not.toContain("surface");
  });

  /**
   * A wrong answer still has to land the lesson, so the reveal states the
   * mechanism — latitude — and not only the two factors.
   */
  // @req REQ-120
  it("reveals both factors, both latitudes and the rule that produces them", () => {
    const round = buildInflationRound(tunisia, kenya);

    expect(round.reveal.textFr).toContain("Tunisie");
    expect(round.reveal.textFr).toContain("Kenya");
    expect(round.reveal.textFr).toContain("1,5");
    expect(round.reveal.textFr).toContain("1,0");
    expect(round.reveal.textFr).toContain("34° N");
    expect(round.reveal.textFr).toContain("latitude");
    expect(round.reveal.textFr).toContain("équateur");
    expect(round.reveal.fieldPath).toBe("lib/atlas/assets/africaAdmin0");
  });

  /**
   * FR65/FR66: a pair the reader could only coin-flip is not generated. Kenya
   * and Gabon both sit on the equator and are both drawn true.
   */
  // @req REQ-120
  it("refuses a pair the projection treats almost alike", () => {
    expect(mercatorInflationOf(kenya)).toBeCloseTo(
      mercatorInflationOf(gabon),
      1
    );
    expect(buildInflationRound(kenya, gabon)).toBeNull();
  });

  // @req REQ-120
  it("generates a pair whose factors differ by the declared minimum", () => {
    const ratio = mercatorInflationOf(morocco) / mercatorInflationOf(kenya);

    expect(ratio).toBeGreaterThanOrEqual(MINIMUM_INFLATION_RATIO);
    expect(buildInflationRound(morocco, kenya)).not.toBeNull();
  });

  /**
   * A country the committed asset cannot draw has no latitude to reason
   * from, and inventing one would be inventing the answer.
   */
  // @req REQ-120
  it("refuses a territory the outlines cannot draw", () => {
    expect(buildInflationRound(tunisia, undrawable)).toBeNull();
  });

  /**
   * The reveal leads to the African half of the pair — never to the answer
   * when the answer is a borrowed silhouette.
   *
   * It used to lead to the answer, which was sound while both options were
   * African. Every pair crosses the continent's edge now, and the answer is
   * the borrowed territory in all but ten of them, so that rule was resolving
   * to `/pays/NOR` — a 404 behind an id that looks like an ISO code because it
   * is one.
   */
  // @req REQ-120
  it("leads to the fiche of its African half, not of its answer", () => {
    const round = buildInflationRound(kenya, norway);

    expect(round.correctIndex).toBe(1);
    expect(round.reveal.ficheHref).toContain("KEN");
  });
});
