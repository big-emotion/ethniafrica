/**
 * API v2 - Names endpoint (Epic 8)
 * GET /api/v2/names
 *
 * Browsable, filterable, searchable index of name-variant records
 * (endonyms, exonyms, historical spellings, surnames). Rate-limited per
 * AR11 (IP: 60 RPM, public key: 600 RPM, partner key: 6 000 RPM).
 *
 * @swagger
 * /api/v2/names:
 *   get:
 *     summary: List and search name-variant records
 *     description: >
 *       Browsable index of name_records with optional full-text search via
 *       `websearch_to_tsquery('french', q)` on `search_vector`, ranked by
 *       relevance × confidence boost. Any name variant leads to its people
 *       (FR53, FR55, FR58).
 *     tags: [API v2 - Names]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Full-text search query (websearch syntax, French stemming)
 *         example: "jieng"
 *       - in: query
 *         name: nameType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [endonym, exonym, historical_spelling, surname]
 *         description: Filter by name record type
 *       - in: query
 *         name: imposedOnly
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: When true, only records with imposed_by IS NOT NULL return
 *       - in: query
 *         name: peopleId
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z_]+$'
 *         description: Filter to name records belonging to one people
 *         example: PPL_JIENG
 *       - in: query
 *         name: letter
 *         required: false
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 1
 *         description: Case-insensitive initial letter filter on nameText
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Names index with Module #0 envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListNamesResponse'
 *       400:
 *         description: Invalid query parameter
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
import { listNamesHandler } from "@/api/v2/handlers/names";
import { listNamesQuerySchema } from "@/api/v2/schemas/names";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // ── rate limiting (AR11) ──────────────────────────────────────────────────
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = listNamesQuerySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      nameType: searchParams.get("nameType") ?? undefined,
      imposedOnly: searchParams.get("imposedOnly") ?? undefined,
      peopleId: searchParams.get("peopleId") ?? undefined,
      letter: searchParams.get("letter") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      logger.warn("Invalid query for GET /api/v2/names", {
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

    logger.info("GET /api/v2/names", parsed.data);

    const envelope = await listNamesHandler(parsed.data);
    const response = jsonWithCors(envelope);

    logger.info("GET /api/v2/names completed", {
      ...parsed.data,
      total: envelope.data.total,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/names", error, {
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

export function OPTIONS() {
  return corsOptionsResponse();
}
