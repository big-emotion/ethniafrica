import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import {
  buildContinentOverlay,
  type ContinentFieldOverlay,
  type CountryOutlineOverlay,
  type FamilyFootprintOverlay,
  type PeopleFieldOverlay,
  type Ring,
} from "@/lib/atlas/overlays";
import {
  BOTTOM_SHEET_VIEW_FRACTION,
  PANEL_SIDE_BREAKPOINT_PX,
  SIDE_PANEL_VIEW_FRACTION,
} from "@/lib/atlas/panelBias";
import { continentTargetFacts, type AtlasTarget } from "@/lib/atlas/targets";

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
  undrawn: [],
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
  undrawn: [],
};

/** Three well-separated countries, so no marker is dropped by the 22px de-duplication. */
const CONTINENT_COUNTS = { TZA: 99, ETH: 89, GHA: 84 };

/** LOT 1 — the shell went full-bleed, so the stage is a fixed band. */
function stageOf(container: HTMLElement): HTMLElement {
  const stage = container.querySelector("[data-atlas-stage]");
  if (!stage) throw new Error("expected an atlas stage");
  return stage as HTMLElement;
}

function continentOverlayFrom(
  counts: Record<string, number>
): ContinentFieldOverlay {
  const overlay = buildContinentOverlay(counts);
  if (overlay.kind !== "continent-field") {
    throw new Error(
      "expected buildContinentOverlay to yield a continent field"
    );
  }
  return overlay;
}

/** The continent scene's caller owns the fiche link; the globe only hosts it. */
function continentFactsWithFicheLink(target: AtlasTarget) {
  return {
    ...continentTargetFacts(target),
    body: <a href={`/fr/pays/${target.countryId}`}>Voir la fiche du pays</a>,
  };
}

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

      // The property that matters, and the only one: the country the reader
      // chose is inside the strip the sheet leaves free. It used to be pinned
      // to the exact centre of that strip, which was a consequence of the bias
      // equalling the covered fraction — an identity that had to go when the
      // sheet grew to 54% (see panelBias.ts). Where in the free strip it lands
      // is a matter of taste; that it lands there at all is not.
      expect(settledTopPercent).toBeLessThan(panelTopEdgePercent);
      expect(settledTopPercent).toBeGreaterThan(0);
    });

    // @req REQ-117
    it("settles the subject left of a side panel, clear of the panel it opened", () => {
      setViewportWidth(PANEL_SIDE_BREAKPOINT_PX);
      render(<AtlasGlobe overlay={familyPeopleOverlay} missingMessage="n/a" />);

      fireEvent.click(screen.getByRole("button", { name: "Nigeria" }));

      const panelLeftEdgePercent = (1 - SIDE_PANEL_VIEW_FRACTION) * 100;
      const settledLeftPercent = percentOf(markerFor("NGA").style.left);

      // As above: inside the free column, not at a pinned point in it.
      expect(settledLeftPercent).toBeLessThan(panelLeftEdgePercent);
      expect(settledLeftPercent).toBeGreaterThan(0);
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
          overlay={{ kind: "people-field-missing", undrawn: [] }}
          missingMessage="Répartition non renseignée"
        />
      );

      expect(
        document.querySelector("[data-atlas-target]")
      ).not.toBeInTheDocument();
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

    /**
     * 394 of the corpus's 789 people fiches declare exactly one country, and
     * those fiches fell back to a bare pastille: a 22px unlabelled circle,
     * and the only thing naming the country the globe was drawing. The list
     * names it. One entry is a thin list, but a fiche asks for a list because
     * its targets are its presence countries, and a people with one declared
     * country still has one.
     */
    // @req REQ-117
    it("lists the one country of a single-presence fiche rather than leaving a bare pastille", () => {
      render(
        <AtlasGlobe
          overlay={peopleOverlay}
          targetPicker="list"
          missingMessage="n/a"
          wholeAreaLabel="Toute l'aire"
          areaNoun="présence"
        />
      );

      expect(
        screen.getByRole("button", { name: "Choisir un pays de présence" })
      ).toBeInTheDocument();
      expect(
        document.querySelector("[data-atlas-target]")
      ).not.toBeInTheDocument();
    });

    /**
     * The button clears the choice, so it is the choice that earns it — not
     * the shape of the picker. Gated on the picker instead, a fiche offering
     * pastilles could be sent into a chosen country with no way back to the
     * whole area but "Recentrer", which also undoes the reader's own turn.
     */
    // @req REQ-117
    it("offers the way back to the whole area as soon as a country is chosen, pastilles or list", () => {
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          missingMessage="n/a"
          wholeAreaLabel="Toute l'aire"
        />
      );

      expect(
        screen.queryByRole("button", { name: "Toute l'aire" })
      ).not.toBeInTheDocument();

      fireEvent.click(markerFor("NGA"));

      const back = screen.getByRole("button", { name: "Toute l'aire" });
      expect(back).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(back);

      expect(
        document.querySelector("[data-atlas-target-chosen]")
      ).not.toBeInTheDocument();
    });

    // @req REQ-117
    it("names the return-to-everything button for the entity it describes", () => {
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          targetPicker="list"
          missingMessage="n/a"
          wholeAreaLabel="Toute l'aire"
        />
      );

      expect(
        screen.getByRole("button", { name: "Toute l'aire" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Toute l'empreinte/ })
      ).not.toBeInTheDocument();
    });

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

    /**
     * A people fiche has no member peoples, so reading a member count on one
     * printed "0 peuple" beside every presence country it declared — a number
     * the corpus never claimed, denying the presence the halo was drawing.
     * The fiche's own figure is carried with the country's facts, because the
     * overlay has none that is true: its `populationShare` is normalised over
     * the largest drawn country, so it sizes halos rather than measuring a
     * share. A country the fiche gives no figure for carries no line.
     */
    // @req REQ-117
    it("carries the fiche's own figure for a presence country, never a member count it has none of", () => {
      render(
        <AtlasGlobe
          overlay={familyPeopleOverlay}
          targetPicker="list"
          missingMessage="n/a"
          areaNoun="présence"
          facts={{
            NGA: { title: "Yoruba au Nigeria", subtitle: "45 500 000" },
            ZAF: { title: "Yoruba en Afrique du Sud" },
          }}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Choisir un pays de présence" })
      );

      for (const option of screen.getAllByRole("option")) {
        expect(option).not.toHaveTextContent(/\bpeuples?\b/);
      }
      expect(screen.getByRole("option", { name: /Nigeria/ })).toHaveTextContent(
        "45 500 000"
      );
      // Declared, but with no figure of its own: a name rather than a zero.
      expect(
        screen.getByRole("option", { name: /Afrique du Sud/ })
      ).toHaveTextContent(/^\s*\S*\s*Afrique du Sud\s*$/);
    });

    // @req REQ-112
    it("flattens to Mercator and back, changing its own label", () => {
      render(
        <AtlasGlobe
          overlay={familyFootprintOverlay}
          targetPicker="list"
          missingMessage="n/a"
        />
      );

      const flatten = () =>
        screen.getByRole("button", {
          name: /carte plate en fait|Revenir au globe/i,
        });

      expect(flatten()).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(flatten());
      expect(flatten()).toHaveTextContent("Revenir au globe");
      expect(flatten()).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(flatten());
      expect(flatten()).toHaveTextContent("Ce que la carte plate en fait");
      expect(flatten()).toHaveAttribute("aria-pressed", "false");
    });

    // @req REQ-112
    it("returns to the sphere when recentring, not just to the middle of the plane", () => {
      // A "recentre" that left the reader on a flat map would not have
      // returned them anywhere.
      render(
        <AtlasGlobe
          overlay={familyFootprintOverlay}
          targetPicker="list"
          missingMessage="n/a"
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: /carte plate en fait/i })
      );
      fireEvent.click(screen.getByRole("button", { name: /Recentrer/i }));

      expect(
        screen.getByRole("button", { name: /carte plate en fait/i })
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("button", { name: /toute l'empreinte/i })
      ).toHaveAttribute("aria-pressed", "true");
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

  /**
   * jsdom has no WebGL, so every assertion here describes the SVG fallback —
   * which is also what the server renders and what the reader sees on first
   * paint, WebGL probe or not.
   */
  describe("the continent scene (REQ-116)", () => {
    // @req REQ-116
    it("frames every committed country with a stroked outline and no fill", () => {
      const overlay = continentOverlayFrom(CONTINENT_COUNTS);
      const { container } = render(
        <AtlasGlobe
          overlay={overlay}
          missingMessage="n/a"
          targetFacts={continentTargetFacts}
        />
      );

      // Counted off the overlay rather than pinned: a country contributes one
      // polygon per ring, so an archipelago contributes several, and adding
      // geometry to the asset should not make this test red for a framing it
      // still draws correctly.
      const expectedPolygons = overlay.frame.reduce(
        (total, country) => total + country.rings.length,
        0
      );
      const polygons = Array.from(container.querySelectorAll("polygon"));
      expect(polygons).toHaveLength(expectedPolygons);
      expect(
        polygons.every((polygon) => polygon.getAttribute("fill") === "none")
      ).toBe(true);
    });

    /**
     * The invariant the whole scene rests on: a filled country would encode
     * the peoples counted inside it as a closed-border area, which the charter
     * §1 forbids for a people.
     */
    // @req REQ-116
    it("never paints a country as an area, at any fill opacity", () => {
      const { container } = render(
        <AtlasGlobe
          overlay={continentOverlayFrom(CONTINENT_COUNTS)}
          missingMessage="n/a"
          targetFacts={continentTargetFacts}
        />
      );

      const filled = Array.from(container.querySelectorAll("polygon")).filter(
        (polygon) =>
          Number.parseFloat(polygon.getAttribute("fill-opacity") ?? "0") > 0
      );
      expect(filled).toHaveLength(0);
    });

    // @req REQ-116
    it("draws one edgeless radial field per documented country", () => {
      const { container } = render(
        <AtlasGlobe
          overlay={continentOverlayFrom(CONTINENT_COUNTS)}
          missingMessage="n/a"
          targetFacts={continentTargetFacts}
        />
      );

      const circles = Array.from(container.querySelectorAll("circle"));
      expect(circles).toHaveLength(Object.keys(CONTINENT_COUNTS).length);
      expect(
        circles.every((circle) => circle.getAttribute("stroke") === "none")
      ).toBe(true);
    });

    /**
     * Two scenes, one formula. A second radius formula would let the same
     * weight read as two different quantities depending on which page the
     * reader is on.
     */
    // @req REQ-116
    it("sizes a continent field exactly as it sizes a people field of the same weight", () => {
      const continent = render(
        <AtlasGlobe
          overlay={continentOverlayFrom({ NGA: 40 })}
          missingMessage="n/a"
          targetFacts={continentTargetFacts}
        />
      );
      const continentRadius = continent.container
        .querySelector("circle")
        ?.getAttribute("r");
      continent.unmount();

      const people = render(
        <AtlasGlobe overlay={peopleOverlay} missingMessage="n/a" />
      );
      const peopleRadius = people.container
        .querySelector("circle")
        ?.getAttribute("r");

      expect(continentRadius).toBe(peopleRadius);
    });

    /**
     * The hub is already framed on its whole subject, so choosing a country
     * reveals facts without moving the map: every other marker stays where the
     * reader last saw it, and picking a second one is a click rather than a
     * hunt.
     */
    // @req REQ-117
    it("holds the camera at IDLE_POSE, drifting nowhere and flying nowhere when a country is chosen", () => {
      const requestFrame = vi.spyOn(window, "requestAnimationFrame");
      const { container } = render(
        <AtlasGlobe
          overlay={continentOverlayFrom(CONTINENT_COUNTS)}
          missingMessage="n/a"
          targetFacts={continentTargetFacts}
        />
      );

      const figure = () =>
        container.querySelector("svg > g")?.getAttribute("transform");
      expect(figure()).toBe("translate(0 0) scale(1)");

      fireEvent.click(screen.getByRole("button", { name: "Tanzanie" }));

      expect(figure()).toBe("translate(0 0) scale(1)");
      expect(requestFrame).not.toHaveBeenCalled();
    });

    // @req REQ-117
    it("opens the panel on the chosen country, carrying the caller's link to its fiche", () => {
      render(
        <AtlasGlobe
          overlay={continentOverlayFrom(CONTINENT_COUNTS)}
          missingMessage="n/a"
          targetFacts={continentFactsWithFicheLink}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Tanzanie" }));

      expect(screen.getByRole("dialog", { name: "Tanzanie" })).toBeVisible();
      expect(
        screen.getByRole("link", { name: "Voir la fiche du pays" })
      ).toHaveAttribute("href", "/fr/pays/TZA");
    });

    /**
     * `targetFacts().title` doubles as the marker's accessible name, so a count
     * placed there would turn "Tanzanie" into "Tanzanie 99" — a number a screen
     * reader would announce as a quantity of Tanzanians.
     */
    // @req REQ-117
    it("declares the corpus size in the panel, never in a marker's accessible name", () => {
      render(
        <AtlasGlobe
          overlay={continentOverlayFrom(CONTINENT_COUNTS)}
          missingMessage="n/a"
          targetFacts={continentTargetFacts}
        />
      );

      const marker = screen.getByRole("button", { name: "Tanzanie" });
      expect(marker).toHaveAccessibleName("Tanzanie");

      fireEvent.click(marker);

      expect(
        screen.getByRole("dialog", { name: "Tanzanie" })
      ).toHaveTextContent("99 peuples documentés");
    });

    // @req REQ-119
    it("declares an unmeasured continent instead of drawing an empty one", () => {
      render(
        <AtlasGlobe
          overlay={buildContinentOverlay(undefined)}
          missingMessage="Corpus non chargé"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent("Corpus non chargé");
      expect(
        document.querySelector("[data-atlas-target]")
      ).not.toBeInTheDocument();
    });
  });
});

describe("AtlasGlobe — the reader's own camera (REQ-117)", () => {
  // @req REQ-117
  it("offers a surface that carries the name and the keyboard, so the canvas can stay paint", () => {
    const { container } = render(
      <AtlasGlobe overlay={countryOverlay} missingMessage="absent" />
    );

    const surface = container.querySelector("[data-atlas-surface]");
    expect(surface).not.toBeNull();
    expect(surface).toHaveAttribute("aria-label");
    expect(surface).toHaveAttribute("tabindex", "0");
  });

  /**
   * The mockup lays the tools out at every width — centred, wrapping — and the
   * project is mobile-first. They were hidden below 760px, which left a phone
   * with no way to flatten the map, recentre it, or leave a chosen country.
   */
  // @req REQ-117
  it("keeps the view controls on the stage at every width, the mockup's own rule", () => {
    const { container } = render(
      <AtlasGlobe overlay={countryOverlay} missingMessage="absent" />
    );

    const toolbar = container.querySelector<HTMLElement>(
      "[data-atlas-toolbar]"
    );
    expect(toolbar).not.toBeNull();
    expect(toolbar?.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  // @req REQ-117
  it("names the projection toggle for what pressing it will do", () => {
    render(<AtlasGlobe overlay={countryOverlay} missingMessage="absent" />);

    const toggle = screen.getByRole("button", {
      name: "Ce que la carte plate en fait",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    const back = screen.getByRole("button", { name: "Revenir au globe" });
    expect(back).toHaveAttribute("aria-pressed", "true");
  });

  // @req REQ-117
  it("returns the globe and releases the choice when the reader recentres", () => {
    render(<AtlasGlobe overlay={countryOverlay} missingMessage="absent" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ce que la carte plate en fait" })
    );
    expect(
      screen.getByRole("button", { name: "Revenir au globe" })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Recentrer" }));

    // Recentring undoes the projection as well as the turn — the mockup
    // does both, in that order.
    expect(
      screen.getByRole("button", { name: "Ce que la carte plate en fait" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  // @req REQ-117
  it("turns under the arrow keys without scrolling the page", () => {
    const { container } = render(
      <AtlasGlobe overlay={countryOverlay} missingMessage="absent" />
    );

    const surface = container.querySelector(
      "[data-atlas-surface]"
    ) as HTMLElement;
    const turned = fireEvent.keyDown(surface, { key: "ArrowRight" });

    // fireEvent returns false once the handler has called preventDefault.
    expect(turned).toBe(false);
  });

  // @req REQ-117
  it("leaves a key it does not steer on to the page", () => {
    const { container } = render(
      <AtlasGlobe overlay={countryOverlay} missingMessage="absent" />
    );

    const surface = container.querySelector(
      "[data-atlas-surface]"
    ) as HTMLElement;
    expect(fireEvent.keyDown(surface, { key: "Tab" })).toBe(true);
  });
});
