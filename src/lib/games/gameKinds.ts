import type { CountryId } from "@/types/afrik";
import type { AutonymExonymName, QuizOptionValue } from "@/types/quiz";
import type { Ring } from "@/lib/atlas/overlays";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";

/**
 * The one gesture the Jouer hub's game is built on (REQ-120).
 *
 * A bespoke game would be an application of its own. This one is an
 * interaction applied to a corpus slice, so the engine knows only this shape
 * and the game is a pure function producing it.
 *
 * `quad` and `areaCompare` went with the eight games retired by the charter's
 * scope cut, and `globeTap` went with « Le pays d'avant » in the cut that
 * followed: a kind no game produces is a renderer shipping unexercised, which
 * `gameRegistry.test.ts` asserts against. All three are in git for whoever
 * rebuilds one of those games against the charter.
 */
export type GameKind = "binary";

/**
 * What the reader is shown after answering. `textFr` is copied verbatim from
 * the corpus — FR65/FR66 forbid a paraphrase as much as they forbid an
 * invented option — and `fieldPath` records where it was read so the claim
 * stays auditable.
 */
/**
 * Confidence recorded for the round's subject, or absent when none is. Never
 * substituted with a default: a made-up percentage on a reveal would be a
 * claim about how well sourced a people is, made by nobody.
 */
export interface GameRevealConfidence {
  score: number;
  sourceCount: number;
  lastHumanAuditAt: string | null;
}

export interface GameReveal {
  textFr: string;
  fieldPath: string;
  /**
   * The standing of what the claim rests on, in fiche order. A round sourced
   * only at `unverified` is played *and* visibly marked, exactly as a fiche
   * is — the tier policy labels, it does not withhold.
   */
  sources: FicheSourceEntry[];
  confidence: GameRevealConfidence | null;
  /** The subject's fiche. A wrong answer is an opening, so it leads somewhere. */
  ficheHref: string;
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
 * How hard a round is expected to be, ascending. A session is served in this
 * order so the reader meets a subject they are likely to know before one they
 * are not, and 1 is the easiest.
 *
 * The band is derived from magnitude — a people's population, a country's
 * drawn area — and magnitude here is a **proxy for familiarity, nothing
 * else**. It is not an assertion that a populous people matters more than a
 * small one, and it must never be rendered as one. Replace it with an
 * empirical p-value, the share of readers who answered a round correctly, as
 * soon as the surface records one; the scale is a small closed set precisely
 * so that swap is a one-function change.
 */
export type DifficultyBand = 1 | 2 | 3;

interface GameRoundBase {
  gameId: string;
  /** The corpus entity the round is about — a people, a country, a family. */
  subjectId: string;
  promptFr: string;
  /**
   * Assigned by the handler, not by the generator: a band is a subject's rank
   * within the pool it was drawn from, and a generator sees one subject.
   */
  difficultyBand?: DifficultyBand;
  reveal: GameReveal;
}

/** Two large buttons. The whole round fits one thumb. */
export interface BinaryRound extends GameRoundBase {
  kind: "binary";
  options: [GameOption, GameOption];
  correctIndex: 0 | 1;
}

export type GameRound = BinaryRound;

/** Narrows a round to the options-bearing kinds without a cast. */
// @req REQ-120
export function isOptionRound(round: GameRound): round is BinaryRound {
  return round.kind === "binary";
}

/**
 * Whether an answer is right, expressed once so no primitive re-derives it.
 * The answer is the index of the option the reader pressed.
 */
// @req REQ-120
export function isCorrectAnswer(
  round: GameRound,
  answer: number | CountryId
): boolean {
  return answer === round.correctIndex;
}

/** Re-exported so a round generator imports one module, not three. */
export type { AutonymExonymName, CountryId, QuizOptionValue, Ring };
