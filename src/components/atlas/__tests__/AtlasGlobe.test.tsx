import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import type {
  CountryOutlineOverlay,
  PeopleFieldOverlay,
  Ring,
} from "@/lib/atlas/overlays";

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

describe("AtlasGlobe", () => {
  let matchMediaDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "matchMedia"
    );
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (matchMediaDescriptor) {
      Object.defineProperty(window, "matchMedia", matchMediaDescriptor);
    } else {
      Reflect.deleteProperty(window, "matchMedia");
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
});
