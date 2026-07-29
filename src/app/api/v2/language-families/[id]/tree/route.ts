/**
 * API v2 - Language family classification tree (Epic 7, FR48, FR33)
 * GET /api/v2/language-families/[id]/tree
 *
 * @swagger
 * /api/v2/language-families/{id}/tree:
 *   get:
 *     summary: Classification tree skeleton for a linguistic family
 *     description: >
 *       Returns the family's languages (branches) with their linked people
 *       count, plus the count of peoples in the family not linked to any of
 *       its languages. Assembled from batched AFRIK queries (AR17, no N+1).
 *     tags: ["API v2 - Language Families"]
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
 *         description: Family tree skeleton envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LanguageFamilyTreeResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=86400"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid language family id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Language family not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */

import { NextRequest } from "next/server";
import { getLanguageFamilyTreeHandler } from "@/api/v2/handlers/languageFamilyTree";
import { languageFamilyTreeParamSchema } from "@/api/v2/schemas/languageFamilyTree";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=86400";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/language-families/[id]/tree", { id });

    if (!languageFamilyTreeParamSchema.safeParse({ id }).success) {
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

    const result = await getLanguageFamilyTreeHandler(id);

    if (result.ok === false) {
      logger.warn("Language family tree request rejected", {
        id,
        code: result.code,
      });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/language-families/[id]/tree completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/language-families/${id}/tree`, error, {
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

export function OPTIONS() {
  return corsOptionsResponse();
}
