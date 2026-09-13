import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSection } from "@/components/fiche/FicheSection";
import { FicheTile, FicheTiles } from "@/components/fiche/FicheTile";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";

const stylesheet = readFileSync(
  join(process.cwd(), "src/styles/fiche-parchment.css"),
  "utf8"
);

/** The body of the first top-level rule for exactly this selector. */
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.[\]="^$*+?()|{}\\:>]/g, "\\$&");
  const match = stylesheet.match(
    new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`)
  );
  if (!match) throw new Error(`No top-level rule for ${selector}`);
  return match[1];
}

describe("FicheTile charter (REQ-153)", () => {
  // @req REQ-153
  it("allows a language-tagged fact to stay visible in a closed tile", () => {
    const { container } = render(
      <FicheTile
        title="Auto-appellation"
        closedFact="Yorùbá"
        closedFactContent={
          <AutonymExonymHeading
            variant="card"
            autonym="Yorùbá"
            autonymIso639_3="yor"
          />
        }
      />
    );

    expect(
      container.querySelector('[data-closed-fact] [lang="yo"]')
    ).toHaveTextContent("Yorùbá");
    expect(container.querySelector("[data-fiche-tile]")).toHaveTextContent(
      "Auto-appellation"
    );
  });

  // @req REQ-153
  it("compares the declared detail text for a composed disclosure", () => {
    const { container, rerender } = render(
      <FicheTile
        title="Exonymes"
        closedFact="2 noms relevés"
        detailText="Nago, Aku"
      >
        <p data-names="">Nago, Aku</p>
      </FicheTile>
    );
    expect(container.querySelector("details")).not.toBeNull();

    rerender(
      <FicheTile title="Exonymes" closedFact="Nago, Aku" detailText="Nago, Aku">
        <p data-names="">Nago, Aku</p>
      </FicheTile>
    );
    expect(container.querySelector("details")).toBeNull();
  });

  // @req REQ-153
  it("teaches a distinct fact before opening and reveals additional detail", () => {
    const { container } = render(
      <FicheTile title="Histoire" closedFact="3 entités politiques">
        <p>Leurs périodes et leurs sources sont détaillées ici.</p>
      </FicheTile>
    );

    const disclosure = container.querySelector("details");
    const fact = container.querySelector("[data-closed-fact]");
    expect(fact).toHaveTextContent("3 entités politiques");
    expect(fact).not.toHaveTextContent("Histoire");
    expect(disclosure).not.toHaveAttribute("data-fiche-section");
    expect(disclosure).not.toHaveAttribute("open");
    expect(
      screen.getByText("Leurs périodes et leurs sources sont détaillées ici.")
    ).toBeInTheDocument();
  });

  // @req REQ-153
  it("leaves a fact-only tile open rather than concealing a repetition", () => {
    const { container } = render(
      <FicheTile title="Histoire" closedFact="3 entités politiques">
        <p>3 entités politiques</p>
      </FicheTile>
    );

    expect(container.querySelector("details")).toBeNull();
    expect(screen.getByText("3 entités politiques")).toBeVisible();
  });

  // @req REQ-153
  it("never disguises a chapter title or an empty label as a fact", () => {
    const { container, rerender } = render(
      <FicheTile title="Histoire" closedFact="Histoire">
        <p>Trois périodes documentées.</p>
      </FicheTile>
    );
    expect(container.querySelector("details")).toBeNull();

    rerender(
      <FicheTile title="Histoire" closedFact=" ">
        <p>Trois périodes documentées.</p>
      </FicheTile>
    );
    expect(container.querySelector("details")).toBeNull();
  });

  // @req REQ-153
  it("keeps the chapter anchor, heading and lede outside the disclosure", () => {
    const { container } = render(
      <FicheSection title="Histoire" note="Une synthèse des périodes.">
        <FicheTile title="Royaumes" closedFact="3 entités politiques">
          <p>Des sources datent chaque entité.</p>
        </FicheTile>
      </FicheSection>
    );

    const chapter = container.querySelector("[data-fiche-section]");
    const disclosure = container.querySelector("details");
    expect(chapter?.tagName).toBe("SECTION");
    expect(chapter).toContainElement(disclosure);
    expect(chapter).toHaveTextContent("Histoire");
    expect(chapter).toHaveTextContent("Une synthèse des périodes.");
    expect(disclosure).not.toContainElement(
      screen.getByRole("heading", { name: "Histoire" })
    );
    expect(disclosure).not.toContainElement(
      screen.getByText("Une synthèse des périodes.")
    );
  });

  // @req REQ-153
  it("uses native keyboard disclosure semantics and exposes its open state", () => {
    const { container } = render(
      <FicheTile title="Royaumes" closedFact="3 entités politiques">
        <p>Des sources datent chaque entité.</p>
      </FicheTile>
    );

    const summary = container.querySelector("summary")!;
    const disclosure = container.querySelector("details")!;
    expect(summary).toHaveTextContent("Royaumes");
    expect(summary).toHaveTextContent("3 entités politiques");
    summary.focus();
    expect(summary).toHaveFocus();
    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute("open");
    fireEvent.click(summary);
    expect(disclosure).not.toHaveAttribute("open");
  });

  /**
   * The closed tile ends on words, not on a glyph (operator ruling,
   * 2026-09-12): "+ en savoir plus", and "− replier" once open. Both labels
   * are in the markup and the `open` attribute decides which one shows, so
   * nothing turns, nothing transitions, and a reduced-motion setting has
   * nothing to fight. The control keeps the 44px floor the reading surface
   * owes a thumb.
   */
  // @req REQ-153
  it("ends the closed tile on a worded control that swaps without motion", () => {
    const { container } = render(
      <FicheTile
        title="Royaumes"
        closedFact="3 entités politiques"
        language="fr"
      >
        <p>Des sources datent chaque entité.</p>
      </FicheTile>
    );

    const control = container.querySelector(
      "summary [data-fiche-tile-control]"
    )!;
    expect(control).toHaveAttribute("aria-hidden", "true");
    expect(control.querySelector('[data-when="closed"]')).toHaveTextContent(
      "+ en savoir plus"
    );
    expect(control.querySelector('[data-when="open"]')).toHaveTextContent(
      "− replier"
    );
    expect(container.querySelector("[data-fiche-tile-chevron]")).toBeNull();
  });

  // @req REQ-153
  it("reaches the same content without any transform animation", () => {
    const { container } = render(
      <FicheTile title="Royaumes" closedFact="3 entités politiques">
        <p>Des sources datent chaque entité.</p>
      </FicheTile>
    );
    const disclosure = container.querySelector("details")!;
    expect(disclosure.outerHTML).not.toMatch(
      /transition-transform|animate-|rotate-|motion-safe:/
    );
    fireEvent.click(container.querySelector("summary")!);
    expect(disclosure).toHaveAttribute("open");
    expect(
      screen.getByText("Des sources datent chaque entité.")
    ).toBeInTheDocument();
  });

  // @req REQ-153
  it("shows a value above the preview and marks the preview for clamping", () => {
    const { container } = render(
      <FicheTile
        title="Parlers"
        value="6 dialectes"
        closedFact="Oshikwanyama · Oshindonga · Oshikwambi"
      >
        <p>Oshikwanyama : standard écrit.</p>
      </FicheTile>
    );

    const value = container.querySelector("[data-tile-value]");
    const preview = container.querySelector("[data-closed-fact]");
    expect(value).toHaveTextContent("6 dialectes");
    expect(preview).toHaveClass("afh-tile-preview");
    expect(
      value!.compareDocumentPosition(preview!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // @req REQ-153
  it("lays tiles out through one grid, and lets a tile ask for both columns", () => {
    const { container } = render(
      <FicheTiles>
        <FicheTile title="Rites" closedFact="Mariage et feu sacré">
          <p>Rituels liés au feu sacré du foyer.</p>
        </FicheTile>
        <FicheTile title="Groupes" closedFact="9 groupes" wide>
          <p>Aandonga, Ovakwanyama.</p>
        </FicheTile>
      </FicheTiles>
    );

    const grid = container.querySelector(".afh-tiles");
    expect(grid).not.toBeNull();
    expect(grid!.children).toHaveLength(2);
    expect(grid!.children[1]).toHaveAttribute("data-wide", "true");
  });

  /**
   * The dress, asserted on the declarations: happy-dom computes no grid and
   * no line clamp, so a DOM assertion would pass on a broken layout too.
   * 16px inside a tile and 12px between two — the tiles on production sat at
   * 6px apart with their text against the border.
   */
  // @req REQ-153
  it("dresses a tile at 16px inside, 12px apart, clamped to two lines when closed", () => {
    const grid = ruleBody(".afh-tiles");
    expect(grid).toMatch(
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );
    expect(grid).toMatch(/gap:\s*12px/);

    const tile = ruleBody(".afh-tile");
    expect(tile).toMatch(/padding:\s*16px/);
    expect(tile).toMatch(/border-radius:\s*var\(--afh-radius-lg\)/);
    expect(tile).toMatch(/background:\s*var\(--afh-surface\)/);
    expect(tile).toMatch(/text-align:\s*start/);

    expect(ruleBody(".afh-tile-preview")).toMatch(/-webkit-line-clamp:\s*2/);
    expect(stylesheet).toMatch(
      /\.afh-tile\[open\]\s+\.afh-tile-preview\s*\{[^}]*-webkit-line-clamp:\s*unset/
    );
    expect(stylesheet).toMatch(/\.afh-tiles\s*>\s*\[data-wide="true"\]/);
    expect(stylesheet).toMatch(
      /\.afh-tiles\s*>\s*:last-child:nth-child\(odd\)/
    );
    expect(stylesheet).not.toMatch(/\.afh-tile[^{]*\{[^}]*transition/);
  });
});
