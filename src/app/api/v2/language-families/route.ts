/**
 * API v2 - Language Families endpoint
 * GET /api/v2/language-families?page=1&perPage=20
 *
 * @swagger
 * /api/v2/language-families:
 *   get:
 *     summary: Liste des familles linguistiques (paginée)
 *     description: Retourne la liste paginée de toutes les familles linguistiques d'Afrique avec leurs données AFRIK
 *     tags: [API v2 - Language Families]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numéro de page
 *         example: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Nombre d'éléments par page (max 100)
 *         example: 20
 *     responses:
 *       200:
 *         description: Liste paginée des familles linguistiques
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageFamiliesListEnvelope'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { listLanguageFamiliesHandler } from "@/api/v2/handlers/languageFamilies";
import { createApiError } from "@/api/v2/utils/response";
import { validatePage, validatePerPage } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

// @req REQ-084
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = validatePage(searchParams.get("page"));
    const perPage = validatePerPage(searchParams.get("perPage"));

    logger.info("GET /api/v2/language-families", { page, perPage });

    const response = await listLanguageFamiliesHandler(page, perPage);
    const corsResponse = jsonWithCors(response);

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/language-families completed", {
      page,
      perPage,
      duration,
      status: 200,
    });

    return corsResponse;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/language-families", error, { duration });
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
