/**
 * API v2 - Single Patronyme endpoint
 * GET /api/v2/patronymes/[id]
 *
 * @swagger
 * /api/v2/patronymes/{id}:
 *   get:
 *     summary: Get a name (patronyme) by identifier
 *     description: >
 *       Returns the public details for one name (patronyme) — DEC-038's fifth
 *       corpus dimension: its naming system, its associated peoples and
 *       countries, and its bearers. Distinct from `/api/v2/names`, which
 *       serves the ethnonym dossier (name_records).
 *     tags: [API v2 - Patronymes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PAT_[A-Z0-9_]+$'
 *         description: Patronyme identifier
 *         example: "PAT_KEITA"
 *     responses:
 *       200:
 *         description: Patronyme detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PatronymeDetailEnvelope'
 *         headers:
 *           Cache-Control:
 *             description: Shared cache duration
 *             schema:
 *               type: string
 *               example: "s-maxage=3600"
 *       400:
 *         description: Invalid patronyme identifier format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Patronyme not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { getPatronymeHandler } from "@/api/v2/handlers/patronymes";
import { patronymeIdParamSchema } from "@/api/v2/schemas/patronymes";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

// @req REQ-133
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/patronymes/[id]", { id });

    if (!patronymeIdParamSchema.safeParse({ id }).success) {
      logger.warn("Invalid patronyme ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid patronyme ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const result = await getPatronymeHandler(id);

    if (result.ok === false) {
      logger.warn("Patronyme request rejected", { id, code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/patronymes/[id] completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/patronymes/${id}`, error, {
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

// @req REQ-133
export function OPTIONS() {
  return corsOptionsResponse();
}
