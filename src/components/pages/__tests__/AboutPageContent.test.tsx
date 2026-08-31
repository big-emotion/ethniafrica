import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPageContent from "../AboutPageContent";
import { getLocalizedRoute } from "@/lib/routing";

function headingLevels(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(
    (heading) => Number(heading.tagName[1])
  );
}

function expectNoSkippedHeadingLevels(levels: number[]) {
  let highestLevelSeen = 0;

  for (const level of levels) {
    expect(level).toBeLessThanOrEqual(highestLevelSeen + 1);
    highestLevelSeen = Math.max(highestLevelSeen, level);
  }
}

describe("AboutPageContent (REQ-132)", () => {
  // @req REQ-132
  it("opens with a clear overview of EthniAfrica", () => {
    render(<AboutPageContent language="fr" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "À propos" })
    ).toBeTruthy();
    expect(screen.getByTestId("about-overview")).toHaveTextContent(
      /EthniAfrica est un atlas éditorial/i
    );
  });

  // @req REQ-132
  it("names the four distinct families of content in the corpus", () => {
    render(<AboutPageContent language="fr" />);

    const families = screen.getByTestId("about-content-families");
    for (const family of [
      "Peuples",
      "Langues",
      "Familles linguistiques",
      "Pays",
    ]) {
      expect(
        within(families).getByRole("heading", { level: 3, name: family })
      ).toBeTruthy();
    }
  });

  // @req REQ-132
  it("exposes the three access modes as distinct destinations", () => {
    render(<AboutPageContent language="fr" />);

    const modes = screen.getByTestId("about-access-modes");
    expect(
      within(modes).getByRole("link", { name: "Explorer" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "explorerHub"));
    expect(
      within(modes).getByRole("link", { name: "Comprendre" })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "comprendreHub"));
    expect(within(modes).getByRole("link", { name: "Jouer" })).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "jouerHub")
    );
  });

  // @req REQ-132
  it("distinguishes this project overview from the Doctrine and links to it", () => {
    render(<AboutPageContent language="fr" />);

    const distinction = screen.getByTestId("about-doctrine-distinction");
    expect(distinction).toHaveTextContent(
      /La page À propos présente le projet/i
    );
    expect(distinction).toHaveTextContent(
      /La Doctrine explique comment les affirmations sont établies/i
    );
    expect(
      within(distinction).getByRole("link", {
        name: "Consulter la Doctrine éditoriale",
      })
    ).toHaveAttribute("href", getLocalizedRoute("fr", "doctrine"));
  });

  // @req REQ-132
  it("keeps one valid H1 → H2 → H3 document outline", () => {
    const { container } = render(<AboutPageContent language="fr" />);
    const levels = headingLevels(container);

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expectNoSkippedHeadingLevels(levels);
  });

  // @req REQ-132
  it("declares mobile-first grids that widen at tablet and editorial desktop", () => {
    render(<AboutPageContent language="fr" />);

    const families = screen.getByTestId("about-content-families");
    expect(families.className).toMatch(/grid-cols-1/);
    expect(families.className).toMatch(/min-\[720px\]:grid-cols-2/);
    expect(families.className).toMatch(/min-\[1240px\]:grid-cols-4/);

    const modes = screen.getByTestId("about-access-modes");
    expect(modes.className).toMatch(/grid-cols-1/);
    expect(modes.className).toMatch(/min-\[720px\]:grid-cols-3/);
  });

  // @req REQ-132
  it("keeps the source bibliography available through accessible links", () => {
    render(<AboutPageContent language="fr" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Sources" })
    ).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: /United Nations, Department of Economic and Social Affairs/i,
      })
    ).toHaveAttribute("href", "https://population.un.org/wpp/");
  });
});
