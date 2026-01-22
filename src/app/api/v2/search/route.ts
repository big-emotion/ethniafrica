/**
 * API v2 - Search endpoint
 * GET /api/v2/search?query=...&type=...&languageFamilyId=...&countryId=...
 *
 * @swagger
 * /api/v2/search:
 *   get:
 *     summary: Recherche multi-entités
 *     description: Recherche dans les pays, peuples, langues et familles linguistiques avec filtres optionnels
 *     tags: [API v2 - Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *         example: "Bantu"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [country, people, language, languageFamily]
 *         description: Filtrer par type d'entité
 *         example: "people"
 *       - in: query
 *         name: languageFamilyId
 *         schema:
 *           type: string
 *         description: Filtrer par famille linguistique (format FLG_*)
 *         example: "FLG_BANTU"
 *       - in: query
 *         name: countryId
 *         schema:
 *           type: string
 *         description: Filtrer par pays (code ISO 3166-1 alpha-3)
 *         example: "ZWE"
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SearchResult'
 *             example:
 *               data:
 *                 - type: "people"
 *                   id: "PPL_SHONA"
 *                   name: "Shona"
 *                   snippet: "Peuple bantou du Zimbabwe..."
 *                   relevance: 0.95
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest } from "next/server";
import { searchHandler } from "@/api/v2/handlers/search";
import type { SearchFilters } from "@/types/afrik";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: SearchFilters = {};

    const query = searchParams.get("query");
    if (query) filters.query = query;

    const type = searchParams.get("type");
    if (
      type &&
      ["country", "people", "language", "languageFamily"].includes(type)
    ) {
      filters.type = type as SearchFilters["type"];
    }

    const languageFamilyId = searchParams.get("languageFamilyId");
    if (languageFamilyId) filters.languageFamilyId = languageFamilyId;

    const countryId = searchParams.get("countryId");
    if (countryId) filters.countryId = countryId;

    logger.info("GET /api/v2/search", { filters });

    const results = await searchHandler(filters);
    const response = jsonWithCors({ data: results });
    if (response instanceof Response) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=86400, s-maxage=86400"
      );
    }

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/search completed", {
      filters,
      resultCount: results.length,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error("Error in GET /api/v2/search", error, { duration });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
