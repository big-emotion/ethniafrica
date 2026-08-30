import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
import type { LanguageFamily } from "@/types/afrik";
import { getCountryRoute, getLocalizedRoute } from "@/lib/routing";

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
    sources: [{ title: "Glottolog", url: null, tier: "unverified" }],
  },
};

describe("LanguageFamilyDetailViewV2", () => {
  // The reading rail lists chapters in document order, so the sources footer
  // closing the fiche is no longer only a visual convention — a rail that ends
  // on "Classification" tells a reader the fiche ends there. The family fiche
  // appended four chapters *after* its own footer; the country fiche has
  // always slotted its extra chapters before it (CountryParchment children).
  // @req REQ-047
  it("closes on its sources footer, with no chapter after it", () => {
    const { container } = render(
      <LanguageFamilyDetailViewV2 family={completeFamily} />
    );

    const chapters = Array.from(
      container.querySelectorAll("[data-fiche-section]")
    ).map((chapter) => chapter.getAttribute("data-fiche-section"));

    expect(chapters[chapters.length - 1]).toBe("Sources");
  });

  // @req REQ-047
  it("renders every non-empty transformed section through SSR", () => {
    render(<LanguageFamilyDetailViewV2 family={completeFamily} />);

    // The h1 moved to the title band above the globe (FamilyFicheTitle).
    expect(
      screen.getByText("Désignation linguistique contemporaine.")
    ).toBeTruthy();
    // The branch names are the classification tree's, which the route feeds
    // into the parchment; the stat card states how many there are.
    expect(screen.getByTestId("stat-card-branches")).toHaveTextContent("1");
    expect(screen.getByText("Shona")).toBeTruthy();
    expect(screen.getByText("Langues agglutinantes")).toBeTruthy();
    expect(screen.getByText("Afrique centrale occidentale")).toBeTruthy();
    // The footprint ranking links each country across to its own fiche.
    expect(screen.getByRole("link", { name: /Congo/ })).toBeTruthy();
    expect(screen.getByText("Glottolog")).toBeTruthy();
  });

  // @req REQ-047
  it("omits empty sections instead of rendering empty shells", () => {
    render(
      <LanguageFamilyDetailViewV2
        family={{ id: "FLG_EMPTY", nameFr: "Sans contenu", content: {} }}
      />
    );

    // The h1 and its editorial second half moved to the title band above the
    // globe (FamilyFicheTitle); FAMILY_TITLE_PREDICATE lives there now.
    // What this test is about is what the view omits when the corpus is
    // silent, which is asserted below.
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

    // The section that reports the gap is the one the parchment opens on, and
    // it is shown precisely because the fields inside it are empty.
    expect(
      screen.getByRole("heading", {
        name: "Ce que la fiche déclare, ce qu'elle ne déclare pas",
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "L'empreinte, et d'où elle vient" })
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
    expect(screen.getByTestId("footprint-ranking")).toBeInTheDocument();
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
  it("renders no marker for a declared value while still flagging a sibling empty field as missing", () => {
    const family = {
      id: "FLG_AFROASIATIQUE",
      nameFr: "Afroasiatique",
      content: {
        generalInfo: {
          branches: [],
          geographicArea: "Corne de l'Afrique, Sahara, Afrique du Nord.",
        },
        distribution: { distributionByCountry: {} },
      },
    };

    render(<LanguageFamilyDetailViewV2 family={family} />);

    // Both branches and distributionByCountry are structurally expected yet
    // empty in this fixture, so each is marked missing. Asserted on the two
    // cards rather than on a count of markers across the page, which changes
    // whenever a section is added and says nothing about either field.
    expect(screen.getByTestId("stat-card-branches")).toHaveAttribute(
      "data-provenance",
      "missing"
    );
    expect(screen.getByTestId("stat-card-distribution")).toHaveAttribute(
      "data-provenance",
      "missing"
    );
    // The one field this fixture does declare is shown, unmarked.
    expect(
      screen.getByText(family.content.generalInfo.geographicArea)
    ).toBeInTheDocument();
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
        }}
        selfAppellationLang="sw"
      />
    );

    expect(screen.getByText("Bantu")).toHaveAttribute("lang", "sw");
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "doctrine")}/endonymes-vs-exonymes`
    );
  });
  // @req REQ-050
  it("anchors source affordances and deep-links each country distribution", () => {
    render(<LanguageFamilyDetailViewV2 family={completeFamily} />);

    expect(screen.getByRole("contentinfo")).toHaveAttribute("id", "sources");
    // Each country of the footprint still steps across to its own fiche; the
    // ranking names it in French rather than by its ISO code.
    expect(screen.getByRole("link", { name: /Congo/ })).toHaveAttribute(
      "href",
      getCountryRoute("fr", "COD")
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
    expect(screen.getByRole("button", { name: "Liste" })).toBeInTheDocument();
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
