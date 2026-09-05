import { GLOSSARY_TERMS } from "@/lib/glossaire/terms";

/**
 * What every English content bank owes its French twin (REQ-143, REQ-145),
 * as predicates the parity suites share.
 *
 * Three checks, each narrow on purpose. `readsAsUntranslated` catches the
 * hole a sidecar leaves when an entry is copied rather than translated;
 * `frenchResidue` catches a sentence the translator never reached; the
 * glossary check catches a rendering the atlas has ruled out. None of them
 * judges the translation itself — that is a reader's job — so a bank that
 * passes here is one with no *mechanical* fault, not a good one.
 */

const WORD = /[\p{L}\p{N}]+/gu;

function wordCount(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

/**
 * A short entry may legitimately read the same in both languages — a
 * city, a relation type, « commercial » — so identity is only a finding
 * past a few words, where a proper name stops being a plausible reason.
 */
const PROPER_NAME_WORDS = 3;

/** An empty sidecar value, or a French entry left standing in the English. */
// @req REQ-145
export function readsAsUntranslated(fr: string, en: string): boolean {
  if (en.trim() === "") return true;
  return en === fr && wordCount(fr) > PROPER_NAME_WORDS;
}

/**
 * Function words that exist in French and not in English, so a hit is a
 * French sentence and never a loanword. Deliberately excludes the words the
 * two languages share — « par », « plus », « son », « a » — and the article
 * « la », which English borrows in place names.
 */
const FRENCH_FUNCTION_WORDS =
  /(?<![\p{L}\p{N}])(?:le|les|des|du|une|et|est|pour|dans|sur|avec|que|qui|ne|pas|vous|votre|nous|sont|fois|aux|cette|ces|très|mais|où|comme|tout|toute|tous|aussi|donc|sans|sous|entre|depuis|leur|leurs|elle|ils|elles|cela|ça|lorsque|selon|ainsi|encore|déjà|peu|beaucoup|jamais|toujours)(?![\p{L}\p{N}])/iu;

/** Letters English prose never carries outside a borrowed name. */
const FRENCH_LETTERS = /[àâçéèêëîïôûùüÿœ]/iu;

/**
 * The first French tell in an English string, or null. `properNames` are
 * removed before the scan: « Pointe des Almadies » is the place's name in
 * English too, and « des » must not condemn it.
 */
// @req REQ-145
export function frenchResidue(
  en: string,
  properNames: readonly string[] = []
): string | null {
  const scanned = properNames.reduce(
    (text, name) => text.split(name).join(" "),
    en
  );
  const word = FRENCH_FUNCTION_WORDS.exec(scanned);
  if (word) return word[0];
  const letter = FRENCH_LETTERS.exec(scanned);
  return letter ? letter[0] : null;
}

/**
 * The numbers a sentence states, normalised to plain decimal strings so a
 * French « 2 316 559 km² » and an English « 2,316,559 km² » compare equal.
 * French groups with U+202F (narrow no-break space) and decimates with a
 * comma; English groups with a comma and decimates with a point. Order is
 * kept: a fact that swaps two figures has changed its claim.
 */
// @req REQ-145
export function figuresIn(text: string, locale: "en" | "fr"): string[] {
  if (locale === "fr") {
    const matches = text.match(/\d+(?:[\u202f\u00a0]\d{3})*(?:,\d+)?/g) ?? [];
    return matches.map((figure) =>
      figure.replace(/[\u202f\u00a0]/g, "").replace(",", ".")
    );
  }
  const matches = text.match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
  return matches.map((figure) => figure.replace(/,/g, ""));
}

function escapeRegExp(phrase: string): string {
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wholeWord(phrase: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,
    "iu"
  );
}

/**
 * The glossary's rulings on one English string (REQ-144): a `forbiddenEn`
 * word standing for a term, or a term's French form left in place. Mirrors
 * the two rules of `scripts/ci/checkGlossary.ts`, which walks translated
 * records and dictionaries and cannot see a TypeScript bank; a test that
 * imported the script would drag its file-system walk and its exit path
 * into every suite.
 */
// @req REQ-144
export function glossaryBreaches(en: string): string[] {
  const breaches: string[] = [];
  for (const term of GLOSSARY_TERMS) {
    for (const word of term.forbiddenEn ?? []) {
      if (wholeWord(word).test(en)) breaches.push(`${term.key}: "${word}"`);
    }
    if (
      term.fr.toLowerCase() !== term.en.toLowerCase() &&
      wholeWord(term.fr).test(en)
    ) {
      breaches.push(`${term.key}: untranslated "${term.fr}"`);
    }
  }
  return breaches;
}
