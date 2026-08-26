import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { PeopleDetailViewV2 } from "../PeopleDetailViewV2";
import type { PeopleDetail } from "@/types/afrik-frontend";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

const ewe: PeopleDetail = {
  id: "PPL_EWE",
  nameMain: "Ewe",
  languageFamilyId: "FLG_KWA",
  languageFamilyName: "Kwa",
  currentCountries: ["GHA", "TGO"],
  appellations: {
    mainName: "Ewe",
    selfAppellation: "Eʋeawo",
    exonyms: ["Ewhe (graphie coloniale)"],
    whyProblematic: "La graphie « Ewhe » vient des rapports coloniaux.",
  },
  languages: { mainLanguage: "Ewe", isoCodes: ["ewe"], dialects: ["Anlo"] },
  origins: { ancientOrigins: "Migrations depuis Notsé." },
  demography: {
    totalPopulation: 7000000,
    referenceYear: 2025,
    distributionByCountry: [
      { country: "GHA", population: 4000000 },
      { country: "TGO", population: 3000000 },
    ],
  },
  sources: [
    { title: "SIL Ethnologue 2025", url: null, tier: "official" },
    { title: "Note de terrain", url: null, tier: "needs_review" },
  ],
};

const fragmentation: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋeawo",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    { iso3: "GHA", nameFr: "Ghana", populationShare: 0.55, assertionId: null },
    { iso3: "TGO", nameFr: "Togo", populationShare: 0.45, assertionId: null },
  ],
  borderPairs: [],
};

describe("PeopleDetailViewV2", () => {
  afterEach(cleanup);

  // The view was a client component that fetched its own fiche, which cost the
  // page its server rendering — and with it the axe audit and the Lighthouse
  // score, on a fiche measured by both. The route already awaits all of this.
  // @req REQ-091
  it("renders from the props it is handed, with no fetching of its own", () => {
    render(<PeopleDetailViewV2 people={ewe} />);

    expect(screen.getAllByText("Ewe").length).toBeGreaterThan(0);
    expect(screen.getByText(/Migrations depuis Notsé/)).toBeInTheDocument();
  });

  // The mockup opens on the naming section, before any figure: it is the
  // fiche's editorial position, not a detail of its identity block.
  // @req REQ-115
  it("opens on the name borne and the names imposed", () => {
    render(<PeopleDetailViewV2 people={ewe} />);

    expect(
      screen.getByText("Le nom porté, les noms subis")
    ).toBeInTheDocument();
    // The hero carries the autonym too, so this asserts presence rather than
    // uniqueness; PeopleNamingBlock's own test pins where it sits.
    expect(screen.getAllByText("Eʋeawo").length).toBeGreaterThan(0);
    expect(screen.getByText(/Ewhe \(graphie coloniale\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Pourquoi ces noms posent problème/)
    ).toBeInTheDocument();
  });

  // @req REQ-116
  it("explains the globe's grammar rather than leaving the halo to be guessed at", () => {
    render(<PeopleDetailViewV2 people={ewe} />);

    expect(
      screen.getByText("Pourquoi la carte ne trace pas de frontière")
    ).toBeInTheDocument();
    expect(screen.getByText(/2 populations par pays/)).toBeInTheDocument();
  });

  // 316 of 789 fiches carry no whyProblematic, and 4 record no exonym. Each
  // absence has to cost its own block, never a heading standing over nothing.
  // @req REQ-115
  it("drops the parts of the naming section the fiche cannot fill", () => {
    render(
      <PeopleDetailViewV2
        people={{
          ...ewe,
          appellations: { mainName: "Ewe", selfAppellation: "Eʋeawo" },
        }}
      />
    );

    expect(
      screen.getByText("Le nom porté, les noms subis")
    ).toBeInTheDocument();
    expect(screen.queryByText("Exonymes")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Pourquoi ces noms posent problème/)
    ).not.toBeInTheDocument();
  });

  // @req REQ-116
  it("omits the cartographic grammar for a fiche declaring no distribution", () => {
    render(<PeopleDetailViewV2 people={{ ...ewe, demography: undefined }} />);

    expect(
      screen.queryByText("Pourquoi la carte ne trace pas de frontière")
    ).not.toBeInTheDocument();
  });

  // @req REQ-092
  it("shows each source with the tier it carries", () => {
    render(<PeopleDetailViewV2 people={ewe} />);

    expect(screen.getByText("Officielle")).toBeInTheDocument();
    expect(screen.getByText("En attente d'examen")).toBeInTheDocument();
  });

  // @req REQ-091
  it("renders the colonial fragmentation the route resolved, and nothing when there is none", () => {
    render(<PeopleDetailViewV2 people={ewe} fragmentation={fragmentation} />);
    expect(screen.getByText("Fragmentation coloniale")).toBeInTheDocument();

    cleanup();
    render(<PeopleDetailViewV2 people={ewe} />);
    expect(screen.queryByText("Fragmentation coloniale")).toBeNull();
  });
});
