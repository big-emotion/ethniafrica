/**
 * API v2 - Single Language Family endpoint
 * GET /api/v2/language-families/[id]
 *
 * @swagger
 * /api/v2/language-families/{id}:
 *   get:
 *     summary: Détails d'une famille linguistique
 *     description: Retourne les détails complets d'une famille linguistique par son identifiant FLG_*
 *     tags: [API v2 - Language Families]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^FLG_[A-Z_]+$'
 *         description: Identifiant de la famille linguistique (format FLG_*)
 *         example: "FLG_BANTU"
 *     responses:
 *       200:
 *         description: Détails de la famille linguistique
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageFamilyDetailEnvelope'
 *       400:
 *         description: Format d'identifiant invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Famille linguistique non trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { getLanguageFamilyHandler } from "@/api/v2/handlers/languageFamilies";
import { createApiError } from "@/api/v2/utils/response";
import { validateLanguageFamilyId } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

// @req REQ-084
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;

    logger.info("GET /api/v2/language-families/[id]", { id });

    // Validate FLG_ ID format
    if (!validateLanguageFamilyId(id)) {
      logger.warn("Invalid language family ID format", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid language family ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const envelope = await getLanguageFamilyHandler(id);

    if (!envelope) {
      logger.warn("Language family not found", { id });
      return jsonWithCors(
        createApiError({
          code: "NOT_FOUND",
          message: "Language family not found",
        }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(envelope);

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/language-families/[id] completed", {
      id,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const { id } = await params;
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/language-families/${id}`, error, {
      id,
      duration,
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

// @req REQ-084
export function OPTIONS() {
  return corsOptionsResponse();
}
