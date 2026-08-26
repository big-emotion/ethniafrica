import { render, screen, waitFor } from "@testing-library/react";
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
  it("never renders empty, even while the capability check is settling", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as unknown as RenderingContext
    );

    const { container } = render(<HomeGlobeStage />);
    expect(container.firstElementChild).not.toBeNull();
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
      /\.home-globe-stage\s*{[^}]*min-height:\s*380px/
    );
    expect(styleTag?.textContent).toMatch(/margin:\s*0 auto/);
    expect(styleTag?.textContent).toMatch(/min-width:\s*720px/);
    expect(styleTag?.textContent).toMatch(/min-width:\s*1200px/);
  });

  // @req REQ-115
  it("renders the SSR-safe fallback first, inside the stage container (ARCH-014/REQ-112 unchanged)", () => {
    const { container } = render(<HomeGlobeStage />);
    const stage = container.querySelector(".home-globe-stage");

    expect(stage).not.toBeNull();
    expect(stage?.firstElementChild).not.toBeNull();
    expect(stage?.querySelector("path#africa-landmass")).toBeInTheDocument();
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
