import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import type {
  CountryOutlineOverlay,
  PeopleFieldOverlay,
  Ring,
} from "@/lib/atlas/overlays";
import {
  BOTTOM_SHEET_VIEW_FRACTION,
  PANEL_SIDE_BREAKPOINT_PX,
  SIDE_PANEL_VIEW_FRACTION,
} from "@/lib/atlas/panelBias";

// The mock reflects the props back as attributes: what AtlasGlobe hands the
// WebGL path is the contract under test here, and a real GL context in
// happy-dom would test the driver instead.
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: ({
    morph,
    focusedCountryId,
    pose,
  }: {
    morph?: number;
    focusedCountryId?: string | null;
    pose: { yaw: number; pitch: number };
  }) => (
    <canvas
      data-testid="atlas-globe-canvas-mock"
      data-morph={String(morph)}
      data-focused={focusedCountryId ?? ""}
      data-yaw={pose.yaw.toFixed(4)}
      data-pitch={pose.pitch.toFixed(4)}
    />
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

const peopleOverlay: PeopleFieldOverlay = {
  kind: "people-field",
  areas: [{ countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 }],
  undrawn: [],
};

/** The two peoples of the family fiche below sit far enough apart to tell their markers apart. */
const familyPeopleOverlay: PeopleFieldOverlay = {
  kind: "people-field",
  areas: [
    { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    { countryId: "ZAF", center: { lon: 25, lat: -29 }, populationShare: 0.4 },
  ],
  undrawn: [],
};

function percentOf(value: string): number {
  return Number.parseFloat(value.replace("%", ""));
}

function markerFor(countryId: string): HTMLElement {
  const marker = document.querySelector<HTMLElement>(
    `[data-atlas-target="${countryId}"]`
  );
  if (!marker) throw new Error(`no marker rendered for ${countryId}`);
  return marker;
}

describe("AtlasGlobe", () => {
  let matchMediaDescriptor: PropertyDescriptor | undefined;
  let innerWidthDescriptor: PropertyDescriptor | undefined;

  /** Both media queries this component asks about, answered per test. */
  function stubMatchMedia({ reducedMotion }: { reducedMotion: boolean }) {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion") && reducedMotion,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  function setViewportWidth(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: width,
    });
  }

  beforeEach(() => {
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );
    innerWidthDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "innerWidth"
    );
    stubMatchMedia({ reducedMotion: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
    if (innerWidthDescriptor) {
      Object.defineProperty(window, "innerWidth", innerWidthDescriptor);
    }
  });

  // @req REQ-119
  it("renders the declared-missing placeholder instead of an empty globe when the overlay is null", () => {
    render(
      <AtlasGlobe overlay={null} missingMessage="Contour non disponible" />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Contour non disponible"
    );
    expect(document.querySelector("canvas")).not.toBeInTheDocument();
  });

  // @req REQ-119
  it("renders the declared-missing placeholder for a people-field-missing overlay", () => {
    render(
      <AtlasGlobe
        overlay={{ kind: "people-field-missing", undrawn: [] }}
        missingMessage="Répartition non renseignée"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Répartition non renseignée"
    );
  });

  // @req REQ-116
  it("renders the SVG fallback before WebGL support has been probed", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<AtlasGlobe overlay={countryOverlay} missingMessage="n/a" />);

    expect(document.querySelector("svg")).toBeInTheDocument();
    expect(document.querySelector("canvas")).not.toBeInTheDocument();
  });

  // @req REQ-116
  it("mounts the WebGL canvas once a WebGL context is confirmed available", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(<AtlasGlobe overlay={peopleOverlay} missingMessage="n/a" />);

    await waitFor(() => {
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument();
    });
  });

  // @req REQ-116
  it("never throws when no WebGL context can be created, falling back to SVG", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() =>
      render(<AtlasGlobe overlay={peopleOverlay} missingMessage="n/a" />)
    ).not.toThrow();
  });

  /**
   * Reduced motion is the deterministic way in: the camera lands on its
   * destination without a traversal, so these assertions describe where the
   * subject SETTLES — the flight itself is covered in camera.test.ts.
   */
  describe("choosing a target (REQ-117)", () => {
    beforeEach(() => {
      stubMatchMedia({ reducedMotion: true });
    });

    // @req REQ-117
    it("offers one choosable target per country, named in French rather than by ISO code", () => {
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      expect(
        screen.getByRole("button", { name: "Nigeria" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Afrique du Sud" })
      ).toBeInTheDocument();
    });

    // @req REQ-117
    it("opens the facts panel on the chosen target, and marks that target as the chosen one", () => {
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      expect(screen.getByRole("dialog", { name: "Nigeria" })).toBeVisible();
      expect(markerFor("NGA")).toHaveAttribute("aria-pressed", "true");
      expect(markerFor("ZAF")).toHaveAttribute("aria-pressed", "false");
    });

    // @req REQ-117
    it("settles the subject above a bottom sheet, clear of the panel it opened", () => {
      setViewportWidth(430);
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      const panelTopEdgePercent = (1 - BOTTOM_SHEET_VIEW_FRACTION) * 100;
      const settledTopPercent = percentOf(markerFor("NGA").style.top);

      expect(settledTopPercent).toBeLessThan(panelTopEdgePercent);
      // Dead centre of the strip the sheet leaves free — an unbiased camera
      // would sit at 50% and still clear the edge, so pin the real position.
      expect(settledTopPercent).toBeCloseTo(panelTopEdgePercent / 2, 1);
    });

    // @req REQ-117
    it("settles the subject left of a side panel, clear of the panel it opened", () => {
      setViewportWidth(PANEL_SIDE_BREAKPOINT_PX);
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      const panelLeftEdgePercent = (1 - SIDE_PANEL_VIEW_FRACTION) * 100;
      const settledLeftPercent = percentOf(markerFor("NGA").style.left);

      expect(settledLeftPercent).toBeLessThan(panelLeftEdgePercent);
      expect(settledLeftPercent).toBeCloseTo(panelLeftEdgePercent / 2, 1);
    });

    // @req REQ-117
    it("swaps the facts when another target is chosen, instead of dismissing the panel", () => {
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));
      fireEvent.click(screen.getByRole("button", { name: "Afrique du Sud" }));

      expect(
        screen.getByRole("dialog", { name: "Afrique du Sud" })
      ).toBeVisible();
      expect(markerFor("NGA")).toHaveAttribute("aria-pressed", "false");
    });

    // Facts arrive as data rather than as a resolver function: the fiche
    // routes are server components, and a function cannot cross into a client
    // one. Passing a builder would have made this unusable from the only
    // caller that matters.
    // @req REQ-117
    it("gives the fiche the last word on what a target's facts are", () => {
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          missingMessage="n/a"
          facts={{
            NGA: {
              title: "Peuple au Nigeria",
              body: <p>82 % de la population</p>,
            },
          }}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Peuple au Nigeria" })
      );

      expect(screen.getByText("82 % de la population")).toBeInTheDocument();
    });

    // @req REQ-117
    it("falls back to the country's French name for a target the fiche said nothing about", () => {
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          missingMessage="n/a"
          facts={{ NGA: { title: "Peuple au Nigeria" } }}
        />
      );

      expect(
        screen.getByRole("button", { name: "Afrique du Sud" })
      ).toBeInTheDocument();
    });

    // @req REQ-117
    it("releases the chosen target when the panel is closed", async () => {
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));
      fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(markerFor("NGA")).toHaveAttribute("aria-pressed", "false");
    });

    // @req REQ-117
    it("offers the same targets and the same facts without WebGL, so the fallback is not a lesser fiche", () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      setViewportWidth(430);
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      expect(document.querySelector("canvas")).not.toBeInTheDocument();
      expect(screen.getByRole("dialog", { name: "Nigeria" })).toBeVisible();
      expect(percentOf(markerFor("NGA").style.top)).toBeLessThan(
        (1 - BOTTOM_SHEET_VIEW_FRACTION) * 100
      );
    });

    // @req REQ-117
    it("offers nothing to choose on a globe that declared itself empty", () => {
      render(
        <AtlasGlobe
          overlay={{ kind: "people-field-missing", undrawn: [] }}
          missingMessage="Répartition non renseignée"
        />
      );

      expect(
        document.querySelector("[data-atlas-target]")
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Focus dimming shipped in the SVG fallback and nowhere else: choosing a
   * country faded the other halos without WebGL and did nothing with it. Both
   * renderers now read the same peopleField.ts, and these assertions are about
   * each path actually being handed the state.
   */
  describe("focusing one country of a people's field (REQ-116)", () => {
    beforeEach(() => {
      stubMatchMedia({ reducedMotion: true });
    });

    // @req REQ-116
    it("tells the WebGL path which country holds attention", async () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        {} as unknown as RenderingContext
      );
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      await waitFor(() => {
        expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
          "data-focused",
          ""
        );
      });

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
        "data-focused",
        "NGA"
      );
    });

    // The hard rule (charter §1) under a state that did not exist when it was
    // written: dimming must scale the halo's falloff, never draw its edge.
    // @req REQ-116
    it("dims the other halos without giving any of them a border", () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      const halos = [...document.querySelectorAll("circle")];
      expect(halos).toHaveLength(2);
      halos.forEach((halo) => {
        expect(halo).toHaveAttribute("stroke", "none");
        expect(Number(halo.getAttribute("opacity"))).toBeGreaterThan(0);
      });
      expect(document.querySelector("polygon")).not.toBeInTheDocument();
    });
  });

  describe("the globe's own commands (REQ-117)", () => {
    beforeEach(() => {
      stubMatchMedia({ reducedMotion: true });
    });

    // Flattening is the one control here that makes an argument rather than a
    // convenience: the reader watches Africa shrink against the high latitudes
    // instead of being told that it does.
    // @req REQ-116
    it("unrolls the sphere into Mercator and back", async () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        {} as unknown as RenderingContext
      );
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      await waitFor(() => {
        expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
          "data-morph",
          "1"
        );
      });

      fireEvent.click(
        screen.getByRole("button", { name: "Ce que la carte plate en fait" })
      );
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
        "data-morph",
        "0"
      );

      fireEvent.click(screen.getByRole("button", { name: "Revenir au globe" }));
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
        "data-morph",
        "1"
      );
    });

    // The fallback IS the flat map. Offering to flatten it would name a change
    // the reader cannot be shown.
    // @req REQ-116
    it("does not offer to flatten a map that is already flat", () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      expect(
        screen.queryByRole("button", { name: /carte plate/ })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Recentrer" })
      ).toBeInTheDocument();
    });

    // @req REQ-117
    it("recentring drops the choice, the flattening and the reader's turning at once", async () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        {} as unknown as RenderingContext
      );
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      await waitFor(() => {
        expect(
          screen.getByTestId("atlas-globe-canvas-mock")
        ).toBeInTheDocument();
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Ce que la carte plate en fait" })
      );
      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));
      expect(screen.getByRole("dialog", { name: "Nigeria" })).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "Recentrer" }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
        "data-morph",
        "1"
      );
      expect(markerFor("NGA")).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("what the fallback says out loud (REQ-116)", () => {
    // AfricaBasemap is aria-hidden, so without WebGL the map itself tells a
    // screen reader nothing at all. The note is the whole of what that reader
    // gets, which is why it has to name the people and the count rather than
    // announce that a map is present.
    // @req REQ-116
    it("names what the flat map is showing when there is no WebGL", () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          missingMessage="n/a"
          fallbackNote="Les 2 pays de présence Yoruba, sans rendu 3D. Aucune limite n'est tracée : ce sont des densités, pas un territoire."
        />
      );

      expect(screen.getByText(/2 pays de présence Yoruba/)).toBeInTheDocument();
      expect(screen.getByText(/pas un territoire/)).toBeInTheDocument();
    });

    // @req REQ-116
    it("says nothing extra on the WebGL path, where the globe speaks for itself", async () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        {} as unknown as RenderingContext
      );
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          missingMessage="n/a"
          fallbackNote="Les 2 pays de présence Yoruba, sans rendu 3D."
        />
      );

      await waitFor(() => {
        expect(
          screen.getByTestId("atlas-globe-canvas-mock")
        ).toBeInTheDocument();
      });
      expect(screen.queryByText(/sans rendu 3D/)).not.toBeInTheDocument();
    });
  });

  describe("turning the globe by hand (REQ-117)", () => {
    beforeEach(() => {
      stubMatchMedia({ reducedMotion: true });
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        {} as unknown as RenderingContext
      );
    });

    // A country on the far side of the sphere has no marker to click, so
    // without a drag it is unreachable — the picker in the toolbar is the
    // other half of the same problem.
    // @req REQ-117
    it("turns the surface with the pointer instead of leaving the far side unreachable", async () => {
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      await waitFor(() => {
        expect(
          screen.getByTestId("atlas-globe-canvas-mock")
        ).toBeInTheDocument();
      });
      const stage = document.querySelector<HTMLElement>("[data-atlas-stage]");
      if (!stage) throw new Error("no stage rendered");
      const yawBefore = Number(
        screen.getByTestId("atlas-globe-canvas-mock").dataset.yaw
      );

      fireEvent.pointerDown(stage, {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });
      fireEvent.pointerMove(stage, {
        pointerId: 1,
        clientX: 160,
        clientY: 100,
      });
      fireEvent.pointerUp(stage, { pointerId: 1 });

      expect(
        Number(screen.getByTestId("atlas-globe-canvas-mock").dataset.yaw)
      ).not.toBeCloseTo(yawBefore, 3);
    });

    // @req REQ-117
    it("leaves the surface where it is until a pointer is actually down", async () => {
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      await waitFor(() => {
        expect(
          screen.getByTestId("atlas-globe-canvas-mock")
        ).toBeInTheDocument();
      });
      const stage = document.querySelector<HTMLElement>("[data-atlas-stage]");
      if (!stage) throw new Error("no stage rendered");
      const yawBefore = Number(
        screen.getByTestId("atlas-globe-canvas-mock").dataset.yaw
      );

      fireEvent.pointerMove(stage, {
        pointerId: 1,
        clientX: 300,
        clientY: 100,
      });

      expect(
        Number(screen.getByTestId("atlas-globe-canvas-mock").dataset.yaw)
      ).toBeCloseTo(yawBefore, 4);
    });
  });
});
