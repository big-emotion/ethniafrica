import { getSeedNameCandidates } from "@/lib/supabase/queries/afrik/seedNames";

/**
 * The words the home's three seed chips turn through, drawn from the corpus
 * on every request (REQ-002).
 *
 * They were twelve names written into the component. Twelve is a claim about
 * the corpus that the corpus itself can make: the row's whole job is to say
 * that a reader can type almost anything African into the field and land on a
 * documented fiche, and a fixed dozen says the opposite once the reader has
 * seen it loop. Drawing at render time also means a second visit is a second
 * tenth of the corpus rather than the same twelve words again.
 *
 * The home is never prerendered — the root layout awaits connection() for the
 * CSP nonce, and the hero already draws a different module per request
 * (REQ-115) — so a draw here is genuinely per reader, not per build.
 */

export type SeedKind = "people" | "country" | "languageFamily";
export type SeedWordsByKind = Record<SeedKind, string[]>;

/** Ten reads as a sample of a corpus; four read as a list someone wrote. */
// @req REQ-002
export const SEED_WORDS_PER_POOL = 10;

/**
 * A chip takes the width of the longest word in its pool, so the row cannot
 * reflow while the words turn — which means the pool decides the row's
 * geometry before the first paint. Fourteen characters is what keeps the
 * three chips on one line at 430px, measured: 80, 104 and 133px for the
 * curated words below.
 *
 * It doubles as an editorial filter, which is why it is not a regret. The
 * names it excludes are the corpus' qualified ones — "Khoïsan (macro-groupe
 * non génétique)", "République démocratique du Congo", "Peuples autochtones
 * des forêts d'Afrique centrale (Baka, Bagyeli, Bedzan)" — and none of them
 * is a query a reader would type. 694 of 789 peoples, 49 of 54 countries and
 * 17 of 24 families remain eligible.
 *
 * The countries are the sharp edge, and what it exposes is a corpus defect
 * rather than a limit of this rule. `name_fr` is the name of ordinary use and
 * `name_official` the protocol name (migration 049), which most fiches
 * respect — ZAF reads "Afrique du Sud", CIV "Côte d'Ivoire". Two do not: TZA
 * carries "République-Unie de Tanzanie" and COD "République démocratique du
 * Congo" in `name_fr`, so those two countries cannot be seed words until
 * their fiches say "Tanzanie" and "RD Congo" where the schema asks them to.
 */
// @req REQ-002
export const SEED_WORD_MAX_LENGTH = 14;

/**
 * The curated dozen, kept as the answer of last resort rather than deleted.
 *
 * homeHeroSeedsCorpus.test.ts asserts every one of them against the fiches on
 * disk: a first pass of this list shipped four words the corpus does not hold
 * under those spellings, which would have been chips running a query that
 * returns nothing on the one screen that has to say the corpus is not thin.
 */
// @req REQ-002
export const FALLBACK_SEED_WORDS: SeedWordsByKind = {
  people: ["Yoruba", "Bété", "Himba", "Zoulou"],
  country: ["Cameroun", "Bénin", "Namibie", "Éthiopie"],
  languageFamily: ["Bantou", "Afro-asiatique", "Mandé", "Nilotique"],
};

/**
 * One pool, drawn from what the corpus offered for that kind.
 *
 * Falls back below two words because a reel needs a second word to be a reel:
 * one name would be a chip that sits there looking broken, and the curated
 * four say more than that.
 */
// @req REQ-002
export function drawSeedWords(
  candidates: readonly string[],
  fallback: readonly string[]
): string[] {
  const eligible = [
    ...new Set(
      candidates
        .map((name) => name.trim())
        .filter(
          (name) => name.length > 0 && name.length <= SEED_WORD_MAX_LENGTH
        )
    ),
  ];

  if (eligible.length < 2) return [...fallback];

  // Fisher-Yates over a copy, then take the head: picking N random indices
  // instead would have to reject collisions, and rejection on a pool of 17
  // families is a loop whose length depends on luck.
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }

  return eligible.slice(0, SEED_WORDS_PER_POOL);
}

/**
 * What the three chips may spend on the row between them, in characters of
 * their longest word each — because that is what each chip reserves.
 *
 * A per-word cap cannot express this and measuring pixels is not available to
 * a server component, so the budget converts: at 430px the row has 406px and
 * two 8px gaps, a chip is ~30px of padding, and the corpus' widest glyphs run
 * ~9.2px per character. 32 characters is what fits, and it was arrived at by
 * measuring — a 14-character cap alone left a quarter of the draws on two
 * lines ("Hutu du Rwanda" + "Soudan du Sud" + "Bénoué-Congo" is 445px).
 *
 * It constrains the combination, never the corpus: every name stays drawable,
 * it just cannot land beside two other long ones.
 */
// @req REQ-002
export const SEED_ROW_CHAR_BUDGET = 32;

/** A pool's contribution to the row: the word the chip sizes itself to. */
function widestWord(words: readonly string[]): number {
  return words.reduce((widest, word) => Math.max(widest, word.length), 0);
}

/**
 * Trim the pools until the row they will render fits on one line.
 *
 * Drops the single widest word of the widest pool at a time, rather than
 * re-drawing: losing one name out of ten is invisible, and a pool that has
 * been redrawn to fit would systematically under-represent the corpus' longer
 * names on every visit instead of only on the crowded ones.
 */
// @req REQ-002
export function drawSeedPools(pools: SeedWordsByKind): SeedWordsByKind {
  const kinds = Object.keys(pools) as SeedKind[];
  const trimmed: SeedWordsByKind = {
    people: [...pools.people],
    country: [...pools.country],
    languageFamily: [...pools.languageFamily],
  };

  const rowMeasure = () =>
    kinds.reduce((total, kind) => total + widestWord(trimmed[kind]), 0);

  while (rowMeasure() > SEED_ROW_CHAR_BUDGET) {
    // Only a pool that can still spare a word: a reel needs a second word to
    // be a reel, so an unfittable row beats a chip that cannot turn.
    const spendable = kinds
      .filter((kind) => trimmed[kind].length > 2)
      .sort((a, b) => widestWord(trimmed[b]) - widestWord(trimmed[a]));

    const kind = spendable[0];
    if (!kind) break;

    const widest = widestWord(trimmed[kind]);
    const at = trimmed[kind].findIndex((word) => word.length === widest);
    trimmed[kind] = trimmed[kind].filter((_, index) => index !== at);
  }

  return trimmed;
}

// @req REQ-002
export async function loadSeedWords(): Promise<SeedWordsByKind> {
  let candidates;
  try {
    candidates = await getSeedNameCandidates();
  } catch {
    // getSeedNameCandidates already logs and degrades per table; this catches
    // the case where it could not even get that far.
    return FALLBACK_SEED_WORDS;
  }

  return drawSeedPools({
    people: drawSeedWords(candidates.people, FALLBACK_SEED_WORDS.people),
    country: drawSeedWords(candidates.country, FALLBACK_SEED_WORDS.country),
    languageFamily: drawSeedWords(
      candidates.languageFamily,
      FALLBACK_SEED_WORDS.languageFamily
    ),
  });
}
