/**
 * API v2 - People ego-network relations (Epic 11, Story 11.7, ETNI-508)
 * GET /api/v2/peoples/[id]/relations
 *
 * @swagger
 * /api/v2/peoples/{id}/relations:
 *   get:
 *     summary: Ego-centered relation network for a people
 *     description: >
 *       Returns the sourced relations directly attributed to this people
 *       plus, when includeDerived=true, the read-time-computed derived
 *       linguistic links (FR73). The sourced/derived split is structural,
 *       never a flag on a shared item shape.
 *     tags: ["API v2 - Relations"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z0-9_]+$'
 *         description: Identifiant du peuple (format PPL_*)
 *         example: "PPL_EWE"
 *       - in: query
 *         name: types
 *         schema:
 *           type: string
 *         description: Comma-separated relationType filter (migratory,commercial,religious)
 *       - in: query
 *         name: includeDerived
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to populate the derived linguistic-link collection
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 24
 *     responses:
 *       200:
 *         description: Ego-network envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EgoNetworkResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600 (people-data class, AR18)"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid people id or query params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: People not found
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
import { getEgoNetworkHandler } from "@/api/v2/handlers/relations";
import {
  egoNetworkParamSchema,
  egoNetworkQuerySchema,
} from "@/api/v2/schemas/relations";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/peoples/[id]/relations", { id });

    const paramResult = egoNetworkParamSchema.safeParse({ id });
    if (!paramResult.success) {
      logger.warn("Invalid people ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid people ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const { searchParams } = request.nextUrl;
    const queryResult = egoNetworkQuerySchema.safeParse({
      types: searchParams.get("types") ?? undefined,
      includeDerived: searchParams.get("includeDerived") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!queryResult.success) {
      logger.warn("Invalid ego-network query params", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message:
            queryResult.error.issues[0]?.message ?? "Invalid query params",
        }),
        { status: 400 }
      );
    }

    const result = await getEgoNetworkHandler(id, queryResult.data);

    if (result.ok === false) {
      logger.warn("Ego-network request rejected", { id, code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/peoples/[id]/relations completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/peoples/${id}/relations`, error, {
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
