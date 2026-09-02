import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeCensusLine } from "../HomeCensusLine";

const CENSUS = [
  { word: "peuples", figure: "790" },
  { word: "langues", figure: "748" },
  { word: "pays", figure: "54" },
  { word: "familles", figure: "24" },
  { word: "appellations", figure: "3 134" },
];

/**
 * The figure is tied to its word by U+00A0 so the pair never breaks a line.
 * Written as an escape, not as the character: the two are indistinguishable
 * on screen, and a plain space typed here fails against a component that is
 * correct.
 */
const NBSP = "\u00a0";

describe("HomeCensusLine — the sizes the band states", () => {
  // The whole point of the line, and what the rotating headline could not do:
  // a reader sees every class the corpus holds without waiting for a turn.
  // @req REQ-113
  it("states every class and its size at once", () => {
    render(<HomeCensusLine entries={CENSUS} />);

    const line = screen.getByTestId("home-hero-census");
    for (const { word, figure } of CENSUS) {
      expect(line.textContent).toContain(`${figure}${NBSP}${word}`);
    }
  });

  // A failed read must not publish a factual claim. "Indisponible" is the
  // word the retired corpus tiles used for the same state, kept so the
  // product says one thing about an unreadable total.
  // @req REQ-113
  it("says a total is unavailable rather than printing a zero for it", () => {
    render(<HomeCensusLine entries={[{ word: "langues", figure: null }]} />);

    const line = screen.getByTestId("home-hero-census");
    expect(line.textContent).toContain("Indisponible");
    expect(line.textContent).toContain("langues");
    expect(line.textContent).not.toContain("0");
  });

  // Zero is a real total, so it is printed like any other and carries no
  // unavailable marker — the counterpart assertion to the one above.
  // @req REQ-113
  it("prints a genuine zero as a figure like any other", () => {
    render(<HomeCensusLine entries={[{ word: "familles", figure: "0" }]} />);

    const line = screen.getByTestId("home-hero-census");
    expect(line.textContent).toContain(`0${NBSP}familles`);
    expect(line.textContent).not.toContain("Indisponible");
  });

  // The separators are punctuation, not content: read aloud they would put a
  // middot between every class the reader is being told about.
  // @req REQ-113
  it("hides its separators from assistive technology", () => {
    const { container } = render(<HomeCensusLine entries={CENSUS} />);

    const separators = container.querySelectorAll(".home-hero-census-sep");
    expect(separators).toHaveLength(CENSUS.length - 1);
    for (const separator of separators) {
      expect(separator).toHaveAttribute("aria-hidden", "true");
    }
  });
});
