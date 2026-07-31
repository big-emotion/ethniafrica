/**
 * API v2 — People names dossier (Epic 8 Names Atlas, FR53-FR58, Story 8.6)
 * GET /api/v2/peoples/[id]/names
 *
 * @swagger
 * /api/v2/peoples/{id}/names:
 *   get:
 *     summary: Names dossier for a people (endonyms, exonyms, historical spellings, surnames)
 *     description: >
 *       Returns every name record for a people, ordered endonyms-first
 *       (sort_rank), then name_type, then name_text. Each record carries its
 *       own per-field sources[] and the people's confidence score, batched
 *       via the AR17 map pattern (no per-record queries).
 *     tags: ["API v2 - Peoples"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z0-9_]+$'
 *         description: Identifiant du peuple (format PPL_*)
 *         example: "PPL_DINKA"
 *     responses:
 *       200:
 *         description: Names dossier envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PeopleNamesDossierResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid people id format
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
import { getPeopleNamesHandler } from "@/api/v2/handlers/peopleNames";
import { peopleNamesParamSchema } from "@/api/v2/schemas/names";
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
    logger.info("GET /api/v2/peoples/[id]/names", { id });

    if (!peopleNamesParamSchema.safeParse({ id }).success) {
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

    const result = await getPeopleNamesHandler(id);

    if (result.ok === false) {
      logger.warn("People names request rejected", { id, code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/peoples/[id]/names completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/peoples/${id}/names`, error, {
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
