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

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const distinctiveWords = (moduleName: string) =>
  fold(moduleName)
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4 && !UNDISTINCTIVE.has(word));

/** The modules of `mode` whose name the sentence picks up. */
// @req REQ-113
// @req REQ-132
export const modulesNamedIn = (mode: AccessMode, sentence: string) => {
  const folded = fold(sentence);

  return getNavModules(mode)
    .filter((module) =>
      distinctiveWords(module.name).some((word) => folded.includes(word))
    )
    .map((module) => module.name);
};
