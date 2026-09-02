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
  it("omits individual facts and source links the result does not carry", () => {
    const partialResult: DominantSearchResult = {
      type: "people",
      id: "PPL_PARTIAL",
      name: "Peuple partiellement documenté",
      population: 1_200_000,
    };

    render(<DominantAnswerPanel result={partialResult} />);

    const panel = screen.getByRole("complementary", {
      name: /réponse dominante/i,
    });
    expect(
      within(panel).getByTestId("dominant-answer-population")
    ).toBeInTheDocument();
    expect(
      within(panel).queryByTestId("dominant-answer-confidence")
    ).toBeNull();
    expect(within(panel).queryByTestId("dominant-answer-countries")).toBeNull();
    expect(within(panel).queryByTestId("dominant-answer-exonyms")).toBeNull();
    expect(within(panel).queryByTestId("dominant-answer-sources")).toBeNull();
    expect(within(panel).queryByRole("link")).toBeNull();
  });

  // @req REQ-124
  it("exposes a patronyme's own facts — not the people-only field set", () => {
    const patronymeResult: DominantSearchResult = {
      type: "patronyme",
      id: "NOM_DIALLO",
      name: "Diallo",
      nameSystem: "clan_name",
      associatedPeopleIds: ["PPL_PEUL", "PPL_TOUCOULEUR"],
      attestedCountryIds: ["SEN", "GIN", "MLI"],
      sourceCount: 2,
    };

    render(<DominantAnswerPanel result={patronymeResult} />);

    const panel = screen.getByRole("complementary", {
      name: /réponse dominante/i,
    });
    expect(
      within(panel).getByTestId("dominant-answer-name-system")
    ).toHaveTextContent("clan_name");
    expect(
      within(panel).getByTestId("dominant-answer-associated-peoples")
    ).toHaveTextContent(/2\s+peuples/i);
    expect(
      within(panel).getByTestId("dominant-answer-attested-countries")
    ).toHaveTextContent(/3\s+pays/i);
    expect(
      within(panel).getByTestId("dominant-answer-sources")
    ).toHaveTextContent(/2\s+sources?/i);
    // People-only fields never leaked onto a patronyme result.
    expect(
      within(panel).queryByTestId("dominant-answer-population")
    ).toBeNull();
  });

  // @req REQ-124
  it("exposes a language's own facts — not the people-only field set", () => {
    const languageResult: DominantSearchResult = {
      type: "language",
      id: "yor",
      name: "Yoruba",
      languageFamilyId: "FLG_NIGER_CONGO",
      languageFamilyName: "Niger-Congo",
      isoCode639_3: "yor",
      speakerPeopleIds: ["PPL_YORUBA"],
      sourceCount: 4,
    };

    render(<DominantAnswerPanel result={languageResult} />);

    const panel = screen.getByRole("complementary", {
      name: /réponse dominante/i,
    });
    expect(
      within(panel).getByTestId("dominant-answer-family")
    ).toHaveTextContent("Niger-Congo");
    expect(
      within(panel).getByTestId("dominant-answer-iso-code")
    ).toHaveTextContent("yor");
    expect(
      within(panel).getByTestId("dominant-answer-speaker-peoples")
    ).toHaveTextContent(/1\s+peuple\b/i);
    expect(
      within(panel).getByTestId("dominant-answer-sources")
    ).toHaveTextContent(/4\s+sources?/i);
    expect(
      within(panel).queryByTestId("dominant-answer-population")
    ).toBeNull();
  });

  // @req REQ-124
  it("renders nothing when the dominant result carries none of its type's facts", () => {
    const emptyPeopleResult: DominantSearchResult = {
      type: "people",
      id: "PPL_SPARSE",
      name: "Peuple sans données complémentaires",
    };

    const { container } = render(
      <DominantAnswerPanel result={emptyPeopleResult} />
    );

    expect(screen.queryByText("En bref")).toBeNull();
    expect(
      screen.queryByRole("complementary", { name: /réponse dominante/i })
    ).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  // @req REQ-124
  it("renders nothing for a country result, which carries no facts yet", () => {
    const countryResult: DominantSearchResult = {
      type: "country",
      id: "SEN",
      name: "Sénégal",
    };

    const { container } = render(
      <DominantAnswerPanel result={countryResult} />
    );

    expect(container.firstChild).toBeNull();
  });
});
