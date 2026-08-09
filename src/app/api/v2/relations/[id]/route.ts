/**
 * API v2 - Relation detail (Epic 11, Story 11.7, ETNI-508)
 * GET /api/v2/relations/[id]
 *
 * @swagger
 * /api/v2/relations/{id}:
 *   get:
 *     summary: Get a single sourced relation
 *     tags: ["API v2 - Relations"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^REL_[A-Z0-9_]+$'
 *         description: Identifiant de la relation (format REL_*)
 *         example: "REL_SONINKE_MANDE_TRADE"
 *     responses:
 *       200:
 *         description: Relation detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RelationDetailResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600 (people-data class, AR18)"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid relation id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Relation not found
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
import { getRelationDetailHandler } from "@/api/v2/handlers/relations";
import { relationDetailParamSchema } from "@/api/v2/schemas/relations";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/relations/[id]", { id });

    if (!relationDetailParamSchema.safeParse({ id }).success) {
      logger.warn("Invalid relation ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid relation ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const result = await getRelationDetailHandler(id);

    if (result.ok === false) {
      logger.warn("Relation detail request rejected", {
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

    logger.info("GET /api/v2/relations/[id] completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/relations/${id}`, error, {
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
