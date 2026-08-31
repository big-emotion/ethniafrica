import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import { ExplorerContinent } from "@/components/hubs/ExplorerContinent";
import type { CountryOutlineOverlay, Ring } from "@/lib/atlas/overlays";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";

// Paint, and the only thing on the stage that needs a GPU. Mocked so the
// contract below is read off the DOM the reader operates rather than off a
// driver the test runner does not have.
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
}));

let triggerIntersection: (() => void) | null = null;

class StubIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    triggerIntersection = () =>
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

/**
 * Three countries the corpus documents unequally, and one it barely documents
 * at all. The gap is the point: TZA carries a radial field and CPV does not,
 * and the marks still have to come out identical.
 */
const COUNTS = { TZA: 99, NGA: 68, GHA: 51 };
const OFFERED = ["TZA", "NGA", "GHA", "CPV"];

async function continentHub() {
  const view = render(
    <ExplorerContinent
      peopleCountsByCountry={COUNTS}
      countryIds={OFFERED}
      missingMessage="rien à afficher"
    />
  );
  act(() => triggerIntersection?.());
  await waitFor(() =>
    expect(view.container.querySelector("[data-atlas-stage]")).not.toBeNull()
  );
  return view;
}

beforeEach(() => {
  triggerIntersection = null;
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * What a mark on the atlas stage is allowed to say (charter §1).
 *
 * One thing only: this country opens. How much the corpus holds there is the
 * radial field's claim, and the field is sized from the data. The stage used
 * to draw two shapes of mark — a 22px bordered button on the twelve countries
 * the field ranks, a 7px dot on the other forty-two — so the twelve read as a
 * different *kind* of thing rather than as the same offer, better documented.
 * The corpus declares no such hierarchy: all fifty-four open the same fiche
 * the same way, and the marks now say exactly that and nothing more.
 */
describe("atlas marks — one offer, one shape (charter §1)", () => {
  // @req REQ-116
  it("gives every country the hub offers the same mark, privileging none", async () => {
    const { container } = await continentHub();

    expect(container.querySelectorAll("[data-atlas-target]")).toHaveLength(0);

    const marks = [
      ...container.querySelectorAll<HTMLElement>("[data-atlas-choice]"),
    ];
    expect(marks.map((mark) => mark.dataset.atlasChoice).sort()).toEqual(
      [...OFFERED].sort()
    );

    const shapes = new Set(
      marks.map(
        (mark) =>
          `${mark.style.width}/${mark.style.backgroundColor}/${mark.style.boxShadow}`
      )
    );
    expect(shapes.size).toBe(1);
  });

  // The 22px markers were the hub's only focusable countries. Removing them
  // without the list would have left the continent reachable by mouse alone.
  // @req REQ-117
  it("keeps every country reachable from the keyboard once no mark is a button", async () => {
    await continentHub();

    expect(
      screen.getByRole("button", { name: "Choisir un pays de l'atlas" })
    ).toBeInTheDocument();
  });
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

  // @req REQ-117
  it("tells the reader a point is a country that opens, on a scene that marks countries", async () => {
    const { container } = await continentHub();

    expect(container.querySelector("[data-atlas-legend]")).toHaveTextContent(
      "appuyez sur un point pour ouvrir le pays"
    );
  });

  // Both were pinned to the top edge of the stage, the picker centred and the
  // legend full-width, so the sentence ran under the button. Every fixed
  // offset that cleared it on a desktop ran under it at 430px, where the
  // picker wraps to two lines — the two have to be in one column.
  // @req REQ-117
  it("stacks the legend under the picker instead of pinning both to the top edge", async () => {
    const { container } = await continentHub();

    const legend = container.querySelector("[data-atlas-legend]");
    const picker = screen.getByRole("button", {
      name: "Choisir un pays de l'atlas",
    });

    expect(legend?.parentElement?.contains(picker)).toBe(true);
    expect(
      legend?.compareDocumentPosition(picker) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy();
  });

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
