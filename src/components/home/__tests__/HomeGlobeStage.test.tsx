import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";

vi.mock("@/components/home/HomeGlobe", () => ({
  HomeGlobe: () => <div data-testid="home-globe-mock" />,
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
});
