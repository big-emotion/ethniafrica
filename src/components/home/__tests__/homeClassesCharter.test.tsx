import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeCorpusCounts } from "@/components/home/HomeCorpusCounts";
import { SEARCH_RESULT_GROUPS } from "@/lib/search/searchVocabulary";
import { SEARCH_ENTITY_ACCENT } from "@/components/search/searchEntityAccent";
import { CORPUS_CLASSES } from "@/lib/home/corpusClasses";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const FULL_CORPUS = {
  peoples: 790,
  languages: 748,
  countries: 54,
  families: 24,
  nameForms: 3134,
  migrations: 6,
};

/**
 * The home says what the corpus holds in two places at once — the tile band
 * prints totals, the search panel groups what comes back — and each used to
 * keep its own list in its own file. They drifted: the band asked "Qui sont
 * les peuples d'Afrique ?" above a panel of three groups, while the corpus
 * held five classes and the API answered six kinds. A reader was told the
 * product was a third of its size.
 *
 * There are two invariants here, not one, and conflating them is its own
 * failure. The tiles print **totals**; the panel and the field's label speak
 * of **search result kinds**. The two lists are neither equal nor nested, and
 * making them equal is the "fix" this file exists to refuse.
 */
describe("home charter — what the band claims the corpus is", () => {
  // @req REQ-113
  it("prints exactly the classes the tile band declares, in the same order", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    const tiles = screen.getAllByTestId(/^home-count-/);
    expect(tiles).toHaveLength(CORPUS_CLASSES.length);
    expect(tiles.map((tile) => tile.getAttribute("data-testid"))).toEqual(
      CORPUS_CLASSES.map(({ key }) => `home-count-${key}`)
    );
  });

  // A figure on this band is a count of something a reader can go and count.
  // A class in the list with no total behind it would be the "3 000 ans" of
  // ETNI-1198 all over again.
  // @req REQ-113
  it("gives every named class a total the server actually reads", () => {
    for (const { key } of CORPUS_CLASSES) {
      expect(FULL_CORPUS).toHaveProperty(key);
      expect(typeof FULL_CORPUS[key]).toBe("number");
    }
  });

  // The band must state every class it prints, to every reader, at once. The
  // rotating headline this lineage replaced could not: it showed one class at
  // a time, and none at all under prefers-reduced-motion, where its reel never
  // armed and the home named a single class for good.
  // @req REQ-113
  it("states every class it declares, on the band itself", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    const band = screen.getByTestId("home-corpus-counts");
    for (const { tileLabel } of CORPUS_CLASSES) {
      expect(band.textContent).toContain(tileLabel);
    }
  });

  // The band counts three of the corpus's classes and no longer counts
  // familles or appellations. That is an editorial choice, and the only thing
  // that keeps it from understating the product is the scope word on every
  // label: three *documented* totals, not the corpus entire. Drop the word and
  // the band silently reasserts the claim it gave up making.
  // @req REQ-113
  it("never lets three totals read as the whole corpus", () => {
    render(<HomeCorpusCounts counts={FULL_CORPUS} />);

    expect(screen.getByTestId("home-corpus-counts")).toHaveAccessibleName(
      /ce que l'atlas documente/i
    );
    for (const { tileLabel } of CORPUS_CLASSES) {
      expect(tileLabel).toMatch(/document/i);
    }
  });

  // The second invariant, and the one the SEARCH_LABEL docblock states: the
  // panel may only group a kind the search can return, and the label may only
  // name a kind the panel groups.
  // @req REQ-002
  it("groups only search kinds the product has a label and an accent for", () => {
    for (const { type, heading } of SEARCH_RESULT_GROUPS) {
      expect(SEARCH_ENTITY_ACCENT[type]).toBeDefined();
      expect(heading.length).toBeGreaterThan(0);
    }

    // `persons` has no rows; grouping it would promise an empty answer.
    expect(SEARCH_RESULT_GROUPS.map((group) => group.type)).not.toContain(
      "person"
    );
  });

  // Counting fewer classes than the search resolves is deliberate, and this
  // asserts the asymmetry so the next reader does not "restore" a tile per
  // search group. The criterion is the figure, not the class: a total claims
  // exhaustiveness, naming a class claims nothing. So the band counts the
  // three classes worth a headline number, while familles, appellations and
  // patronymes keep their menu entry, their index and their search group.
  // @req REQ-113
  it("counts fewer classes than the search panel returns kinds", () => {
    const groupedTypes = SEARCH_RESULT_GROUPS.map((group) => group.type);

    expect(groupedTypes).toContain("patronyme");
    expect(CORPUS_CLASSES.length).toBeLessThan(groupedTypes.length);
    expect(CORPUS_CLASSES.map((entity) => entity.key)).not.toContain(
      "nameForms"
    );
  });
});
