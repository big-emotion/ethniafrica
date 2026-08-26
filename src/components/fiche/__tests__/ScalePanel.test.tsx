import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { ScalePanel } from "../ScalePanel";
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

// RTL's default text normalizer collapses all Unicode whitespace (including
// the narrow no-break space Intl.NumberFormat("fr-FR") emits) to a plain
// space, so the expected string must be normalized the same way to compare.
const frFR = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, " ");

const PEOPLE_BASE: PeopleDetail = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA", "BEN", "TGO"],
};

const PEOPLE_WITH_DEMOGRAPHY: PeopleDetail = {
  ...PEOPLE_BASE,
  demography: {
    totalPopulation: 42_000_000,
    referenceYear: 2025,
    source: "UNFPA, World Population Prospects 2025",
    distributionByCountry: [
      { country: "NGA", population: 38_000_000, percentage: 90.5 },
      { country: "BEN", population: 2_500_000, percentage: 6 },
      { country: "TGO", population: 1_500_000, percentage: 3.5 },
    ],
  },
};

const COUNTRY_BASE: CountryDetail = {
  id: "NGA",
  nameFr: "Nigéria",
  nameCommonFr: "Nigéria",
};

const COUNTRY_WITH_DEMOGRAPHICS: CountryDetail = {
  ...COUNTRY_BASE,
  demographics: {
    peoples: [
      { name: "Yoruba", population: 38_000_000, percentageInCountry: 18 },
      { name: "Igbo", population: 32_000_000, percentageInCountry: 15 },
    ],
  },
  sources: [
    { title: "CIA World Factbook, 2025", url: null, tier: "unverified" },
  ],
};

const FAMILY_BASE: LanguageFamilyDetail = {
  id: "FLG_NIGER_CONGO",
  nameFr: "Niger-Congo",
};

const FAMILY_WITH_DISTRIBUTION: LanguageFamilyDetail = {
  ...FAMILY_BASE,
  generalInfo: {
    numberOfLanguages: 1542,
  },
  sources: [{ title: "Glottolog 5.0", url: null, tier: "unverified" }],
};

const CONTESTED_FAMILY: LanguageFamilyDetail = {
  ...FAMILY_WITH_DISTRIBUTION,
  classificationStatus: "contested",
};

function renderPanel(ui: Parameters<typeof render>[0]) {
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ScalePanel", () => {
  describe("data-gating", () => {
    // @req REQ-091
    it("renders zero DOM output when the people payload has no demography", () => {
      mockMatchMedia(true);
      const { container } = renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_BASE}
          size="md"
          side="left"
        />
      );
      expect(container.querySelector("article")).toBeNull();
    });

    // @req REQ-091
    it("renders zero DOM output when the country payload has no demographics", () => {
      mockMatchMedia(true);
      const { container } = renderPanel(
        <ScalePanel
          entityType="country"
          payload={COUNTRY_BASE}
          size="md"
          side="left"
        />
      );
      expect(container.querySelector("article")).toBeNull();
    });

    // @req REQ-091
    it("renders zero DOM output when the family payload has no languages count", () => {
      mockMatchMedia(true);
      const { container } = renderPanel(
        <ScalePanel
          entityType="language-family"
          payload={FAMILY_BASE}
          size="md"
          side="left"
        />
      );
      expect(container.querySelector("article")).toBeNull();
    });
  });

  describe("people — magnitude figure (R3, R4)", () => {
    // @req REQ-091
    it("renders the population fr-FR formatted", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      expect(
        screen.getByText(
          frFR(PEOPLE_WITH_DEMOGRAPHY.demography!.totalPopulation!)
        )
      ).toBeTruthy();
    });

    // @req REQ-091
    it("shows the reference-year label", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      expect(screen.getByText(/Année de référence : 2025/)).toBeTruthy();
    });

    // @req REQ-091
    it("uses the step label 02 · Échelle", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      expect(screen.getByText("02 · Échelle")).toBeTruthy();
    });

    // @req REQ-091
    it("does not render a reference-year label when absent", () => {
      mockMatchMedia(true);
      const payload: PeopleDetail = {
        ...PEOPLE_BASE,
        demography: {
          totalPopulation: 1000,
          source: "UNFPA, World Population Prospects 2025",
        },
      };
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={payload}
          size="md"
          side="left"
        />
      );
      expect(screen.queryByText(/référence/i)).toBeNull();
    });
  });

  describe("confidence chip + source line (FR99)", () => {
    // @req REQ-091
    it("renders the source line from demography.source", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      expect(
        screen.getByText("UNFPA, World Population Prospects 2025")
      ).toBeTruthy();
    });

    // @req REQ-091
    it("renders a confidence chip when classificationStatus is contested", () => {
      mockMatchMedia(true);
      const payload: PeopleDetail = {
        ...PEOPLE_WITH_DEMOGRAPHY,
        classificationStatus: "contested",
      };
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={payload}
          size="md"
          side="left"
        />
      );
      expect(screen.getByText("Contesté")).toBeTruthy();
    });

    // @req REQ-091
    it("renders no confidence chip when classificationStatus is absent", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      expect(screen.queryByText("Contesté")).toBeNull();
      expect(screen.queryByText("Consensuel")).toBeNull();
    });

    // @req REQ-091
    it("falls back to the entity sources array when demography.source is absent", () => {
      mockMatchMedia(true);
      const payload: CountryDetail = COUNTRY_WITH_DEMOGRAPHICS;
      renderPanel(
        <ScalePanel
          entityType="country"
          payload={payload}
          size="md"
          side="left"
        />
      );
      expect(screen.getByText("CIA World Factbook, 2025")).toBeTruthy();
    });

    // @req REQ-091
    it("data-gates to zero DOM when a magnitude exists but no source can be resolved", () => {
      mockMatchMedia(true);
      const payload: CountryDetail = {
        ...COUNTRY_BASE,
        demographics: { peoples: [{ name: "Yoruba", population: 1 }] },
      };
      const { container } = renderPanel(
        <ScalePanel
          entityType="country"
          payload={payload}
          size="md"
          side="left"
        />
      );
      expect(container.querySelector("article")).toBeNull();
    });
  });

  describe("people — per-country ramp + text legend (never color alone)", () => {
    // @req REQ-091
    it("renders one legend entry per country with its share", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      for (const entry of PEOPLE_WITH_DEMOGRAPHY.demography!
        .distributionByCountry!) {
        expect(screen.getByText(new RegExp(entry.country))).toBeTruthy();
        expect(
          screen.getByText(new RegExp(String(entry.percentage)))
        ).toBeTruthy();
      }
    });

    // @req REQ-091
    it("renders no ramp/legend when distributionByCountry is absent", () => {
      mockMatchMedia(true);
      const payload: PeopleDetail = {
        ...PEOPLE_BASE,
        demography: {
          totalPopulation: 1000,
          source: "UNFPA, World Population Prospects 2025",
        },
      };
      const { container } = renderPanel(
        <ScalePanel
          entityType="people"
          payload={payload}
          size="md"
          side="left"
        />
      );
      expect(container.querySelector("[data-scale-ramp]")).toBeNull();
    });
  });

  describe("country variant", () => {
    // @req REQ-091
    it("shows the peoples count from the payload", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="country"
          payload={COUNTRY_WITH_DEMOGRAPHICS}
          size="md"
          side="left"
        />
      );
      expect(
        screen.getByText(
          String(COUNTRY_WITH_DEMOGRAPHICS.demographics!.peoples!.length)
        )
      ).toBeTruthy();
    });
  });

  describe("family variant", () => {
    // @req REQ-091
    it("shows the languages count from the payload", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="language-family"
          payload={FAMILY_WITH_DISTRIBUTION}
          size="md"
          side="left"
        />
      );
      expect(
        screen.getByText(
          frFR(FAMILY_WITH_DISTRIBUTION.generalInfo!.numberOfLanguages!)
        )
      ).toBeTruthy();
    });

    // @req REQ-091
    it("shows the «estimation débattue» chip when classification is contested", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="language-family"
          payload={CONTESTED_FAMILY}
          size="md"
          side="left"
        />
      );
      expect(screen.getByText("estimation débattue")).toBeTruthy();
    });

    // @req REQ-091
    it("does not show the «estimation débattue» chip for a non-contested family", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="language-family"
          payload={FAMILY_WITH_DISTRIBUTION}
          size="md"
          side="left"
        />
      );
      expect(screen.queryByText("estimation débattue")).toBeNull();
    });
  });

  describe("reduced-motion (R5)", () => {
    // @req REQ-091
    it("shows the final value immediately with no count-up when prefers-reduced-motion is set", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      expect(
        screen.getByText(
          frFR(PEOPLE_WITH_DEMOGRAPHY.demography!.totalPopulation!)
        )
      ).toBeTruthy();
      expect(screen.queryByText(frFR(0))).toBeNull();
    });

    // @req REQ-091
    it("ends exactly on the payload value once any count-up settles", () => {
      vi.useFakeTimers();
      mockMatchMedia(false);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      act(() => {
        vi.runAllTimers();
      });
      expect(
        screen.getByText(
          frFR(PEOPLE_WITH_DEMOGRAPHY.demography!.totalPopulation!)
        )
      ).toBeTruthy();
    });
  });

  describe("no derived values (R4)", () => {
    // @req REQ-091
    it("never renders a value absent from the source payload", () => {
      mockMatchMedia(true);
      renderPanel(
        <ScalePanel
          entityType="people"
          payload={PEOPLE_WITH_DEMOGRAPHY}
          size="md"
          side="left"
        />
      );
      // The sum of per-country populations (42M) differs from any partial
      // sub-total (e.g. NGA+BEN only) — only the payload's own total may show.
      expect(screen.queryByText(frFR(40_500_000))).toBeNull();
    });
  });
});
