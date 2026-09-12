import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSummaryBrief } from "@/components/fiche/FicheSummaryBrief";

const parchmentCss = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

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

    expect(screen.getByText("People recorded")).toBeVisible();
    expect(screen.getByText("Reference year: 2025")).toBeVisible();
    expect(screen.getByText("Countries of presence")).toBeVisible();
    expect(screen.getByText("Main language")).toBeVisible();
    expect(screen.getByText("Test language")).toBeVisible();
    expect(screen.getByText("Language family")).toBeVisible();
    expect(screen.getByText("Test family")).toBeVisible();
    expect(screen.getByText("Linked names")).toBeVisible();
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
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="LBR"
        name="Liberia"
        language="fr"
        figures={{}}
      />
    );

    expect(screen.getByTestId("fiche-summary-fact")).toBeVisible();
    const rule = parchmentCss.match(
      /\.fiche-summary-brief__fact\s*\{([^}]*)\}/
    )![1];
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

  // @req REQ-155
  it("leads the people panel with its population across both columns, ahead of four tiles", () => {
    render(
      <FicheSummaryBrief
        kind="people"
        entityId="PPL_NOT_IN_BANK"
        name="Test people"
        language="fr"
        figures={{
          persons: { value: 1_250_000, referenceYear: 2025 },
          countries: 3,
          mainLanguage: "Test language",
          family: "Test family",
          names: 5,
        }}
      />
    );

    // One device for both records: a people panel draws the shared stat
    // card too, a word value riding it like a count.
    expect(screen.getByTestId("stat-card-persons")).toHaveAttribute(
      "data-emphasis",
      "lead"
    );
    expect(
      screen
        .getAllByTestId(/^stat-card-/)
        .filter((card) => card.dataset.emphasis === "tile")
    ).toHaveLength(4);
    expect(screen.getByTestId("stat-card-mainLanguage")).toHaveAttribute(
      "data-kind",
      "word"
    );
    expect(parchmentCss).toMatch(
      /\.fiche-summary-brief__counted\s*>\s*\[data-emphasis="lead"\]\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/
    );
  });

  // @req REQ-155
  it("sets a word value in the display face at weight 700, one step smaller than a count", () => {
    const rule = parchmentCss.match(
      /\.afh-stat-card\[data-kind="word"\]\s+\.afh-stat-card-n\s*\{([^}]*)\}/
    )![1];
    // The semantic token, not the font loader's own variable: only
    // `var(--afh-font-display)` is swept by displayWeightCharter.
    expect(rule).toMatch(/font-family:\s*var\(--afh-font-display\)/);
    expect(rule).toMatch(/font-weight:\s*700/);
    expect(rule).not.toMatch(/font-weight:\s*600/);
    expect(rule).toMatch(/font-size:\s*var\(--afh-text-h3\)/);
  });

  // @req REQ-155
  it("draws both records at the chapter's width, with no dress of its own", () => {
    const { container, rerender } = render(
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
    expect(container.querySelector("style")).toBeNull();
    expect(
      container.querySelectorAll(".fiche-summary-brief__counted > *")
    ).toHaveLength(5);

    rerender(
      <FicheSummaryBrief
        kind="people"
        entityId="PPL_NOT_IN_BANK"
        name="Test people"
        language="fr"
        figures={{
          persons: { value: 1_250_000, referenceYear: 2025 },
          countries: 3,
          mainLanguage: "Test language",
          family: "Test family",
          names: 5,
        }}
      />
    );
    expect(container.querySelector("style")).toBeNull();
    expect(
      container.querySelectorAll(".fiche-summary-brief__counted > *")
    ).toHaveLength(5);

    // The panel used to cap itself at min(100% - 1rem, 44rem) and sit
    // narrower than the chapter it belongs to.
    const panel = parchmentCss.match(
      /\n\.fiche-summary-brief\s*\{([^}]*)\}/
    )![1];
    expect(panel).not.toMatch(/max-width/);
    expect(panel).not.toMatch(/(^|[\s;])width:/);
  });
});
