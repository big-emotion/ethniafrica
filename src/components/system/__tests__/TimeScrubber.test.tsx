import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { TimeScrubber } from "@/components/system/TimeScrubber";

// axe-core is already a project dependency (used by scripts/a11y-test.ts via
// @axe-core/playwright); running it directly against the jsdom/happy-dom
// render output gives the same rule engine as vitest-axe without adding a
// new package (precedent: src/components/compare/__tests__/components.test.tsx).
async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axe.run(container);
  const summary = results.violations.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ")})`
  );
  expect(summary).toEqual([]);
}

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" && reducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TimeScrubber — ARIA structure", () => {
  // @req REQ-101
  it("exposes role=slider, aria-label, aria-valuemin/max/now and aria-valuetext", () => {
    render(
      <TimeScrubber min={-3000} max={2025} value={1200} onChange={() => {}} />
    );

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-label", "Année");
    expect(slider).toHaveAttribute("aria-valuemin", "-3000");
    expect(slider).toHaveAttribute("aria-valuemax", "2025");
    expect(slider).toHaveAttribute("aria-valuenow", "1200");
    expect(slider).toHaveAttribute("aria-valuetext", "1200");
  });

  // @req REQ-101
  it("derives aria-valuetext from formatYearFr for a BCE value", () => {
    render(
      <TimeScrubber min={-3000} max={2025} value={-500} onChange={() => {}} />
    );

    expect(screen.getByRole("slider")).toHaveAttribute(
      "aria-valuetext",
      "500 av. J.-C."
    );
  });

  // @req REQ-101
  it("uses a custom formatYear function when provided", () => {
    render(
      <TimeScrubber
        min={0}
        max={100}
        value={50}
        onChange={() => {}}
        formatYear={(year) => `Y${year}`}
      />
    );

    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "Y50");
  });
});

describe("TimeScrubber — keyboard interaction", () => {
  // @req REQ-101
  it("changes value by step on ArrowRight / ArrowLeft", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TimeScrubber
        min={0}
        max={2000}
        value={1000}
        step={10}
        onChange={handleChange}
      />
    );

    const slider = screen.getByRole("slider");
    slider.focus();

    await user.keyboard("{ArrowRight}");
    expect(handleChange).toHaveBeenLastCalledWith(1010);

    await user.keyboard("{ArrowLeft}");
    expect(handleChange).toHaveBeenLastCalledWith(990);
  });

  // @req REQ-101
  it("changes value by eraStep on PageUp / PageDown", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TimeScrubber
        min={0}
        max={2000}
        value={1000}
        step={10}
        eraStep={100}
        onChange={handleChange}
      />
    );

    const slider = screen.getByRole("slider");
    slider.focus();

    await user.keyboard("{PageUp}");
    expect(handleChange).toHaveBeenLastCalledWith(1100);

    await user.keyboard("{PageDown}");
    expect(handleChange).toHaveBeenLastCalledWith(900);
  });

  // @req REQ-101
  it("clamps eraStep jumps to the configured bounds", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TimeScrubber
        min={0}
        max={1050}
        value={1000}
        step={10}
        eraStep={100}
        onChange={handleChange}
      />
    );

    const slider = screen.getByRole("slider");
    slider.focus();

    await user.keyboard("{PageUp}");
    expect(handleChange).toHaveBeenLastCalledWith(1050);
  });

  // @req REQ-101
  it("jumps to bounds on Home / End", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TimeScrubber
        min={-3000}
        max={2025}
        value={1200}
        onChange={handleChange}
      />
    );

    const slider = screen.getByRole("slider");
    slider.focus();

    await user.keyboard("{End}");
    expect(handleChange).toHaveBeenLastCalledWith(2025);

    await user.keyboard("{Home}");
    expect(handleChange).toHaveBeenLastCalledWith(-3000);
  });

  // @req REQ-101
  it("shows an --afh-gold focus ring on the thumb", () => {
    render(<TimeScrubber min={0} max={100} value={50} onChange={() => {}} />);

    expect(screen.getByRole("slider")).toHaveClass(
      "focus-visible:ring-afh-gold"
    );
  });

  // @req REQ-101
  it("keeps the thumb tap target at least 44x44 px", () => {
    render(<TimeScrubber min={0} max={100} value={50} onChange={() => {}} />);

    const slider = screen.getByRole("slider");
    expect(slider).toHaveClass("h-11");
    expect(slider).toHaveClass("w-11");
  });
});

describe("TimeScrubber — reduced motion", () => {
  // @req REQ-101
  it("marks motion as instant and ships no autoplay control when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<TimeScrubber min={0} max={100} value={50} onChange={() => {}} />);

    expect(screen.getByTestId("time-scrubber")).toHaveAttribute(
      "data-motion",
      "instant"
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  // @req REQ-101
  it("marks motion as smooth by default and still ships no autoplay control", () => {
    render(<TimeScrubber min={0} max={100} value={50} onChange={() => {}} />);

    expect(screen.getByTestId("time-scrubber")).toHaveAttribute(
      "data-motion",
      "smooth"
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("TimeScrubber — disabled", () => {
  // @req REQ-101
  it("marks the slider aria-disabled and ignores keyboard input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TimeScrubber
        min={0}
        max={100}
        value={50}
        onChange={handleChange}
        disabled
      />
    );

    expect(screen.getByTestId("time-scrubber")).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    const slider = screen.getByRole("slider");
    slider.focus();
    await user.keyboard("{ArrowRight}");
    expect(handleChange).not.toHaveBeenCalled();
  });
});

describe("TimeScrubber — accessibility (axe)", () => {
  // @req REQ-101
  it("has no axe violations", async () => {
    const { container } = render(
      <TimeScrubber min={-3000} max={2025} value={1200} onChange={() => {}} />
    );
    await expectNoAxeViolations(container);
  });

  // @req REQ-101
  it("has no axe violations when disabled", async () => {
    const { container } = render(
      <TimeScrubber
        min={-3000}
        max={2025}
        value={1200}
        onChange={() => {}}
        disabled
      />
    );
    await expectNoAxeViolations(container);
  });
});
