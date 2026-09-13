import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FicheTileChapter } from "@/components/fiche/FicheTileChapter";
import {
  countryLanguageTiles,
  peopleLanguageTiles,
} from "@/lib/fiche/languages";
import { getFamilyRoute } from "@/lib/routing";

import { countryRecord } from "./corpusRecords";

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
 * The language chapter, drawn by the same tiles as the culture chapter. The
 * family is one click away from a people, by name; a country's languages are
 * names with their codes, never an emoji standing for "official".
 */
describe("fiche languages charter", () => {
  afterEach(cleanup);

  // @req REQ-091
  it("links the family by its name from a people", () => {
    render(
      <FicheTileChapter
        tiles={peopleLanguageTiles(
          {
            mainLanguage: "Yoruba",
            isoCodes: ["yor"],
            dialects: [],
            languageFamilyId: "FLG_NIGER_CONGO",
          },
          "Niger-Congo",
          "fr"
        )}
        language="fr"
      />
    );
    const link = within(tileLabelled("Famille")).getByRole("link", {
      name: "Niger-Congo",
    });
    expect(link).toHaveAttribute(
      "href",
      getFamilyRoute("fr", "FLG_NIGER_CONGO")
    );
  });

  // @req REQ-091
  it("offers no family link, and no identifier, when the family has no name", () => {
    const { container } = render(
      <FicheTileChapter
        tiles={peopleLanguageTiles(
          {
            mainLanguage: "Yoruba",
            isoCodes: ["yor"],
            dialects: [],
            languageFamilyId: "FLG_NIGER_CONGO",
          },
          undefined,
          "fr"
        )}
        language="fr"
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/FLG_/);
  });

  // @req REQ-091 REQ-145
  it("sets each country language beside its code, without a pictogram", () => {
    const { container } = render(
      <FicheTileChapter
        tiles={countryLanguageTiles(
          countryRecord("NAM").culture?.mainLanguages ?? [],
          "fr"
        )}
        language="fr"
      />
    );
    const others = tileLabelled("Autres langues du pays");
    const herero = within(others).getByText("Herero").closest("li");
    expect(herero).toHaveTextContent("her");
    expect(herero?.querySelector(".afh-pill-code")).toHaveTextContent("her");
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
