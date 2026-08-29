import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";

let reportFailureOnMount = false;
vi.mock("@/components/home/HomeGlobe", () => ({
  HomeGlobe: ({ onUnavailable }: { onUnavailable?: () => void }) => {
    if (reportFailureOnMount) onUnavailable?.();
    return <div data-testid="home-globe-mock" />;
  },
}));

describe("HomeGlobeStage (ARCH-014 capability gate)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @req REQ-112
  it("renders the committed AfricaBasemap fallback when no WebGL context can be created", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    render(<HomeGlobeStage />);

    await waitFor(() =>
      expect(document.querySelector("path#africa-landmass")).toBeInTheDocument()
    );
    expect(screen.queryByTestId("home-globe-mock")).not.toBeInTheDocument();
  });

  // @req REQ-112
  it("mounts the WebGL globe once a WebGL context is confirmed client-side", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(<HomeGlobeStage />);

    await waitFor(() =>
      expect(screen.getByTestId("home-globe-mock")).toBeInTheDocument()
    );
    expect(document.querySelector("path#africa-landmass")).toBeNull();
  });

  // @req REQ-112
  it("serves a stage that holds its box open but paints no flat map, so the first frame cannot flash one", () => {
    const serverHtml = renderToStaticMarkup(<HomeGlobeStage />);

    expect(serverHtml).toContain("home-globe-stage");
    expect(serverHtml).not.toContain("africa-landmass");
  });

  // @req REQ-115
  it("wraps its content in a bounded, centred stage with a declared min-height per breakpoint", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const { container } = render(<HomeGlobeStage />);

    await waitFor(() =>
      expect(document.querySelector("path#africa-landmass")).toBeInTheDocument()
    );

    const stage = container.querySelector(".home-globe-stage");
    expect(stage).not.toBeNull();
    expect(stage?.querySelector("path#africa-landmass")).toBeInTheDocument();

    const styleTag = container.querySelector("style");
    expect(styleTag?.textContent).toMatch(
      /\.home-globe-stage\s*{[^}]*min-height:\s*560px/
    );
    expect(styleTag?.textContent).toMatch(/margin:\s*0 auto/);
    expect(styleTag?.textContent).toMatch(/min-width:\s*720px/);
    expect(styleTag?.textContent).toMatch(/min-width:\s*1200px/);
  });

  // @req REQ-115
  it("never paints the flat map on a browser that supports WebGL, at any point of the mount", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    const { container } = render(<HomeGlobeStage />);

    expect(container.querySelector(".home-globe-stage")).not.toBeNull();
    expect(document.querySelector("path#africa-landmass")).toBeNull();

    await waitFor(() =>
      expect(screen.getByTestId("home-globe-mock")).toBeInTheDocument()
    );
    expect(document.querySelector("path#africa-landmass")).toBeNull();
  });
});

// The probe only proves a context can be created. Creating the layer on it
// can still fail — a driver that refuses to compile or link the shaders is
// the common case on low-end hardware — and the stage had already swapped
// the committed basemap out by then, leaving a blank canvas in the hero.
describe("HomeGlobeStage — recovers when the globe gives up (REQ-112)", () => {
  beforeEach(() => {
    reportFailureOnMount = false;
  });

  afterEach(() => {
    reportFailureOnMount = false;
  });

  // @req REQ-112
  it("restores the committed basemap when the globe reports it cannot run", async () => {
    reportFailureOnMount = true;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(<HomeGlobeStage />);

    await waitFor(() =>
      expect(screen.queryByTestId("home-globe-mock")).not.toBeInTheDocument()
    );
    expect(document.querySelector("path#africa-landmass")).toBeInTheDocument();
  });

  // @req REQ-112
  it("keeps the globe mounted when it initializes cleanly", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    render(<HomeGlobeStage />);

    await waitFor(() =>
      expect(screen.getByTestId("home-globe-mock")).toBeInTheDocument()
    );
  });
});

// The stage is absolute-positioned from the inside (.home-globe-layout is
// inset:0), so it is the stage's own box that has to hold a height.
//
// It used to drop that floor above 1200px and take the rest of the hero
// band instead, through a flex chain rooted in the band's pinned 100dvh.
// The rule was scoped to .home-globe-holder precisely because the escape
// only worked inside that band — outside it the box sat at zero and the
// globe painted over whatever followed, which is what happened on
// /fr/jouer/mercator.
//
// There is no pinned band any more: the module stands in its own section
// in the page flow (FeaturedModule), and .home-globe-holder went with it.
// The scope that made the escape safe is gone, so the escape is too.
describe("HomeGlobeStage — keeps a floor at every width (REQ-115)", () => {
  // @req REQ-115
  it("borrows no ancestor's height, at any breakpoint", () => {
    const styleSheet = renderToStaticMarkup(<HomeGlobeStage />);

    expect(styleSheet).not.toMatch(/min-height:\s*0/);
    expect(styleSheet).toMatch(
      /@media \(min-width: 1200px\)[\s\S]*?min-height:\s*\d+px/
    );
  });
});
