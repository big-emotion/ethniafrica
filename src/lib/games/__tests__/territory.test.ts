import { describe, expect, it } from "vitest";

import { WORLD_ADMIN0 } from "@/lib/atlas/assets/worldAdmin0";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import {
  NON_AFRICAN_SILHOUETTES,
  isAfricanTerritory,
  territoryFootprint,
} from "@/lib/games/territory";

/**
 * The pool a Mercator round may draw an option from.
 *
 * Every assertion here is about a *disagreement between two assets* — the one
 * failure mode a second world asset introduces. A country present in both
 * would let one reveal state two areas for it; a country present in neither
 * would be offered as an option the globe cannot draw.
 */
describe("territory pool", () => {
  // @req REQ-120
  it("keeps the two world assets disjoint, so no country has two areas", () => {
    const overlap = Object.keys(WORLD_ADMIN0).filter(
      (id) => id in WORLD_COMPARE
    );

    expect(overlap).toEqual([]);
  });

  // @req REQ-120
  it("never borrows a country the African asset already draws", () => {
    const overlap = Object.keys(WORLD_ADMIN0).filter(
      (id) => id in AFRICA_ADMIN0
    );

    expect(overlap).toEqual([]);
  });

  // @req REQ-120
  it("offers every world country as a comparable territory", () => {
    const offered = new Set(NON_AFRICAN_SILHOUETTES.map(({ id }) => id));

    for (const id of Object.keys(WORLD_ADMIN0)) {
      expect(offered.has(id)).toBe(true);
    }
  });

  // @req REQ-120
  it("measures every offered territory, so no option is unanswerable", () => {
    for (const territory of NON_AFRICAN_SILHOUETTES) {
      expect(territoryFootprint(territory)?.trueAreaKm2).toBeGreaterThan(0);
    }
  });

  // @req REQ-120
  it("counts no borrowed country as African, so no reveal links to a fiche that does not exist", () => {
    for (const territory of NON_AFRICAN_SILHOUETTES) {
      expect(isAfricanTerritory(territory)).toBe(false);
    }
  });

  /**
   * The worked examples the widening exists to make possible, held as tests
   * because they are the claim itself: a country of the north drawn far larger
   * than an African country that really covers more ground.
   *
   * France against Côte d'Ivoire is deliberately not one of them. Mainland
   * France is 546 000 km² against 331 000, so the flat map exaggerates that
   * gap without inverting it, and this round only asks about inversions. The
   * pair carrying the same intuition honestly is Norway's.
   */
  // @req REQ-120
  it.each([
    ["NOR", "CIV"],
    ["FRA", "MDG"],
    ["SWE", "CMR"],
  ])(
    "draws %s larger than the %s that is actually bigger",
    (north, african) => {
      const northern = territoryFootprint({ id: north, nameFr: north });
      const southern = territoryFootprint({ id: african, nameFr: african });

      expect(southern.trueAreaKm2).toBeGreaterThan(northern.trueAreaKm2);
      expect(northern.drawnAreaKm2).toBeGreaterThan(southern.drawnAreaKm2);
    }
  );

  /**
   * The outlines are simplified, so an area they state is approximate, and
   * `MINIMUM_AREA_RATIO` has to stay clear of that approximation or a round can
   * be asked about a difference the simplification invented.
   *
   * Published figures rather than the source geometry, because this is the
   * number the reveal prints and the reader may go and check.
   *
   * Two countries are missing from this list on purpose, both for the same
   * reason: their area is carried by a chain of islands, and a shape rule
   * written for a mainland cannot hold it. The United Kingdom measured 4,7 %
   * short of its published area, and Japan 3,8 % short once Okinawa fell
   * outside the mainland radius. Neither is offered as an option — a wrong
   * figure on a reveal is worse than a country the game does not name.
   */
  // @req REQ-120
  it("measures each world country within 3% of its published area", () => {
    const published: Record<string, number> = {
      FRA: 551695,
      DEU: 357596,
      ESP: 505990,
      ITA: 302073,
      POL: 312696,
      SWE: 450295,
      NOR: 323802,
      FIN: 338455,
      ISL: 103000,
      KAZ: 2724900,
      MNG: 1564110,
      TUR: 783562,
      IRN: 1648195,
      MEX: 1964375,
      ARG: 2780400,
      AUS: 7692024,
    };

    // Every country in the asset is checked, and no country is checked that
    // the asset does not hold: a list drifting from the asset would pass while
    // measuring nothing.
    expect(Object.keys(published).sort()).toEqual(
      Object.keys(WORLD_ADMIN0).sort()
    );

    for (const [id, reference] of Object.entries(published)) {
      const measured = territoryFootprint({ id, nameFr: id }).trueAreaKm2;
      const error = Math.abs(measured - reference) / reference;

      expect(error, `${id} measured ${Math.round(measured)}`).toBeLessThan(
        0.03
      );
    }
  });
});
