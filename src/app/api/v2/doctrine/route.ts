/**
 * API v2 - Doctrine endpoint (Module #0)
 * GET /api/v2/doctrine
 *
 * Returns the current version of every canonical editorial-doctrine slug.
 *
 * @swagger
 * /api/v2/doctrine:
 *   get:
 *     summary: List current editorial doctrine
 *     description: Returns the current version of every doctrine slug. Takes no query parameters.
 *     tags:
 *       - "API v2 - Module #0"
 *     responses:
 *       200:
 *         description: Doctrine envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DoctrineResponse'
 *       401:
 *         $ref: '#/components/responses/Module0Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Module0Forbidden'
 *       429:
 *         $ref: '#/components/responses/Module0RateLimited'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       503:
 *         $ref: '#/components/responses/Module0ServiceUnavailable'
 */

import { listDoctrineHandler } from "@/api/v2/handlers/doctrine";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET() {
  const startTime = Date.now();
  try {
    logger.info("GET /api/v2/doctrine");
    const envelope = await listDoctrineHandler();
    const response = jsonWithCors(envelope);
    logger.info("GET /api/v2/doctrine completed", {
      duration: Date.now() - startTime,
      status: 200,
      count: envelope.data.length,
    });
    return response;
  } catch (error) {
    logger.error("Error in GET /api/v2/doctrine", error, {
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
