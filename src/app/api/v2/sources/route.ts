/**
 * API v2 - Sources endpoint (Module #0)
 * GET /api/v2/sources
 *
 * Returns the paginated list of citation sources. Carries the AR18
 * Cache-Control header (`public, s-maxage=86400, stale-while-revalidate=86400`)
 * for edge caching with a graceful revalidation window.
 *
 * @swagger
 * /api/v2/sources:
 *   get:
 *     summary: List Module #0 citation sources
 *     description: Returns a paginated list of sources backing AFRIK assertions.
 *     tags: [API v2 - Module #0]
 *     parameters:
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
 *         description: Paginated list of sources
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: "public, s-maxage=86400, stale-while-revalidate=86400"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SourceListResponse'
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
import { listSourcesHandler } from "@/api/v2/handlers/sources";
import { listSourcesQuerySchema } from "@/api/v2/schemas/sources";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const SOURCES_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = listSourcesQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      perPage: searchParams.get("perPage") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      logger.warn("Invalid query for GET /api/v2/sources", {
        issues: parsed.error.issues,
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: issue?.message ?? "Invalid query parameters",
          field: issue?.path?.join(".") ?? undefined,
        }),
        { status: 400 }
      );
    }

    logger.info("GET /api/v2/sources", parsed.data);

    const envelope = await listSourcesHandler(parsed.data);
    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": SOURCES_CACHE_CONTROL },
    });

    logger.info("GET /api/v2/sources completed", {
      ...parsed.data,
      duration: Date.now() - startTime,
      status: 200,
    });

    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/sources", error, {
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
