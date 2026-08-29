import { readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DID_YOU_KNOW_FACTS,
  findDidYouKnowFact,
  pickDidYouKnowFact,
  pickNextDidYouKnowFact,
  shuffleDidYouKnowDeck,
  type DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";

const fact = (id: string): DidYouKnowFact => ({
  id,
  headline: `Titre ${id}`,
  body: [`Corps ${id}`],
  entities: [],
  tier: "referenced",
});

/**
 * The corpus, read from the fiches themselves.
 *
 * This check used to assert that a chip's id and label were non-empty
 * strings, under a name promising it verified them against the corpus. It
 * passed on `PPL_MBUTI`, a people the atlas does not hold, and would have
 * passed on any typo — a chip pointing at a missing fiche is a 404 the
 * reader finds before we do. Reading the directory is the only version of
 * this test that can fail for the reason its name gives.
 */
function corpusIds(): {
  country: Set<string>;
  people: Set<string>;
  family: Set<string>;
} {
  const root = resolve(process.cwd(), "dataset/source/afrik");
  const stem = (file: string) => basename(file, ".json");

  const country = new Set(readdirSync(join(root, "pays")).map(stem));
  const family = new Set(
    readdirSync(join(root, "famille_linguistique")).map(stem)
  );

  const people = new Set<string>();
  const peoplesRoot = join(root, "peuples");
  for (const branch of readdirSync(peoplesRoot)) {
    const branchPath = join(peoplesRoot, branch);
    if (!statSync(branchPath).isDirectory()) continue;
    for (const file of readdirSync(branchPath)) {
      if (file.startsWith("PPL_") && file.endsWith(".json")) {
        people.add(stem(file));
      }
    }
  }

  return { country, people, family };
}

describe("the Saviez-vous bank", () => {
  // @req REQ-113
  it("holds only facts whose chips name a corpus entity", () => {
    const corpus = corpusIds();
    const dangling: string[] = [];

    for (const entry of DID_YOU_KNOW_FACTS) {
      for (const entity of entry.entities) {
        expect(entity.label).not.toBe("");
        if (!corpus[entity.kind].has(entity.id)) {
          dangling.push(`${entry.id} → ${entity.kind} ${entity.id}`);
        }
      }
    }

    expect(dangling).toEqual([]);
  });

  // Two facts must not claim the same anchor: the anecdotes page addresses
  // a fact by its id.
  // @req REQ-113
  it("gives every fact an id of its own", () => {
    const ids = DID_YOU_KNOW_FACTS.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  // A tier printed over nothing claims an authority the atlas cannot
  // produce. Six facts predate the sources field and are exempted by name,
  // so the exemption shrinks and can never silently grow.
  // @req REQ-113
  it("makes every fact added since the sources field cite its claim", () => {
    const beforeTheSourcesField = new Set([
      "monrovia",
      "bantou",
      "cote-ivoire",
      "amazigh",
      "lingala",
      "personne-relationnelle",
    ]);

    for (const entry of DID_YOU_KNOW_FACTS) {
      if (beforeTheSourcesField.has(entry.id)) continue;

      expect(
        entry.sources?.length,
        `${entry.id} cites nothing`
      ).toBeGreaterThan(0);
      for (const source of entry.sources ?? []) {
        expect(source.title).not.toBe("");
        expect(source.url.startsWith("https://"), source.url).toBe(true);
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

describe("shuffleDidYouKnowDeck — the order the anecdotes page reads in", () => {
  const bank = [fact("a"), fact("b"), fact("c"), fact("d")];

  // The whole reason the page shuffles a deck instead of rolling a die: a
  // reader pressing « Suivant » must reach the last fact of the bank before
  // meeting the first one again.
  // @req REQ-113
  it("serves every fact once before serving any of them twice", () => {
    const drawn = shuffleDidYouKnowDeck(() => 0.42, bank);

    expect(drawn).toHaveLength(bank.length);
    expect(drawn.map((f) => f.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  // @req REQ-113
  it("draws the order the random it was given dictates", () => {
    expect(
      shuffleDidYouKnowDeck(() => 0, [fact("a"), fact("b"), fact("c")]).map(
        (f) => f.id
      )
    ).toEqual(["b", "c", "a"]);
  });

  // The seam between two permutations is the one repeat a reader is certain
  // to notice, because it lands on consecutive presses.
  // @req REQ-113
  it("never opens on the fact the reader has just been shown", () => {
    const reshuffled = shuffleDidYouKnowDeck(() => 0, bank, "c");

    expect(reshuffled[0].id).not.toBe("c");
    expect(reshuffled.map((f) => f.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  // @req REQ-113
  it("hands back the only fact it has rather than nothing to avoid a repeat", () => {
    const single = [fact("a")];

    expect(
      shuffleDidYouKnowDeck(() => 0, single, "a").map((f) => f.id)
    ).toEqual(["a"]);
  });

  // @req REQ-113
  it("shuffles an empty bank into an empty deck", () => {
    expect(shuffleDidYouKnowDeck(() => 0, [])).toEqual([]);
  });
});

describe("findDidYouKnowFact — the fact a shared link names", () => {
  const bank = [fact("a"), fact("b")];

  // @req REQ-113
  it("resolves the id a link carries", () => {
    expect(findDidYouKnowFact("b", bank)?.id).toBe("b");
  });

  // A link posted before a fact was retired must land on the page, not on a
  // 404 — the address still points at something worth reading.
  // @req REQ-113
  it("returns nothing for an id the bank no longer holds", () => {
    expect(findDidYouKnowFact("gone", bank)).toBeNull();
    expect(findDidYouKnowFact(null, bank)).toBeNull();
    expect(findDidYouKnowFact(undefined, bank)).toBeNull();
  });
});
