import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PeopleCultureChapter } from "../PeopleCultureChapter";

describe("PeopleCultureChapter", () => {
  afterEach(cleanup);

  // @req REQ-003 REQ-097
  it("groups the four culture and organisation facts into four tiles", () => {
    render(
      <PeopleCultureChapter
        language="fr"
        culture={{
          majorRites: "Rites de passage.",
          symbols: "Un symbole tissé.",
          artsAndMusic: "Des tambours.",
          spiritualities: "Un culte ancestral.",
        }}
        related={{ ethnicities: [], politicalSystem: "Conseil local." }}
        associatedGroups={[]}
      />
    );

    const tiles = document.querySelectorAll("[data-fiche-tile]");
    expect(tiles).toHaveLength(4);
    expect(
      within(tiles[0] as HTMLElement).getByText(/Rites de passage/)
    ).toBeVisible();
    fireEvent.click(tiles[0].querySelector("summary")!);
    expect(
      within(tiles[0] as HTMLElement).getByText(/symbole tissé/)
    ).toBeVisible();
    expect(within(tiles[1] as HTMLElement).getByText(/tambours/)).toBeVisible();
    expect(
      within(tiles[2] as HTMLElement).getByText(/culte ancestral/)
    ).toBeVisible();
    expect(
      within(tiles[3] as HTMLElement).getByText(/Conseil local/)
    ).toBeVisible();
    expect(tiles[0].tagName).toBe("DETAILS");
    expect(tiles[0].querySelector("[data-closed-fact]")).toHaveTextContent(
      "Rites de passage."
    );
    expect(tiles[0].children[1]).not.toHaveTextContent("Rites de passage.");
  });

  // @req REQ-097
  it("keeps sourced neighbours and organisation visible when culture is empty", () => {
    render(
      <PeopleCultureChapter
        language="en"
        culture={{}}
        related={{ ethnicities: ["Oyo"], roleOfLineages: "Lineage councils." }}
        associatedGroups={[{ label: "Oyo" }]}
      />
    );

    expect(document.querySelectorAll("[data-fiche-tile]")).toHaveLength(1);
    fireEvent.click(document.querySelector("summary")!);
    expect(screen.getByText("Oyo")).toBeVisible();
    expect(screen.getByText("Lineage councils.")).toBeVisible();
  });

  // @req REQ-019 REQ-153
  it("opens a long cultural field on additional sourced prose without repeating the lead", () => {
    render(
      <PeopleCultureChapter
        language="fr"
        culture={{
          artsAndMusic:
            "Des tambours ouvrent la danse. Les chants marquent les étapes du rite.",
          spiritualities:
            "Des récits évoquent les ancêtres. Des cérémonies leur sont consacrées.",
        }}
        related={{ ethnicities: [] }}
        associatedGroups={[]}
        cultureNotes={{
          artsAndMusic: {
            noteNumber: 7,
            anchorId: "note-arts",
            fieldLabel: "Arts & musique",
            assertionId: "assertion-arts",
            assertionStatement: "Arts and music",
            contested: false,
            sources: [],
            numberBySourceId: {},
          },
        }}
      />
    );

    const tiles = document.querySelectorAll("[data-fiche-tile]");
    expect(tiles).toHaveLength(2);
    const arts = tiles[0] as HTMLElement;
    expect(arts.tagName).toBe("DETAILS");
    expect(arts.querySelector("[data-closed-fact]")).toHaveTextContent(
      "Des tambours ouvrent la danse."
    );
    expect(arts.querySelector("[data-closed-fact]")).not.toHaveTextContent(
      "Les chants"
    );
    fireEvent.click(arts.querySelector("summary")!);
    expect(within(arts).getByText(/Les chants marquent/)).toBeVisible();
    expect(arts.children[1]).not.toHaveTextContent(
      "Des tambours ouvrent la danse."
    );
    expect(within(arts).getByRole("button", { name: /note 7/i })).toBeVisible();
  });

  // @req REQ-019 REQ-153
  it("keeps a source-note control outside a disclosure summary", () => {
    render(
      <PeopleCultureChapter
        language="fr"
        culture={{ majorRites: "Un rite cité.", symbols: "Un symbole cité." }}
        related={{ ethnicities: [] }}
        associatedGroups={[]}
        cultureNotes={{
          majorRites: {
            noteNumber: 8,
            anchorId: "note-rites",
            fieldLabel: "Rites majeurs",
            assertionId: "assertion-rites",
            assertionStatement: "Major rites",
            contested: false,
            sources: [],
            numberBySourceId: {},
          },
        }}
      />
    );

    const tile = document.querySelector("[data-fiche-tile]")!;
    expect(tile.tagName).toBe("DIV");
    expect(
      within(tile as HTMLElement).getByText("Un rite cité.")
    ).toBeVisible();
    expect(
      within(tile as HTMLElement).getByText("Un symbole cité.")
    ).toBeVisible();
    expect(
      within(tile as HTMLElement).getByRole("button", { name: /note 8/i })
    ).toBeVisible();
  });

  // @req REQ-119
  it("marks an entirely silent chapter as missing", () => {
    render(
      <PeopleCultureChapter
        language="fr"
        culture={{}}
        related={{ ethnicities: [] }}
        associatedGroups={[]}
      />
    );

    expect(screen.getByRole("status")).toBeVisible();
  });
});
