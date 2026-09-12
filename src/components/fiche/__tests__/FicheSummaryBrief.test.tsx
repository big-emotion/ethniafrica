import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSummaryBrief } from "@/components/fiche/FicheSummaryBrief";

describe("FicheSummaryBrief", () => {
  // @req REQ-151
  it("renders the five country figures with a year and scoped coverage labels", () => {
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="ZZZ"
        name="Test country"
        language="fr"
        figures={{
          population: { value: 12_000_000, referenceYear: 2025 },
          peoples: 3,
          languages: 4,
          families: 2,
          names: 23,
        }}
      />
    );

    const panel = screen.getByRole("region", { name: /Test country/ });
    expect(within(panel).getByText("habitants")).toBeVisible();
    expect(within(panel).getAllByRole("definition")[0]).toHaveTextContent(
      /12\s?000\s?000/
    );
    expect(within(panel).getByText("Année de référence : 2025")).toBeVisible();
    expect(within(panel).getByText("peuples")).toBeVisible();
    expect(within(panel).getByText("langues")).toBeVisible();
    expect(within(panel).getByText("familles linguistiques")).toBeVisible();
    expect(within(panel).getByText("noms")).toBeVisible();
    expect(within(panel).getByText("23")).toBeVisible();

    // Population is the one figure a reader arrives wanting; the other four
    // are the reach of what the atlas holds. One lead plate, four tiles.
    expect(within(panel).getByTestId("stat-card-population")).toHaveAttribute(
      "data-emphasis",
      "lead"
    );
    expect(
      within(panel)
        .getAllByTestId(/^stat-card-/)
        .filter((card) => card.dataset.emphasis === "tile")
    ).toHaveLength(4);

    // The scope the label used to carry now sits under the count.
    expect(
      within(within(panel).getByTestId("stat-card-peoples")).getByText(
        "documentés ici"
      )
    ).toBeVisible();
  });

  // @req REQ-151
  it("renders the people figures and English labels without implying census completeness", () => {
    render(
      <FicheSummaryBrief
        kind="people"
        entityId="PPL_NOT_IN_BANK"
        name="Test people"
        language="en"
        figures={{
          persons: { value: 1_250_000, referenceYear: 2025 },
          countries: 3,
          mainLanguage: "Test language",
          family: "Test family",
          names: 5,
        }}
      />
    );

    expect(screen.getByText("Persons recorded for this people")).toBeVisible();
    expect(screen.getByText("Reference year: 2025")).toBeVisible();
    expect(screen.getByText("Countries of documented presence")).toBeVisible();
    expect(screen.getByText("Main language")).toBeVisible();
    expect(screen.getByText("Test language")).toBeVisible();
    expect(screen.getByText("Language family")).toBeVisible();
    expect(screen.getByText("Test family")).toBeVisible();
    expect(screen.getByText("Names borne and referenced here")).toBeVisible();
  });

  /**
   * The panel used to write "Non renseigné dans l'atlas" into the slot where
   * the number goes, five times over, and a reader scanning it met the same
   * sentence in every slot. A dash occupies that slot without pretending to
   * be a measurement, and the note underneath still says the silence in
   * words — so the reader is told exactly as much as before, in the place
   * they look for it. Never a zero: zero is a total the atlas can hold, and
   * an absence is a different statement.
   */
  // @req REQ-151
  it("marks a missing figure with a dash and states the silence beneath it", () => {
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="ZZZ"
        name="Test country"
        language="fr"
        figures={{}}
      />
    );

    const panel = screen.getByRole("region", { name: /Test country/ });
    expect(within(panel).getAllByText("—")).toHaveLength(5);
    expect(within(panel).getByText("aucun peuple documenté ici")).toBeVisible();
    expect(
      within(panel).getByText("aucune langue documentée ici")
    ).toBeVisible();
    expect(within(panel).getByText("population non renseignée")).toBeVisible();
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("NaN")).toBeNull();
  });

  /**
   * A line across the top read as the end of the figures. The fact is not a
   * sixth count — it is one sourced sentence — so it takes the rule down its
   * left that the search surface already gives a sourced highlight, in the
   * same gold role, and the device means one thing in both places.
   */
  // @req REQ-151
  it("quotes its fact against a left rule rather than under a top one", () => {
    const { container } = render(
      <FicheSummaryBrief
        kind="country"
        entityId="LBR"
        name="Liberia"
        language="fr"
        figures={{}}
      />
    );

    const dress = container.querySelector("style")!.textContent;
    const rule = dress.match(/\.fiche-summary-brief__fact \{([^}]*)\}/)![1];
    expect(rule).toMatch(/border-left:\s*3px solid var\(--afh-gold\)/);
    expect(rule).not.toMatch(/border-top/);
  });

  // @req REQ-151
  it("shows one existing fact matched on both entity kind and id, with its tier", () => {
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="LBR"
        name="Liberia"
        language="fr"
        figures={{}}
      />
    );

    const fact = screen.getByTestId("fiche-summary-fact");
    expect(
      within(fact).getByText(/Un même peuple s'appelle Guéré/)
    ).toBeVisible();
    expect(within(fact).getByText(/Source référencée/)).toBeVisible();
    expect(within(fact).getByRole("link", { name: /Holsoe/ })).toBeVisible();
    expect(screen.getAllByTestId("fiche-summary-fact")).toHaveLength(1);
  });

  // @req REQ-145
  it("uses the English sidecar for a matched fact", () => {
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="LBR"
        name="Liberia"
        language="en"
        figures={{}}
      />
    );

    expect(
      screen.getByText(/One and the same people is called Guéré/)
    ).toBeVisible();
    expect(screen.getByText(/Referenced source/)).toBeVisible();
  });

  // @req REQ-151
  it("does not match a country fact to a people with the same id", () => {
    render(
      <FicheSummaryBrief
        kind="people"
        entityId="LBR"
        name="Test people"
        language="fr"
        figures={{}}
      />
    );

    expect(screen.queryByTestId("fiche-summary-fact")).toBeNull();
  });

  // @req REQ-151
  it("shows one matching fact on a people summary", () => {
    render(
      <FicheSummaryBrief
        kind="people"
        entityId="PPL_WE"
        name="Wè"
        language="fr"
        figures={{}}
      />
    );

    expect(screen.getAllByTestId("fiche-summary-fact")).toHaveLength(1);
    expect(screen.getByText(/Un même peuple s'appelle Guéré/)).toBeVisible();
  });

  // @req REQ-151
  it("omits the fact section entirely when the bank has no matching entity", () => {
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="ZZZ"
        name="Test country"
        language="fr"
        figures={{}}
      />
    );

    expect(screen.queryByTestId("fiche-summary-fact")).toBeNull();
    expect(screen.queryByText("Niveau de source")).toBeNull();
  });
});
