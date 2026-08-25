import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeGlobeFallback } from "@/components/home/HomeGlobeFallback";

describe("HomeGlobeFallback", () => {
  // @req REQ-112
  it("renders the committed AfricaBasemap SVG figure", () => {
    const { container } = render(<HomeGlobeFallback />);

    expect(container.querySelector("svg#africa-landmass")).toBeNull();
    expect(container.querySelector("path#africa-landmass")).toBeInTheDocument();
  });

  // @req REQ-112
  it("is decorative and never intercepts pointer events", () => {
    const { container } = render(<HomeGlobeFallback />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect((wrapper as HTMLElement)?.style.pointerEvents).toBe("none");
  });
});
