import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FamilyParchment } from "@/components/family/FamilyParchment";
import { FamilyFicheTitle } from "@/components/family/FamilyFicheTitle";
import { buildFamilyFootprintOverlay } from "@/lib/atlas/overlays";
import type { FamilyPageData } from "@/lib/familyDataTransformer";
import {
  getFamilyRoute,
  getLocalizedRoute,
  getPeopleRoute,
} from "@/lib/routing";
import { deriveTrail } from "@/lib/navigation/deriveTrail";

const overlay = buildFamilyFootprintOverlay(
  [["NGA", "BEN"], ["NGA", "TGO"], ["NGA"]],
  3
);

/** The stored row the band transforms — the parchment takes a view model. */
const BENOUECONGO_FAMILY = {
  id: "FLG_BENOUECONGO",
  nameFr: "Bénoué-Congo",
  nameEn: "Benue–Congo",
  content: {},
} as never;

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
  return render(
    <FamilyParchment
      language="fr"
      data={data}
      footprintCountries={overlay!.countries}
      memberPeoples={memberPeoples}
      memberPeopleCount={memberPeoples.length}
    />
  );
}

describe("FamilyParchment — what the fiche declares", () => {
  // The head opened on "N peuples · M pays dérivés" — the same two figures
  // the empreinte section states a screen below, in a sentence that also says
  // what they were derived from and by which rule. Bare in a chip they were
  // the conclusion without the argument, and the word "dérivés" asserted a
  // provenance the chip could not name.
  // @req REQ-116
  it("leaves the derived figures to the section that explains them", () => {
    renderParchment();

    expect(screen.queryByText(/pays dérivés/)).toBeNull();
    // The sentence that does explain them is asserted in « says the area is
    // calculated, not read from the fiche » below.
  });

  // Removing the last unconditional chip left the head band rendering an empty
  // bordered strip under the globe on any fiche that declares a distribution.
  // @req REQ-116
  it("renders no head band when there is no chip to put in it", () => {
    const { container } = renderParchment({
      ...undeclaredFamily(),
      distribution: {
        totalSpeakers: null,
        distributionByCountry: { COD: 3 },
        footprintByCountry: {},
      },
    });

    expect(container.querySelector(".afh-parchment-head")).toBeNull();
  });

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

  // The head opened on a "900 langues" chip and the stat card printed 900 a
  // few lines below it — the same field, twice, on one screen. The card is the
  // one that carries the rubric naming where the figure is read and the
  // provenance marker when it is missing; the chip carried neither.
  // @req REQ-116
  it("states the languages count once, on the card that names its rubric", () => {
    const { container } = renderParchment();

    const stated = Array.from(container.querySelectorAll("*")).filter(
      (element) =>
        element.children.length === 0 &&
        /\b900\b/.test(element.textContent ?? "")
    );

    expect(stated).toHaveLength(1);
    expect(
      stated[0].closest("[data-testid='stat-card-langues']")
    ).not.toBeNull();
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

  /**
   * The rule is stated in French, not in field names. Which rule produced the
   * area still has to be legible — that is REQ-116 — but "les peuples
   * rattachés à cette famille" says it to the reader who came for peoples,
   * and `languageFamilyId` said it only to someone holding the schema.
   */
  // @req REQ-116
  it("credits the peoples attached to the family, in French, when that is where it looked", () => {
    const { container } = renderParchment();

    // Each rule has one sentence only it can produce. Matching on "peuples
    // rattachés" alone would also catch the members section's own heading,
    // which both branches render.
    expect(container.textContent).toContain("rattachés à cette famille");
    expect(container.textContent).not.toContain(
      "la seule liste que la fiche assume"
    );
    expect(container.querySelector("code")).toBeNull();
  });

  /**
   * A macro-family (Afro-asiatique) has no people carrying its own id, so the
   * area comes from the peoples the fiche names instead. Saying "peuples
   * rattachés" there would describe a rule the page did not apply.
   */
  // @req REQ-116
  it("names the fiche's own declaration when that is where it looked instead", () => {
    const { container } = render(
      <FamilyParchment
        language="fr"
        data={undeclaredFamily()}
        footprintCountries={overlay!.countries}
        memberPeoples={memberPeoples}
        memberPeopleCount={memberPeoples.length}
        footprintProvenance="declared-associated-peoples"
      />
    );

    expect(container.textContent).toContain(
      "la seule liste que la fiche assume"
    );
    expect(container.textContent).toContain("peuples que la fiche nomme");
    expect(screen.getByText(/sous-familles/i)).toBeInTheDocument();
    expect(container.textContent).not.toContain("rattachés à cette famille");
    expect(container.querySelector("code")).toBeNull();
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
    expect(
      link.getAttribute("href")?.startsWith(getPeopleRoute("fr", "PPL_"))
    ).toBe(true);
  });
});

describe("FamilyParchment — the trail", () => {
  // A family fiche carried no breadcrumb at all, while the people fiches
  // below it open theirs on "Familles" — the parent announced none of the
  // hierarchy its children did.
  // @req REQ-115
  it("puts the family under the families directory", () => {
    // The trail is the shell's now — mounted once in `PageLayout` for every
    // route — so what a family fiche owes it is the family's name, and what is
    // asserted here is the path that name lands in.
    // The fixture above is cast to `never` to satisfy the band's prop, so its
    // fields are spelled out here rather than read back off it.
    const trail = deriveTrail(
      getFamilyRoute("fr", "FLG_BENOUECONGO"),
      "Bénoué-Congo"
    );

    expect(trail).toContainEqual({
      label: "Familles",
      href: getLocalizedRoute("fr", "families"),
    });
    expect(trail.at(-1)?.label).toBe("Bénoué-Congo");
  });

  /**
   * The band mounted its own trail until the shell took it over. Asserting the
   * absence is what keeps a second one from coming back: two trails on a fiche
   * is the failure this move was made to end, and it renders as a duplicate
   * rather than an error.
   */
  // @req REQ-115
  it("mounts no trail of its own, the shell owning the only one", () => {
    render(<FamilyFicheTitle family={BENOUECONGO_FAMILY} />);

    expect(
      screen.queryByRole("navigation", { name: /fil d'ariane/i })
    ).toBeNull();
  });
});

describe("FamilyParchment — the sources", () => {
  // A family declaring no source lost the section outright — and with it
  // #sources, the landmark deep links across the app point at, so those links
  // scrolled nowhere on exactly the fiches whose sourcing a reader would most
  // want to check. The people and country parchments print the section with a
  // missing marker instead, which is charter §4: state the gap, never hide it.
  // @req REQ-116
  it("keeps its footer landmark for a family that declares no source", () => {
    const { container } = renderParchment({
      ...undeclaredFamily(),
      sources: [],
    });

    const footer = container.querySelector("#sources");
    expect(footer).not.toBeNull();
    expect(footer?.tagName.toLowerCase()).toBe("footer");
    expect(footer?.textContent).toMatch(/Donnée manquante/);
  });

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
 * under a card headed "Locuteurs". Translating those into the model's French
 * rubric names moved the sentence out of JSON without moving it towards the
 * reader: "Rubriques « informations générales » et « répartition » de la
 * fiche" still names the machinery.
 *
 * What survives is what the reader can act on: the derivation prose, which
 * walks through how the footprint was computed (the charter states that rule
 * with the field names in it, §1), and the tier note, which says what the
 * badge on each source means.
 */
describe("FamilyParchment — provenance addressed to the reader", () => {
  const FIELD_PATH = /[a-z][A-Za-z0-9]*\.[a-zA-Z]/;
  const MODEL_RUBRIC = /rubriques?\s+«/i;

  /**
   * The card's third line was the mockup's field annotation twice translated:
   * out of "generalInfo.totalSpeakers", then into "Informations générales ·
   * total de locuteurs" — under a card already headed "Locuteurs". The
   * provenance marker below the figure is what a reader acts on.
   */
  // @req REQ-119
  it("gives a figure a label and a provenance marker, and no third line", () => {
    renderParchment();

    expect(document.querySelectorAll(".afh-stat-card-src")).toHaveLength(0);
    expect(document.querySelectorAll(".afh-stat-card")).toHaveLength(4);
    expect(
      within(screen.getByTestId("stat-card-branches")).getByText(
        "Donnée manquante"
      )
    ).toBeTruthy();
  });

  // @req REQ-119
  it("names neither a field path nor a rubric of the fiche model in a note", () => {
    renderParchment();

    const notes = Array.from(
      document.querySelectorAll(".afh-parchment-note")
    ).map((node) => node.textContent ?? "");

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note).not.toMatch(FIELD_PATH);
      expect(note).not.toMatch(MODEL_RUBRIC);
    }
  });

  /**
   * Charter §4 wants the gap stated, not argued. The paragraph used to weigh
   * the editorial alternatives out loud — "plutôt que de masquer la section ou
   * d'inventer une aire" — a decision the reader was never asked to make.
   */
  // @req REQ-119
  it("states the gap and its consequence, without arguing the choice", () => {
    renderParchment();

    const gap = document.querySelector(".afh-parchment-gap");
    expect(gap).not.toBeNull();
    expect(gap?.textContent).toMatch(/branches/i);
    expect(gap?.textContent).toMatch(/répartition/i);
    expect(gap?.textContent).toMatch(/reconstruite/i);
    expect(gap?.textContent).not.toMatch(/plutôt que|l'état du corpus/i);
    expect(gap?.querySelector("h3")).toBeNull();
    expect(gap?.querySelector("code")).toBeNull();
  });
});
