/**
 * API v2 — dossier index
 * GET /api/v2/dossiers
 *
 * @swagger
 * /api/v2/dossiers:
 *   get:
 *     summary: List the published dossiers
 *     description: >
 *       Returns one summary per dossier, newest first. A dossier is the long-form
 *       editorial entity of the corpus: each of its chapters carries an
 *       authoritative reading of a fact and a counter-reading of the same fact,
 *       both cited. Fetch a single dossier for the chapters themselves.
 *     tags: [API v2 - Dossiers]
 *     parameters:
 *       - in: query
 *         name: vertical
 *         required: false
 *         schema:
 *           type: string
 *           enum: [realites, nommer]
 *         description: Restrict the listing to one editorial vertical
 *     responses:
 *       200:
 *         description: Dossier index envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DossierIndexEnvelope'
 *         headers:
 *           Cache-Control:
 *             description: Shared cache duration
 *             schema:
 *               type: string
 *               example: "s-maxage=3600"
 *       400:
 *         description: Unknown vertical
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

import { listDossiersHandler } from "@/api/v2/handlers/dossiers";
import { listDossiersQuerySchema } from "@/api/v2/schemas/dossiers";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

// @req REQ-114
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const vertical = request.nextUrl.searchParams.get("vertical") ?? undefined;

  try {
    logger.info("GET /api/v2/dossiers", { vertical });

    const query = listDossiersQuerySchema.safeParse(
      vertical ? { vertical } : {}
    );

    if (!query.success) {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Unknown dossier vertical",
          field: "vertical",
        }),
        { status: 400 }
      );
    }

    const envelope = await listDossiersHandler(query.data.vertical);

    logger.info("GET /api/v2/dossiers completed", {
      count: envelope.data.length,
      duration: Date.now() - startTime,
      status: 200,
    });

    return jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    logger.error("Error in GET /api/v2/dossiers", error, {
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
