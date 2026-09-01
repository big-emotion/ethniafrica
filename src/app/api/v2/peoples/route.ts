/**
 * API v2 - Peoples endpoint
 * GET /api/v2/peoples?page=1&perPage=20&search=shona&letter=S&languageFamilyId=FLG_BANTU
 *
 * @swagger
 * /api/v2/peoples:
 *   get:
 *     summary: Liste des peuples (paginée)
 *     description: Retourne la liste paginée de tous les peuples d'Afrique avec leurs données AFRIK
 *     tags: [API v2 - Peoples]
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
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Full-text search applied to people records
 *         example: shona
 *       - in: query
 *         name: letter
 *         required: false
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 1
 *         description: Case-insensitive initial letter filter
 *         example: S
 *       - in: query
 *         name: languageFamilyId
 *         required: false
 *         schema:
 *           type: string
 *           pattern: '^FLG_[A-Z_]+$'
 *         description: Language family identifier filter
 *         example: FLG_BANTU
 *     responses:
 *       200:
 *         description: Liste paginée des peuples
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PeoplesListEnvelope'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { listPeoplesHandler } from "@/api/v2/handlers/peoples";
import {
  validateLanguageFamilyId,
  validatePage,
  validatePerPage,
} from "@/api/v2/utils/validation";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

// @req REQ-084
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = validatePage(searchParams.get("page"));
    const perPage = validatePerPage(searchParams.get("perPage"));
    const search = searchParams.get("search")?.trim() || undefined;
    const initialLetter =
      searchParams.get("letter")?.trim().toUpperCase() || undefined;
    const rawLanguageFamilyId =
      searchParams.get("languageFamilyId")?.trim() || undefined;

    if (rawLanguageFamilyId && !validateLanguageFamilyId(rawLanguageFamilyId)) {
      logger.warn("Invalid language family ID format", {
        languageFamilyId: rawLanguageFamilyId,
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid language family ID format",
          field: "languageFamilyId",
        }),
        { status: 400 }
      );
    }

    const languageFamilyId = rawLanguageFamilyId;
    const filters = {
      ...(search ? { search } : {}),
      ...(initialLetter ? { initialLetter } : {}),
      ...(languageFamilyId ? { languageFamilyId } : {}),
    };

    logger.info("GET /api/v2/peoples", { page, perPage, ...filters });

    const response = await listPeoplesHandler(page, perPage, filters);
    const corsResponse = jsonWithCors(response);

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/peoples completed", {
      page,
      perPage,
      ...filters,
      duration,
      status: 200,
    });

    return corsResponse;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/peoples", error, { duration });
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
