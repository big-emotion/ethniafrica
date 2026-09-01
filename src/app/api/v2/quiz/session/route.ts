/**
 * API v2 - Quiz session (Epic 10, Story 10.7, ETNI-496, FR66)
 * GET /api/v2/quiz/session
 *
 * @swagger
 * /api/v2/quiz/session:
 *   get:
 *     summary: Compose a quiz session for one entity scope
 *     description: >
 *       Draws `count` (5–10, default 8) active questions from the scope named
 *       by `pays`, `famille` or `mode`, ordered by the games charter's
 *       difficulty ladder — the subject's population decile inside that scope,
 *       two easy rounds, four middling, two hard. `mode=aleatoire` is the one
 *       track that skips the ladder. Every question is re-validated at serve
 *       time against current confidence, human-audit and source-tier state
 *       (FR65 gate), so a question that has decayed since the last generation
 *       sweep never reaches a player. The answer key ships in the payload
 *       (`correctOption`, `explanationFr`, `source`): reveal is client-side,
 *       there is nothing to cheat for (no leaderboard, no persistence, no
 *       stakes). A track whose pool cannot fill the session asked for answers
 *       422: a short session is a track with no top rung, which the ladder
 *       above is the whole point of. A pool that was big enough and was then
 *       thinned by the FR65 gate still answers 200, with however many questions
 *       survived — including none, the calm empty state.
 *     tags: ["API v2 - Quiz"]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: pays
 *         required: false
 *         schema:
 *           type: string
 *         description: ISO 3166-1 alpha-3 country code — the peoples of that country
 *         example: GHA
 *       - in: query
 *         name: famille
 *         required: false
 *         schema:
 *           type: string
 *         description: "`FLG_*` language family id — the peoples of that family"
 *         example: FLG_NIGERO_CONGOLAISE
 *       - in: query
 *         name: mode
 *         required: false
 *         schema:
 *           type: string
 *           enum: [mixte, aleatoire]
 *         description: >
 *           Whole-corpus track when no entity is named. `mixte` (the default)
 *           applies the difficulty ladder; `aleatoire` does not.
 *       - in: query
 *         name: theme
 *         required: false
 *         schema:
 *           type: string
 *           enum: [noms, langues, parente-linguistique, territoire, rites-et-culture, croyances, royaumes-et-histoire, organisation, migrations]
 *         description: >
 *           A domain of content. Composes with `pays` / `famille` rather than
 *           replacing them, so `?pays=ZAF&theme=croyances` is « les croyances
 *           des peuples d'Afrique du Sud ». Omitted, a session spreads over at
 *           most two rounds per theme.
 *       - in: query
 *         name: count
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 5
 *           maximum: 10
 *           default: 8
 *         description: Number of questions requested
 *     responses:
 *       200:
 *         description: Composed session envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizSessionResponse'
 *         headers:
 *           Cache-Control:
 *             description: "no-store"
 *             schema:
 *               type: string
 *       400:
 *         description: Malformed pays, famille, mode or count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       422:
 *         description: Well-formed scope naming a country or family that does not exist, or a track whose pool cannot fill the session requested
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       429:
 *         description: Rate limit exceeded (AR11, 60 req/min anonymous)
 *         headers:
 *           Retry-After:
 *             schema:
 *               type: integer
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *           X-RateLimit-Reset:
 *             schema:
 *               type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { composeQuizSessionHandler } from "@/api/v2/handlers/quiz";
import { quizSessionQuerySchema } from "@/api/v2/schemas/quiz";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/api/logger";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// @req REQ-103
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = quizSessionQuerySchema.safeParse({
      pays: searchParams.get("pays") ?? undefined,
      famille: searchParams.get("famille") ?? undefined,
      mode: searchParams.get("mode") ?? undefined,
      theme: searchParams.get("theme") ?? undefined,
      count: searchParams.get("count") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      logger.warn("Invalid query for GET /api/v2/quiz/session", {
        issues: parsed.error.issues,
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: issue?.message ?? "Invalid query parameters",
          field: issue?.path?.join(".") || undefined,
        }),
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    logger.info("GET /api/v2/quiz/session", parsed.data);

    const result = await composeQuizSessionHandler(parsed.data);

    if (result.ok === false) {
      logger.warn("Quiz session request rejected", { code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 422, headers: NO_STORE_HEADERS }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: NO_STORE_HEADERS,
    });

    logger.info("GET /api/v2/quiz/session completed", {
      ...parsed.data,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/quiz/session", error, {
      duration: Date.now() - startTime,
    });
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// @req REQ-103
export function OPTIONS() {
  return corsOptionsResponse();
}
