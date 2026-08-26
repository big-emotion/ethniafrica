import type { CountryId } from "@/types/afrik";
import type { AutonymExonymName, QuizOptionValue } from "@/types/quiz";
import type { Ring } from "@/lib/atlas/overlays";

/**
 * The four gestures the eleven games of the Jouer hub share (REQ-120).
 *
 * Eleven bespoke games would be eleven applications. They are in fact four
 * interactions applied to eleven corpus sources, so the engine knows only
 * these four shapes and every game is a pure function producing one of them.
 */
export type GameKind = "binary" | "quad" | "globeTap" | "areaCompare";

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

/** An outline the reader compares by eye, with the area it truly covers. */
export interface GameAreaShape {
  labelFr: string;
  rings: Ring[];
  areaKm2: number;
  /** Verbatim corpus figure, when the shape stands for a share of a people. */
  captionFr?: string;
}

interface GameRoundBase {
  gameId: string;
  /** The corpus entity the round is about — a people, a country, a family. */
  subjectId: string;
  promptFr: string;
  reveal: GameReveal;
}

/** Two large buttons. The whole round fits one thumb. */
export interface BinaryRound extends GameRoundBase {
  kind: "binary";
  options: [GameOption, GameOption];
  correctIndex: 0 | 1;
}

/** Four options, every wrong one read verbatim from the corpus. */
export interface QuadRound extends GameRoundBase {
  kind: "quad";
  options: [GameOption, GameOption, GameOption, GameOption];
  correctIndex: number;
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

/**
 * Two outlines laid over one another. The reader answers by eye, then the
 * true areas are shown — which is the only honest way to make the point,
 * since the reader's error is the lesson.
 */
export interface AreaCompareRound extends GameRoundBase {
  kind: "areaCompare";
  shapes: [GameAreaShape, GameAreaShape];
  correctIndex: 0 | 1;
  /** What "correct" means here, e.g. « laquelle est la plus grande ? ». */
  questionFr: string;
}

export type GameRound =
  | BinaryRound
  | QuadRound
  | GlobeTapRound
  | AreaCompareRound;

/** Narrows a round to the options-bearing kinds without a cast. */
// @req REQ-120
export function isOptionRound(
  round: GameRound
): round is BinaryRound | QuadRound {
  return round.kind === "binary" || round.kind === "quad";
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
