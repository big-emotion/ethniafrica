import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SourcesPageContent from "../SourcesPageContent";

function headingLevels(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(
    (heading) => Number(heading.tagName[1])
  );
}

describe("SourcesPageContent (REQ-091)", () => {
  // @req REQ-091
  it("opens with the bibliography title and intro", () => {
    render(<SourcesPageContent />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Sources" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Bibliographie complète/i)).toBeInTheDocument();
  });

  // @req REQ-091
  it("keeps the source bibliography available through accessible links", () => {
    render(<SourcesPageContent />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Sources internationales (principales)",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /United Nations, Department of Economic and Social Affairs/i,
      })
    ).toHaveAttribute("href", "https://population.un.org/wpp/");
  });

  // @req REQ-091
  it("names every regional and thematic bibliography section", () => {
    render(<SourcesPageContent />);

    for (const title of [
      "Sources par région (instituts officiels africains)",
      "Sources académiques & linguistiques",
      "Sources complémentaires (démographie & géopolitique)",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: title })
      ).toBeInTheDocument();
    }
  });

  // @req REQ-091
  it("keeps one valid H1 → H2 document outline", () => {
    const { container } = render(<SourcesPageContent />);
    const levels = headingLevels(container);

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels.every((level) => level <= 2)).toBe(true);
  });
});
