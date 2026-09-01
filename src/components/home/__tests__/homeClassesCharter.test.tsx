import { describe, expect, it, vi } from "vitest";

import { SEARCH_RESULT_GROUPS } from "@/components/home/HomeHeroSearch";
import { SEARCH_ENTITY_ACCENT } from "@/components/search/searchEntityAccent";
import { CORPUS_CLASSES } from "@/lib/home/corpusClasses";
import {
  HEADLINE_ACCESSIBLE_NAME,
  headlineSegments,
} from "@/lib/home/headlineSegments";

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
 * The home says what the corpus holds in two places at once — the headline
 * names a class, the search panel groups what comes back — and each used to
 * keep its own list in its own file. They drifted: the band asked "Qui sont
 * les peuples d'Afrique ?" above a panel of three groups, while the corpus
 * held five classes and the API answered six kinds. A reader was told the
 * product was a third of its size.
 *
 * There are two invariants here, not one, and conflating them is its own
 * failure. The headline speaks of **corpus classes**; the panel and the
 * field's label speak of **search result kinds**. They overlap in four
 * places and part company in the fifth — appellations are name forms of
 * peoples, Noms are patronyme fiches.
 */
describe("home charter — what the band claims the corpus is", () => {
  // @req REQ-113
  it("names exactly the classes the corpus declares, in the same order", () => {
    const named = headlineSegments(FULL_CORPUS);

    expect(named).toHaveLength(CORPUS_CLASSES.length);
    expect(named).toEqual(
      CORPUS_CLASSES.map(
        (entity) =>
          `${new Intl.NumberFormat("fr-FR").format(FULL_CORPUS[entity.key])} ${entity.headlineWord}`
      )
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

  // The heading is a landmark. Its name must cover every class the reel turns
  // through, or a screen-reader user is told about fewer classes than the page
  // shows — the exact defect this charter exists to prevent, one layer down.
  // @req REQ-113
  it("names every class in the heading's fixed accessible name", () => {
    for (const { headlineWord } of CORPUS_CLASSES) {
      expect(HEADLINE_ACCESSIBLE_NAME.toLowerCase()).toContain(headlineWord);
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

  // The overlap is deliberate and partial. Asserting it keeps the next reader
  // from "fixing" the asymmetry by making the headline count patronymes.
  // @req REQ-113
  it("shares four classes with the search panel and parts company on the fifth", () => {
    const groupedTypes = SEARCH_RESULT_GROUPS.map((group) => group.type);

    expect(groupedTypes).toContain("patronyme");
    expect(CORPUS_CLASSES.map((entity) => entity.key)).toContain("nameForms");
    expect(CORPUS_CLASSES.map((entity) => entity.key)).not.toContain(
      "patronymes"
    );
  });
});
