import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { AfricaBasemap } from "../AfricaBasemap";
import { BASEMAP_VIEWBOX } from "@/lib/atlas/projection";

describe("AfricaBasemap", () => {
  // @req REQ-101
  it("renders an inline <svg>, not an <img>", () => {
    const { container } = render(<AfricaBasemap />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  // @req REQ-101
  it("uses the committed asset's viewBox", () => {
    const { container } = render(<AfricaBasemap />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "viewBox",
      `0 0 ${BASEMAP_VIEWBOX.width} ${BASEMAP_VIEWBOX.height}`
    );
  });

  // @req REQ-101
  it("inlines the landmass path with non-empty geometry", () => {
    const { container } = render(<AfricaBasemap />);
    const path = container.querySelector("#africa-landmass");
    expect(path).not.toBeNull();
    expect(path?.getAttribute("d")?.length ?? 0).toBeGreaterThan(0);
  });

  // @req REQ-101
  it("defaults to aria-hidden=true", () => {
    const { container } = render(<AfricaBasemap />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  // @req REQ-101
  it("lets a caller override aria-hidden", () => {
    const { container } = render(<AfricaBasemap aria-hidden={false} />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "false"
    );
  });

  // @req REQ-101
  it("styles the landmass exclusively via --afh-atlas-* tokens, no raw hex", () => {
    const { container } = render(<AfricaBasemap />);
    const path = container.querySelector("#africa-landmass");
    expect(path).toHaveClass(
      "fill-afh-atlas-land",
      "stroke-afh-atlas-coastline"
    );
    expect(path?.getAttribute("style") ?? "").not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  // @req REQ-101
  it("reserves a fixed aspect ratio to keep CLS at 0", () => {
    const { container } = render(<AfricaBasemap />);
    const svg = container.querySelector("svg");
    expect(svg?.style.aspectRatio).toBe(
      `${BASEMAP_VIEWBOX.width} / ${BASEMAP_VIEWBOX.height}`
    );
  });

  // @req REQ-101
  it("accepts children layers rendered inside the svg", () => {
    const { container } = render(
      <AfricaBasemap>
        <circle data-testid="overlay-dot" cx={10} cy={10} r={2} />
      </AfricaBasemap>
    );
    const svg = container.querySelector("svg");
    expect(svg?.querySelector('[data-testid="overlay-dot"]')).not.toBeNull();
  });
});
