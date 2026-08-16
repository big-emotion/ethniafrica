/**
 * API v2 - Quiz session (Epic 10, Story 10.7, ETNI-496, FR66)
 * GET /api/v2/quiz/session
 *
 * @swagger
 * /api/v2/quiz/session:
 *   get:
 *     summary: Compose a random quiz session for a segment and difficulty rung
 *     description: >
 *       Draws `count` (5–10, default 8) active questions for
 *       `(segment, difficulty)`, re-validated at serve time against current
 *       confidence, human-audit and source-tier state (FR65 gate) — a
 *       question that has decayed since the last generation sweep never
 *       reaches a player. The answer key ships in the payload
 *       (`correctOption`, `explanationFr`, `source`): reveal is
 *       client-side, there is nothing to cheat for (no leaderboard, no
 *       persistence, no stakes). Fewer eligible questions than requested
 *       returns 200 with the shorter array; zero returns 200 with an empty
 *       array (calm empty state).
 *     tags: ["API v2 - Quiz"]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: segment
 *         required: true
 *         schema:
 *           type: string
 *           enum: [children, teens, adults, university, professionals]
 *         description: Audience segment
 *         example: adults
 *       - in: query
 *         name: difficulty
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Difficulty rung requested within the segment
 *         example: 3
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
 *         description: Malformed segment, difficulty or count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       422:
 *         description: Difficulty is a valid 1-5 rung but not offered by this segment
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
      segment: searchParams.get("segment") ?? undefined,
      difficulty: searchParams.get("difficulty") ?? undefined,
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
