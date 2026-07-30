import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FamilyDecolonialHeader } from "@/components/family/FamilyDecolonialHeader";
import { FamilyHero } from "@/components/family/FamilyHero";
import { LanguageFamilyDetailViewV2 } from "@/components/family/LanguageFamilyDetailViewV2";
import type { LanguageFamily } from "@/types/afrik";

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
      screen.queryByRole("heading", { name: "Informations générales" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Caractéristiques linguistiques" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Histoire et origines" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Répartition géographique" })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Sources et références" })
    ).toBeNull();
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
});
