import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAllCountries,
  getAllLanguageFamilies,
  getPeoples,
} from "@/lib/afrikLoader";
import type {
  CountrySummary,
  LanguageFamilySummary,
  PeopleSummary,
} from "@/types/afrik-frontend";
import { PeopleView } from "@/components/views/PeopleView";
import { LanguageFamilyView } from "@/components/views/LanguageFamilyView";
import {
  DirectoryHero,
  DIRECTORY_ACCENT_CLASS,
  type DirectoryEntityType,
} from "@/components/views/DirectoryHero";

// Charter §3.2, §7 — the three directories (peuples/pays/familles) each take
// one entity accent, a Display-scale H1, pill filter/search controls, 16px
// rounded cards with the hard accent-tint hover, and a pill alphabet rail.

vi.mock("@/lib/afrikLoader", () => ({
  getAllCountries: vi.fn(),
  getAllLanguageFamilies: vi.fn(),
  getPeoples: vi.fn(),
  getUnclassifiedPeoplesCount: vi.fn(() => Promise.resolve(0)),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(() => false),
}));

const COUNTRIES: CountrySummary[] = [
  { id: "ZAF", nameFr: "Afrique du Sud", nameCommonFr: "Afrique du Sud" },
  { id: "ZWE", nameFr: "Zimbabwe", nameCommonFr: "Zimbabwe" },
];

const FAMILIES: LanguageFamilySummary[] = [
  { id: "FLG_BANTU", nameFr: "Bantoues" },
  { id: "FLG_NILO", nameFr: "Nilo-sahariennes" },
];

const PEOPLES: PeopleSummary[] = [
  {
    id: "PPL_YORUBA",
    nameMain: "Yoruba",
    languageFamilyId: "FLG_BENUE_CONGO" as PeopleSummary["languageFamilyId"],
    currentCountries: ["NGA"] as PeopleSummary["currentCountries"],
  },
  {
    id: "PPL_ZULU",
    nameMain: "Zulu",
    languageFamilyId: "FLG_BENUE_CONGO" as PeopleSummary["languageFamilyId"],
    currentCountries: ["ZAF"] as PeopleSummary["currentCountries"],
  },
];

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("DirectoryHero — accent scope + Display H1 (ETNI-801 · FR106)", () => {
  // @req REQ-091
  it("maps peoples to terre, countries to ocre, families to teal", () => {
    expect(DIRECTORY_ACCENT_CLASS.people).toBe("afh-accent-terre");
    expect(DIRECTORY_ACCENT_CLASS.country).toBe("afh-accent-ocre");
    expect(DIRECTORY_ACCENT_CLASS["language-family"]).toBe("afh-accent-teal");
  });

  // @req REQ-091
  it.each([
    ["people", "Peuples"],
    ["country", "Pays"],
    ["language-family", "Familles linguistiques"],
  ] satisfies [DirectoryEntityType, string][])(
    "scopes the %s directory root to its charter accent and renders one Display H1",
    (entityType, title) => {
      const { container } = render(
        <DirectoryHero entityType={entityType} title={title}>
          <p>contenu</p>
        </DirectoryHero>
      );

      const root = screen.getByTestId("directory-root");
      expect(root.className).toContain(DIRECTORY_ACCENT_CLASS[entityType]);

      // Only that entity's accent hue is present — no other directory scope leaks in.
      for (const [otherEntity, accentClass] of Object.entries(
        DIRECTORY_ACCENT_CLASS
      )) {
        if (otherEntity === entityType) continue;
        expect(root.className).not.toContain(accentClass);
      }

      const headings = container.querySelectorAll("h1");
      expect(headings).toHaveLength(1);
      expect(headings[0].textContent).toBe(title);
      expect(headings[0].className).toMatch(/clamp\(48px,13vw,96px\)/);
      expect(headings[0].className).toMatch(/leading-\[1\.02\]/);
    }
  );
});

describe.each([
  {
    name: "LanguageFamilyView",
    entityType: "language-family" as DirectoryEntityType,
    Component: LanguageFamilyView,
    props: { language: "fr" as const, onFamilySelect: vi.fn() },
    setup: () => vi.mocked(getAllLanguageFamilies).mockResolvedValue(FAMILIES),
    firstCardName: "Bantoues",
  },
  {
    name: "PeopleView",
    entityType: "people" as DirectoryEntityType,
    Component: PeopleView,
    props: { language: "fr" as const, onPeopleSelect: vi.fn() },
    setup: () =>
      vi.mocked(getPeoples).mockResolvedValue({
        data: PEOPLES,
        meta: { total: 2, page: 1, perPage: 10, totalPages: 1 },
      }),
    firstCardName: "Yoruba",
  },
])(
  "$name — pills, cards and heading order under the directory accent (ETNI-801 · FR106)",
  ({ entityType, Component, props, setup, firstCardName }) => {
    beforeEach(() => {
      vi.clearAllMocks();
      setup();
    });

    async function renderDirectory() {
      return renderWithQuery(
        <DirectoryHero entityType={entityType} title="Titre">
          {
            // @ts-expect-error — props shape is narrowed per view under test
            <Component {...props} />
          }
        </DirectoryHero>
      );
    }

    // @req REQ-091
    it("keeps heading order H1 -> H2, no skipped level", async () => {
      const { container } = await renderDirectory();
      await screen.findByRole("heading", { name: firstCardName });

      const headings = Array.from(
        container.querySelectorAll("h1, h2, h3, h4, h5, h6")
      );
      expect(headings[0].tagName).toBe("H1");
      let previousLevel = 1;
      for (const heading of headings.slice(1)) {
        const level = Number(heading.tagName[1]);
        expect(level).toBeLessThanOrEqual(previousLevel + 1);
        previousLevel = level;
      }
      // Card titles resolve as H2, directly under the directory's H1.
      expect(screen.getByRole("heading", { name: firstCardName }).tagName).toBe(
        "H2"
      );
    });

    // @req REQ-091
    it("gives the alphabet pill rail and the 'Tous' pill a >=44px hit area", async () => {
      await renderDirectory();
      await screen.findByRole("heading", { name: firstCardName });

      const pills = [
        screen.getByRole("button", { name: "Tous" }),
        screen.getByRole("button", { name: "A" }),
      ];
      for (const pill of pills) {
        expect(pill.className).toMatch(/(?:^|\s)h-11(?:\s|$)/);
        expect(pill.className).toMatch(/rounded-full/);
      }
    });

    // @req REQ-091
    it("resolves entity row cards through the 16px radius + accent-tint hover tokens", async () => {
      await renderDirectory();
      const card = (
        await screen.findByRole("heading", { name: firstCardName })
      ).closest(".rounded-afh-xl");
      expect(card).toBeTruthy();
      expect(card!.className).toMatch(
        /shadow-\[4px_4px_0_0_var\(--accent-tint\)\]/
      );
    });

    // @req REQ-091
    it("shapes the search input as a pill", async () => {
      await renderDirectory();
      await screen.findByRole("heading", { name: firstCardName });
      expect(screen.getByRole("textbox").className).toMatch(/rounded-full/);
    });
  }
);
