/**
 * @swagger
 * /api/v2/oral-narratives:
 *   get:
 *     summary: List public oral narratives for a fiche
 *     description: Returns only public narratives that have been approved and rights-cleared. Responses omit transcripts, media locators, collector details, and restricted identity metadata.
 *     tags:
 *       - API v2 - Oral Narratives
 *     parameters:
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [language_family, people, country]
 *       - in: query
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated public oral narratives
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OralNarrativeListResponse'
 *       400:
 *         description: Validation error
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
import { listOralNarrativesHandler } from "@/api/v2/handlers/oralNarratives";
import { listOralNarrativesQuerySchema } from "@/api/v2/schemas/oralNarratives";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export const revalidate = 0;

const CACHE_CONTROL = "no-store";

// @req REQ-095
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const parsed = listOralNarrativesQuerySchema.safeParse({
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    perPage: searchParams.get("perPage") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    logger.warn("Invalid query for GET /api/v2/oral-narratives", {
      issues: parsed.error.issues,
    });
    return jsonWithCors(
      createApiError({
        code: "VALIDATION_ERROR",
        message: issue?.message ?? "Invalid query parameters",
        field: issue?.path?.join(".") ?? undefined,
      }),
      { status: 400, headers: { "Cache-Control": CACHE_CONTROL } }
    );
  }

  try {
    const envelope = await listOralNarrativesHandler(parsed.data);
    logger.info("GET /api/v2/oral-narratives completed", {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      duration: Date.now() - startTime,
      status: 200,
    });
    return jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    logger.error("Error in GET /api/v2/oral-narratives", error, {
      duration: Date.now() - startTime,
    });
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500, headers: { "Cache-Control": CACHE_CONTROL } }
    );
  }
}

export function OPTIONS() {
  return corsOptionsResponse();
}
