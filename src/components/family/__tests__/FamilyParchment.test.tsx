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

/**
 * A fiche declaring neither branches nor a distribution.
 *
 * This used to describe every family in the recette database, because the
 * loader had not been run since those fields were written to the corpus. It no
 * longer describes any of them — all 24 declare both — so it models the case
 * rather than reporting the state.
 */
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
    // This is the test the whole card exists for, and the day it was written
    // for has arrived. The mockup hard-codes "vide"; that was true of the
    // recette database and false of the corpus, where all 24 fiches already
    // declared branches. The loader has since been run, so the database now
    // declares them too — and a page that had hard-coded "vide" would be
    // lying to the reader today. In a project whose entire posture is source
    // transparency, the worst possible regression, and one no gate would
    // have caught.
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

  // @req REQ-116
  it("credits the peoples carrying the family id when that is where it looked", () => {
    renderParchment();

    expect(
      screen.getByText("languageFamilyId", { selector: "code" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("associatedPeoples", { selector: "code" })
    ).not.toBeInTheDocument();
  });

  /**
   * A macro-family (Afro-asiatique) has no people carrying its own id, so the
   * area comes from the peoples the fiche names instead. Saying "peuples
   * rattachés" there would describe a rule the page did not apply.
   */
  // @req REQ-116
  it("names the fiche's own declaration when that is where it looked instead", () => {
    render(
      <FamilyParchment
        data={undeclaredFamily()}
        footprintCountries={overlay!.countries}
        memberPeoples={memberPeoples}
        memberPeopleCount={memberPeoples.length}
        footprintProvenance="declared-associated-peoples"
      />
    );

    expect(
      screen.getByText("associatedPeoples", { selector: "code" })
    ).toBeInTheDocument();
    expect(screen.getByText(/sous-familles/i)).toBeInTheDocument();
    expect(
      screen.queryByText("languageFamilyId", { selector: "code" })
    ).not.toBeInTheDocument();
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

  // The corpus carries each member's PPL_ id and the list used to throw it
  // away, so the one move a reader of this section wants was the one it did
  // not offer.
  // @req REQ-116
  it("opens each member people's fiche", () => {
    renderParchment();

    const link = within(screen.getByTestId("member-peoples")).getAllByRole(
      "link"
    )[0];
    expect(link).toHaveTextContent("Bantou");
    expect(link.getAttribute("href")).toMatch(/^\/fr\/peuples\/PPL_/);
  });
});

describe("FamilyParchment — the trail", () => {
  // A family fiche carried no breadcrumb at all, while the people fiches
  // below it open theirs on "Familles" — the parent announced none of the
  // hierarchy its children did.
  // @req REQ-115
  it("puts the family under the families directory", () => {
    renderParchment();

    const trail = screen.getByRole("navigation", { name: /fil d'ariane/i });
    const up = within(trail).getByRole("link", { name: "Familles" });

    expect(up).toHaveAttribute("href", "/fr/familles");
    expect(trail).toHaveTextContent("Bénoué-Congo");
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

/**
 * Who the provenance lines are written for.
 *
 * The family fiche was the first surface to say where each figure comes from,
 * and it said it in the corpus's own key names — "generalInfo.totalSpeakers"
 * under a card headed "Locuteurs". The claim was right and the audience was
 * wrong. The gap paragraph goes the same way: it already names the two empty
 * rubrics in French, and repeating them as JSON keys adds nothing a reader
 * can act on.
 *
 * The derivation prose is the one place a key still belongs. It walks a reader
 * through how the footprint was computed, and the charter itself states that
 * rule with the field names in it (§1) — naming them is what makes the
 * reconstruction checkable rather than a claim to trust.
 */
describe("FamilyParchment — provenance addressed to the reader", () => {
  const FIELD_PATH = /[a-z][A-Za-z0-9]*\.[a-zA-Z]/;

  // @req REQ-119
  it("prints no field path on a stat card", () => {
    renderParchment();

    const sources = Array.from(
      document.querySelectorAll(".afh-stat-card-src")
    ).map((node) => node.textContent ?? "");

    expect(sources).toHaveLength(4);
    for (const source of sources) expect(source).not.toMatch(FIELD_PATH);
  });

  // @req REQ-119
  it("prints no field path in a section's provenance note", () => {
    renderParchment();

    const notes = Array.from(
      document.querySelectorAll(".afh-parchment-note")
    ).map((node) => node.textContent ?? "");

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(note).not.toMatch(FIELD_PATH);
  });

  // @req REQ-119
  it("names the two empty rubrics without naming their JSON keys", () => {
    renderParchment();

    const gap = document.querySelector(".afh-parchment-gap");
    expect(gap).not.toBeNull();
    expect(gap?.textContent).toMatch(/branches/i);
    expect(gap?.textContent).toMatch(/répartition/i);
    expect(gap?.querySelector("code")).toBeNull();
  });
});
