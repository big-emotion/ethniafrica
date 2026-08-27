/**
 * Turning an AFRIK language code into something `lang` may legally carry.
 *
 * The corpus records ISO 639-3 — 744 distinct codes across the peoples, every
 * one of them three letters. BCP 47 asks for the shortest code a language has,
 * so `yor` must reach the page as `yo`, `kon` as `kg`, `ful` as `ff`. A code
 * with no two-letter equivalent — `bfa`, `zgh`, `tmh`, most of the corpus —
 * stays exactly as the corpus wrote it.
 *
 * This is not cosmetic. `lang` is what tells a screen reader to switch voice
 * for an autonym, and a tag it cannot resolve leaves the name read in French.
 * axe-core enforces it as a serious `valid-lang` violation, and it enforces it
 * on precisely this rule: it rejects a three-letter code when a two-letter one
 * exists, and accepts it when none does.
 *
 * The canonicalisation is CLDR's, via `Intl` — the same table browsers and
 * screen readers resolve tags with. A hand-written map of the 184 codes that
 * have a 639-1 form would be one more thing to keep correct, and wrong in a
 * way nothing would catch until a reader met it.
 */

/**
 * The canonical BCP 47 tag for an AFRIK language code, or `undefined` when the
 * corpus has no code or the code is not a well-formed tag.
 *
 * Returning `undefined` rather than the raw value is deliberate: an absent
 * `lang` inherits the page's, which is merely imprecise, while an invalid one
 * is a violation and can leave assistive technology guessing.
 */
// @req REQ-115
export function bcp47LanguageTag(code?: string | null): string | undefined {
  const trimmed = code?.trim();
  if (!trimmed) return undefined;

  try {
    return Intl.getCanonicalLocales(trimmed)[0];
  } catch {
    return undefined;
  }
}
