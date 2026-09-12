import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FicheSection } from "@/components/fiche/FicheSection";
import { FicheTile } from "@/components/fiche/FicheTile";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";

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
});
