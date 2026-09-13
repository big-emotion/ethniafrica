import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { peopleRecord } from "@/components/fiche/__tests__/corpusRecords";
import { PeopleDetailViewV2 } from "@/components/people/PeopleDetailViewV2";
import { PeopleNamingTiles } from "@/components/people/PeopleNamingTiles";
import type { PeopleNamesData } from "@/lib/peopleDataTransformer";

const naming = {
  nameMain: "Yoruba",
  selfAppellation: "Yorùbá",
  exonyms: ["Nago", "Aku"],
  originOfExonyms: "Nago vient d'un usage voisin documenté.",
  whyProblematic: "Nago peut réduire des identités distinctes.",
  contemporaryUsage: "Yorùbá est aujourd'hui revendiqué.",
  isoCode: "yor",
};

const nameRecord = (
  nameText: string,
  nameType: "endonym" | "exonym",
  extra: Record<string, string | null> = {}
) => ({
  record: {
    nameText,
    nameType,
    languageOfOrigin: null,
    meaning: null,
    periodLabel: null,
    imposedBy: null,
    impositionPeriod: null,
    whyProblematic: null,
    contemporaryUsage: null,
    ...extra,
  },
  confidenceScore: 80,
  sourceCount: 2,
  lastHumanAuditAt: "2025-01-01",
});

const records: PeopleNamesData = {
  autonym: "Yorùbá",
  endonyms: [
    nameRecord("Yorùbá", "endonym", { meaning: "ceux de la terre d'Oyo" }),
  ],
  exonyms: [
    nameRecord("Nago", "exonym", {
      imposedBy: "administration coloniale française",
      impositionPeriod: "1894-1960",
    }),
    nameRecord("Anago", "exonym", { meaning: "variante voisine" }),
  ],
  spellingHistory: [
    {
      nameText: "Yariba",
      periodLabel: "1820-1880",
      confidenceScore: 60,
      sourceCount: 1,
      lastHumanAuditAt: null,
    },
  ],
};

describe("PeopleNamingTiles", () => {
  afterEach(cleanup);

  // @req REQ-153
  it("gives each of the four naming fields a fact-bearing tile", () => {
    const { container } = render(<PeopleNamingTiles {...naming} />);
    const tiles = [...container.querySelectorAll("[data-fiche-tile]")];

    expect(tiles).toHaveLength(4);
    expect(tiles[0]).toHaveTextContent("Auto-appellation");
    expect(tiles[0]).toHaveTextContent("Yorùbá");
    expect(tiles[1].querySelector("[data-closed-fact]")).toHaveTextContent(
      "2 noms relevés"
    );
    expect(tiles[2].querySelector("[data-closed-fact]")).toHaveTextContent(
      "Nago vient d'un usage voisin documenté."
    );
    expect(tiles[3].querySelector("[data-closed-fact]")).toHaveTextContent(
      "Yorùbá est aujourd'hui revendiqué."
    );
    expect(
      screen.getByText("Nago peut réduire des identités distinctes.")
    ).toBeInTheDocument();
  });

  // @req REQ-115
  it("keeps the autonym visible and language-tagged before any tile is opened", () => {
    const { container } = render(<PeopleNamingTiles {...naming} />);
    const selfTile = container.querySelector("[data-fiche-tile]")!;

    expect(
      selfTile.querySelector('[data-closed-fact] [lang="yo"]')
    ).toHaveTextContent("Yorùbá");
  });

  // @req REQ-153
  it("omits empty optional fields without replacing them with claims", () => {
    const { container } = render(
      <PeopleNamingTiles
        nameMain="Yoruba"
        exonyms={[]}
        originOfExonyms={null}
        whyProblematic={null}
        contemporaryUsage={null}
      />
    );

    expect(container.querySelectorAll("[data-fiche-tile]")).toHaveLength(1);
    expect(screen.queryByText("Exonymes")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Pourquoi ces noms posent problème/)
    ).not.toBeInTheDocument();
  });

  // @req REQ-145
  it("uses English field labels and count for an English fiche", () => {
    render(<PeopleNamingTiles {...naming} language="en" />);

    expect(screen.getAllByText("Self-designation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exonyms").length).toBeGreaterThan(0);
    expect(screen.getByText("2 names recorded")).toBeInTheDocument();
  });

  /**
   * The chapter printed its names twice: the tiles named the autonym and the
   * exonyms, then an embedded names section printed a card per name record
   * under them, the autonym first. Each name now appears once, and the
   * record's context rides the tile that names it (operator ruling,
   * 2026-09-12).
   */
  // @req REQ-153
  it("prints the autonym once and each exonym once", () => {
    render(<PeopleNamingTiles {...naming} records={records} />);

    expect(screen.getAllByText("Yorùbá")).toHaveLength(1);
    expect(screen.getAllByText("Nago")).toHaveLength(1);
    expect(screen.getAllByText("Aku")).toHaveLength(1);
    expect(screen.getAllByText("Anago")).toHaveLength(1);
  });

  // @req REQ-056
  it("carries each name record's context in the tile that names it", () => {
    const { container } = render(
      <PeopleNamingTiles {...naming} records={records} />
    );
    const [selfTile, exonymTile] = [
      ...container.querySelectorAll<HTMLElement>("[data-fiche-tile]"),
    ];

    expect(selfTile).toHaveTextContent("ceux de la terre d'Oyo");

    expect(exonymTile.querySelector("[data-closed-fact]")).toHaveTextContent(
      "3 noms relevés"
    );
    expect(exonymTile).toHaveTextContent("administration coloniale française");
    expect(exonymTile).toHaveTextContent("1894-1960");
    expect(exonymTile).toHaveTextContent("variante voisine");
    expect(
      within(exonymTile).getByRole("link", { name: "Lire la doctrine" })
    ).toBeInTheDocument();
    expect(exonymTile.querySelector("ol")).toHaveTextContent("Yariba");
  });

  // @req REQ-153
  it("folds origin and usage behind their first sentence", () => {
    const { container } = render(
      <PeopleNamingTiles
        {...naming}
        originOfExonyms="Nago vient d'un usage voisin documenté. Aku désigne les affranchis de Freetown."
        contemporaryUsage="Yorùbá est aujourd'hui revendiqué. Nago survit au Bénin."
      />
    );
    const tiles = [...container.querySelectorAll("[data-fiche-tile]")];

    for (const [tile, lead, rest] of [
      [tiles[2], "Nago vient d'un usage voisin documenté.", "Aku désigne"],
      [tiles[3], "Yorùbá est aujourd'hui revendiqué.", "Nago survit au Bénin."],
    ] as const) {
      expect(tile.tagName).toBe("DETAILS");
      expect(tile.querySelector("[data-closed-fact]")?.textContent).toBe(lead);
      expect(tile).toHaveTextContent(rest);
    }
  });

  // The record's names chapter kept a second section beneath the tiles. The
  // anchor other pages link to (`#noms`) stays on the chapter.
  // @req REQ-153
  it("names each Ovambo exonym once on the record, under the #noms anchor", () => {
    const people = peopleRecord("PPL_OVAMBO");
    const { container } = render(
      <PeopleDetailViewV2 language="fr" people={people} />
    );

    const chapter = container
      .querySelector("#noms")
      ?.closest<HTMLElement>("[data-fiche-section]");
    expect(chapter).toHaveAttribute(
      "data-fiche-section",
      "Le nom et ses appellations"
    );
    for (const exonym of people.appellations!.exonyms!) {
      expect(within(chapter!).getAllByText(exonym)).toHaveLength(1);
    }
    expect(chapter!.querySelectorAll("[data-autonym]")).toHaveLength(0);
  });
});
