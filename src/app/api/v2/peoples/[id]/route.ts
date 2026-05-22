/**
 * API v2 - Single People endpoint
 * GET /api/v2/peoples/[id]
 *
 * @swagger
 * /api/v2/peoples/{id}:
 *   get:
 *     summary: Détails d'un peuple
 *     description: Retourne les détails complets d'un peuple par son identifiant PPL_*
 *     tags: [API v2 - Peoples]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z_]+$'
 *         description: Identifiant du peuple (format PPL_*)
 *         example: "PPL_SHONA"
 *     responses:
 *       200:
 *         description: Détails du peuple
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PeopleV2'
 *             example:
 *               data:
 *                 id: "PPL_SHONA"
 *                 nameMain: "Shona"
 *                 languageFamilyId: "FLG_BANTU"
 *                 currentCountries: ["ZWE", "MOZ"]
 *                 content: {}
 *       400:
 *         description: Format d'identifiant invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Invalid people ID format"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Peuple non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "People not found"
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */

import { NextRequest } from "next/server";
import { getPeopleHandler } from "@/api/v2/handlers/peoples";
import { validatePeopleId } from "@/api/v2/utils/validation";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;

    logger.info("GET /api/v2/peoples/[id]", { id });

    // Validate PPL_ ID format
    if (!validatePeopleId(id)) {
      logger.warn("Invalid people ID format", { id });
      return jsonWithCors(
        { error: "Invalid people ID format" },
        { status: 400 }
      );
    }

    const people = await getPeopleHandler(id);

    if (!people) {
      logger.warn("People not found", { id });
      return jsonWithCors({ error: "People not found" }, { status: 404 });
    }

    const response = jsonWithCors({ data: people });

    const duration = Date.now() - startTime;
    logger.info("GET /api/v2/peoples/[id] completed", {
      id,
      duration,
      status: 200,
    });

    return response;
  } catch (error) {
    const { id } = await params;
    const duration = Date.now() - startTime;
    logger.error(`Error in GET /api/v2/peoples/${id}`, error, { id, duration });
    return jsonWithCors({ error: "Internal server error" }, { status: 500 });
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
