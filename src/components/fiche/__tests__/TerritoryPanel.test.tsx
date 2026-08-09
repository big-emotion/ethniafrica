import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TerritoryPanel } from "../TerritoryPanel";
import type { CountryDistributionRow } from "@/lib/peopleDataTransformer";

const SOURCE_LINE = { label: "UNFPA, World Population Prospects 2025" };

const DISTRIBUTIONS: CountryDistributionRow[] = [
  {
    country: "BEN",
    population: 2_500_000,
    populationFormatted: "2,5M",
    percentage: 25,
  },
  {
    country: "NGA",
    population: 6_000_000,
    populationFormatted: "6M",
    percentage: 60,
  },
  {
    country: "TGO",
    population: 1_500_000,
    populationFormatted: "1,5M",
    percentage: 15,
  },
];

const { africaDotsMock } = vi.hoisted(() => ({
  africaDotsMock: vi.fn(() => [
    [0.1, 0.1, 0] as const,
    [0.3, 0.3, 0] as const,
    [0.5, 0.5, 0] as const,
    [0.7, 0.7, 0] as const,
    [0.9, 0.9, 0] as const,
  ]),
}));

vi.mock("@/lib/continentDots", () => ({
  africaDots: africaDotsMock,
}));

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof TerritoryPanel>> = {}
) {
  return render(
    <TerritoryPanel
      distributions={DISTRIBUTIONS}
      stepLabel="03 · Territoire"
      heading="Où vivent les Yoruba"
      body="Présents au Nigeria, au Bénin et au Togo."
      sourceLine={SOURCE_LINE}
      size="md"
      side="left"
      {...overrides}
    />
  );
}

describe("TerritoryPanel", () => {
  let context: CanvasRenderingContext2D;
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    africaDotsMock.mockClear();

    context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
      setTransform: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      context
    );
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      () => 300
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      () => 200
    );

    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    vi.spyOn(window, "requestAnimationFrame");
    vi.spyOn(window, "cancelAnimationFrame");

    class IntersectionObserverMock {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0.05];
      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }
    class ResizeObserverMock {
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
    }
  });

  describe("data-gating (FR98)", () => {
    // @req REQ-091
    it("renders zero DOM output when there are no country distributions", () => {
      const { container } = renderPanel({ distributions: [] });
      expect(container.firstChild).toBeNull();
    });

    // @req REQ-091
    it("renders content when distributions are present", () => {
      const { container } = renderPanel();
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe("text-first country list", () => {
    // @req REQ-091
    it("renders a semantic list of every country in the payload", () => {
      const { container } = renderPanel();
      const items = container.querySelectorAll(
        "[data-territory-country-list] li"
      );
      expect(items).toHaveLength(DISTRIBUTIONS.length);
    });

    // @req REQ-091
    it("renders each country's values matching the payload, ordered by descending share", () => {
      const { container } = renderPanel();
      const items = Array.from(
        container.querySelectorAll("[data-territory-country-list] li")
      );

      const expectedOrder = [...DISTRIBUTIONS].sort(
        (a, b) => (b.percentage ?? -Infinity) - (a.percentage ?? -Infinity)
      );

      expect(items).toHaveLength(expectedOrder.length);
      items.forEach((item, i) => {
        const row = expectedOrder[i];
        expect(item.textContent).toContain(row.country);
        expect(item.textContent).toContain(`${row.percentage}%`);
        expect(item.textContent).toContain(row.populationFormatted);
      });
    });

    // @req REQ-091
    it("renders a dash when percentage is absent for a country", () => {
      const { container } = renderPanel({
        distributions: [{ country: "GHA" }],
      });
      const item = container.querySelector("[data-territory-country-list] li");
      expect(item?.textContent).toContain("GHA");
      expect(item?.textContent).toContain("—");
    });
  });

  describe("canvas is decorative (display-only, R4)", () => {
    // @req REQ-091
    it("marks the highlight canvas wrapper aria-hidden", () => {
      const { container } = renderPanel();
      const canvasWrapper = container.querySelector(
        "[data-territory-highlight]"
      );
      expect(canvasWrapper).not.toBeNull();
      expect(canvasWrapper).toHaveAttribute("aria-hidden", "true");
    });

    // @req REQ-091
    it("keeps the DottedContinent canvas itself aria-hidden", () => {
      const { container } = renderPanel();
      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("reduced motion (R5)", () => {
    // @req REQ-091
    it("never invokes requestAnimationFrame when the user prefers reduced motion", () => {
      renderPanel();
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe("accent lightness ramp derived from the dot field", () => {
    // @req REQ-091
    it("orders highlight dot mix percentages to match descending share order", () => {
      const { container } = renderPanel();
      const dots = Array.from(
        container.querySelectorAll("[data-territory-highlight-dot]")
      );
      expect(dots).toHaveLength(DISTRIBUTIONS.length);

      const mixPercents = dots.map((dot) => {
        const value = dot.getAttribute("data-mix-percent");
        if (value === null)
          throw new Error("Expected a data-mix-percent attribute");
        return Number(value);
      });

      for (let i = 1; i < mixPercents.length; i++) {
        expect(mixPercents[i]).toBeLessThanOrEqual(mixPercents[i - 1]);
      }
    });

    // @req REQ-091
    it("samples highlight dot positions from the real dot field, not hand-drawn coordinates", () => {
      renderPanel();
      expect(africaDotsMock).toHaveBeenCalled();
    });
  });

  describe("chapter anatomy (FR99)", () => {
    // @req REQ-091
    it("emits the heading at H2", () => {
      const { getByRole } = renderPanel();
      expect(
        getByRole("heading", { level: 2, name: "Où vivent les Yoruba" })
      ).toBeTruthy();
    });

    // @req REQ-091
    it("renders the required source-line", () => {
      const { getByText } = renderPanel();
      expect(getByText("UNFPA, World Population Prospects 2025")).toBeTruthy();
    });
  });
});
