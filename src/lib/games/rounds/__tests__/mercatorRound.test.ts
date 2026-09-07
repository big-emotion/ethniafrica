import { describe, expect, it } from "vitest";
import type { GameCountryFixture } from "@/lib/games/corpus";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import { ringArea } from "@/lib/games/sphericalArea";
import { frenchNumber } from "@/lib/games/format";
import { NON_AFRICAN_SILHOUETTES } from "@/lib/games/territory";
import {
  COMPARISON_PROMPT_FR,
  buildMercatorRound,
  mercatorMisleads,
} from "../mercatorRound";
import { INFLATION_PROMPT_FR } from "../inflationRound";

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
    expect(round.promptFr).toBe(COMPARISON_PROMPT_FR);
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

/**
 * The registry's prompt is the line printed above every round. It held this
 * game's one question while the game had one, and went on holding it after a
 * second and a third shipped — announcing « lequel est le plus grand ? » above
 * a slider.
 */
describe("the standing line and the stems", () => {
  const standing = getGameBySlug("mercator").promptFr;

  // @req REQ-120
  it("states the game's claim rather than one of its questions", () => {
    expect(standing).not.toBe(COMPARISON_PROMPT_FR);
    expect(standing).not.toBe(INFLATION_PROMPT_FR);
    expect(standing).not.toContain("?");
  });

  // @req REQ-120
  it("gives each question a stem of its own", () => {
    expect(COMPARISON_PROMPT_FR).not.toBe(INFLATION_PROMPT_FR);
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

/**
 * The comparison this page was built to make, and could not: Greenland lives
 * in the `worldCompare` asset rather than in the corpus, so no round could
 * name it. Inside Africa the projection barely lies — its factor runs from
 * 1,00 to 1,46 — and the striking inversion sat one asset away.
 */
describe("a comparison that reaches outside the continent", () => {
  const greenland = NON_AFRICAN_SILHOUETTES.find(({ id }) => id === "GRL");
  const congo = countryFixture("COD", "République démocratique du Congo");

  // @req REQ-120
  it("flags Greenland against the Congo, which truly outranks it", () => {
    expect(mercatorMisleads(greenland, congo)).toBe(true);
  });

  // @req REQ-120
  it("answers with the Congo and states how far Mercator inflates Greenland", () => {
    const round = buildMercatorRound(greenland, congo);

    expect(round.correctIndex).toBe(1);
    expect(round.reveal.textFr).toContain("Groenland");
    // 14,3 times itself — the figure the whole page is an argument about.
    expect(round.reveal.textFr).toContain("14,3");
  });

  /**
   * A silhouette has no fiche. Routing the reveal to `/pays/GRL` would be a
   * 404 behind an id that looks like an ISO code because, for Greenland, it
   * is one.
   */
  // @req REQ-120
  it("leads to the fiche of the African half, whichever side it was passed on", () => {
    expect(buildMercatorRound(greenland, congo).reveal.ficheHref).toContain(
      "COD"
    );
    expect(buildMercatorRound(congo, greenland).reveal.ficheHref).toContain(
      "COD"
    );
  });
});
