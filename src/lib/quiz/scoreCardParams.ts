/**
 * Shared score-card URL param schema (Epic 10, Story 10.10, ETNI-499,
 * ETNI-1138). Single source of truth for validating
 * `/fr/quiz/score?segment=&correct=&total=&rung=`, reused by the score page
 * and the `/api/og/quiz-score` OG endpoint so forged params (e.g.
 * correct=47&total=8) 404 in both places rather than rendering an absurd
 * card (dignity rule — no leaderboard exists, honest-looking forged scores
 * are a harmless accepted residual).
 */

import { z } from "zod";
import { quizAudienceSchema } from "@/api/v2/schemas/quiz";
import { DIFFICULTY_RUNGES } from "@/lib/quiz/segmentPolicy";

export const MIN_SCORE_CARD_TOTAL = 5;
export const MAX_SCORE_CARD_TOTAL = 10;

// @req REQ-103 FR70
export const scoreCardParamsSchema = z
  .object({
    segment: quizAudienceSchema,
    total: z.coerce
      .number()
      .int()
      .min(MIN_SCORE_CARD_TOTAL)
      .max(MAX_SCORE_CARD_TOTAL),
    correct: z.coerce.number().int().min(0),
    rung: z.coerce.number().int(),
  })
  .refine((value) => value.correct <= value.total, {
    message: "correct must not exceed total",
    path: ["correct"],
  })
  .refine(
    (value) => {
      const range = DIFFICULTY_RUNGES[value.segment];
      return value.rung >= range.min && value.rung <= range.max;
    },
    { message: "rung is out of range for this segment", path: ["rung"] }
  );

export type ScoreCardParams = z.infer<typeof scoreCardParamsSchema>;

type ScoreCardRawParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function toPlainRecord(raw: ScoreCardRawParams): Record<string, unknown> {
  if (raw instanceof URLSearchParams) {
    return Object.fromEntries(raw.entries());
  }
  return raw;
}

/**
 * Returns the validated, typed params, or `null` when any field is missing,
 * malformed, or out of range — absurd cards cannot render (FR70).
 */
export function parseScoreCardParams(
  raw: ScoreCardRawParams
): ScoreCardParams | null {
  const result = scoreCardParamsSchema.safeParse(toPlainRecord(raw));
  return result.success ? result.data : null;
}
