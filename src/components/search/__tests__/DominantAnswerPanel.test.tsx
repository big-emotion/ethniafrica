import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DominantAnswerPanel } from "../DominantAnswerPanel";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";
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

const baillyResult: DominantSearchResult = {
  type: "patronyme",
  id: "NOM_BAILLY",
  name: "Bailly",
  nameSystem: "non_hereditary_patronymic",
  associatedPeopleIds: ["PPL_DIOULA"],
  associatedPeoples: [{ id: "PPL_DIOULA", name: "Dioula" }],
  attestedCountryIds: ["CIV", "MLI", "BFA", "GIN", "SEN", "GHA", "LBR"],
  sourceCount: 2,
  externalLinks: [
    {
      title: "Atlas des patronymes ouest-africains",
      url: "https://example.org/patronymes/bailly",
    },
    {
      title: "Dictionnaire des noms de famille",
      url: "https://example.org/noms/bailly",
    },
  ],
};

function sectionTitled(name: string): HTMLElement {
  const section = screen.getByRole("heading", { name }).closest("section");
  if (!section) {
    throw new Error(`No section under the heading "${name}"`);
  }
  return section;
}

describe("DominantAnswerPanel", () => {
  // @req REQ-124
  it("exposes the dominant result and every available key figure accessibly", () => {
    render(<DominantAnswerPanel result={completeResult} language="fr" />);

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
    render(<DominantAnswerPanel result={completeResult} language="fr" />);

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

    render(<DominantAnswerPanel result={partialResult} language="fr" />);

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

    render(<DominantAnswerPanel result={patronymeResult} language="fr" />);

    const panel = screen.getByRole("complementary", {
      name: /réponse dominante/i,
    });
    expect(
      within(panel).getByTestId("dominant-answer-name-system")
    ).toHaveTextContent("Nom de clan");
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
  it("labels every naming system in French and never prints the raw key", () => {
    const labels: Array<[string, string]> = [
      ["clan_name", "Nom de clan"],
      ["non_hereditary_patronymic", "Patronyme non héréditaire"],
      ["nisba", "Nisba"],
      ["praise_name", "Nom d'éloge (jamu)"],
      ["totemic_clan", "Clan totémique"],
      ["some_future_system", "Non déterminé"],
    ];

    for (const [nameSystem, label] of labels) {
      const { container, unmount } = render(
        <DominantAnswerPanel
          result={{ ...baillyResult, nameSystem }}
          language="fr"
        />
      );

      expect(
        screen.getByTestId("dominant-answer-name-system")
      ).toHaveTextContent(label);
      expect(container.textContent).not.toContain("_");
      unmount();
    }
  });

  // @req REQ-124
  it("lets the naming-system value wrap inside its grid column", () => {
    render(<DominantAnswerPanel result={baillyResult} language="fr" />);

    const value = screen.getByTestId("dominant-answer-name-system");
    expect(value.className).toMatch(/\bmin-w-0\b/);
    expect(value.className).toMatch(/\bbreak-words\b/);
    expect(value.className).not.toMatch(/\bwhitespace-nowrap\b/);
  });

  // @req REQ-124
  it("links up to five attested countries as French-labelled chips and counts the rest", () => {
    render(<DominantAnswerPanel result={baillyResult} language="fr" />);

    const section = sectionTitled("Pays attestés (7)");
    const chips = within(section).getAllByRole("link");
    expect(chips).toHaveLength(5);
    expect(chips[0]).toHaveTextContent(/Côte d.Ivoire/);
    expect(chips[0]).toHaveAttribute("href", getCountryRoute("fr", "CIV"));
    expect(chips[1]).toHaveTextContent("Mali");
    expect(chips[1]).toHaveAttribute("href", getCountryRoute("fr", "MLI"));
    expect(section).toHaveTextContent("et 2 autres");
  });

  // @req REQ-124
  it("uses the singular when exactly one attested country is left unlisted", () => {
    render(
      <DominantAnswerPanel
        result={{
          ...baillyResult,
          attestedCountryIds: ["CIV", "MLI", "BFA", "GIN", "SEN", "GHA"],
        }}
        language="fr"
      />
    );

    const section = sectionTitled("Pays attestés (6)");
    expect(within(section).getAllByRole("link")).toHaveLength(5);
    expect(section).toHaveTextContent("et 1 autre");
    expect(section).not.toHaveTextContent("autres");
  });

  // @req REQ-124
  it("links each resolved associated people as a chip to its fiche", () => {
    render(<DominantAnswerPanel result={baillyResult} language="fr" />);

    const section = sectionTitled("Peuples associés (1)");
    const chips = within(section).getAllByRole("link");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent("Dioula");
    expect(chips[0]).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_DIOULA")
    );
  });

  // @req REQ-124
  it("counts every associated people id but never prints an identifier for an unresolved one", () => {
    const { container } = render(
      <DominantAnswerPanel
        result={{
          ...baillyResult,
          associatedPeopleIds: ["PPL_DIOULA", "PPL_GHOST"],
        }}
        language="fr"
      />
    );

    const section = sectionTitled("Peuples associés (2)");
    expect(within(section).getAllByRole("link")).toHaveLength(1);
    expect(container.textContent).not.toContain("PPL_");
  });

  // @req REQ-124
  it("lists the cited sources under a counted, scrollable Sources section", () => {
    render(<DominantAnswerPanel result={baillyResult} language="fr" />);

    const section = sectionTitled("Sources (2)");
    const links = within(section).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://example.org/patronymes/bailly",
      "https://example.org/noms/bailly",
    ]);
    const scroller = links[0].closest(".overflow-y-auto");
    expect(scroller).not.toBeNull();
    expect(section).toContainElement(scroller as HTMLElement);
    expect(screen.queryByRole("heading", { name: "Ailleurs" })).toBeNull();
  });

  // @req REQ-124
  it("omits the country and people sections when the result carries none", () => {
    render(
      <DominantAnswerPanel
        result={{
          ...baillyResult,
          associatedPeopleIds: [],
          associatedPeoples: [],
          attestedCountryIds: [],
        }}
        language="fr"
      />
    );

    expect(
      screen.queryByRole("heading", { name: /^Pays attestés/ })
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: /^Peuples associés/ })
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Sources (2)" })
    ).toBeInTheDocument();
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

    render(<DominantAnswerPanel result={languageResult} language="fr" />);

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
      <DominantAnswerPanel result={emptyPeopleResult} language="fr" />
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
      <DominantAnswerPanel result={countryResult} language="fr" />
    );

    expect(container.firstChild).toBeNull();
  });
});
