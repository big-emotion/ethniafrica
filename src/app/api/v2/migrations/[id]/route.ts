/**
 * API v2 - Migration detail (Epic 12, Story 12.5, ETNI-518)
 * GET /api/v2/migrations/[id]
 *
 * @swagger
 * /api/v2/migrations/{id}:
 *   get:
 *     summary: Get a single migration event
 *     description: >
 *       Full migration event detail incl. GeoJSON geometry, time range,
 *       peoples involved (one batched join query, AR17), sources,
 *       narrative, debate, and meta.confidence.
 *     tags: ["API v2 - Migrations"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^MGR_[A-Z0-9_]+$'
 *         description: Identifiant de l'événement migratoire (format MGR_*)
 *         example: "MGR_BANTU_HOMELAND_DISPERSAL"
 *     responses:
 *       200:
 *         description: Migration detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MigrationDetailResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=86400, immutable"
 *             schema:
 *               type: string
 *       422:
 *         description: Invalid migration id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Migration not found
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
import { getMigrationDetailHandler } from "@/api/v2/handlers/migrations";
import { migrationDetailParamSchema } from "@/api/v2/schemas/migrations";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=86400, immutable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/migrations/[id]", { id });

    if (!migrationDetailParamSchema.safeParse({ id }).success) {
      logger.warn("Invalid migration ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid migration ID format",
          field: "id",
        }),
        { status: 422 }
      );
    }

    const result = await getMigrationDetailHandler(id);

    if (result.ok === false) {
      logger.warn("Migration detail request rejected", {
        id,
        code: result.code,
      });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/migrations/[id] completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/migrations/${id}`, error, {
      id,
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
