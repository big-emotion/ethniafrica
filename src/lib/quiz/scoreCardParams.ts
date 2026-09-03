/**
 * Shared score-card URL param schema (Epic 10, Story 10.10, ETNI-499,
 * ETNI-1138). Single source of truth for validating
 * `/fr/quiz/score?pays=|famille=|mode=&correct=&total=`, reused by the score
 * page and the `/api/og/quiz-score` OG endpoint so forged params (e.g.
 * correct=47&total=8) 404 in both places rather than rendering an absurd card
 * (dignity rule — no leaderboard exists, honest-looking forged scores are a
 * harmless accepted residual).
 *
 * The track's *name* is deliberately not a parameter. It is resolved from the
 * corpus by the id, so a share URL cannot put arbitrary text on a card that
 * carries the site's own typography — which is what a free-text label would
 * have allowed. `rung` is gone with the audience ladder it belonged to.
 */

import { z } from "zod";
import { quizSessionQuerySchema } from "@/api/v2/schemas/quiz";
import { parseQuizScope, type QuizScope } from "@/lib/quiz/quizScope";

// @req REQ-103
export const MIN_SCORE_CARD_TOTAL = 5;
// @req REQ-103
export const MAX_SCORE_CARD_TOTAL = 10;

// @req REQ-103 FR70
export const scoreCardParamsSchema = z
  .object({
    pays: quizSessionQuerySchema.shape.pays,
    famille: quizSessionQuerySchema.shape.famille,
    mode: quizSessionQuerySchema.shape.mode,
    total: z.coerce
      .number()
      .int()
      .min(MIN_SCORE_CARD_TOTAL)
      .max(MAX_SCORE_CARD_TOTAL),
    correct: z.coerce.number().int().min(0),
  })
  .refine((value) => value.correct <= value.total, {
    message: "correct must not exceed total",
    path: ["correct"],
  });

export type ScoreCardParams = z.infer<typeof scoreCardParamsSchema>;

type ScoreCardRawParams =
  URLSearchParams | Record<string, string | string[] | undefined>;

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
// @req REQ-103 FR70
export function parseScoreCardParams(
  raw: ScoreCardRawParams
): ScoreCardParams | null {
  const result = scoreCardParamsSchema.safeParse(toPlainRecord(raw));
  return result.success ? result.data : null;
}

/** The track those params describe — the same reading the session endpoint does. */
// @req REQ-103 FR70
export function scoreCardScope(params: ScoreCardParams): QuizScope {
  return parseQuizScope(params);
}

/** The query string that reproduces a card, minus its label. */
// @req REQ-103 FR70
export function scoreCardSearchParams(
  scope: QuizScope,
  correct: number,
  total: number
): URLSearchParams {
  const search = new URLSearchParams();
  if (scope.kind === "country" && scope.entityId) {
    search.set("pays", scope.entityId);
  } else if (scope.kind === "family" && scope.entityId) {
    search.set("famille", scope.entityId);
  } else if (scope.kind === "random") {
    search.set("mode", "aleatoire");
  }
  search.set("correct", String(correct));
  search.set("total", String(total));
  return search;
}
