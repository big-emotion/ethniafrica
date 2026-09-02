/**
 * API v2 - Single People endpoint
 * GET /api/v2/peoples/[id]
 *
 * @swagger
 * /api/v2/peoples/{id}:
 *   get:
 *     summary: Détails d'un peuple
 *     description: >
 *       Retourne les détails complets d'un peuple par son identifiant PPL_*,
 *       et le bloc `patronymes` — les noms que porte ce peuple. À ne pas
 *       confondre avec `/peoples/{id}/names`, qui porte les ethnonymes : ce que
 *       le peuple est *appelé*, et non ce que ses membres *portent*.
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
 *               $ref: '#/components/schemas/PeopleDetailEnvelope'
 *       400:
 *         description: Format d'identifiant invalide
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Peuple non trouvé
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
import { getPeopleHandler } from "@/api/v2/handlers/peoples";
import { validatePeopleId } from "@/api/v2/utils/validation";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

// @req REQ-084
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
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid people ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const envelope = await getPeopleHandler(id);

    if (!envelope) {
      logger.warn("People not found", { id });
      return jsonWithCors(
        createApiError({ code: "NOT_FOUND", message: "People not found" }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(envelope);

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
