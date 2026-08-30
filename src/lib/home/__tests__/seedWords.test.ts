import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  drawSeedWords,
  drawSeedPools,
  loadSeedWords,
  FALLBACK_SEED_WORDS,
  SEED_WORDS_PER_POOL,
  SEED_WORD_MAX_LENGTH,
  SEED_ROW_CHAR_BUDGET,
} from "../seedWords";

vi.mock("@/lib/supabase/queries/afrik/seedNames", () => ({
  getSeedNameCandidates: vi.fn(),
}));

const { getSeedNameCandidates } =
  await import("@/lib/supabase/queries/afrik/seedNames");
const readCandidates = vi.mocked(getSeedNameCandidates);

/** A corpus large enough that two honest draws colliding is not a worry. */
function manyNames(count: number, prefix = "Peuple"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("drawSeedWords — what a chip may be asked to hold", () => {
  // A chip sizes itself to the longest word of its pool so the row never
  // reflows mid-turn. The corpus holds names up to 73 characters ("Peuples
  // autochtones des forêts d'Afrique centrale (Baka, Bagyeli, Bedzan)"),
  // which would be a single ~600px chip and no row at all at 430px.
  // @req REQ-002
  it("leaves out names no chip could hold", () => {
    const tooLong = "Peuples Soudaniques Centraux (macro-groupe)";
    const drawn = drawSeedWords([tooLong, "Yoruba", "Himba"], []);

    expect(drawn).not.toContain(tooLong);
    expect(drawn).toEqual(expect.arrayContaining(["Yoruba", "Himba"]));
  });

  // @req REQ-002
  it("keeps every word within the chip's measure", () => {
    const drawn = drawSeedWords(manyNames(200, "Nom-de-peuple-long"), []);

    drawn.forEach((word) => {
      expect(word.length).toBeLessThanOrEqual(SEED_WORD_MAX_LENGTH);
    });
  });

  // @req REQ-002
  it("draws no more than a pool's worth", () => {
    expect(drawSeedWords(manyNames(400), [])).toHaveLength(SEED_WORDS_PER_POOL);
  });

  // The whole point of drawing at render time: a reader who comes back to the
  // home is shown a different tenth of the corpus, not the same twelve words.
  // @req REQ-002
  it("draws a different selection each time it is asked", () => {
    const corpus = manyNames(400);

    const first = drawSeedWords(corpus, []).join("|");
    const second = drawSeedWords(corpus, []).join("|");

    expect(first).not.toBe(second);
  });

  // Two fiches can carry the same nameFr. A pool holding one word twice makes
  // a chip that appears not to turn, which is the bug this all started from.
  // @req REQ-002
  it("never holds the same word twice", () => {
    const drawn = drawSeedWords(["Yoruba", "Yoruba", "Himba", "Himba"], []);

    expect(new Set(drawn).size).toBe(drawn.length);
  });

  // @req REQ-002
  it("takes everything eligible when the corpus is thinner than a pool", () => {
    expect(drawSeedWords(["Bantou", "Mandé"], [])).toHaveLength(2);
  });

  // A reel needs a second word to be a reel. Below that the corpus has told
  // us nothing usable, and the curated words say more than one frozen chip.
  // @req REQ-002
  it("falls back rather than show a chip that cannot turn", () => {
    const fallback = ["Yoruba", "Bété"];

    expect(drawSeedWords([], fallback)).toEqual(fallback);
    expect(drawSeedWords(["Peuple unique"], fallback)).toEqual(fallback);
  });
});

describe("drawSeedPools — the row the three chips will make", () => {
  /** What the row's geometry is decided by: the longest word of each pool. */
  function rowMeasure(pools: Record<string, string[]>): number {
    return Object.values(pools).reduce(
      (total, words) => total + Math.max(...words.map((w) => w.length)),
      0
    );
  }

  // Measured at 430px: a chip is ~30px of padding plus ~9.2px per character
  // at the corpus' widest glyphs, and the row has 406px and two 8px gaps. A
  // per-word cap cannot express that — three chips each within the cap still
  // made a 445px row, two lines, on a quarter of the draws.
  // @req REQ-002
  it("keeps the three pools within one row's worth of characters", () => {
    // Pools of ten, as drawn — each carrying the one long name that made the
    // 445px row, with short ones behind it for the trim to fall back on.
    const wide = {
      people: ["Hutu du Rwanda", "Kru", "Anyi", "Himba", "Zoulou"],
      country: ["Soudan du Sud", "Togo", "Mali", "Bénin", "Ghana"],
      languageFamily: ["Bénoué-Congo", "Khoe", "Krou", "Gur", "Tuu"],
    };

    expect(rowMeasure(wide)).toBeGreaterThan(SEED_ROW_CHAR_BUDGET);
    expect(rowMeasure(drawSeedPools(wide))).toBeLessThanOrEqual(
      SEED_ROW_CHAR_BUDGET
    );
  });

  // The budget constrains the combination, not the name: a long name stays
  // drawable, it simply cannot land beside two other long ones. Trimming a
  // word or two out of ten is invisible; excluding them from the corpus is
  // what would cost "Afro-asiatique" and "Côte d'Ivoire" their turn.
  // @req REQ-002
  it("spends the budget by trimming a pool, never by shortening the corpus", () => {
    const pools = drawSeedPools({
      people: ["Yao", "Kru", "Bété"],
      country: ["Togo", "Mali"],
      languageFamily: ["Afro-asiatique", "Bantou", "Mandé"],
    });

    expect(pools.languageFamily).toContain("Afro-asiatique");
  });

  // A reel needs two words. The budget may take a pool down to that floor and
  // no further — an unfittable row is better than a chip that cannot turn.
  // @req REQ-002
  it("never trims a pool below what a reel needs", () => {
    const pools = drawSeedPools({
      people: ["Hutu du Rwanda", "Lunda-Kazembe"],
      country: ["Soudan du Sud", "Guinée-Bissau"],
      languageFamily: ["Afro-asiatique", "Bénoué-Congo"],
    });

    Object.values(pools).forEach((words) => {
      expect(words.length).toBeGreaterThanOrEqual(2);
    });
  });

  // @req REQ-002
  it("leaves a row that already fits alone", () => {
    const pools = drawSeedPools({
      people: ["Yoruba", "Bété", "Himba"],
      country: ["Togo", "Mali", "Bénin"],
      languageFamily: ["Bantou", "Mandé", "Khoe"],
    });

    expect(pools.people).toHaveLength(3);
    expect(pools.country).toHaveLength(3);
    expect(pools.languageFamily).toHaveLength(3);
  });

  // @req REQ-002
  it("keeps the curated fallback inside the same budget", () => {
    expect(rowMeasure(FALLBACK_SEED_WORDS)).toBeLessThanOrEqual(
      SEED_ROW_CHAR_BUDGET
    );
  });
});

describe("loadSeedWords — the three pools at render time", () => {
  // @req REQ-002
  it("draws each kind from its own names", async () => {
    readCandidates.mockResolvedValue({
      people: manyNames(50, "Peuple"),
      country: manyNames(40, "Pays"),
      languageFamily: manyNames(30, "Famille"),
    });

    const pools = await loadSeedWords();

    expect(pools.people.every((w) => w.startsWith("Peuple"))).toBe(true);
    expect(pools.country.every((w) => w.startsWith("Pays"))).toBe(true);
    expect(pools.languageFamily.every((w) => w.startsWith("Famille"))).toBe(
      true
    );
  });

  // The hero is not worth a 500, and a band with no chips is a band that
  // stops saying what the corpus holds. An unreachable database costs the
  // freshness of the selection, never the selection itself.
  // @req REQ-002
  it("serves the curated words when the corpus answers with nothing", async () => {
    readCandidates.mockResolvedValue({
      people: [],
      country: [],
      languageFamily: [],
    });

    expect(await loadSeedWords()).toEqual(FALLBACK_SEED_WORDS);
  });

  // @req REQ-002
  it("serves the curated words when the query throws", async () => {
    readCandidates.mockRejectedValue(new Error("no database"));

    expect(await loadSeedWords()).toEqual(FALLBACK_SEED_WORDS);
  });
});
