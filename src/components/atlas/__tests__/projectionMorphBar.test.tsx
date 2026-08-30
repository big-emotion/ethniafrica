import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import type { CountryOutlineOverlay, Ring } from "@/lib/atlas/overlays";

// The morph only ever exists as a float uniform inside a shader, so the mock
// publishes it. A test that cannot read it can only assert which control is on
// screen, and the control is not the thing this surface is judged on.
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: ({ pose }: { pose: { morph: number } }) => (
    <canvas data-testid="atlas-globe-canvas-mock" data-morph={pose.morph} />
  ),
}));

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

const MORPH_BAR_NAME = "Morphing de la carte plate vers le globe";

function morphOf(container: HTMLElement): number {
  const canvas = container.querySelector(
    "[data-testid='atlas-globe-canvas-mock']"
  );
  return Number(canvas?.getAttribute("data-morph"));
}

function morphBar(): HTMLElement {
  return screen.getByRole("slider", { name: MORPH_BAR_NAME });
}

function queryMorphBar(): HTMLElement | null {
  return screen.queryByRole("slider", { name: MORPH_BAR_NAME });
}

/**
 * `probedWebglSupport` seeds the first commit only — the globe's own probe
 * runs on mount and overwrites it — so a stage that has to stay a sphere for
 * the length of a test needs the probe itself to answer yes.
 */
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as unknown as RenderingContext
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The control the projection argument is made with (REQ-112, REQ-117).
 *
 * Two surfaces exist to show that a flat map lies about surface area — the
 * home's featured module and /jouer/mercator — and on both the demonstration
 * *is* the movement: the reader closes the Mercator plane back into a sphere
 * and watches every indicatrice shrink to the same size on the way. The engine
 * retired by ETNI-1360 gave them a labelled range to do it with; the
 * consolidation onto AtlasGlobe replaced it with a two-state button, which
 * skips the middle — and the middle was the argument.
 *
 * The engine never lost the ability: `morph` is a float uniform `camera.ts`
 * already interpolates. What was lost was the way in, which is why every test
 * here reads the morph off the surface rather than off the control beside it.
 */
describe("the projection morph bar", () => {
  // @req REQ-117
  it("offers a range from the flat map to the globe rather than a two-state button", () => {
    render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    expect(morphBar()).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ce que la carte plate en fait" })
    ).not.toBeInTheDocument();
  });

  /**
   * Why the bar is a range and not a switch: a value between the ends has to
   * reach the shader, or the middle of the drag draws nothing new and the
   * reader watches a jump they could have had from a button.
   */
  // @req REQ-117
  it("carries an intermediate position through to the surface", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    expect(morphOf(container)).toBe(1);

    fireEvent.change(morphBar(), { target: { value: "40" } });

    expect(morphOf(container)).toBeCloseTo(0.4, 5);
  });

  // @req REQ-117
  it("reaches both ends exactly, so the flat map is flat and the globe is round", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    fireEvent.change(morphBar(), { target: { value: "0" } });
    expect(morphOf(container)).toBe(0);

    fireEvent.change(morphBar(), { target: { value: "100" } });
    expect(morphOf(container)).toBe(1);
  });

  /**
   * A screen reader announcing « 47 » says nothing about a surface. What the
   * sighted reader gets is the shape they are watching, so that is what the
   * value has to carry.
   */
  // @req REQ-117
  it("announces the surface it is showing, never the number behind it", () => {
    render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    expect(morphBar()).toHaveAttribute("aria-valuetext", "Globe");

    fireEvent.change(morphBar(), { target: { value: "0" } });
    expect(morphBar()).toHaveAttribute("aria-valuetext", "Carte plate");

    fireEvent.change(morphBar(), { target: { value: "50" } });
    expect(morphBar()).toHaveAttribute(
      "aria-valuetext",
      "Projection intermédiaire"
    );
  });

  /**
   * The two ends are the whole legend of this control, and the actions charter
   * §2 rule holds for them: the label survives every breakpoint. An unlabelled
   * range asks the reader to guess which way is which.
   */
  // @req REQ-117
  it("names both ends of the range", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    const bar = container.querySelector("[data-atlas-morph]");
    expect(bar).toHaveTextContent("Carte plate");
    expect(bar).toHaveTextContent("Globe");
  });

  /**
   * The readout is what makes the middle of the drag mean something: it names
   * what the reader is looking at while the plane is closing, and states the
   * measurement the indicatrices carry at either end.
   */
  // @req REQ-117
  it("says what the surface underneath is doing to area", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    const readout = () => container.querySelector("[data-atlas-morph-readout]");

    expect(readout()).toHaveTextContent("30,4 M km²");

    fireEvent.change(morphBar(), { target: { value: "0" } });
    expect(readout()).toHaveTextContent("Mercator");

    fireEvent.change(morphBar(), { target: { value: "50" } });
    expect(readout()).toHaveTextContent("repli");
  });

  // @req REQ-117
  it("returns the globe when the reader recentres", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport
        missingMessage="absent"
      />
    );

    fireEvent.change(morphBar(), { target: { value: "0" } });
    expect(morphOf(container)).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Recentrer" }));

    expect(morphOf(container)).toBe(1);
    expect(morphBar()).toHaveAttribute("aria-valuetext", "Globe");
  });

  /**
   * A round owns the projection on /jouer/mercator, and a pin withdraws the
   * reader's control rather than disabling it — a range that refuses to move
   * reads as a broken page. The note takes its slot and says why.
   */
  // @req REQ-120
  it("withdraws itself when a round pins the projection", () => {
    render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        pinnedProjection="flat"
        pinnedProjectionNote="La carte reste à plat pendant la question."
        missingMessage="absent"
      />
    );

    expect(queryMorphBar()).not.toBeInTheDocument();
    expect(
      screen.getByText("La carte reste à plat pendant la question.")
    ).toBeInTheDocument();
  });

  /**
   * Without WebGL the stage is the committed SVG basemap, which has no morph
   * to run. Offering the bar there would be a control moving a number nothing
   * reads — the dead affordance « Glissez pour tourner » already was on the
   * flat map before `surfaceTurns` was introduced.
   */
  // @req REQ-112
  it("is not offered on a surface that cannot morph", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(
      <AtlasGlobe
        overlay={countryOverlay}
        projectionControl="morph"
        probedWebglSupport={false}
        missingMessage="absent"
      />
    );

    expect(queryMorphBar()).not.toBeInTheDocument();
  });

  /**
   * A fiche shows a people or a country and makes no claim about area, so it
   * has no argument to run and keeps the button. The bar is asked for, never
   * assumed.
   */
  // @req REQ-117
  it("leaves every other surface on the two-state button", () => {
    render(<AtlasGlobe overlay={countryOverlay} missingMessage="absent" />);

    expect(
      screen.getByRole("button", { name: "Ce que la carte plate en fait" })
    ).toBeInTheDocument();
    expect(queryMorphBar()).not.toBeInTheDocument();
  });
});
