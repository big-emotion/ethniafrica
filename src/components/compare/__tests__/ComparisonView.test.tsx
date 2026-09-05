import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComparisonView } from "@/components/compare/ComparisonView";
import { CompareSectionRow } from "@/components/compare/CompareSectionRow";
import { CompareValueCell } from "@/components/compare/CompareValueCell";
import type { ComparisonPageData } from "@/types/compare";
import { getCountryRoute, getFamilyRoute } from "@/lib/routing";

// @req REQ-097 REQ-098
const peopleComparison: ComparisonPageData = {
  type: "peuple",
  columns: [
    { id: "PPL_YORUBA", label: "Yoruba", type: "peuple" },
    { id: "PPL_IGBO", label: "Igbo", type: "peuple" },
  ],
  rows: [
    {
      key: "appellations",
      values: {
        PPL_YORUBA: {
          mainName: "Yoruba",
          selfAppellation: "Yoruba",
          linguisticFamily: "FLG_NIGER_CONGO",
          currentCountries: ["NGA", "BEN"],
        },
        PPL_IGBO: null,
      },
    },
    {
      key: "demography",
      values: {
        PPL_YORUBA: {
          totalPopulation: 47000000,
          distributionByCountry: [
            { country: "NGA", population: 40000000, percentage: 85 },
          ],
        },
        PPL_IGBO: {
          totalPopulation: 32000000,
        },
      },
    },
  ],
};

describe("ComparisonView", () => {
  // @req REQ-097
  it("renders a table caption naming the compared entities", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByText("Comparaison de Yoruba et Igbo")
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("renders one column header per entity", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    expect(
      screen.getAllByRole("columnheader", { name: "Yoruba" })
    ).toHaveLength(1);
    expect(screen.getAllByRole("columnheader", { name: "Igbo" })).toHaveLength(
      1
    );
  });

  // @req REQ-097
  it("renders one row header per comparable attribute", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    expect(
      screen.getAllByRole("rowheader", { name: "Noms & appellations" })
    ).toHaveLength(1);
    expect(
      screen.getAllByRole("rowheader", { name: "Répartition géographique" })
    ).toHaveLength(1);
  });

  // @req REQ-097
  it("stacks each section as a definition list whose dt reads '{row label} — {autonym}'", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    expect(
      screen.getByText("Noms & appellations — Yoruba")
    ).toBeInTheDocument();
    expect(screen.getByText("Noms & appellations — Igbo")).toBeInTheDocument();
    expect(screen.getAllByRole("definition").length).toBeGreaterThan(0);
  });

  // @req REQ-097
  it("links relational values to their fiches", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    expect(
      screen.getAllByRole("link", { name: "FLG_NIGER_CONGO" })[0]
    ).toHaveAttribute("href", getFamilyRoute("fr", "FLG_NIGER_CONGO"));
    expect(screen.getAllByRole("link", { name: "NGA" })[0]).toHaveAttribute(
      "href",
      getCountryRoute("fr", "NGA")
    );
  });

  // @req REQ-098
  it("shows non renseigné with sr-only entity context for an absent section", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    const missing = screen.getAllByText("non renseigné")[0];
    expect(missing).toBeInTheDocument();
    expect(
      within(missing.parentElement as HTMLElement).getByText("pour Igbo")
    ).toBeInTheDocument();
  });

  // @req REQ-098
  it("shows a réf. 2025 caption on demography rows without reformatting the figures", () => {
    render(<ComparisonView language="fr" data={peopleComparison} />);

    expect(screen.getAllByText("réf. 2025").length).toBeGreaterThan(0);
    expect(screen.getAllByText("47000000").length).toBeGreaterThan(0);
  });

  // @req REQ-098
  it("drops a row that is null for every entity", () => {
    const data: ComparisonPageData = {
      ...peopleComparison,
      rows: [
        ...peopleComparison.rows,
        { key: "culture", values: { PPL_YORUBA: null, PPL_IGBO: null } },
      ],
    };
    render(<ComparisonView language="fr" data={data} />);

    expect(
      screen.queryByRole("rowheader", { name: "Culture & spiritualité" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Culture & spiritualité —/)
    ).not.toBeInTheDocument();
  });
});

describe("CompareSectionRow", () => {
  // @req REQ-098
  it("renders nothing when every entity value is null", () => {
    const { container } = render(
      <CompareSectionRow
        language="fr"
        row={{ key: "culture", values: { PPL_YORUBA: null, PPL_IGBO: null } }}
        entities={peopleComparison.columns}
        entityType="peuple"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  // @req REQ-097
  it("renders a section heading and one dt/dd pair per entity", () => {
    render(
      <CompareSectionRow
        language="fr"
        row={peopleComparison.rows[0]}
        entities={peopleComparison.columns}
        entityType="peuple"
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Noms & appellations" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Noms & appellations — Yoruba")
    ).toBeInTheDocument();
    expect(screen.getByText("Noms & appellations — Igbo")).toBeInTheDocument();
    expect(screen.getAllByRole("definition").length).toBeGreaterThanOrEqual(2);
  });
});

describe("CompareValueCell", () => {
  // @req REQ-098
  it("renders 'non renseigné' with sr-only entity context when the value is missing", () => {
    render(
      <CompareValueCell
        language="fr"
        value={null}
        entity={{ id: "PPL_IGBO", label: "Igbo", type: "peuple" }}
      />
    );

    expect(screen.getByText("non renseigné")).toBeInTheDocument();
    expect(screen.getByText("pour Igbo")).toBeInTheDocument();
  });

  // @req REQ-098
  it("renders a scalar value verbatim", () => {
    render(
      <CompareValueCell
        language="fr"
        value={47000000}
        entity={{ id: "PPL_YORUBA", label: "Yoruba", type: "peuple" }}
      />
    );

    expect(screen.getByText("47000000")).toBeInTheDocument();
  });

  // @req REQ-098
  it("renders a relational id string as a link to its fiche", () => {
    render(
      <CompareValueCell
        language="fr"
        value="FLG_NIGER_CONGO"
        entity={{ id: "PPL_YORUBA", label: "Yoruba", type: "peuple" }}
      />
    );

    expect(
      screen.getByRole("link", { name: "FLG_NIGER_CONGO" })
    ).toHaveAttribute("href", getFamilyRoute("fr", "FLG_NIGER_CONGO"));
  });

  // @req REQ-098
  it("appends a réf. 2025 caption only when showReferenceYear is set", () => {
    render(
      <CompareValueCell
        language="fr"
        value={{ totalPopulation: 1000 }}
        entity={{ id: "PPL_YORUBA", label: "Yoruba", type: "peuple" }}
        showReferenceYear
      />
    );

    expect(screen.getByText("réf. 2025")).toBeInTheDocument();
  });
});
