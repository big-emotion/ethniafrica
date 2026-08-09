/**
 * API v2 - Relations list (Epic 11, Story 11.7, ETNI-508)
 * GET /api/v2/relations
 *
 * @swagger
 * /api/v2/relations:
 *   get:
 *     summary: List sourced relations
 *     description: >
 *       Non-ego-centered, paginated list of sourced relations, filterable by
 *       relationType, peopleId (either side) and period window.
 *     tags: ["API v2 - Relations"]
 *     parameters:
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated relationType filter (migratory,commercial,religious)
 *       - in: query
 *         name: peopleId
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z0-9_]+$'
 *         description: Filter to relations involving this people (either side)
 *       - in: query
 *         name: periodFrom
 *         schema:
 *           type: integer
 *       - in: query
 *         name: periodTo
 *         schema:
 *           type: integer
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
 *         description: Paginated relation list envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RelationListResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600 (people-data class, AR18)"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid query params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { listRelationsHandler } from "@/api/v2/handlers/relations";
import { listRelationsQuerySchema } from "@/api/v2/schemas/relations";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info("GET /api/v2/relations");

    const { searchParams } = request.nextUrl;
    const queryResult = listRelationsQuerySchema.safeParse({
      types: searchParams.get("types") ?? undefined,
      peopleId: searchParams.get("peopleId") ?? undefined,
      periodFrom: searchParams.get("periodFrom") ?? undefined,
      periodTo: searchParams.get("periodTo") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!queryResult.success) {
      logger.warn("Invalid relations list query params");
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message:
            queryResult.error.issues[0]?.message ?? "Invalid query params",
        }),
        { status: 400 }
      );
    }

    const envelope = await listRelationsHandler(queryResult.data);

    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/relations completed", {
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/relations", error, {
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
