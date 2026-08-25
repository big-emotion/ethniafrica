import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FamilyClassificationTreeSection } from "@/components/family/FamilyClassificationTreeSection";

vi.mock("@/hooks/use-consent", () => ({
  useConsent: () => ({
    consentState: {
      hasConsented: true,
      preferences: { essential: true, analytics: false, functional: true },
      consentDate: null,
    },
    acceptAll: vi.fn(),
    rejectAll: vi.fn(),
    updatePreferences: vi.fn(),
    showBanner: false,
    setShowBanner: vi.fn(),
  }),
}));
import { FamilyDecolonialHeader } from "@/components/family/FamilyDecolonialHeader";
import { FamilyHero } from "@/components/family/FamilyHero";
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
import type { LanguageFamily } from "@/types/afrik";

const classificationTree = {
  family: { id: "FLG_BANTU", nameFr: "Bantou" },
  branches: [{ iso639_3: "kon", name: "Kikongo", peopleCount: 2 }],
  unlinkedPeopleCount: 0,
};

function renderClassificationSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FamilyClassificationTreeSection
        familyId="FLG_BANTU"
        tree={classificationTree}
      />
    </QueryClientProvider>
  );
}

const completeFamily: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  classificationStatus: "contested",
  associatedPeoples: [{ name: "Shona", peopleId: "PPL_SHONA" }],
  content: {
    decolonialHeader: {
      selfAppellation: "Bantou",
      contemporaryUsage: "Désignation linguistique contemporaine.",
    },
    generalInfo: {
      branches: ["Bantou étroit"],
      geographicArea: "Afrique centrale",
      numberOfLanguages: 500,
      totalSpeakers: 350000000,
    },
    linguisticCharacteristics: {
      typology: "Langues agglutinantes",
    },
    historyAndOrigins: {
      probableOrigin: "Afrique centrale occidentale",
    },
    distribution: {
      totalSpeakers: 350000000,
      distributionByCountry: { COD: 90000000 },
    },
    sources: ["Glottolog"],
  },
};

describe("LanguageFamilyDetailViewV2", () => {
  // @req REQ-047
  it("renders every non-empty transformed section through SSR", () => {
    render(<LanguageFamilyDetailViewV2 family={completeFamily} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Bantou" })
    ).toBeTruthy();
    expect(
      screen.getByText("Désignation linguistique contemporaine.")
    ).toBeTruthy();
    expect(screen.getByText("Bantou étroit")).toBeTruthy();
    expect(screen.getByText("Shona")).toBeTruthy();
    expect(screen.getByText("Langues agglutinantes")).toBeTruthy();
    expect(screen.getByText("Afrique centrale occidentale")).toBeTruthy();
    expect(screen.getByText("COD")).toBeTruthy();
    expect(screen.getByText("Glottolog")).toBeTruthy();
  });

  // @req REQ-047
  it("omits empty sections instead of rendering empty shells", () => {
    render(
      <LanguageFamilyDetailViewV2
        family={{ id: "FLG_EMPTY", nameFr: "Sans contenu", content: {} }}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Sans contenu" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Appellations et décolonisation" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Caractéristiques linguistiques" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Histoire et origines" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Sources et références" })
    ).toBeNull();
  });

  // @req REQ-119
  it("shows structurally-expected but empty fields as missing rather than hiding their section", () => {
    render(
      <LanguageFamilyDetailViewV2
        family={{ id: "FLG_EMPTY", nameFr: "Sans contenu", content: {} }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Informations générales" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Répartition géographique" })
    ).toBeTruthy();
    expect(screen.getAllByText("Donnée manquante").length).toBeGreaterThan(0);
  });

  // @req REQ-119
  it("names the origin of a derived footprint instead of presenting it as declared", () => {
    render(
      <LanguageFamilyDetailViewV2
        family={{
          id: "FLG_BANTU",
          nameFr: "Bantou",
          content: {},
          footprintByCountry: { COD: 3 },
        }}
      />
    );

    expect(
      screen.getByText("Dérivée de : peuples rattachés à la famille")
    ).toBeInTheDocument();
    expect(screen.getByText("COD")).toBeInTheDocument();
  });

  // @req REQ-119
  it("shows the declared distribution as missing alongside the derived footprint instead of the footprint hiding the gap", () => {
    render(
      <LanguageFamilyDetailViewV2
        family={{
          id: "FLG_BANTU",
          nameFr: "Bantou",
          content: {},
          footprintByCountry: { COD: 3 },
        }}
      />
    );

    expect(screen.getAllByText("Donnée manquante").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Dérivée de : peuples rattachés à la famille")
    ).toBeInTheDocument();
  });

  // @req REQ-119
  it("renders no marker when the corpus declares a value, using a real corpus fixture with an empty branches list", () => {
    const fixturePath = join(
      process.cwd(),
      "dataset/source/afrik/famille_linguistique/FLG_AFROASIATIQUE.json"
    );
    const family = JSON.parse(readFileSync(fixturePath, "utf-8"));

    // Sanity-check the fixture still represents the case this ticket
    // documents (declared geographicArea, empty branches).
    expect(family.content.generalInfo.branches).toEqual([]);
    expect(family.content.generalInfo.geographicArea).toBeTruthy();

    render(<LanguageFamilyDetailViewV2 family={family} />);

    expect(
      screen.getByText(family.content.generalInfo.geographicArea)
    ).toBeInTheDocument();
    // Both branches (generalInfo) and distributionByCountry (distribution)
    // are structurally expected yet empty in this real fixture.
    expect(screen.getAllByText("Donnée manquante").length).toBe(2);
  });

  // @req REQ-047
  it("keeps an endonym's supplied language metadata in the decolonial header", () => {
    render(
      <FamilyDecolonialHeader
        data={{
          linkWithFamily: null,
          nameFr: null,
          nameEn: null,
          historicalAppellations: [],
          originOfHistoricalTerm: null,
          whyProblematic: null,
          selfAppellation: "Bantu",
          contemporaryUsage: null,
          geographicArea: null,
          numberOfLanguages: null,
          totalSpeakers: null,
        }}
        selfAppellationLang="sw"
      />
    );

    expect(screen.getByText("Bantu")).toHaveAttribute("lang", "sw");
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute("href", "/fr/doctrine/endonymes-vs-exonymes");
  });

  // @req REQ-047
  it("surfaces confidence and contested-classification affordances in the hero", () => {
    render(
      <FamilyHero
        data={{
          id: "FLG_BANTU",
          nameFr: "Famille bantoue",
          nameEn: null,
          classificationStatus: "contested",
        }}
      />
    );

    expect(screen.getByText("voir les sources")).toHaveAttribute(
      "href",
      "#sources"
    );
    expect(screen.getByRole("link", { name: /contesté/i })).toHaveAttribute(
      "href",
      "/fr/doctrine#contested"
    );
    expect(
      screen.getAllByRole("link", { name: "Lire la doctrine" })[0]
    ).toHaveAttribute("href", "/fr/doctrine/classifications-contestees");
  });

  // @req REQ-050
  it("anchors source affordances and deep-links each country distribution", () => {
    render(<LanguageFamilyDetailViewV2 family={completeFamily} />);

    expect(screen.getByRole("contentinfo")).toHaveAttribute("id", "sources");
    expect(screen.getByRole("link", { name: "COD" })).toHaveAttribute(
      "href",
      "/fr/pays/COD"
    );
  });

  // @req REQ-012 (AC5)
  it("renders a disabled FlagTarget shell on the History section by default", () => {
    render(<LanguageFamilyDetailViewV2 family={completeFamily} />);

    const flagTarget = screen.getByTestId("section-flag-target-history");
    expect(within(flagTarget).getByRole("button")).toBeDisabled();
  });

  // @req REQ-012 (AC5)
  it("wires the live fiche_section FlagTarget on the History section when turnstileSiteKey is provided", () => {
    render(
      <LanguageFamilyDetailViewV2
        family={completeFamily}
        turnstileSiteKey="test-site-key"
      />
    );

    const flagTarget = screen.getByTestId("section-flag-target-history");
    expect(
      within(flagTarget).getByRole("button", { name: "Signaler cette section" })
    ).toBeEnabled();
  });
});

describe("FamilyClassificationTreeSection", () => {
  // @req REQ-047
  it("renders the server-safe text index and collapsed tree skeleton", () => {
    renderClassificationSection();

    expect(
      screen.getByRole("heading", { level: 2, name: "Classification" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "Classification", hidden: true })
    ).toBeInTheDocument();
    expect(screen.getByText("Kikongo")).toBeInTheDocument();
    expect(screen.getByText("Voir en liste")).toBeInTheDocument();
  });

  // @req REQ-047
  it("does not load a branch before expansion, then requests and paginates it", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "PPL_BAKONGO",
            nameMain: "Bakongo",
            classificationStatus: null,
          },
        ],
        meta: { pagination: { total: 2 } },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderClassificationSection();

    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("treeitem", { name: /Kikongo/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v2/language-families/FLG_BANTU/tree/branch?language=kon&limit=20&offset=0"
      );
    });
    expect(await screen.findByText("Bakongo")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "charger la suite (1 restants)" })
    ).toBeInTheDocument();
  });
});
