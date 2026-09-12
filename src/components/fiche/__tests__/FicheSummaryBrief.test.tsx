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
    expect(within(panel).getByText("Population du pays")).toBeVisible();
    expect(within(panel).getAllByRole("definition")[0]).toHaveTextContent(
      /12\s?000\s?000/
    );
    expect(within(panel).getByText("Année de référence : 2025")).toBeVisible();
    expect(within(panel).getByText("Peuples documentés ici")).toBeVisible();
    expect(within(panel).getByText("Langues documentées ici")).toBeVisible();
    expect(
      within(panel).getByText("Familles linguistiques documentées ici")
    ).toBeVisible();
    expect(within(panel).getByText("Noms référencés ici")).toBeVisible();
    expect(within(panel).getByText("23")).toBeVisible();
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

  // @req REQ-151
  it("states a gap for missing figures without displaying a fabricated zero", () => {
    render(
      <FicheSummaryBrief
        kind="country"
        entityId="ZZZ"
        name="Test country"
        language="fr"
        figures={{}}
      />
    );

    expect(screen.getAllByText("Non renseigné dans l’atlas")).toHaveLength(5);
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.queryByText("NaN")).toBeNull();
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
  it("gives the people variant a headline figure spanning both columns, ahead of four tiles", () => {
    const { container } = render(
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

    const list = container.querySelector("dl.fiche-summary-brief__figures");
    expect(list).not.toBeNull();
    const rows = Array.from(list!.children);
    expect(rows).toHaveLength(5);

    const [headline, ...tiles] = rows;
    expect(headline.className).toContain(
      "fiche-summary-brief__figure--headline"
    );
    expect(tiles).toHaveLength(4);
    for (const tile of tiles) {
      expect(tile.className).toContain("fiche-summary-brief__figure--tile");
      expect(tile.className).not.toContain("headline");
    }

    // dl/dt/dd stay the markup: only the wrapping div gains a class.
    expect(headline.tagName).toBe("DIV");
    expect(headline.querySelector("dt")).not.toBeNull();
    expect(headline.querySelector("dd")).not.toBeNull();

    const stylesheet = container.querySelector("style")?.textContent ?? "";
    expect(stylesheet).toMatch(
      /\.fiche-summary-brief__figure--headline\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/
    );
  });

  // @req REQ-155
  it("renders the people headline and tile figures in the display face at weight 700, never 600", () => {
    const { container } = render(
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

    const stylesheet = container.querySelector("style")?.textContent ?? "";
    const figureRules = stylesheet.match(
      /\.fiche-summary-brief__figure--(?:headline|tile)\s+dd\s*\{[^}]*\}/g
    );
    expect(figureRules).not.toBeNull();
    expect(figureRules!.length).toBeGreaterThan(0);
    for (const rule of figureRules!) {
      // The semantic token, not the font loader's own variable. Only
      // `var(--afh-font-display)` is swept by displayWeightCharter, so a
      // declaration written against `--font-fraunces` evades the weight gate
      // instead of satisfying it — which is how this panel's own h2 sat
      // outside that charter for the whole life of the file.
      expect(rule).toMatch(/font-family:\s*var\(--afh-font-display\)/);
      expect(rule).toMatch(/font-weight:\s*700/);
      expect(rule).not.toMatch(/font-weight:\s*600/);
      expect(rule).toMatch(/font-variant-numeric:\s*tabular-nums/);
    }
  });

  // @req REQ-155
  it("leaves the country variant's uniform two-column grid untouched", () => {
    const { container } = render(
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

    const list = container.querySelector("dl.fiche-summary-brief__figures");
    expect(list).not.toBeNull();
    expect(list!.className).not.toContain("--people");

    const rows = Array.from(list!.children);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.className).toBe("");
    }
  });
});
