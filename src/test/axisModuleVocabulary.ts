import { getNavModules, type AccessMode } from "@/lib/hubs/moduleRegistry";

/**
 * How a test recognises that a sentence names the modules sitting under an axis.
 *
 * The three axis descriptions are read by someone who has not chosen yet, and
 * the only thing they owe that reader is what is behind the entry. Pinning the
 * prose would freeze the wording; pinning nothing let « Quand on sait ce qu'on
 * cherche » stand for a year without naming a single module. So the contract is
 * derived from the registry instead: whatever modules an axis holds today, its
 * description has to name some of them, and adding a module cannot silently
 * make the sentence wrong.
 *
 * Words shorter than four letters carry no signal, and « Afrique » is in three
 * module names at once, so neither can stand as evidence that a module was
 * named. The rest are grammatical filler.
 */
const UNDISTINCTIVE = new Set([
  "afrique",
  "avec",
  "cette",
  "dans",
  "leur",
  "pour",
  "plus",
  "sont",
  "vous",
]);

/**
 * The words below four letters that do carry signal, admitted by name.
 *
 * The floor is a consequence of the lookup being a substring test, not a
 * judgement that short words say nothing \u2014 and DEC-038 named an axis \u00ab Nom \u00bb,
 * which the floor then dropped. The module stopped being recognised the moment
 * the registry was corrected, and both consuming suites stayed green because
 * they only ask for *two* modules to be named.
 *
 * A word admitted here is matched on a word boundary instead, which is what
 * the floor was standing in for: \u00ab nom \u00bb must not answer for \u00ab nommage \u00bb, the
 * very word this axis's own copy uses.
 */
const SHORT_BUT_DISTINCTIVE = new Set(["nom"]);

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const distinctiveWords = (moduleName: string) =>
  fold(moduleName)
    .split(/[^a-z]+/)
    .filter(
      (word) =>
        !UNDISTINCTIVE.has(word) &&
        (word.length >= 4 || SHORT_BUT_DISTINCTIVE.has(word))
    );

/** Long enough to stand on its own inside a word; short enough to need edges. */
const sentenceNames = (word: string, foldedSentence: string) =>
  SHORT_BUT_DISTINCTIVE.has(word)
    ? new RegExp(`\\b${word}s?\\b`).test(foldedSentence)
    : foldedSentence.includes(word);

/** The modules of `mode` whose name the sentence picks up. */
// @req REQ-113
// @req REQ-132
export const modulesNamedIn = (mode: AccessMode, sentence: string) => {
  const folded = fold(sentence);

  return getNavModules(mode)
    .filter((module) =>
      distinctiveWords(module.name).some((word) => sentenceNames(word, folded))
    )
    .map((module) => module.name);
};
