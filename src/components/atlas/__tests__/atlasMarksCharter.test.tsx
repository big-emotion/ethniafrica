import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import type { CountryOutlineOverlay, Ring } from "@/lib/atlas/overlays";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";

// Paint, and the only thing on the stage that needs a GPU. Mocked so the
// contract below is read off the DOM the reader operates rather than off a
// driver the test runner does not have.
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
}));

const COUNTS = { TZA: 99, NGA: 68, GHA: 51 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A mark that is only seen is a mark half the readers never find. The legend
 * is the one sentence the stage always shows, so it is where the offer is
 * stated — and it is stated only where marks exist.
 */
describe("atlas marks — the stage says a point opens (charter §1)", () => {
  const square: Ring = [
    { lon: 0, lat: 0 },
    { lon: 2, lat: 0 },
    { lon: 2, lat: 2 },
    { lon: 0, lat: 2 },
  ];

  const countryOverlay: CountryOutlineOverlay = {
    kind: "country-outline",
    countryId: "ZAF",
    rings: [square],
    fillOpacity: 0.22,
  };

  // A country fiche as it ships: one outline traced, its countries offered in
  // the list, and nothing marked on the stage at all. Promising a point there
  // sends the reader hunting for a target the scene never drew.
  // @req REQ-117
  it("promises no point on a scene that marks none", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={countryOverlay}
        targetPicker="list"
        pickerTargets={buildCountryPickerTargets(["ZAF", "NGA"], {
          ZAF: 12,
          NGA: 8,
        })}
        missingMessage="absent"
      />
    );

    expect(container.querySelector("[data-atlas-choice]")).toBeNull();
    expect(container.querySelector("[data-atlas-target]")).toBeNull();

    const legend = container.querySelector("[data-atlas-legend]");
    expect(legend).toHaveTextContent("Glissez pour déplacer");
    expect(legend).not.toHaveTextContent("point");
  });
});

/**
 * The other half of "a mark says this country opens" (charter §1): a scene
 * that does not open countries may not draw one.
 *
 * ContinentGlobeStage stands under exactly two surfaces — the home's featured
 * module and /jouer/mercator — and both are named after what a flat map does
 * to surface area. It reached those surfaces reusing `buildContinentOverlay`,
 * the Explorer hub's scene, and inherited the hub's whole offer with it:
 * twelve pinned countries, a stage that selects the nearest one on any tap,
 * and a legend promising « appuyez sur un point pour ouvrir le pays ». The
 * promise was false on the home, where the subject is the projection and not
 * the corpus, and on /jouer/mercator it was a way out of a standing round —
 * a tap mid-question opened a country panel over the game.
 *
 * Asserted through the stage rather than through AtlasGlobe's prop, because
 * the defect was that the stage asked for the hub's offer, not that the globe
 * failed to honour a request.
 */
describe("a projection scene opens no country (charter §1)", () => {
  // @req REQ-116
  it("draws the continent without marking a country the reader could open", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    const { container } = render(
      <ContinentGlobeStage peopleCountsByCountry={COUNTS} />
    );

    await waitFor(() =>
      expect(container.querySelector("[data-atlas-stage]")).not.toBeNull()
    );

    expect(container.querySelector("[data-atlas-target]")).toBeNull();
    expect(container.querySelector("[data-atlas-choice]")).toBeNull();
  });

  /**
   * The legend is read off what was actually placed, so dropping the marks
   * has to drop the sentence that points at them. Left behind, it sends the
   * reader tapping a sphere that answers nothing.
   */
  // @req REQ-116
  it("stops promising a point once it marks none", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    const { container } = render(
      <ContinentGlobeStage peopleCountsByCountry={COUNTS} />
    );

    await waitFor(() =>
      expect(container.querySelector("[data-atlas-legend]")).not.toBeNull()
    );

    const legend = container.querySelector("[data-atlas-legend]");
    expect(legend).toHaveTextContent("Glissez pour tourner");
    expect(legend).not.toHaveTextContent("ouvrir le pays");
  });
});
