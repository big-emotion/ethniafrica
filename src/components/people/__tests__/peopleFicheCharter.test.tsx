import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleDetailViewV2 } from "@/components/people/PeopleDetailViewV2";
import { PeopleFicheTitle } from "@/components/people/PeopleFicheTitle";
import type { PeopleDetail } from "@/types/afrik-frontend";

/**
 * The people fiche's parity contract, held against the mockup at
 * docs/design/mockups/pages/peuple.html.
 *
 * Named "charter" so scripts/charterContractManifest.ts picks it up: the
 * aggregate suite is its own CI step, which makes a regression here read as
 * "charter contract suite failed" rather than hiding in the generic run.
 *
 * It is measured on the three regimes the corpus actually has, because they
 * render different fiches. The mockup was drawn on a five-country people; half
 * the corpus declares one country and gets neither picker nor share bar, and
 * PPL_BANTU stacks 21. A pass on the middle case says nothing about the edges,
 * which is how the previous plan for this surface was built on a premise
 * nobody had recounted.
 */
function peopleWith(
  countries: Array<{ country: string; population: number }>
): PeopleDetail {
  return {
    id: "PPL_SAMPLE",
    nameMain: "Échantillon",
    languageFamilyId: "FLG_BANTU",
    languageFamilyName: "Bantu",
    currentCountries: countries.map((entry) => entry.country),
    appellations: {
      mainName: "Échantillon",
      selfAppellation: "Autonyme",
      exonyms: ["Exonyme colonial"],
      whyProblematic: "Pourquoi ce nom pose problème.",
      ethnoLinguisticGroup: "Volta-Congo",
      historicalRegion: "Région historique déclarée",
    },
    languages: { mainLanguage: "Langue", isoCodes: ["xxx"], dialects: ["A"] },
    origins: { ancientOrigins: "Origines déclarées." },
    demography: {
      totalPopulation: countries.reduce((sum, e) => sum + e.population, 0),
      referenceYear: 2025,
      distributionByCountry: countries,
    },
    sources: [{ title: "Source", url: null, tier: "official" }],
  };
}

const REGIMES = [
  {
    label: "one country — half the corpus",
    people: peopleWith([{ country: "NGA", population: 45500000 }]),
    presenceCount: 1,
  },
  {
    label: "five countries — the mockup's own sample",
    people: peopleWith([
      { country: "NGA", population: 45500000 },
      { country: "BEN", population: 1800000 },
      { country: "TGO", population: 450000 },
      { country: "GHA", population: 150000 },
      { country: "SLE", population: 7300 },
    ]),
    presenceCount: 5,
  },
  {
    label: "21 countries — the widest field in the corpus",
    people: peopleWith(
      [
        "NGA",
        "BEN",
        "TGO",
        "GHA",
        "CMR",
        "COD",
        "AGO",
        "ZMB",
        "TZA",
        "KEN",
        "UGA",
        "RWA",
        "BDI",
        "MWI",
        "MOZ",
        "ZWE",
        "BWA",
        "NAM",
        "ZAF",
        "COG",
        "GAB",
      ].map((country, index) => ({
        country,
        population: 1000000 - index * 1000,
      }))
    ),
    presenceCount: 21,
  },
];

describe("people fiche parity with the mockup", () => {
  afterEach(cleanup);

  for (const regime of REGIMES) {
    // @req REQ-115
    it(`renders the mockup's sections, in order, on ${regime.label}`, () => {
      const { container } = render(
        <PeopleDetailViewV2 language="fr" people={regime.people} />
      );

      const sections = [
        ...container.querySelectorAll("[data-fiche-section]"),
      ].map((node) => node.getAttribute("data-fiche-section"));

      // The mockup's four prose sections open the fiche, in this order. What
      // follows them (history, culture, distribution…) is the fiche's own
      // depth and is not what parity is measured on.
      expect(sections.slice(0, 4)).toEqual([
        "Le nom porté, les noms subis",
        "Pourquoi la carte ne trace pas de frontière",
        "Origines & formation",
        "Langue",
      ]);
    });

    // The count lives in the fiche's head, which now stands above the globe
    // rather than inside the parchment — so it is PeopleFicheTitle that must
    // state it, and this asserts the page still does.
    // @req REQ-115
    it(`counts the presence countries the globe draws on ${regime.label}`, () => {
      render(<PeopleFicheTitle people={regime.people} />);

      expect(
        screen.getByText(`${regime.presenceCount} pays de présence`)
      ).toBeInTheDocument();
    });

    // The hard rule the charter calls hard: a people never receives a closed
    // line. The legend is prose and a list, and it must stay that way — a
    // swatch drawn as a stroked shape would be the first edge on the page.
    // @req REQ-116
    it(`draws no closed outline anywhere on ${regime.label}`, () => {
      const { container } = render(
        <PeopleDetailViewV2 language="fr" people={regime.people} />
      );

      expect(container.querySelector("polygon")).toBeNull();
      expect(container.querySelector("path[stroke]")).toBeNull();
    });
  }

  // 316 fiches carry no whyProblematic and 4 record no exonym. The mockup
  // renders both unconditionally; the corpus cannot.
  // @req REQ-115
  it("never prints a heading the fiche has nothing to put under", () => {
    const bare = peopleWith([{ country: "NGA", population: 1000 }]);
    render(
      <PeopleDetailViewV2
        language="fr"
        people={{
          ...bare,
          appellations: {
            mainName: "Échantillon",
            selfAppellation: "Autonyme",
          },
        }}
      />
    );

    expect(screen.queryByText("Exonymes")).toBeNull();
    expect(screen.queryByText(/Pourquoi ces noms posent problème/)).toBeNull();
  });
});

/**
 * Charter §4 on the people fiche.
 *
 * The two granularities are deliberately not the same rule. A **chapter** of
 * the fiche model — origines, langue, rôle historique, culture… — is one every
 * fiche is structurally expected to fill, so its emptiness is a fact about the
 * corpus and the fiche states it. A **field inside a block**, like the exonyms
 * above, is optional by design, and marking it would report a gap the model
 * never opened.
 */
describe("people fiche — what the corpus does not fill", () => {
  afterEach(cleanup);

  /** A fiche carrying its appellations and nothing else the model asks for. */
  function bareFiche(): PeopleDetail {
    const people = peopleWith([{ country: "NGA", population: 1000 }]);
    return {
      ...people,
      origins: undefined,
      languages: undefined,
      culture: undefined,
      historicalRole: undefined,
      organization: undefined,
    } as PeopleDetail;
  }

  // @req REQ-119
  it("keeps every chapter of the model, filled or not", () => {
    const { container } = render(
      <PeopleDetailViewV2 language="fr" people={bareFiche()} />
    );

    const chapters = [
      ...container.querySelectorAll("[data-fiche-section]"),
    ].map((node) => node.getAttribute("data-fiche-section"));

    expect(chapters).toContain("Origines & formation");
    expect(chapters).toContain("Langue");
    expect(chapters).toContain("Rôle historique");
    expect(chapters).toContain("Culture & spiritualité");
  });

  // @req REQ-119
  it("marks each unfilled chapter as a gap in the corpus", () => {
    const { container } = render(
      <PeopleDetailViewV2 language="fr" people={bareFiche()} />
    );

    const textOf = (title: string) =>
      container.querySelector(`[data-fiche-section="${title}"]`)?.textContent ??
      "";

    expect(textOf("Origines & formation")).toContain("Donnée manquante");
    expect(textOf("Langue")).toContain("Donnée manquante");
    expect(textOf("Rôle historique")).toContain("Donnée manquante");
  });

  // A marker beside a value the fiche does declare would report a gap that is
  // not there — the failure charter §4 was rewritten after.
  // @req REQ-119
  it("marks nothing on a chapter the fiche does fill", () => {
    const { container } = render(
      <PeopleDetailViewV2
        language="fr"
        people={peopleWith([{ country: "NGA", population: 1000 }])}
      />
    );

    expect(
      container.querySelector('[data-fiche-section="Langue"]')?.textContent
    ).not.toContain("Donnée manquante");
  });

  // Fragmentation is not a rubric of the model: it exists only where a people
  // straddles two countries. Absent below that, it is inapplicable, not
  // missing, and marking it would invent a gap.
  // @req REQ-119
  it("prints no chapter for what the model never asked for", () => {
    const { container } = render(
      <PeopleDetailViewV2 language="fr" people={bareFiche()} />
    );

    const chapters = [
      ...container.querySelectorAll("[data-fiche-section]"),
    ].map((node) => node.getAttribute("data-fiche-section"));

    expect(chapters).not.toContain("Fragmentation coloniale");
  });

  // @req REQ-119
  it("prints no field path in its provenance notes", () => {
    const { container } = render(
      <PeopleDetailViewV2 language="fr" people={bareFiche()} />
    );

    const notes = Array.from(
      container.querySelectorAll(".afh-parchment-note")
    ).map((node) => node.textContent ?? "");

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes)
      expect(note).not.toMatch(/[a-z][A-Za-z0-9]*\.[a-zA-Z]/);
  });
});
