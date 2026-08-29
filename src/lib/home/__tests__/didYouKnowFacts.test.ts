import { describe, expect, it } from "vitest";

import {
  DID_YOU_KNOW_FACTS,
  orderDidYouKnowDeck,
  pickDidYouKnowFact,
  pickNextDidYouKnowFact,
  type DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";

const fact = (id: string): DidYouKnowFact => ({
  id,
  headline: `Titre ${id}`,
  body: [`Corps ${id}`],
  entities: [],
  tier: "referenced",
});

describe("the Saviez-vous bank", () => {
  // @req REQ-113
  it("holds only facts whose chips name a corpus entity", () => {
    for (const entry of DID_YOU_KNOW_FACTS) {
      for (const entity of entry.entities) {
        expect(entity.id).not.toBe("");
        expect(entity.label).not.toBe("");
      }
    }
  });
});

describe("pickNextDidYouKnowFact — the draw the loader uses", () => {
  // @req REQ-104
  it("never draws the fact the reader has just been shown", () => {
    const bank = [fact("a"), fact("b"), fact("c")];

    // A random source that always lands on the first slot would return "a"
    // forever. The whole point of the previous id is that it cannot.
    const drawn = pickNextDidYouKnowFact("a", () => 0, bank);

    expect(drawn?.id).not.toBe("a");
  });

  // @req REQ-104
  it("still draws something when the bank holds a single fact", () => {
    // With nothing else to show, repeating is better than showing an empty
    // wait: the reader is waiting either way.
    const bank = [fact("only")];

    expect(pickNextDidYouKnowFact("only", Math.random, bank)?.id).toBe("only");
  });

  // @req REQ-104
  it("draws from the whole bank when nothing has been shown yet", () => {
    const bank = [fact("a"), fact("b"), fact("c")];

    expect(pickNextDidYouKnowFact(null, () => 0, bank)?.id).toBe("a");
  });

  // @req REQ-104
  it("reaches every fact in the bank across successive draws", () => {
    // A rotation that can only ever surface two of six would make the bank's
    // maintenance cost pointless.
    const bank = [fact("a"), fact("b"), fact("c"), fact("d")];
    const seen = new Set<string>();

    let previous: string | null = null;
    for (let index = 0; index < 400; index += 1) {
      const drawn = pickNextDidYouKnowFact(previous, Math.random, bank);
      if (drawn) {
        seen.add(drawn.id);
        previous = drawn.id;
      }
    }

    expect(seen.size).toBe(bank.length);
  });

  // @req REQ-104
  it("reports nothing rather than inventing a fact when the bank is empty", () => {
    expect(pickNextDidYouKnowFact(null, Math.random, [])).toBeNull();
  });
});

describe("pickDidYouKnowFact — the home band's draw", () => {
  // @req REQ-113
  it("keeps drawing across the whole bank", () => {
    const bank = [fact("a"), fact("b")];

    expect(pickDidYouKnowFact(() => 0, bank)?.id).toBe("a");
    expect(pickDidYouKnowFact(() => 0.99, bank)?.id).toBe("b");
  });
});

describe("orderDidYouKnowDeck — the order the band pages through", () => {
  // @req REQ-113
  it("opens the deck on the fact it drew", () => {
    const bank = [fact("a"), fact("b"), fact("c")];

    expect(orderDidYouKnowDeck(() => 0.5, bank).map((f) => f.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  // The deck replaced a per-request draw. Dropping a fact to make room for
  // the rotation would silently shrink the bank the reader can reach.
  // @req REQ-113
  it("keeps every fact of the bank, whatever it drew", () => {
    const bank = [fact("a"), fact("b"), fact("c")];

    for (const roll of [0, 0.34, 0.67, 0.99]) {
      expect(orderDidYouKnowDeck(() => roll, bank)).toHaveLength(3);
      expect(
        new Set(orderDidYouKnowDeck(() => roll, bank).map((f) => f.id))
      ).toEqual(new Set(["a", "b", "c"]));
    }
  });

  // @req REQ-113
  it("returns nothing rather than inventing a deck from an empty bank", () => {
    expect(orderDidYouKnowDeck(() => 0, [])).toEqual([]);
  });
});
