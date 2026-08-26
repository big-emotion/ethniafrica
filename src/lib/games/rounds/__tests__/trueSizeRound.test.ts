import { describe, expect, it } from "vitest";
import type { GameCountryFixture } from "@/lib/games/corpus";
import type { Ring } from "@/lib/atlas/overlays";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { ringArea } from "@/lib/games/sphericalArea";
import type { WorldCompareEntry } from "../trueSizeRound";
import { buildTrueSizeRound } from "../trueSizeRound";

function countryFixture(
  id: string,
  nameFr: string,
  overrides: Partial<GameCountryFixture> = {}
): GameCountryFixture {
  return {
    id,
    nameFr,
    etymology: null,
    nameOriginActor: null,
    historicalNames: null,
    kingdoms: [],
    ...overrides,
  };
}

/** A lon/lat box, the smallest honest stand-in for a non-African outline. */
function box(west: number, south: number, east: number, north: number): Ring[] {
  return [
    [
      { lon: west, lat: south },
      { lon: east, lat: south },
      { lon: east, lat: north },
      { lon: west, lat: north },
    ],
  ];
}

const algeria = countryFixture("DZA", "Algérie");
const capeVerde = countryFixture("CPV", "Cap-Vert");

const tinyComparison: WorldCompareEntry = {
  id: "BOX_S",
  nameFr: "Petite forme",
  rings: box(0, 0, 1, 1),
};

const vastComparison: WorldCompareEntry = {
  id: "BOX_L",
  nameFr: "Grande forme",
  rings: box(0, -20, 40, 20),
};

const frenchNumber = new Intl.NumberFormat("fr-FR");

function trueAreaKm2(countryId: string): number {
  return getAdmin0Rings(countryId).reduce(
    (total, ring) => total + ringArea(ring),
    0
  );
}

describe("buildTrueSizeRound", () => {
  // @req REQ-120
  it("lays the African outline against the comparison one, at true area", () => {
    const round = buildTrueSizeRound(algeria, tinyComparison);

    expect(round.kind).toBe("areaCompare");
    expect(round.gameId).toBe("vraie-taille");
    expect(round.subjectId).toBe("DZA");
    expect(round.promptFr).toBe(getGameBySlug("vraie-taille").promptFr);
    expect(round.questionFr).toBe("Laquelle est la plus grande ?");
    expect(round.shapes.map((shape) => shape.labelFr)).toEqual([
      "Algérie",
      "Petite forme",
    ]);
    expect(round.shapes[0].rings).toEqual(getAdmin0Rings("DZA"));
    expect(round.shapes[1].rings).toEqual(tinyComparison.rings);
    expect(round.shapes[0].areaKm2).toBeCloseTo(trueAreaKm2("DZA"), 0);
  });

  // @req REQ-120
  it("answers with the genuinely larger outline, whichever side it is on", () => {
    expect(buildTrueSizeRound(algeria, tinyComparison).correctIndex).toBe(0);
    expect(buildTrueSizeRound(algeria, vastComparison).correctIndex).toBe(1);
  });

  // @req REQ-120
  it("reveals both areas and how many times one fits into the other", () => {
    const round = buildTrueSizeRound(algeria, vastComparison);

    expect(round.reveal.textFr).toContain(
      frenchNumber.format(Math.round(trueAreaKm2("DZA")))
    );
    expect(round.reveal.textFr).toContain("km²");
    expect(round.reveal.textFr).toMatch(/\d+,\d fois/);
  });

  // @req REQ-120
  it("returns null when the two outlines are too close to separate", () => {
    const sameShape: WorldCompareEntry = {
      id: "DZA_COPY",
      nameFr: "Copie",
      rings: getAdmin0Rings("DZA"),
    };

    expect(buildTrueSizeRound(algeria, sameShape)).toBeNull();
  });

  // @req REQ-120
  it("returns null when the African country has no committed outline", () => {
    expect(buildTrueSizeRound(capeVerde, tinyComparison)).toBeNull();
  });

  // @req REQ-120
  it("returns null when the comparison carries no outline", () => {
    expect(
      buildTrueSizeRound(algeria, {
        id: "BOX_EMPTY",
        nameFr: "Forme absente",
        rings: [],
      })
    ).toBeNull();
  });
});
