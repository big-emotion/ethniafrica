import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AboutPageContent from "../AboutPageContent";
import { ACCESS_MODE_LABELS } from "@/lib/hubs/moduleRegistry";

const renderAbout = () => render(<AboutPageContent language="fr" />);

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
    renderAbout();

    expect(
      screen.getByRole("heading", { level: 1, name: "À propos" })
    ).toBeTruthy();
    expect(screen.getByTestId("about-overview")).toHaveTextContent(
      /EthniAfrica est un atlas éditorial/i
    );
  });

  // @req REQ-132
  it("names the four distinct families of content in the corpus", () => {
    renderAbout();

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
  it("renders the existing purpose argument after the overview", () => {
    const { container } = renderAbout();

    const overview = screen.getByTestId("about-overview");
    const purpose = screen.getByTestId("home-purpose-blocks");
    const corpus = screen.getByTestId("about-content-families");

    expect(
      overview.compareDocumentPosition(purpose) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      purpose.compareDocumentPosition(corpus) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-testid="home-purpose-blocks"]')
    ).toHaveLength(1);
  });

  // Trimmed 2026-09-01: the example-country cards ("Ce que contient une
  // fiche"), the interactive access cards ("Par où commencer") and the
  // About/Doctrine distinction ("03 · La méthode") each duplicated a block
  // sitting right next to them. This test replaces
  // "places the corpus synthesis before the existing three access axes" and
  // "preserves the access framing around one interactive axis-card set".
  // @req REQ-132
  it("names the three access modes as a static list, with nothing else duplicating them", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Trois manières d’entrer dans l’atlas",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Le même corpus se parcourt selon l’intention du moment : chercher une fiche, approfondir une question ou mettre ses repères à l’épreuve.",
        { exact: true }
      )
    ).toBeInTheDocument();

    const staticItems = screen.getByTestId("about-access-mode-list");
    for (const name of Object.values(ACCESS_MODE_LABELS)) {
      expect(within(staticItems).getByText(name)).toBeInTheDocument();
    }

    expect(screen.queryByTestId("home-synthesis-rail")).toBeNull();
    expect(screen.queryByTestId("access-axes")).toBeNull();
    expect(screen.queryByTestId("about-doctrine-distinction")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /Sources/i })
    ).not.toBeInTheDocument();
  });

  // @req REQ-132
  it("keeps one valid H1 → H2 → H3 document outline", () => {
    const { container } = renderAbout();
    const levels = headingLevels(container);

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expectNoSkippedHeadingLevels(levels);
  });

  // @req REQ-132
  it("declares mobile-first grids that widen at tablet and editorial desktop", () => {
    renderAbout();

    const families = screen.getByTestId("about-content-families");
    expect(families.className).toMatch(/grid-cols-1/);
    expect(families.className).toMatch(/min-\[720px\]:grid-cols-2/);
    expect(families.className).toMatch(/min-\[1240px\]:grid-cols-4/);

    const accessModes = screen.getByTestId("about-access-mode-list");
    expect(accessModes.className).toMatch(/grid-cols-1/);
    expect(accessModes.className).toMatch(/min-\[720px\]:grid-cols-3/);
  });
});
