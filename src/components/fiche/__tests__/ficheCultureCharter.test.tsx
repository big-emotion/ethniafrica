import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
import { countryCultureTiles, peopleCultureTiles } from "@/lib/fiche/culture";
import { resolveAssociatedPeoples } from "@/lib/people/associatedPeopleLinks";
import { transformPeopleData } from "@/lib/peopleDataTransformer";
import { getPeopleRoute } from "@/lib/routing";

import { countryRecord, peopleRecord } from "./corpusRecords";

function ovamboTiles() {
  const data = transformPeopleData(peopleRecord("PPL_OVAMBO"), null, "fr");
  return peopleCultureTiles(
    {
      culture: data.culture,
      related: data.relatedPeoples,
      relationsWithNeighbors: data.history.relationsWithNeighbors,
      associatedGroups: resolveAssociatedPeoples(
        data.relatedPeoples.ethnicities,
        [],
        data.hero.peopleId
      ),
      relationNames: [],
    },
    "fr"
  );
}

function tileLabelled(label: string): HTMLElement {
  const tile = Array.from(
    document.querySelectorAll<HTMLElement>("[data-fiche-tile]")
  ).find(
    (node) => node.querySelector(".afh-tile-label")?.textContent === label
  );
  if (!tile) throw new Error(`No tile labelled ${label}`);
  return tile;
}

/**
 * One culture chapter for both records: the same tiles, a preview of two
 * lines, the whole field behind "+ en savoir plus".
 */
describe("fiche culture charter", () => {
  afterEach(cleanup);

  // @req REQ-097 REQ-153
  it("lays every rubric out as a closed tile on one grid", () => {
    const { container } = render(
      <FicheTileChapter tiles={ovamboTiles()} language="fr" />
    );
    const grid = container.querySelector(".afh-tiles")!;
    expect(grid.children).toHaveLength(7);
    expect(container.querySelectorAll("details[open]")).toHaveLength(0);
    expect(
      tileLabelled("Rites").querySelector("[data-closed-fact]")
    ).toHaveTextContent(
      "Cérémonies de mariage combinant traditions ovambo et pratiques chrétiennes luthériennes."
    );
  });

  /**
   * A country field is often one long sentence. Its preview and its body are
   * then the same words, and the tile would print them whole and open. A
   * preview that overflows two lines folds all the same: the clamp is the
   * difference between them.
   */
  // @req REQ-092 REQ-153
  it("folds a long single sentence behind its two-line preview", () => {
    render(
      <FicheTileChapter
        tiles={countryCultureTiles(countryRecord("NAM").culture, "fr")}
        language="fr"
      />
    );
    const religions = tileLabelled("Religions");
    expect(religions.tagName).toBe("DETAILS");
    expect(religions).toHaveAttribute("data-body-restates-preview", "true");
  });

  // @req REQ-019 REQ-153
  it("keeps a field's note call in the opened tile", () => {
    const note: ParagraphNoteData = {
      noteNumber: 7,
      anchorId: "note-arts",
      fieldLabel: "Arts et musique",
      assertionId: "assertion-arts",
      assertionStatement: "Arts and music",
      contested: false,
      sources: [],
      numberBySourceId: {},
    };
    render(
      <FicheTileChapter
        tiles={ovamboTiles()}
        notes={{ artsAndMusic: note }}
        language="fr"
      />
    );
    expect(
      within(tileLabelled("Arts et musique")).getByRole("button", {
        name: /note 7/i,
      })
    ).toBeInTheDocument();
  });

  // @req REQ-097
  it("links an associated group to its record when the atlas holds one", () => {
    render(
      <FicheTileChapter
        tiles={peopleCultureTiles(
          {
            culture: {},
            related: { ethnicities: ["Herero", "Kwambi"] },
            associatedGroups: [
              { label: "Herero", peopleId: "PPL_HERERO" },
              { label: "Kwambi" },
            ],
            relationNames: [],
          },
          "fr"
        )}
        language="fr"
      />
    );
    const groups = tileLabelled("Groupes associés");
    expect(
      within(groups).getByRole("link", { name: "Herero" })
    ).toHaveAttribute("href", getPeopleRoute("fr", "PPL_HERERO"));
    expect(within(groups).queryByRole("link", { name: "Kwambi" })).toBeNull();
  });

  // @req REQ-097
  it("places a record's own detail inside the tile it belongs to", () => {
    render(
      <FicheTileChapter
        tiles={ovamboTiles()}
        extras={{ relations: <p data-testid="relation-links">Liens</p> }}
        language="fr"
      />
    );
    expect(
      within(tileLabelled("Relations")).getByTestId("relation-links")
    ).toBeInTheDocument();
  });

  // @req REQ-119
  it("marks a chapter the record leaves silent", () => {
    render(<FicheTileChapter tiles={[]} language="fr" />);
    expect(screen.getByRole("status")).toBeVisible();
  });
});
