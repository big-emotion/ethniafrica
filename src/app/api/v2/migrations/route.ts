/**
 * API v2 - Migrations list (Epic 12, Story 12.5, ETNI-518)
 * GET /api/v2/migrations
 *
 * @swagger
 * /api/v2/migrations:
 *   get:
 *     summary: List migration event summaries
 *     description: >
 *       Paginated, filterable list of migration event summaries (no
 *       geometry — AR18 payload-size discipline). `from`/`to` bound a
 *       requested year window; an event is included when its own
 *       [startYear, endYear] intersects that window (interval
 *       intersection, not containment).
 *     tags: ["API v2 - Migrations"]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *         description: Start of the requested year window (negative = BCE)
 *       - in: query
 *         name: to
 *         schema:
 *           type: integer
 *         description: End of the requested year window (negative = BCE)
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [expansion, trade_route, forced_displacement, pastoral_movement]
 *       - in: query
 *         name: peopleId
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z0-9_]+$'
 *         description: Filter to migrations involving this people
 *       - in: query
 *         name: classificationStatus
 *         schema:
 *           type: string
 *           enum: [consensual, contested, colonial-legacy, reconstructive]
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *         description: Filter by migration_group (e.g. bantu-expansion)
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
 *         description: Paginated migration summary list envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MigrationListResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=86400, immutable"
 *             schema:
 *               type: string
 *       422:
 *         description: Invalid query params, or peopleId does not resolve to a known people
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
import { listMigrationsHandler } from "@/api/v2/handlers/migrations";
import { listMigrationsQuerySchema } from "@/api/v2/schemas/migrations";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=86400, immutable";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info("GET /api/v2/migrations");

    const { searchParams } = request.nextUrl;
    const queryResult = listMigrationsQuerySchema.safeParse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      eventType: searchParams.get("eventType") ?? undefined,
      peopleId: searchParams.get("peopleId") ?? undefined,
      classificationStatus:
        searchParams.get("classificationStatus") ?? undefined,
      group: searchParams.get("group") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });
    if (!queryResult.success) {
      logger.warn("Invalid migrations list query params");
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message:
            queryResult.error.issues[0]?.message ?? "Invalid query params",
        }),
        { status: 422 }
      );
    }

    const result = await listMigrationsHandler(queryResult.data);

    if (result.ok === false) {
      logger.warn("Migrations list request rejected", { code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 422 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/migrations completed", {
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/migrations", error, {
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
