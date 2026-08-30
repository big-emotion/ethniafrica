import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    // The chapter is headed by its subject, not by the atlas's method of
    // handling it: "Ce que la fiche déclare, ce qu'elle ne déclare pas" named
    // an editorial procedure above four figures about a linguistic family.
    expect(
      screen.getByRole("heading", { name: "La famille en chiffres" })
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

    // The tag sits on the definition, which wraps the whole value, rather than
    // on a span inside it: it qualifies every block the field holds, and `lang`
    // inherits. What matters is that the endonym is announced in its own
    // language, not which element carries the attribute.
    expect(screen.getByText("Bantu").closest("[lang]")).toHaveAttribute(
      "lang",
      "sw"
    );
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "doctrine")}/endonymes-vs-exonymes`
    );
  });

  // The header printed nameFr, nameEn and the historical appellations as three
  // bare paragraphs, one after another, with nothing saying which was which —
  // three names stacked, and a reader had to guess. They are the subject of
  // this section, so they are labelled like every other field in it.
  // @req REQ-047
  it("labels the names it prints instead of stacking them bare", () => {
    render(
      <FamilyDecolonialHeader
        data={{
          linkWithFamily: null,
          nameFr: "Bantou",
          nameEn: null,
          historicalAppellations: ["Cafres", "Bantous"],
          originOfHistoricalTerm: null,
          whyProblematic: null,
          selfAppellation: null,
          contemporaryUsage: null,
        }}
      />
    );

    expect(screen.getByText(/Nom français/)).toBeTruthy();
    expect(screen.getByText(/Appellations historiques/)).toBeTruthy();
    expect(screen.getByText(/Cafres · Bantous/)).toBeTruthy();
  });

  // `nameEn` here is the very field the title band above the globe already
  // states, labelled — the band reads `hero.nameEn ?? decolonialHeader.nameEn`,
  // so whenever this one renders at all it is the same string a second time.
  // @req REQ-047
  it("leaves the English name to the title band that already labels it", () => {
    render(
      <FamilyDecolonialHeader
        data={{
          linkWithFamily: null,
          nameFr: null,
          nameEn: "Bantu languages",
          historicalAppellations: [],
          originOfHistoricalTerm: null,
          whyProblematic: null,
          selfAppellation: null,
          contemporaryUsage: null,
        }}
      />
    );

    expect(screen.queryByText("Bantu languages")).toBeNull();
  });

  // The parchment gives this field a section of its own — "D'où vient le nom
  // de la famille" — and the header listed it again as a labelled line. That
  // was the open half of the mockup's arbitrage on this section: it isolated
  // the field without deciding what became of the header around it. The
  // titled section wins; it is the one a reader can navigate to.
  // @req REQ-047
  it("leaves the origin of the historical term to the section built around it", () => {
    render(
      <FamilyDecolonialHeader
        data={{
          linkWithFamily: null,
          nameFr: null,
          nameEn: null,
          historicalAppellations: [],
          originOfHistoricalTerm: "Forgé par Wilhelm Bleek en 1862.",
          whyProblematic: null,
          selfAppellation: null,
          contemporaryUsage: null,
        }}
      />
    );

    expect(screen.queryByText(/Wilhelm Bleek/)).toBeNull();
  });

  // With every field it still prints empty, the section is a heading over
  // nothing. `originOfHistoricalTerm` no longer counts towards its content,
  // or it would open an empty section for a field it does not render.
  // @req REQ-047
  it("renders nothing when the only field left is one it no longer prints", () => {
    const { container } = render(
      <FamilyDecolonialHeader
        data={{
          linkWithFamily: null,
          nameFr: null,
          nameEn: "Bantu languages",
          historicalAppellations: [],
          originOfHistoricalTerm: "Forgé par Wilhelm Bleek en 1862.",
          whyProblematic: null,
          selfAppellation: null,
          contemporaryUsage: null,
        }}
      />
    );

    expect(container.firstChild).toBeNull();
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
