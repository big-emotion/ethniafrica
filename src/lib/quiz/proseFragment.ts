/**
 * Reading a fiche's prose against the names of its subject.
 *
 * The five original templates ask about fields whose value is an atom — a
 * family, an autonym, a language, an ISO code, a country — because that atom
 * can be an option and its near pool can supply distractors. The rubrics that
 * carry what the atlas is actually about (rites, beliefs, kingdoms, migrations)
 * are paragraphs, and three other peoples' paragraphs are not distractors.
 *
 * The inversion templates get round that by **turning the question over**: the
 * paragraph becomes the stimulus and the people becomes the answer, so the
 * distractor pool is peoples again. The charter allows exactly this — a round
 * names its subject *unless the subject is what is being guessed* (§2).
 *
 * Which leaves one problem, and this module is it: a fragment that names its
 * own subject hands over the answer. Measured over the 789 people fiches,
 * rejecting a whole field the moment it names the subject yields 1 320 usable
 * fragments; cutting at the sentence instead yields 4 195. The corpus writes
 * one sentence that names the people and then several that do not, so the cut
 * has to be finer than the field.
 */

import type { AutonymExonymName } from "@/types/quiz";

/** Every name a fiche gives its subject — the shape `QuizPeopleFixture` satisfies. */
export interface SubjectNaming {
  subjectName: AutonymExonymName;
  selfAppellation: string;
  exonyms: string[];
}

/**
 * Below this a fragment is an aside, not a stimulus: it carries too little for
 * the reader to reason from and the round becomes a guess.
 */
const MIN_SENTENCE_LENGTH = 60;

/**
 * Charter §9.1 — stimulus, stem and four options share one 430px viewport, and
 * the options are never what gets pushed off. This budget is what makes them
 * fit.
 */
const MAX_FRAGMENT_LENGTH = 400;

/**
 * Shorter than this a word identifies nobody: dropping it costs one people
 * whose name is three letters, keeping it would make « Ewe » match « ewes »
 * and every French word starting the same way.
 */
const MIN_NAME_TOKEN_LENGTH = 4;

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

/** A list field's items are joined for display; the separator is punctuation, never a word. */
const LIST_ITEM_SEPARATOR = " · ";

function withoutAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalise(value: string): string {
  return withoutAccents(value).toLowerCase();
}

/**
 * The name itself, without the French gloss the corpus wraps it in — an exonym
 * is stored as « Venda (terme europeen standardise) », one string carrying two
 * different things.
 */
function beforeGloss(name: string): string {
  return name.replace(/\(.*?\)/g, " ");
}

/**
 * Every capitalised word of every name the fiche gives its subject, folded for
 * comparison.
 *
 * Capitalisation is the discriminator, and it is doing real work rather than
 * being a convenience. A name arrives glossed in French inside its own string
 * — « Southern Sotho (pour distinguer des Bapedi) », « egalement Vhangona (nom
 * des clans originels) ». Taking every word would make « pour », « terme » and
 * « egalement » forbidden and reject nearly every sentence in the corpus; a
 * hand-written stop list would work but would be a list of French words
 * nobody could justify one by one. A people's name is a proper noun and its
 * gloss is not, which is a rule that states itself.
 */
// @req REQ-121
export function subjectNameTokens(naming: SubjectNaming): Set<string> {
  const names = [
    naming.subjectName.autonym,
    naming.subjectName.exonym,
    naming.selfAppellation,
    ...naming.exonyms,
  ];

  const tokens = new Set<string>();
  for (const name of names) {
    if (!name) continue;
    for (const rawWord of beforeGloss(name).split(/[^\p{L}\p{N}]+/u)) {
      const word = rawWord.trim();
      if (word.length < MIN_NAME_TOKEN_LENGTH) continue;
      if (word[0] !== word[0].toUpperCase()) continue;
      tokens.add(normalise(word));
    }
  }
  return tokens;
}

/**
 * Matches a token as a prefix rather than a whole word, so « zoulou » also
 * catches « zoulous ». The leading boundary is what keeps « venda » from
 * matching inside « vhavenda », which would reject the very sentences the
 * autonym makes safe.
 */
function namesSubject(sentence: string, tokens: Set<string>): boolean {
  const haystack = normalise(sentence);
  for (const token of tokens) {
    if (new RegExp(`\\b${token}`).test(haystack)) return true;
  }
  return false;
}

function sentencesOf(field: string | string[]): string[] {
  const items = Array.isArray(field) ? field : [field];
  return items
    .flatMap((item) => String(item).trim().split(SENTENCE_BOUNDARY))
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/**
 * The longest run of this field's sentences that never names its subject, kept
 * verbatim and capped at what a phone screen can hold.
 *
 * Never redacted. Replacing the name with « ce peuple » would read better and
 * would be a paraphrase, and the reveal shows this text as the corpus wrote it
 * (charter §7). A sentence that names the subject is dropped whole; a field
 * where none survives yields no question, which is the same discipline
 * `selectDistractors` already applies to options (FR65/FR66).
 */
// @req REQ-121
export function selectVerbatimFragment(
  field: string | string[] | null | undefined,
  tokens: Set<string>
): string | null {
  if (field === null || field === undefined) return null;

  const kept: string[] = [];
  let length = 0;

  for (const sentence of sentencesOf(field)) {
    if (sentence.length < MIN_SENTENCE_LENGTH) continue;
    if (sentence.length > MAX_FRAGMENT_LENGTH) continue;
    if (namesSubject(sentence, tokens)) continue;

    const separator = kept.length === 0 ? 0 : LIST_ITEM_SEPARATOR.length;
    if (length + separator + sentence.length > MAX_FRAGMENT_LENGTH) break;

    kept.push(sentence);
    length += separator + sentence.length;
  }

  return kept.length === 0 ? null : kept.join(LIST_ITEM_SEPARATOR);
}

/**
 * Which of a people's own exonyms a passage puts on trial, or null when the
 * question would have no single answer.
 *
 * `content.appellations.whyProblematic` explains in prose why a name is
 * contested; the name itself is in there, but so is every other name the
 * paragraph compares it with. Of the 476 fiches that fill the field, 197 name
 * exactly one of their own exonyms and 197 make a playable round. The other
 * 279 name none or several — and a round with two right answers is worse than
 * no round, so the ambiguity is refused rather than settled by taking the
 * first match.
 */
// @req REQ-121
export function namedExonym(
  whyProblematic: string | null | undefined,
  exonyms: string[]
): string | null {
  if (!whyProblematic?.trim()) return null;

  const haystack = normalise(whyProblematic);
  const cited = exonyms.filter((exonym) => {
    const bare = normalise(beforeGloss(exonym)).trim();
    if (bare.length < MIN_NAME_TOKEN_LENGTH) return false;
    return new RegExp(`\\b${bare.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(
      haystack
    );
  });

  return cited.length === 1 ? cited[0] : null;
}
