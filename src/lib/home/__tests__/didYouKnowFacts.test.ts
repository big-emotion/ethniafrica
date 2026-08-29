import { readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DID_YOU_KNOW_FACTS,
  paginateDidYouKnowFacts,
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

describe("paginateDidYouKnowFacts — the anecdotes feed", () => {
  const bank = Array.from({ length: 9 }, (_, index) => fact(`f${index}`));

  // @req REQ-113
  it("cuts the bank into pages of the size asked for", () => {
    const page = paginateDidYouKnowFacts(1, bank, 4);

    expect(page.facts.map((f) => f.id)).toEqual(["f0", "f1", "f2", "f3"]);
    expect(page.pageCount).toBe(3);
  });

  // @req REQ-113
  it("leaves the last page short rather than padding it", () => {
    const page = paginateDidYouKnowFacts(3, bank, 4);

    expect(page.facts.map((f) => f.id)).toEqual(["f8"]);
  });

  // The feed keeps the authored order so a fact does not move between pages
  // between two requests — a URL a reader shares has to hold still.
  // @req REQ-113
  it("hands the same page back for the same page number", () => {
    expect(paginateDidYouKnowFacts(2, bank, 4).facts).toEqual(
      paginateDidYouKnowFacts(2, bank, 4).facts
    );
  });

  // A hand-typed or stale page number is the common case, not an attack; a
  // 404 there would tell the reader the anecdotes are gone.
  // @req REQ-113
  it("clamps a page number outside the range instead of refusing it", () => {
    expect(paginateDidYouKnowFacts(0, bank, 4).pageNumber).toBe(1);
    expect(paginateDidYouKnowFacts(99, bank, 4).pageNumber).toBe(3);
    expect(paginateDidYouKnowFacts(Number.NaN, bank, 4).pageNumber).toBe(1);
  });

  // @req REQ-113
  it("reports one empty page rather than none when the bank is empty", () => {
    const page = paginateDidYouKnowFacts(1, [], 4);

    expect(page.facts).toEqual([]);
    expect(page.pageCount).toBe(1);
  });
});
