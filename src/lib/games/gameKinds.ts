import type { CountryId } from "@/types/afrik";
import type { AutonymExonymName, QuizOptionValue } from "@/types/quiz";
import type { Ring } from "@/lib/atlas/overlays";

/**
 * The two gestures the three games of the Jouer hub share (REQ-120).
 *
 * Bespoke games would be one application each. They are in fact a couple of
 * interactions applied to several corpus sources, so the engine knows only
 * these shapes and every game is a pure function producing one of them.
 *
 * `quad` and `areaCompare` were removed with the eight retired games rather
 * than left declared: a kind no game produces is a renderer shipping
 * unexercised, which `gameRegistry.test.ts` asserts against. Both are in git
 * for whoever rebuilds a four-option game against the charter.
 */
export type GameKind = "binary" | "globeTap";

/**
 * What the reader is shown after answering. `textFr` is copied verbatim from
 * the corpus — FR65/FR66 forbid a paraphrase as much as they forbid an
 * invented option — and `fieldPath` records where it was read so the claim
 * stays auditable.
 */
export interface GameReveal {
  textFr: string;
  fieldPath: string;
}

/**
 * One answerable option. `name` carries the autonym/exonym pair whenever the
 * option is a people or a language, so a caller can render it through
 * AutonymExonymHeading instead of flattening it to a bare string.
 */
export interface GameOption {
  labelFr: string;
  name?: AutonymExonymName;
}

/**
 * Who the round is about, shown above the question (charter §2).
 *
 * Optional, and deliberately so: a round must name its subject *unless the
 * subject is what is being guessed*. « Le pays d'avant » asks which country
 * carries a former name, so naming it would be handing over the answer;
 * « La taille qu'on vous a cachée » names both countries in its own options.
 * Only « Eux, ou les autres ? » asks about an attribute of a subject the
 * reader would otherwise never be told.
 */
export interface GameStimulus {
  /** `languageFamilyNameFr` — null in the fiches that record no family. */
  familyFr: string | null;
  /** Resolved country names; an id the corpus cannot name is dropped, not shown as a code. */
  countriesFr: string[];
  subjectName: AutonymExonymName;
  /** Order of magnitude in words, omitted when the corpus carries no figure. */
  scaleFr?: string;
}

interface GameRoundBase {
  gameId: string;
  /** The corpus entity the round is about — a people, a country, a family. */
  subjectId: string;
  stimulus?: GameStimulus;
  promptFr: string;
  reveal: GameReveal;
}

/** Two large buttons. The whole round fits one thumb. */
export interface BinaryRound extends GameRoundBase {
  kind: "binary";
  options: [GameOption, GameOption];
  correctIndex: 0 | 1;
}

/**
 * Tap a country on the globe. `choices` are the countries made tappable;
 * they are always countries the committed admin-0 asset can draw, because a
 * target the reader cannot see is not a choice.
 */
export interface GlobeTapRound extends GameRoundBase {
  kind: "globeTap";
  choices: CountryId[];
  correctCountryId: CountryId;
}

export type GameRound = BinaryRound | GlobeTapRound;

/** Narrows a round to the options-bearing kinds without a cast. */
// @req REQ-120
export function isOptionRound(round: GameRound): round is BinaryRound {
  return round.kind === "binary";
}

/**
 * Whether an answer is right, expressed once so no primitive re-derives it.
 * For globeTap the answer is a country id; for the others, an option index.
 */
// @req REQ-120
export function isCorrectAnswer(
  round: GameRound,
  answer: number | CountryId
): boolean {
  if (round.kind === "globeTap") return answer === round.correctCountryId;
  return answer === round.correctIndex;
}

/** Re-exported so a round generator imports one module, not three. */
export type { AutonymExonymName, CountryId, QuizOptionValue, Ring };
