import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  resolveScalePanel,
  sideForPanelOrder,
  SCALE_PANEL_SIDE,
} from "../panelRegistry";
import { PANEL_TABLE } from "@/lib/fichePanels";
import type {
  PeopleDetail,
  CountryDetail,
  LanguageFamilyDetail,
} from "@/types/afrik-frontend";

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

function renderInAccentScope(ui: Parameters<typeof render>[0]) {
  return render(
    <div
      style={
        {
          "--accent": "var(--afh-cat-teal)",
          "--accent-tint": "var(--afh-cat-teal-tint)",
        } as React.CSSProperties
      }
    >
      {ui}
    </div>
  );
}

const PEOPLE_WITH_DEMOGRAPHY: PeopleDetail = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA"],
  demography: {
    totalPopulation: 42_000_000,
    referenceYear: 2025,
    source: "UNFPA, World Population Prospects 2025",
  },
};

const PEOPLE_BASE: PeopleDetail = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA"],
};

const COUNTRY_WITH_DEMOGRAPHICS: CountryDetail = {
  id: "NGA",
  nameFr: "Nigéria",
  nameCommonFr: "Nigéria",
  demographics: {
    peoples: [
      { name: "Yoruba", population: 38_000_000, percentageInCountry: 18 },
    ],
  },
  sources: ["CIA World Factbook, 2025"],
};

const FAMILY_WITH_DISTRIBUTION: LanguageFamilyDetail = {
  id: "FLG_NIGER_CONGO",
  nameFr: "Niger-Congo",
  generalInfo: { numberOfLanguages: 1542 },
  sources: ["Glottolog 5.0"],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sideForPanelOrder", () => {
  // @req REQ-091
  it("places odd panel orders on the left", () => {
    expect(sideForPanelOrder(1)).toBe("left");
    expect(sideForPanelOrder(3)).toBe("left");
  });

  // @req REQ-091
  it("places even panel orders on the right", () => {
    expect(sideForPanelOrder(2)).toBe("right");
    expect(sideForPanelOrder(4)).toBe("right");
  });
});

describe("SCALE_PANEL_SIDE", () => {
  // @req REQ-091
  it("matches the side derived from the scale panel's PANEL_TABLE order", () => {
    const scaleOrder = PANEL_TABLE.find(
      (panel) => panel.kind === "scale"
    )!.order;
    expect(SCALE_PANEL_SIDE).toBe(sideForPanelOrder(scaleOrder));
  });
});

describe("resolveScalePanel", () => {
  // @req REQ-091
  it("resolves 'scale' to a ScalePanel for people at step label 02 · Échelle", () => {
    mockMatchMedia(true);
    renderInAccentScope(
      resolveScalePanel({
        entityType: "people",
        payload: PEOPLE_WITH_DEMOGRAPHY,
      })
    );
    expect(screen.getByText("02 · Échelle")).toBeTruthy();
  });

  // @req REQ-091
  it("resolves 'scale' to a ScalePanel for country", () => {
    mockMatchMedia(true);
    renderInAccentScope(
      resolveScalePanel({
        entityType: "country",
        payload: COUNTRY_WITH_DEMOGRAPHICS,
      })
    );
    expect(screen.getByText("02 · Échelle")).toBeTruthy();
  });

  // @req REQ-091
  it("resolves 'scale' to a ScalePanel for language-family", () => {
    mockMatchMedia(true);
    renderInAccentScope(
      resolveScalePanel({
        entityType: "language-family",
        payload: FAMILY_WITH_DISTRIBUTION,
      })
    );
    expect(screen.getByText("02 · Échelle")).toBeTruthy();
  });

  // @req REQ-091
  it("data-gates to zero DOM without breaking sibling panel ordering when demography is absent", () => {
    mockMatchMedia(true);
    const { container } = renderInAccentScope(
      resolveScalePanel({ entityType: "people", payload: PEOPLE_BASE })
    );
    expect(container.querySelector("article")).toBeNull();
  });
});
