import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import type {
  CountryOutlineOverlay,
  FamilyFootprintOverlay,
  PeopleFieldOverlay,
  Ring,
} from "@/lib/atlas/overlays";
import {
  BOTTOM_SHEET_VIEW_FRACTION,
  PANEL_SIDE_BREAKPOINT_PX,
  SIDE_PANEL_VIEW_FRACTION,
} from "@/lib/atlas/panelBias";

vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
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
};

/** Two countries at different densities, so a per-country tint is distinguishable from a flat wash. */
const familyFootprintOverlay: FamilyFootprintOverlay = {
  kind: "family-footprint",
  countries: [
    { countryId: "NGA", rings: [square], memberCount: 4, weight: 1 },
    {
      countryId: "BEN",
      rings: [
        [
          { lon: 10, lat: 0 },
          { lon: 12, lat: 0 },
          { lon: 12, lat: 2 },
          { lon: 10, lat: 2 },
        ],
      ],
      memberCount: 1,
      weight: 0.25,
    },
  ],
  memberPeopleCount: 4,
};

/** The two peoples of the family fiche below sit far enough apart to tell their markers apart. */
const familyPeopleOverlay: PeopleFieldOverlay = {
  kind: "people-field",
  areas: [
    { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    { countryId: "ZAF", center: { lon: 25, lat: -29 }, populationShare: 0.4 },
  ],
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
        overlay={{ kind: "people-field-missing" }}
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

    // @req REQ-117
    it("gives the fiche the last word on what a target's facts are", () => {
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          missingMessage="n/a"
          targetFacts={(target) => ({
            title: `Peuple au ${target.nameFr}`,
            body: <p>82 % de la population</p>,
          })}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Peuple au Nigeria" })
      );

      expect(screen.getByText("82 % de la population")).toBeInTheDocument();
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
          overlay={{ kind: "people-field-missing" }}
          missingMessage="Répartition non renseignée"
        />
      );

      expect(
        document.querySelector("[data-atlas-target]")
      ).not.toBeInTheDocument();
    });
  });

  describe("the stage the globe stands on", () => {
    const stageOf = () =>
      document.querySelector<HTMLElement>("[data-atlas-stage]")!;

    // @req REQ-116
    it("keeps the rounded card for the country and people fiches, which pass no variant", () => {
      // Those two routes must be untouched by the family band: a regression
      // here changes pages this work was never asked to change.
      render(<AtlasGlobe overlay={countryOverlay} missingMessage="n/a" />);

      const stage = stageOf();
      expect(stage.dataset.atlasStageVariant).toBe("card");
      expect(stage.style.borderRadius).toBe("var(--afh-radius-xl)");
      expect(stage.style.aspectRatio).not.toBe("");
      expect(stage.className).not.toContain("afh-fiche-globe-stage");
    });

    // @req REQ-116
    it("drops the radius and the aspect ratio in the band variant", () => {
      render(
        <AtlasGlobe
          overlay={familyFootprintOverlay}
          stageVariant="band"
          missingMessage="n/a"
        />
      );

      const stage = stageOf();
      expect(stage.dataset.atlasStageVariant).toBe("band");
      expect(stage.style.borderRadius).toBe("0px");
      // A band keyed to an aspect ratio would grow taller as the viewport
      // widens, until the parchment fell below the fold on a desktop. Its
      // heights come from a container query instead.
      expect(stage.style.aspectRatio).toBe("");
      expect(stage.className).toContain("afh-fiche-globe-stage");
    });

    // @req REQ-116
    it("stays on the night ground in both variants (DEC-022)", () => {
      render(<AtlasGlobe overlay={countryOverlay} missingMessage="n/a" />);
      expect(stageOf().style.backgroundColor).toBe("var(--afh-night-ground)");
    });
  });

  describe("how targets are offered", () => {
    beforeEach(() => {
      stubMatchMedia({ reducedMotion: true });
    });

    // @req REQ-117
    it("keeps pastilles, and no view controls, for the fiches that pass no picker", () => {
      // The country and people fiches must come through this work unchanged.
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      expect(document.querySelector("[data-atlas-target]")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /pays de l'empreinte/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("atlas-view-controls")
      ).not.toBeInTheDocument();
    });

    // @req REQ-117
    it("replaces the pastilles with a list when asked for one", () => {
      render(
        <AtlasGlobe
          overlay={familyFootprintOverlay}
          targetPicker="list"
          missingMessage="n/a"
        />
      );

      // Seventeen overlapping pastilles are why this option exists; none may
      // survive alongside the list.
      expect(
        document.querySelector("[data-atlas-target]")
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /pays de l'empreinte/i })
      ).toBeInTheDocument();
    });

    // @req REQ-117
    it("counts each country's peoples in the list from the overlay itself", () => {
      render(
        <AtlasGlobe
          overlay={familyFootprintOverlay}
          targetPicker="list"
          missingMessage="n/a"
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /pays de l'empreinte/i })
      );
      expect(screen.getByRole("option", { name: /Nigeria/ })).toHaveTextContent(
        "4 peuples"
      );
      expect(screen.getByRole("option", { name: /Bénin/ })).toHaveTextContent(
        "1 peuple"
      );
    });

    // @req REQ-117
    it("un-presses « toute l'empreinte » as soon as one country is chosen", () => {
      render(
        <AtlasGlobe
          overlay={familyFootprintOverlay}
          targetPicker="list"
          missingMessage="n/a"
        />
      );

      const whole = () =>
        screen.getByRole("button", { name: /toute l'empreinte/i });
      expect(whole()).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(
        screen.getByRole("button", { name: /pays de l'empreinte/i })
      );
      fireEvent.click(screen.getByRole("option", { name: /Nigeria/ }));

      expect(whole()).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(whole());
      expect(whole()).toHaveAttribute("aria-pressed", "true");
    });
  });

  /**
   * atlas-charter §1: an encoding may not exist in only one rendering
   * technique. Whatever the WebGL path says about the footprint, the fallback
   * has to say too — a reader without WebGL must not be shown a different map.
   */
  describe("family footprint without WebGL", () => {
    const familyFootprintPolygons = () =>
      Array.from(
        document.querySelectorAll<SVGPolygonElement>("g[data-country] polygon")
      );

    // @req REQ-116
    it("gives each country its own fill opacity, drawn from its own weight", () => {
      render(
        <AtlasGlobe overlay={familyFootprintOverlay} missingMessage="n/a" />
      );

      const byCountry = Object.fromEntries(
        familyFootprintPolygons().map((polygon) => [
          polygon.closest("g")?.getAttribute("data-country"),
          Number(polygon.getAttribute("fill-opacity")),
        ])
      );

      // The same 0.16 + 0.46 x weight ramp the WebGL path uses, so a reader on
      // either path sees the same relative densities.
      expect(byCountry.NGA).toBeCloseTo(0.62, 5);
      expect(byCountry.BEN).toBeCloseTo(0.275, 5);
      expect(byCountry.NGA).toBeGreaterThan(byCountry.BEN);
    });

    // @req REQ-116
    it("dashes every country's outline", () => {
      render(
        <AtlasGlobe overlay={familyFootprintOverlay} missingMessage="n/a" />
      );

      const polygons = familyFootprintPolygons();
      expect(polygons.length).toBeGreaterThan(0);
      // Not one solid edge anywhere: a family has no border, and an aggregate
      // of presences has even less of one.
      for (const polygon of polygons) {
        expect(polygon.getAttribute("stroke-dasharray")).toBe("9 7");
      }
    });

    // @req REQ-116
    it("never closes a line around a people, whichever overlay it is handed", () => {
      // The guard that matters most, because it is the one rule the charter
      // states as absolute. A people is a field, never a bounded territory.
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      expect(document.querySelector("polygon")).not.toBeInTheDocument();
      expect(document.querySelector("g[data-country]")).not.toBeInTheDocument();
    });
  });
});
