/**
 * API v2 — single dossier
 * GET /api/v2/dossiers/[id]
 *
 * @swagger
 * /api/v2/dossiers/{id}:
 *   get:
 *     summary: Get one dossier by identifier
 *     description: >
 *       Returns the whole dossier — thesis, chapters, the two readings each
 *       chapter carries, its illustration credits, its sources and the gaps it
 *       declares. Every chapter published here holds both an authoritative and
 *       a counter reading; the schema refuses to serve one that does not.
 *     tags: [API v2 - Dossiers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^DOS_[A-Z0-9_]+$'
 *         description: Dossier identifier
 *         example: "DOS_PROPORTIONS"
 *     responses:
 *       200:
 *         description: Dossier detail envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DossierDetailEnvelope'
 *         headers:
 *           Cache-Control:
 *             description: Shared cache duration
 *             schema:
 *               type: string
 *               example: "s-maxage=3600"
 *       400:
 *         description: Invalid dossier identifier format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Dossier not found
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

import { getDossierHandler } from "@/api/v2/handlers/dossiers";
import { dossierIdParamSchema } from "@/api/v2/schemas/dossiers";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

// @req REQ-114
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/dossiers/[id]", { id });

    if (!dossierIdParamSchema.safeParse(id).success) {
      logger.warn("Invalid dossier ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid dossier ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const result = await getDossierHandler(id);

    if (result.ok === false) {
      logger.warn("Dossier request rejected", { id, code: result.code });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    logger.info("GET /api/v2/dossiers/[id] completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    logger.error(`Error in GET /api/v2/dossiers/${id}`, error, {
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

// @req REQ-114
export function OPTIONS() {
  return corsOptionsResponse();
}
