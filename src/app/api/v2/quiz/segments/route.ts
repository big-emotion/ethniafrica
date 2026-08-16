/**
 * API v2 - Quiz segments (Epic 10, Story 10.7, ETNI-496, FR66)
 * GET /api/v2/quiz/segments
 *
 * @swagger
 * /api/v2/quiz/segments:
 *   get:
 *     summary: List the five quiz audience segments with per-rung question counts
 *     description: >
 *       Five audience segments (children, teens, adults, university,
 *       professionals) with French labels and, per available difficulty
 *       rung, the count of currently active questions — so the UI can
 *       disable empty rungs honestly. Counts change only on generation
 *       sweeps (Story 10.5).
 *     tags: ["API v2 - Quiz"]
 *     security: []
 *     responses:
 *       200:
 *         description: Segments envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QuizSegmentsResponse'
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

import { getQuizSegmentsHandler } from "@/api/v2/handlers/quiz";
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
    logger.info("GET /api/v2/quiz/segments");

    const envelope = await getQuizSegmentsHandler();
    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/quiz/segments completed", {
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/quiz/segments", error, {
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
