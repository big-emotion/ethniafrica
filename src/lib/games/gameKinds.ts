import type { CountryId } from "@/types/afrik";
import type { AutonymExonymName, QuizOptionValue } from "@/types/quiz";
import type { Ring } from "@/lib/atlas/overlays";
import type { FicheSourceEntry } from "@/lib/afrik/ficheSourceLabel";

/**
 * The two gestures the Jouer hub's game is built on (REQ-120).
 *
 * A bespoke game would be an application of its own. These are interactions
 * applied to a corpus slice, so the engine knows only these shapes and each
 * round is a pure function producing one.
 *
 * `estimate` exists because `binary` cannot carry the lesson on its own. A
 * two-way choice can only ever record right or wrong; the misperception this
 * game is about is not a ranking error but a *magnitude* error — the reader
 * does not think Greenland outranks Africa, they think the gap is small. Only
 * a round that asks for a number can register how far off that is.
 *
 * `list` is the third, and it exists because `binary` teaches a shortcut. Over
 * a session of two-way choices the reader learns « pick the one that is not
 * northern » — a heuristic that answers every round without ever using the
 * rule the page is about. Four options, three of them drawn at least as large
 * as the answer, cannot be won that way: the reader has to rank the
 * exaggeration, which is the rule itself. It also drops the base rate from a
 * half to a quarter, so a guess stops being worth half a point.
 *
 * `quad` and `areaCompare` went with the eight games retired by the charter's
 * scope cut, and `globeTap` went with « Le pays d'avant » in the cut that
 * followed: a kind no game produces is a renderer shipping unexercised, which
 * `gameRegistry.test.ts` asserts against. All three are in git for whoever
 * rebuilds one of those games against the charter. `list` is not `quad`
 * restored — `quad` was four options drawn from a corpus slice with no
 * similarity rule, which is the padding §3 forbids.
 */
export type GameKind = "binary" | "estimate" | "list";

/**
 * Which question a round asks — not to be confused with `GameKind`, which is
 * the control it asks it with.
 *
 * The two came apart the day « lequel des deux Mercator agrandit-il le
 * plus ? » shipped: it is the same two buttons as « lequel des deux est le
 * plus grand ? » and a different lesson, so `kind` could no longer tell the
 * assembly which list a round belonged to, nor a test which contract to hold
 * it to. The reader sees the difference in the prompt; everything upstream of
 * the prompt reads it here.
 *
 * - `larger-area` — the ground really covered, where the flat map inverts it.
 * - `greater-inflation` — how much the projection enlarges each, from latitude.
 * - `fits-in-africa` — how many times a non-African shape fits in the continent.
 * - `largest-of-list` — the same question as `larger-area`, asked of four, so
 *   the answer cannot be reached by eliminating one northern country.
 */
export type RoundTemplate =
  "larger-area" | "greater-inflation" | "fits-in-africa" | "largest-of-list";

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
  textEn?: string;
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
  ficheHrefEn?: string;
}

/**
 * One answerable option. `name` carries the autonym/exonym pair whenever the
 * option is a people or a language, so a caller can render it through
 * AutonymExonymHeading instead of flattening it to a bare string.
 */
export interface GameOption {
  labelFr: string;
  labelEn?: string;
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
  /** Which of the game's questions this round asks. */
  template: RoundTemplate;
  /** The corpus entity the round is about — a people, a country, a family. */
  subjectId: string;
  /**
   * Every territory the round holds up against every other, in option order
   * (REQ-120).
   *
   * `subjectId` names one of them and a two-option round has two, so a caller
   * that wants to *show* what is being compared could not get there from the
   * fields above — and the Mercator page needs exactly that, to mark the
   * countries on the globe beside the question (atlas-charter §9.3: a map has
   * a referent).
   *
   * Ids, never names: an option's label is prose the reader reads, and looking
   * a country up by it would break the first time a name carried a qualifier —
   * which one already does, « France métropolitaine ».
   *
   * Absent on a round that compares nothing to a place, such as the estimate
   * of how many times a shape fits in the whole continent.
   */
  comparedIds?: string[];
  promptFr: string;
  promptEn?: string;
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

/**
 * A stacked list of options, one of them right.
 *
 * Same gesture as `binary` — one tap, no separate « valider » — and a
 * different layout, which is why it is a kind of its own rather than a
 * `BinaryRound` with a longer array. Two options sit side by side above
 * 720 px; four never can, at any width the site supports, without cramming
 * « République démocratique du Congo » into a quarter column.
 */
export interface ListRound extends GameRoundBase {
  kind: "list";
  options: GameOption[];
  correctIndex: number;
}

/**
 * One slider, and a number the reader commits to.
 *
 * Unlike `binary` this round has no options to place, so nothing here needs
 * `correctOptionIndex`: the answer is a measurement, and where it falls on
 * the track is the reader's problem rather than the generator's.
 */
export interface EstimateRound extends GameRoundBase {
  kind: "estimate";
  /** What the reader is estimating, named — the slider is meaningless without it. */
  subjectFr: string;
  subjectEn?: string;
  /** The unit the track is read in, e.g. « fois ». */
  unitFr: string;
  unitEn?: string;
  min: number;
  max: number;
  step: number;
  /** The measured answer, in `unitFr`. */
  correctValue: number;
  /**
   * How far off still counts, as a share of `correctValue`. Relative and not
   * absolute: being three out on a ratio of fourteen is a good estimate, and
   * being three out on a ratio of three is not the same answer at all.
   */
  toleranceRatio: number;
}

export type GameRound = BinaryRound | EstimateRound | ListRound;

/** Narrows a round to the options-bearing kinds without a cast. */
// @req REQ-120
export function isOptionRound(
  round: GameRound
): round is BinaryRound | ListRound {
  return round.kind === "binary" || round.kind === "list";
}

/** Narrows a round to the stacked-list kind without a cast. */
// @req REQ-120
export function isListRound(round: GameRound): round is ListRound {
  return round.kind === "list";
}

/** Narrows a round to the slider kind without a cast. */
// @req REQ-120
export function isEstimateRound(round: GameRound): round is EstimateRound {
  return round.kind === "estimate";
}

/**
 * Whether an answer is right, expressed once so no primitive re-derives it.
 *
 * `strictNullChecks` is off in this repo, so a `switch` that forgets a member
 * of `GameKind` returns `undefined` without the compiler saying a word — and
 * `undefined` is falsy, which would silently mark every round of the missing
 * kind wrong. The `if` chain below ends in an explicit `false` for exactly
 * that reason, and `gameKinds.test.ts` covers each kind by name.
 */
// @req REQ-120
export function isCorrectAnswer(
  round: GameRound,
  answer: number | CountryId
): boolean {
  if (round.kind === "binary") return answer === round.correctIndex;

  if (round.kind === "list") return answer === round.correctIndex;

  if (round.kind === "estimate") {
    if (typeof answer !== "number") return false;
    const margin = round.correctValue * round.toleranceRatio;
    return Math.abs(answer - round.correctValue) <= margin;
  }

  return false;
}

/** Re-exported so a round generator imports one module, not three. */
export type { AutonymExonymName, CountryId, QuizOptionValue, Ring };
