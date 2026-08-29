/**
 * API v2 - Quiz scopes (Epic 10, Story 10.7, ETNI-496, FR66)
 * GET /api/v2/quiz/scopes
 *
 * Replaces `/api/v2/quiz/segments`, which listed audience segments. A path
 * that returned a different kind of thing under the same name would have been
 * the harder break to notice.
 *
 * @swagger
 * /api/v2/quiz/scopes:
 *   get:
 *     summary: List the entity tracks a quiz session can be drawn from
 *     description: >
 *       Every country and every language family, each with the number of
 *       currently active questions its peoples hold, plus the two
 *       whole-corpus tracks (`mixed`, ordered by the difficulty ladder, and
 *       `random`, which is not). `playable` is false when a track cannot fill
 *       a session of eight — it is still listed and still counted, so the UI
 *       can be honest about what the corpus holds rather than hiding it.
 *       Counts change only on generation sweeps (Story 10.5).
 *     tags: ["API v2 - Quiz"]
 *     security: []
 *     responses:
 *       200:
 *         description: Scopes envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizScopesResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600"
 *             schema:
 *               type: string
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

import { getQuizScopesHandler } from "@/api/v2/handlers/quiz";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/api/logger";
import type { NextRequest } from "next/server";

const CACHE_CONTROL = "s-maxage=3600";

// @req REQ-103
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    logger.info("GET /api/v2/quiz/scopes");

    const envelope = await getQuizScopesHandler();
    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/quiz/scopes completed", {
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/quiz/scopes", error, {
      duration: Date.now() - startTime,
    });
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500 }
    );
  }
}

// @req REQ-103
export function OPTIONS() {
  return corsOptionsResponse();
}
