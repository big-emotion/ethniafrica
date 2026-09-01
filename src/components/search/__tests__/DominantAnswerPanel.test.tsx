import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DominantAnswerPanel } from "../DominantAnswerPanel";
import type { SearchResult } from "@/types/afrik-frontend";

/**
 * The search envelope exposes only source titles and real cited URLs to the
 * panel. A source without a URL still counts toward provenance, but cannot
 * become a link.
 */
type DominantSearchResult = SearchResult & {
  sourceCount?: number;
  externalLinks?: Array<{ title: string; url: string }>;
};

const completeResult: DominantSearchResult = {
  type: "people",
  id: "PPL_YORUBA",
  name: "Yoruba",
  population: 47_000_000,
  confidence: 0.82,
  countryIds: ["NGA", "BEN", "TGO"],
  exonyms: ["Yariba", "Nago"],
  sourceCount: 3,
  externalLinks: [
    {
      title: "UNESCO — Yoruba language",
      url: "https://www.unesco.org/languages-atlas/en/yoruba",
    },
    {
      title: "Ethnologue — Yoruba",
      url: "https://www.ethnologue.com/language/yor/",
    },
  ],
};

describe("DominantAnswerPanel", () => {
  // @req REQ-124
  it("exposes the dominant result and every available key figure accessibly", () => {
    render(<DominantAnswerPanel result={completeResult} />);

    const panel = screen.getByRole("complementary", {
      name: /réponse dominante/i,
    });
    expect(
      within(panel).getByRole("heading", { name: "Yoruba" })
    ).toBeInTheDocument();
    expect(
      within(panel).getByTestId("dominant-answer-population")
    ).toHaveTextContent(/47\s*000\s*000/);
    expect(
      within(panel).getByTestId("dominant-answer-confidence")
    ).toHaveTextContent(/82\s*%/);
    expect(
      within(panel).getByTestId("dominant-answer-countries")
    ).toHaveTextContent(/3\s+pays/i);
    expect(
      within(panel).getByTestId("dominant-answer-exonyms")
    ).toHaveTextContent(/2\s+exonymes?/i);
    expect(
      within(panel).getByTestId("dominant-answer-sources")
    ).toHaveTextContent(/3\s+sources?/i);
  });

  // @req REQ-124
  it("renders only cited source URLs as safely opened external links", () => {
    render(<DominantAnswerPanel result={completeResult} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(
      links.map((link) => [link.textContent, link.getAttribute("href")])
    ).toEqual([
      [
        "UNESCO — Yoruba language",
        "https://www.unesco.org/languages-atlas/en/yoruba",
      ],
      ["Ethnologue — Yoruba", "https://www.ethnologue.com/language/yor/"],
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute(
        "rel",
        expect.stringMatching(/\bnoopener\b/)
      );
      expect(link).toHaveAttribute(
        "rel",
        expect.stringMatching(/\bnoreferrer\b/)
      );
    }
  });

  // @req REQ-124
  it("omits facts and source links that the result does not carry", () => {
    const sparseResult: DominantSearchResult = {
      type: "people",
      id: "PPL_SPARSE",
      name: "Peuple sans données complémentaires",
    };

    render(<DominantAnswerPanel result={sparseResult} />);

    const panel = screen.getByRole("complementary", {
      name: /réponse dominante/i,
    });
    expect(
      within(panel).queryByTestId("dominant-answer-population")
    ).toBeNull();
    expect(
      within(panel).queryByTestId("dominant-answer-confidence")
    ).toBeNull();
    expect(within(panel).queryByTestId("dominant-answer-countries")).toBeNull();
    expect(within(panel).queryByTestId("dominant-answer-exonyms")).toBeNull();
    expect(within(panel).queryByTestId("dominant-answer-sources")).toBeNull();
    expect(within(panel).queryByRole("link")).toBeNull();
  });
});
