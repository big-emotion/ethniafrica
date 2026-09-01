/**
 * @swagger
 * /api/v2/media:
 *   get:
 *     summary: List media entries attached to a fiche
 *     description: Returns image/video credits (author, licence URI, source page) attached to a language family, language, people or country. Never returns binary media content — this endpoint is metadata only.
 *     tags:
 *       - API v2 - Media
 *     parameters:
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [language_family, language, people, country]
 *         example: people
 *       - in: query
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         example: PPL_SHONA
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
 *         description: Paginated media entries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaListResponse'
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
import { listMediaHandler } from "@/api/v2/handlers/media";
import { listMediaQuerySchema } from "@/api/v2/schemas/media";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

// @req REQ-128
export const revalidate = 0;

const CACHE_CONTROL = "no-store";

// @req REQ-128
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const parsed = listMediaQuerySchema.safeParse({
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    perPage: searchParams.get("perPage") ?? undefined,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    logger.warn("Invalid query for GET /api/v2/media", {
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
    const envelope = await listMediaHandler(parsed.data);
    logger.info("GET /api/v2/media completed", {
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      duration: Date.now() - startTime,
      status: 200,
    });
    return jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    logger.error("Error in GET /api/v2/media", error, {
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

// @req REQ-128
export function OPTIONS() {
  return corsOptionsResponse();
}
