import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FamilyParchment } from "@/components/family/FamilyParchment";
import { buildFamilyFootprintOverlay } from "@/lib/atlas/overlays";
import type { FamilyPageData } from "@/lib/familyDataTransformer";

const overlay = buildFamilyFootprintOverlay(
  [["NGA", "BEN"], ["NGA", "TGO"], ["NGA"]],
  3
);

const memberPeoples = [
  { id: "PPL_A", nameMain: "Anaga", currentCountries: ["NGA"] },
  { id: "PPL_B", nameMain: "Bantou", currentCountries: ["NGA", "BEN", "TGO"] },
];

/** A fiche declaring neither branches nor a distribution — the state of every family in the recette database. */
function undeclaredFamily(): FamilyPageData {
  return {
    hero: {
      id: "FLG_BENOUECONGO",
      nameFr: "Bénoué-Congo",
      nameEn: "Benue–Congo",
      classificationStatus: null,
    },
    decolonialHeader: {
      linkWithFamily: null,
      nameFr: "Bénoué-Congo",
      nameEn: "Benue–Congo",
      historicalAppellations: [],
      originOfHistoricalTerm:
        "Le terme « Western Sudanese » a été introduit par Diedrich Westermann.",
      whyProblematic: null,
      selfAppellation: "Benue–Congo",
      contemporaryUsage: null,
      geographicArea: null,
      numberOfLanguages: 900,
      totalSpeakers: 500_000_000,
    },
    generalInfo: {
      branches: [],
      geographicArea: null,
      numberOfLanguages: 900,
      totalSpeakers: 500_000_000,
      associatedPeoples: [],
    },
    linguisticTraits: {
      typology: null,
      phonologicalFeatures: null,
      relationsWithNeighbors: null,
      keyInnovations: null,
    },
    history: {
      probableOrigin: null,
      emergencePeriod: null,
      diffusion: null,
      historicalBreaks: null,
      contactZones: null,
      majorEvents: null,
    },
    distribution: {
      totalSpeakers: 500_000_000,
      distributionByCountry: {},
      footprintByCountry: { NGA: 3, BEN: 1, TGO: 1 },
    },
    sources: [],
  };
}

function renderParchment(data: FamilyPageData = undeclaredFamily()) {
  render(
    <FamilyParchment
      data={data}
      footprintCountries={overlay!.countries}
      memberPeoples={memberPeoples}
      memberPeopleCount={memberPeoples.length}
    />
  );
}

describe("FamilyParchment — what the fiche declares", () => {
  // @req REQ-119
  it("reads « vide » for a field the fiche does not declare", () => {
    renderParchment();

    const branches = screen.getByTestId("stat-card-branches");
    expect(branches).toHaveTextContent("vide");
    expect(branches).toHaveAttribute("data-provenance", "missing");
  });

  // @req REQ-119
  it("reads the real count for a field the fiche does declare", () => {
    // This is the test the whole card exists for. The mockup hard-codes
    // "vide", which is true of the recette database and false of the corpus in
    // this repository, where all 24 family fiches already declare branches. A
    // page that hard-coded it would start lying to the reader about the state
    // of the corpus on the day the loader finally reaches the database — in a
    // project whose entire posture is source transparency, the worst possible
    // regression, and one no gate would catch.
    const declared = undeclaredFamily();
    declared.generalInfo.branches = ["Bantoid", "Defoid", "Igboid"];

    renderParchment(declared);

    const branches = screen.getByTestId("stat-card-branches");
    expect(branches).toHaveTextContent("3");
    expect(branches).not.toHaveTextContent("vide");
    expect(branches).toHaveAttribute("data-provenance", "declared");
  });

  // @req REQ-119
  it("does the same for the distribution, which is the other empty field", () => {
    const declared = undeclaredFamily();
    declared.distribution.distributionByCountry = { NGA: 60, BEN: 40 };

    renderParchment(declared);

    const distribution = screen.getByTestId("stat-card-distribution");
    expect(distribution).toHaveTextContent("2");
    expect(distribution).toHaveAttribute("data-provenance", "declared");
  });

  // @req REQ-119
  it("keeps the declared gap marked even though the footprint is derived", () => {
    // Deriving a value does not fill the hole it was derived around. The
    // footprint below says where the family is; this card still says the fiche
    // never declared it.
    renderParchment();

    expect(screen.getByTestId("stat-card-distribution")).toHaveAttribute(
      "data-provenance",
      "missing"
    );
    // The derived footprint is still stated, right beside the gap.
    expect(screen.getByTestId("footprint-ranking")).toBeInTheDocument();
  });

  // @req REQ-116
  it("states the scale the fiche does declare", () => {
    renderParchment();

    expect(screen.getByTestId("stat-card-langues")).toHaveTextContent("900");
    expect(screen.getByTestId("stat-card-locuteurs")).toHaveTextContent("500");
  });
});

describe("FamilyParchment — the footprint", () => {
  // @req REQ-116
  it("ranks the countries the way the globe drew them", () => {
    renderParchment();

    const rows = within(screen.getByTestId("footprint-ranking")).getAllByRole(
      "listitem"
    );
    expect(rows[0]).toHaveTextContent("Nigeria");
    expect(rows[0]).toHaveTextContent("3");
  });

  // @req REQ-116
  it("says the area is calculated, not read from the fiche", () => {
    renderParchment();

    expect(screen.getByText(/calculée/i)).toBeInTheDocument();
  });
});

describe("FamilyParchment — the peoples", () => {
  // @req REQ-116
  it("lists the most widespread first, with the countries each reaches", () => {
    renderParchment();

    const rows = within(screen.getByTestId("member-peoples")).getAllByRole(
      "listitem"
    );
    expect(rows[0]).toHaveTextContent("Bantou");
    expect(rows[0]).toHaveTextContent("3 pays");
  });
});

describe("FamilyParchment — the sources", () => {
  // @req REQ-116
  it("labels a source by its own tier, never by the retired Tier 1/2/3 scale", () => {
    // The mockup stamps every source "Tier 1". The project retired that scale
    // for Officielle / Référencée / Non vérifiée; reproducing it would put a
    // withdrawn vocabulary back on the page.
    const withSources = undeclaredFamily();
    withSources.sources = [
      { title: "Greenberg, J. (1963)", url: null, tier: "official" },
      { title: "Un blog", url: null, tier: "unverified" },
    ] as FamilyPageData["sources"];

    renderParchment(withSources);

    expect(screen.getByText(/Officielle/i)).toBeInTheDocument();
    expect(screen.getByText(/Non vérifiée/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tier 1/)).not.toBeInTheDocument();
  });

  // @req REQ-116
  it("turns a markdown link in a source into a link", () => {
    const withSources = undeclaredFamily();
    withSources.sources = [
      {
        title: "Maho, J. (2009) — [Guthrie List](https://goto.glottolog.org)",
        url: null,
        tier: "referenced",
      },
    ] as FamilyPageData["sources"];

    renderParchment(withSources);

    expect(screen.getByRole("link", { name: "Guthrie List" })).toHaveAttribute(
      "href",
      "https://goto.glottolog.org"
    );
  });

  // @req REQ-116
  it("escapes HTML in a source instead of rendering it", () => {
    // Sources come from the corpus, which is edited as JSON by contributors.
    // Rendering their text as markup would make a fiche an injection vector.
    const withSources = undeclaredFamily();
    withSources.sources = [
      {
        title: "<img src=x onerror=alert(1)> Vraie source",
        url: null,
        tier: "referenced",
      },
    ] as FamilyPageData["sources"];

    renderParchment(withSources);

    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText(/Vraie source/)).toBeInTheDocument();
  });
});
