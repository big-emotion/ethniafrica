import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";

vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: ({
    pose,
    showTissot,
  }: {
    pose: { morph: number };
    showTissot?: boolean;
  }) => (
    <canvas
      data-testid="atlas-globe-canvas-mock"
      data-morph={pose.morph}
      data-tissot={showTissot ? "true" : "false"}
    />
  ),
}));

/** Enough for buildContinentOverlay to resolve a scene rather than the missing placeholder. */
const peopleCounts = { NGA: 40, ZAF: 22, ETH: 18 };

describe("ContinentGlobeStage (ARCH-014 capability gate)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-112
  it("renders the committed AfricaBasemap when no WebGL context can be created", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    await waitFor(() =>
      expect(document.querySelector("path#africa-landmass")).toBeInTheDocument()
    );
    expect(
      screen.queryByTestId("atlas-globe-canvas-mock")
    ).not.toBeInTheDocument();
  });

  /**
   * The indicatrices are the argument this stage exists to make: the home's
   * module and /jouer/mercator both stand on it, and both are named after the
   * surface Mercator hides. The engine deleted in ETNI-1360 drew them by
   * default; the consolidation dropped them on the way across, leaving a globe
   * that demonstrates nothing about area.
   */
  // @req REQ-112
  it("draws the indicatrices, which is the argument this stage makes", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toHaveAttribute(
        "data-tissot",
        "true"
      )
    );
  });

  // @req REQ-112
  it("mounts the globe once a WebGL context is confirmed client-side", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(document.querySelector("path#africa-landmass")).toBeNull();
  });

  // @req REQ-112
  it("holds its box open on the server but paints no flat map, so the first frame cannot flash one", () => {
    const serverHtml = renderToStaticMarkup(
      <ContinentGlobeStage peopleCountsByCountry={peopleCounts} />
    );

    expect(serverHtml).toContain("home-globe-stage");
    expect(serverHtml).not.toContain("africa-landmass");
  });

  // @req REQ-112
  it("never paints the flat map on a browser that supports WebGL, at any point of the mount", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    const { container } = render(
      <ContinentGlobeStage peopleCountsByCountry={peopleCounts} />
    );

    expect(container.querySelector(".home-globe-stage")).not.toBeNull();
    expect(document.querySelector("path#africa-landmass")).toBeNull();

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(document.querySelector("path#africa-landmass")).toBeNull();
  });

  /**
   * The floors ETNI-1280 fixed. A `min-height: 0` here has already collapsed
   * the stage to 0px with every test green, so the numbers are asserted rather
   * than merely the property.
   */
  // @req REQ-115
  it("wraps the globe in a bounded, centred stage with a declared floor per breakpoint", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const { container } = render(
      <ContinentGlobeStage peopleCountsByCountry={peopleCounts} />
    );

    await waitFor(() =>
      expect(document.querySelector("path#africa-landmass")).toBeInTheDocument()
    );

    const stage = container.querySelector(".home-globe-stage");
    expect(stage).not.toBeNull();
    expect(stage?.querySelector("path#africa-landmass")).toBeInTheDocument();

    const styles = container.querySelector("style")?.textContent ?? "";
    expect(styles).toMatch(/\.home-globe-stage\s*{[^}]*min-height:\s*560px/);
    expect(styles).toMatch(/margin:\s*0 auto/);
    expect(styles).toMatch(/max-width:\s*1120px/);
    expect(styles).toMatch(/min-width:\s*720px[\s\S]*?min-height:\s*680px/);
    expect(styles).toMatch(/min-width:\s*1200px[\s\S]*?min-height:\s*720px/);
  });

  /**
   * The globe sizes itself from --afh-globe-stage-height, which is 470/520 —
   * shorter than this stage's own floors. Left alone, the box and the figure
   * inside it disagree at every breakpoint.
   */
  // @req REQ-115
  it("gives the globe the stage's own height rather than the atlas default", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const { container } = render(
      <ContinentGlobeStage peopleCountsByCountry={peopleCounts} />
    );

    await waitFor(() =>
      expect(document.querySelector("path#africa-landmass")).toBeInTheDocument()
    );

    const styles = container.querySelector("style")?.textContent ?? "";
    expect(styles).toMatch(/--afh-globe-stage-height:\s*560px/);
  });

  // The external projection band plus the 44px figure-tool row are about
  // 181px tall at phone width. The reservation keeps both above the counters.
  // @req REQ-115
  it("reserves enough flow space for the homepage projection band", () => {
    const { container } = render(
      <ContinentGlobeStage
        peopleCountsByCountry={peopleCounts}
        presentation="hero"
      />
    );

    const styles = container.querySelector("style")?.textContent ?? "";
    expect(styles).toMatch(
      /\.home-globe-stage--hero\s*\{[^}]*padding-bottom:\s*184px/
    );
  });
});

/**
 * The Mercator game owns the projection while a question stands (REQ-120).
 * The stage is the only thing between it and the globe, so it is where the
 * forwarding can break without any other test noticing.
 */
describe("ContinentGlobeStage — a caller that owns the projection (REQ-120)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-120
  it("holds the map flat, and says why, when the caller pins it", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(
      <ContinentGlobeStage
        peopleCountsByCountry={peopleCounts}
        pinnedProjection="flat"
        pinnedProjectionNote="La carte reste à plat le temps de la question."
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(
      screen.getByTestId("atlas-globe-canvas-mock").getAttribute("data-morph")
    ).toBe("0");
    expect(
      screen.getByText("La carte reste à plat le temps de la question.")
    ).toBeTruthy();
  });

  // @req REQ-120
  it("closes the map into the sphere when the caller releases it", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(
      <ContinentGlobeStage
        peopleCountsByCountry={peopleCounts}
        pinnedProjection="sphere"
        pinnedProjectionNote="Le globe est revenu."
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(
      screen.getByTestId("atlas-globe-canvas-mock").getAttribute("data-morph")
    ).toBe("1");
  });

  /**
   * The counts come from a service the page is allowed to lose — the explorer
   * hub already catches its failure. The hero must still not be empty.
   */
  // @req REQ-119
  it("names what is absent rather than going blank when the corpus carries no counts", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(<ContinentGlobeStage peopleCountsByCountry={undefined} />);

    await waitFor(() =>
      expect(
        screen.getByText(/ne renseigne encore aucun peuple par pays/i)
      ).toBeTruthy()
    );
  });
});
