import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheStatCard } from "@/components/fiche/FicheStatCard";

describe("FicheStatCard", () => {
  // @req REQ-151
  it("puts a formatted count under the name of what it counts", () => {
    render(
      <FicheStatCard id="langues" label="langues" value={1234} language="fr" />
    );

    const card = screen.getByTestId("stat-card-langues");
    expect(within(card).getByText(/1\s?234/)).toBeVisible();
    expect(within(card).getByText("langues")).toBeVisible();
    expect(card).toHaveAttribute("data-provenance", "declared");
  });

  /**
   * Below the tablet floor the atlas centres everything except `p`,
   * `blockquote`, `dt` and `dd`, and no surface may exempt itself in CSS —
   * `mobileTextCentring` sweeps for that. So the markup is what holds the
   * figure and its name against the left edge, and a refactor that swapped
   * this pair back to spans would move the whole card to the middle with
   * nothing turning red. This is that red.
   */
  // @req REQ-091
  it("carries the pair in a definition list, which is what keeps it left", () => {
    render(
      <FicheStatCard id="peuples" label="peuples" value={3} language="fr" />
    );

    const card = screen.getByTestId("stat-card-peuples");
    expect(card.tagName).toBe("DL");
    expect(within(card).getByText("peuples").tagName).toBe("DT");
    expect(within(card).getByText("3").tagName).toBe("DD");
  });

  // A list and a record are both counted by their size: the card asks how
  // many, and a caller should not have to compute that twice.
  // @req REQ-151
  it("counts the entries of a list rather than printing it", () => {
    render(
      <FicheStatCard
        id="branches"
        label="branches"
        value={["a", "b", "c"]}
        language="fr"
      />
    );

    expect(
      within(screen.getByTestId("stat-card-branches")).getByText("3")
    ).toBeVisible();
  });

  // @req REQ-119
  it("marks a card the corpus does not fill, and shows the caller's stand-in", () => {
    render(
      <FicheStatCard
        id="locuteurs"
        label="locuteurs"
        value={null}
        emptyValue="vide"
        language="fr"
      />
    );

    const card = screen.getByTestId("stat-card-locuteurs");
    expect(card).toHaveAttribute("data-provenance", "missing");
    expect(within(card).getByText("vide")).toBeVisible();
  });

  // @req REQ-151
  it("stands a dash in for an absent count when the caller names none", () => {
    render(<FicheStatCard id="noms" label="noms" value={null} language="fr" />);

    expect(
      within(screen.getByTestId("stat-card-noms")).getByText("—")
    ).toBeVisible();
  });

  /**
   * A surface that says in its own words what its count covers has already
   * said what the generic marker would say. Printing both would state the
   * same absence twice, in two vocabularies.
   */
  // @req REQ-119
  it("prefers the caller's scope line to the generic absent-field marker", () => {
    render(
      <FicheStatCard
        id="langues"
        label="langues"
        value={null}
        scope="aucune langue documentée ici"
        language="fr"
      />
    );

    const card = screen.getByTestId("stat-card-langues");
    expect(
      within(card).getByText("aucune langue documentée ici")
    ).toBeVisible();
    expect(within(card).queryByText("Donnée manquante")).toBeNull();
  });

  // @req REQ-119
  it("falls back to the app's one wording for an absent field", () => {
    render(
      <FicheStatCard
        id="branches"
        label="branches"
        value={null}
        language="fr"
      />
    );

    expect(
      within(screen.getByTestId("stat-card-branches")).getByText(
        "Donnée manquante"
      )
    ).toBeVisible();
  });
});
