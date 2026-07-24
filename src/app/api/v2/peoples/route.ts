/**
 * API v2 - Peoples endpoint
 * GET /api/v2/peoples?page=1&perPage=20
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
 *     responses:
 *       200:
 *         description: Liste paginée des peuples
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PeopleV2'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               data:
 *                 - id: "PPL_SHONA"
 *                   nameMain: "Shona"
 *                   languageFamilyId: "FLG_BANTU"
 *                   currentCountries: ["ZWE", "MOZ"]
 *               meta:
 *                 total: 592
 *                 page: 1
 *                 perPage: 20
 *                 totalPages: 30
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest } from "next/server";
import { listPeoplesHandler } from "@/api/v2/handlers/peoples";
import { validatePage, validatePerPage } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = validatePage(searchParams.get("page"));
    const perPage = validatePerPage(searchParams.get("perPage"));

    logger.info("GET /api/v2/peoples", { page, perPage });

    const response = await listPeoplesHandler(page, perPage);
    const corsResponse = jsonWithCors(response);

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/peoples completed", {
      page,
      perPage,
      duration,
      status: 200,
    });

    return corsResponse;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/peoples", error, { duration });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
