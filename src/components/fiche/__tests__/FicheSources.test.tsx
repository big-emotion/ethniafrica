import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSources } from "@/components/fiche/FicheSources";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";

const parchmentCss = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

const entry = (
  label: string,
  extra: Partial<FicheSourceEntry> = {}
): FicheSourceEntry => ({
  label,
  url: null,
  standing: "referenced",
  ...extra,
});

describe("FicheSources", () => {
  // @req REQ-092
  it("returns null when there is no source at all", () => {
    const { container } = render(<FicheSources sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-092
  it("renders every source", () => {
    render(
      <FicheSources
        sources={[
          entry("UN 2025", { standing: "official" }),
          entry("CIA World Factbook"),
        ]}
      />
    );
    expect(screen.getByText("UN 2025")).toBeTruthy();
    expect(screen.getByText("CIA World Factbook")).toBeTruthy();
  });

  // @req REQ-092
  it("shows each source's own standing rather than one verdict over the list", () => {
    render(
      <FicheSources
        sources={[
          entry("UN 2025", { standing: "official" }),
          entry("Un blog", { standing: "unverified" }),
        ]}
      />
    );
    const list = screen.getByRole("list");
    expect(within(list).getByText("Officielle")).toBeTruthy();
    expect(within(list).getByText("Non vérifiée")).toBeTruthy();
  });

  // @req REQ-092
  it("says a pending source is awaiting review, never that it is unverified", () => {
    const { container } = render(
      <FicheSources
        sources={[entry("À trancher", { standing: "needs_review" })]}
      />
    );

    expect(container.textContent).toContain("En attente d'examen");
    expect(container.textContent).not.toContain("Non vérifiée");
    expect(container.textContent).not.toContain("Tier 1");
  });

  /**
   * Country and family declare sources and cite none of them from the prose.
   * Numbering a bibliography nothing points at would promise a link that does
   * not exist.
   */
  // @req REQ-092
  it("stays an unordered list when no source carries a number", () => {
    const { container } = render(
      <FicheSources sources={[entry("Ethnologue"), entry("Glottolog")]} />
    );

    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelector("ol")).toBeNull();
    expect(container.querySelector("[id^='source-']")).toBeNull();
  });

  /**
   * The anchor is the whole point: a callout links to `#source-2`, so the entry
   * has to be addressable and the number has to be the one the callout printed.
   */
  // @req REQ-092
  it("numbers an ordered list with the anchors and numbers its callouts print", () => {
    const { container } = render(
      <FicheSources
        sources={[
          entry("Ethnologue", { number: 1, standing: "official" }),
          entry("Glottolog", { number: 4, standing: "needs_review" }),
        ]}
      />
    );

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelector("ul")).toBeNull();
    expect(container.querySelector("#source-1")).not.toBeNull();
    expect(container.querySelector("#source-4")).not.toBeNull();
    expect(screen.getByText("4.")).toBeInTheDocument();
    // Numbering must not collapse the standing each entry carries.
    expect(
      within(screen.getByRole("list")).getByText("Officielle")
    ).toBeTruthy();
  });

  /**
   * The census the tally line used to state in words, drawn: one segment per
   * standing, as wide as its share of the list, in the order the page's own
   * sources arrive. Nine entries were the only way to learn that seven of
   * them await examination.
   */
  // @req REQ-092
  it("draws a census bar with one segment per standing, as wide as its share", () => {
    const { container } = render(
      <FicheSources
        sources={[
          entry("A", { standing: "official" }),
          entry("B", { standing: "official" }),
          entry("C", { standing: "official" }),
          entry("D", { standing: "official" }),
          entry("E", { standing: "referenced" }),
        ]}
      />
    );

    const bar = container.querySelector(".afh-census")!;
    expect(bar).toHaveAttribute("role", "img");
    const segments = Array.from(
      bar.querySelectorAll<HTMLElement>("[data-census-standing]")
    );
    expect(
      segments.map((segment) => [
        segment.dataset.censusStanding,
        segment.style.width,
      ])
    ).toEqual([
      ["official", "80%"],
      ["referenced", "20%"],
    ]);
    expect(screen.getByTestId("sources-tally")).toHaveTextContent(
      "5 sources · Officielle : 4 · Référencée : 1"
    );
    expect(bar.getAttribute("aria-label")).toBe(
      screen.getByTestId("sources-tally").textContent
    );

    for (const standing of [
      "official",
      "referenced",
      "unverified",
      "needs_review",
    ]) {
      const rule = parchmentCss.match(
        new RegExp(`\\[data-census-standing="${standing}"\\]\\s*\\{([^}]*)\\}`)
      );
      expect(rule?.[1]).toMatch(/var\(--afh-/);
      expect(rule?.[1]).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    }
  });

  /**
   * A bibliography is the longest block on most records and the one a reader
   * consults rather than reads. It folds behind the first titles like every
   * other long field (operator ruling, 2026-09-12); nothing is dropped.
   */
  // @req REQ-092
  it("folds the list into a closed tile previewed by its first titles", () => {
    const { container } = render(
      <FicheSources
        sources={["SIL", "CIA", "NSA", "SAHA", "UN"].map((label) =>
          entry(label)
        )}
      />
    );

    const tile = container.querySelector("details[data-fiche-tile]")!;
    expect(tile).not.toBeNull();
    expect(tile).not.toHaveAttribute("open");
    expect(tile.querySelector("ul")).not.toBeNull();
    expect(tile.querySelector("[data-closed-fact]")).toHaveTextContent(
      "SIL · CIA · NSA · +2"
    );
    expect(tile).toHaveTextContent("UN");
  });

  /**
   * A list no longer than its preview has nothing to fold: closed, it would
   * print each title twice, once as the preview and once in the list.
   */
  // @req REQ-092
  it("leaves a list of three or fewer open, each title printed once", () => {
    const { container } = render(
      <FicheSources sources={[entry("SIL"), entry("CIA"), entry("NSA")]} />
    );

    expect(container.querySelector("details")).toBeNull();
    expect(screen.getAllByText("CIA")).toHaveLength(1);
  });

  /**
   * `sources[].notes` reaches the reader verbatim, and the pipeline wrote its
   * own bookkeeping there on thousands of entries. The reader is owed the
   * silence, never the reason the workshop has not filled it: a clause in
   * that register is not printed, and whatever else the note says still is.
   */
  // @req REQ-092
  it("prints what a note tells the reader and none of the pipeline's bookkeeping", () => {
    const { container } = render(
      <FicheSources
        sources={[
          entry("Glottolog", {
            notes:
              "Tier resolved from the authorized source catalogue entry for Glottolog.",
          }),
          entry("AFJN", {
            notes:
              "No domain ruling covers afjn.org; the tier awaits editorial review.",
          }),
          entry("Sans lien", {
            notes:
              "No URL and no recognisable citation shape; the tier awaits editorial review.",
          }),
          entry("IWGIA", {
            notes:
              "Tier resolu depuis le catalogue des sources autorisees (domaine iwgia.org) ; documente le statut politique des peuples marrons.",
          }),
          entry("Recensement", { notes: "Recensement national de 2011." }),
        ]}
      />
    );

    const notes = Array.from(
      container.querySelectorAll("[data-source-note]"),
      (node) => node.textContent
    );
    expect(notes).toEqual([
      "Documente le statut politique des peuples marrons.",
      "Recensement national de 2011.",
    ]);
    expect(container.textContent).not.toMatch(/tier|domain ruling/i);
  });
});
