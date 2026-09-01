import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeCorpusCounts } from "@/components/home/HomeCorpusCounts";

const FULL_CORPUS = {
  peoples: 4213,
  countries: 91,
  families: 37,
  languages: 748,
  nameForms: 3134,
  migrations: 5,
};

describe("HomeCorpusCounts — the corpus in five honest figures (ETNI-1511)", () => {
  // @req REQ-113
  it("renders the five totals supplied by the server", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    expect(screen.getByTestId("home-count-peoples")).toHaveTextContent(
      /4\s?213/
    );
    expect(screen.getByTestId("home-count-peoples")).toHaveTextContent(
      "Peuples"
    );
    expect(screen.getByTestId("home-count-languages")).toHaveTextContent("748");
    expect(screen.getByTestId("home-count-languages")).toHaveTextContent(
      "Langues"
    );
    expect(screen.getByTestId("home-count-countries")).toHaveTextContent("91");
    expect(screen.getByTestId("home-count-countries")).toHaveTextContent(
      "Pays"
    );
    expect(screen.getByTestId("home-count-families")).toHaveTextContent("37");
    expect(screen.getByTestId("home-count-families")).toHaveTextContent(
      "Familles linguistiques"
    );
    expect(screen.getByTestId("home-count-nameForms")).toHaveTextContent(
      /3\s?134/
    );
    expect(screen.getByTestId("home-count-nameForms")).toHaveTextContent(
      "Appellations"
    );
  });

  // Family → language → people → country is the corpus's own hierarchy, and
  // the band reads in that order rather than by how large each figure is.
  // Appellations close the row because they are what the other four are named
  // by.
  // @req REQ-113
  it("orders the figures the way the corpus nests", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    const labels = screen
      .getAllByRole("term")
      .map((term) => term.textContent?.trim());

    expect(labels).toEqual([
      "Peuples",
      "Langues",
      "Pays",
      "Familles linguistiques",
      "Appellations",
    ]);
  });

  // A database failure is not an empty corpus. Printing zero would turn an
  // operational failure into a false claim on the site's most visible page.
  // @req REQ-113
  it("states that totals are unavailable instead of replacing them with zero", () => {
    render(<HomeCorpusCounts counts={null} />);

    expect(screen.getAllByText("Indisponible")).toHaveLength(5);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    for (const item of screen.getAllByTestId(/^home-count-/)) {
      expect(item).toHaveAttribute("data-state", "unavailable");
    }
  });

  // The six reads behind these figures fail independently (see corpusCounts),
  // so the band has to be able to show four numbers and one absence rather
  // than going dark whole.
  // @req REQ-113
  it("marks a single missing figure unavailable and keeps the rest", () => {
    render(<HomeCorpusCounts counts={{ ...FULL_CORPUS, languages: null }} />);

    expect(screen.getByTestId("home-count-languages")).toHaveAttribute(
      "data-state",
      "unavailable"
    );
    expect(screen.getByTestId("home-count-peoples")).toHaveAttribute(
      "data-state",
      "available"
    );
    expect(screen.getAllByText("Indisponible")).toHaveLength(1);
  });
});
