/**
 * API v2 - People fragmentation (Epic 13, FR85)
 * GET /api/v2/peoples/[id]/fragmentation
 *
 * @swagger
 * /api/v2/peoples/{id}/fragmentation:
 *   get:
 *     summary: Colonial-border fragmentation for a people
 *     description: >
 *       Derives, from data already in production (afrik_people_countries +
 *       content.demography.distributionByCountry), the countries a people
 *       spans with their demographic share and border pairs. `colonialOrigin`
 *       on a border pair is populated only once the colonial-borders dataset
 *       (Story 13.3) documents it (NFR31 — additive, optional from day one).
 *     tags: ["API v2 - Peoples"]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z0-9_]+$'
 *         description: Identifiant du peuple (format PPL_*)
 *         example: "PPL_EWE"
 *     responses:
 *       200:
 *         description: Fragmentation envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PeopleFragmentationResponse'
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=3600 (people-data class, AR18)"
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid people id format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: People not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       422:
 *         description: People spans fewer than 2 countries — fragmentation undefined
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
import { getPeopleFragmentationHandler } from "@/api/v2/handlers/peopleFragmentation";
import { peopleFragmentationParamSchema } from "@/api/v2/schemas/peopleFragmentation";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_CONTROL = "s-maxage=3600";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    logger.info("GET /api/v2/peoples/[id]/fragmentation", { id });

    if (!peopleFragmentationParamSchema.safeParse({ id }).success) {
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

    const result = await getPeopleFragmentationHandler(id);

    if (result.ok === false) {
      logger.warn("Fragmentation request rejected", {
        id,
        code: result.code,
      });
      return jsonWithCors(
        createApiError({ code: result.code, message: result.message }),
        { status: result.code === "NOT_FOUND" ? 404 : 422 }
      );
    }

    const response = jsonWithCors(result.envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });

    logger.info("GET /api/v2/peoples/[id]/fragmentation completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/peoples/${id}/fragmentation`, error, {
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
