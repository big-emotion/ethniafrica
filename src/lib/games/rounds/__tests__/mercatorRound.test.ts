import { describe, expect, it } from "vitest";
import type { GameCountryFixture } from "@/lib/games/corpus";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { ringArea } from "@/lib/games/sphericalArea";
import { frenchNumber } from "@/lib/games/format";
import { buildMercatorRound, mercatorMisleads } from "../mercatorRound";

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
    sources: [],
    confidence: null,
    ...overrides,
  };
}

const algeria = countryFixture("DZA", "Algérie");
const chad = countryFixture("TCD", "Tchad");
const kenya = countryFixture("KEN", "Kenya");
const botswana = countryFixture("BWA", "Botswana");
const senegal = countryFixture("SEN", "Sénégal");
const tunisia = countryFixture("TUN", "Tunisie");
const undrawable = countryFixture("SHN", "Sainte-Hélène");

/** Total spherical area of a country's committed outline, islands included. */
function trueAreaKm2(countryId: string): number {
  return getAdmin0Rings(countryId).reduce(
    (total, ring) => total + ringArea(ring),
    0
  );
}

describe("buildMercatorRound", () => {
  // @req REQ-120
  it("answers with the country that truly covers more ground", () => {
    const round = buildMercatorRound(algeria, chad);

    expect(round.kind).toBe("binary");
    expect(round.gameId).toBe("mercator");
    expect(round.subjectId).toBe("DZA");
    expect(round.promptFr).toBe(getGameBySlug("mercator").promptFr);
    expect(round.options.map((option) => option.labelFr)).toEqual([
      "Algérie",
      "Tchad",
    ]);
    expect(round.correctIndex).toBe(0);
  });

  // @req REQ-120
  it("keeps the same answer when the pair is passed the other way round", () => {
    expect(buildMercatorRound(chad, algeria).correctIndex).toBe(1);
  });

  // @req REQ-120
  it("reveals both true areas and how much Mercator inflates each", () => {
    const round = buildMercatorRound(algeria, chad);

    expect(round.reveal.textFr).toContain(
      frenchNumber.format(Math.round(trueAreaKm2("DZA")))
    );
    expect(round.reveal.textFr).toContain(
      frenchNumber.format(Math.round(trueAreaKm2("TCD")))
    );
    expect(round.reveal.textFr).toContain("km²");
    // Algeria sits near 28° N and is drawn about 1,3 times its true size;
    // Chad, closer to the equator, barely 1,1 times.
    expect(round.reveal.textFr).toContain("1,3");
    expect(round.reveal.textFr).toContain("1,1");
    expect(round.reveal.fieldPath).toBe("lib/atlas/assets/africaAdmin0");
  });

  // Kenya and Botswana are within a thousandth of each other: no reader could
  // answer that honestly, so there is no round.
  // @req REQ-120
  it("returns null when the two areas are too close to separate", () => {
    expect(buildMercatorRound(kenya, botswana)).toBeNull();
  });

  // @req REQ-120
  it("returns null when a country has no committed outline", () => {
    expect(buildMercatorRound(undrawable, chad)).toBeNull();
    expect(buildMercatorRound(chad, undrawable)).toBeNull();
  });
});

describe("mercatorMisleads", () => {
  // Senegal is larger than Tunisia, yet Mercator draws Tunisia bigger — the
  // pair the game exists for.
  // @req REQ-120
  it("flags a pair where the larger country is drawn smaller", () => {
    expect(mercatorMisleads(senegal, tunisia)).toBe(true);
    expect(mercatorMisleads(tunisia, senegal)).toBe(true);
  });

  // @req REQ-120
  it("does not flag a pair Mercator ranks correctly", () => {
    expect(mercatorMisleads(algeria, chad)).toBe(false);
  });

  // @req REQ-120
  it("does not flag a pair one of whose outlines is missing", () => {
    expect(mercatorMisleads(undrawable, tunisia)).toBe(false);
  });
});
