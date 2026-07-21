/**
 * @swagger
 * /api/v2/search:
 *   get:
 *     summary: FTS search — peoples + countries ranked by relevance × confidence
 *     description: >
 *       Full-text search across AFRIK peoples and countries using
 *       `websearch_to_tsquery('french', q)` on the indexed `search_vector`
 *       columns. Results are ranked by ts_rank_cd multiplied by a confidence
 *       boost (confidence_scores.score). Rate-limited per AR11 (IP: 60 RPM,
 *       public key: 600 RPM, partner key: 6 000 RPM).
 *     tags: [API v2 - Search]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *         description: Full-text search query (websearch syntax)
 *         example: "Yoruba Nigeria"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Maximum results to return (capped at 50)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *       - in: query
 *         name: classificationStatus
 *         schema:
 *           type: string
 *           enum: [consensual, contested, colonial-legacy, reconstructive]
 *         description: Filter peoples by epistemic classification status
 *       - in: query
 *         name: minConfidence
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Filter by minimum confidence score (0–1)
 *       - in: query
 *         name: sinceVerifiedAfter
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to entities verified (human audit) after this ISO date
 *         example: "2026-01-01"
 *     responses:
 *       200:
 *         description: Search results with Module #0 envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *       400:
 *         description: Invalid query parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiEnvelope'
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
 *               $ref: '#/components/schemas/ApiEnvelope'
 */

import { NextRequest } from "next/server";
import { ftsSearchHandler } from "@/api/v2/handlers/search";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { applyRateLimit } from "@/lib/api/rate-limit";
import { createApiError } from "@/api/v2/utils/response";
import { logger } from "@/lib/api/logger";
import type { FtsSearchParams } from "@/types/afrik";

const VALID_CLASSIFICATION_STATUSES = new Set([
  "consensual",
  "contested",
  "colonial-legacy",
  "reconstructive",
]);

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

function parseParams(
  searchParams: URLSearchParams
): { params: FtsSearchParams } | { error: string; field: string } {
  // q — required, non-empty
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return { error: "q is required and must be non-empty", field: "q" };
  }

  // limit — optional integer, clamped to [1, MAX_LIMIT]
  const limitRaw = searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { error: "limit must be a positive integer", field: "limit" };
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  // offset — optional non-negative integer
  const offsetRaw = searchParams.get("offset");
  let offset = DEFAULT_OFFSET;
  if (offsetRaw !== null) {
    const parsed = parseInt(offsetRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return {
        error: "offset must be a non-negative integer",
        field: "offset",
      };
    }
    offset = parsed;
  }

  // classificationStatus — optional enum
  const classificationStatus = searchParams.get("classificationStatus");
  if (
    classificationStatus !== null &&
    !VALID_CLASSIFICATION_STATUSES.has(classificationStatus)
  ) {
    return {
      error: `classificationStatus must be one of: ${[...VALID_CLASSIFICATION_STATUSES].join(", ")}`,
      field: "classificationStatus",
    };
  }

  // minConfidence — optional float in [0, 1]
  const minConfidenceRaw = searchParams.get("minConfidence");
  let minConfidence: number | undefined;
  if (minConfidenceRaw !== null) {
    const parsed = parseFloat(minConfidenceRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
      return {
        error: "minConfidence must be a number between 0 and 1",
        field: "minConfidence",
      };
    }
    minConfidence = parsed;
  }

  // sinceVerifiedAfter — optional ISO date string
  const sinceVerifiedAfter =
    searchParams.get("sinceVerifiedAfter") ?? undefined;

  const params: FtsSearchParams = {
    q,
    limit,
    offset,
    ...(classificationStatus !== null && {
      classificationStatus:
        classificationStatus as FtsSearchParams["classificationStatus"],
    }),
    ...(minConfidence !== undefined && { minConfidence }),
    ...(sinceVerifiedAfter !== undefined && { sinceVerifiedAfter }),
  };

  return { params };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // ── rate limiting (AR11) ──────────────────────────────────────────────────
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // ── param validation ──────────────────────────────────────────────────────
  const parsed = parseParams(request.nextUrl.searchParams);
  if ("error" in parsed) {
    return jsonWithCors(
      createApiError({
        code: "INVALID_PARAM",
        message: parsed.error,
        field: parsed.field,
      }),
      { status: 400 }
    );
  }

  const { params } = parsed;

  try {
    logger.info("GET /api/v2/search", { params });

    const envelope = await ftsSearchHandler(params);

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/search completed", {
      params,
      total: envelope.data.total,
      duration,
      status: 200,
    });

    return jsonWithCors(envelope);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/search", error, { duration });
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
