/**
 * API v2 - Compare endpoint (Epic 9, FR64, AR8, AR9, NFR38)
 * GET /api/v2/compare
 *
 * @swagger
 * /api/v2/compare:
 *   get:
 *     summary: Compare 2–3 entities of the same type
 *     description: >
 *       Public comparison endpoint (Module #0 envelope) reusing the same
 *       assembly path as the SSR comparison page. Sections absent from a
 *       given entity are returned as explicit `null` (not omitted).
 *     tags: [API v2 - Compare]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [peoples, countries, language-families]
 *         description: Entity type being compared
 *         example: peoples
 *       - in: query
 *         name: ids
 *         required: true
 *         schema:
 *           type: string
 *         description: 2–3 comma-separated, distinct ids of the given type
 *         example: "PPL_SHONA,PPL_ZULU"
 *     responses:
 *       200:
 *         description: Comparison envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompareResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid type, id count, or duplicate ids
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: One of the ids does not exist
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       429:
 *         description: Rate limit exceeded (AR11)
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
import { assembleComparison } from "@/api/v2/handlers/compare";
import { compareQuerySchema } from "@/api/v2/schemas/compare";
import { createApiResponse, createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

// @req REQ-084
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = compareQuerySchema.safeParse({
      type: searchParams.get("type") ?? undefined,
      ids: searchParams.get("ids") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      logger.warn("Invalid query for GET /api/v2/compare", {
        issues: parsed.error.issues,
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: issue?.message ?? "Invalid query parameters",
          field: issue?.path?.join(".") ?? undefined,
        }),
        { status: 400 }
      );
    }

    logger.info("GET /api/v2/compare", parsed.data);

    const result = await assembleComparison({
      entityType: parsed.data.type,
      ids: parsed.data.ids,
    });

    if (result.ok === false) {
      logger.warn("Compare request rejected", { code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const envelope = createApiResponse({
      entityType: result.entityType,
      entities: result.entities,
    });
    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/compare completed", {
      ...parsed.data,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/compare", error, {
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

// @req REQ-084
export function OPTIONS() {
  return corsOptionsResponse();
}
