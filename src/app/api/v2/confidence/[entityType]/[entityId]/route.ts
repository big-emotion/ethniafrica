/**
 * API v2 - Confidence endpoint (Module #0)
 * GET /api/v2/confidence/[entityType]/[entityId]
 *
 * @swagger
 * /api/v2/confidence/{entityType}/{entityId}:
 *   get:
 *     summary: Get confidence metadata for a fiche
 *     description: Returns the pre-computed confidence record for a people or language-family fiche.
 *     tags:
 *       - "API v2 - Module #0"
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [people, language-family]
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^(PPL_[A-Z0-9_]+|FLG_[A-Z0-9_]+)$'
 *     responses:
 *       200:
 *         description: Confidence envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfidenceResponse'
 *       400:
 *         description: Invalid params
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       401:
 *         $ref: '#/components/responses/Module0Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Module0Forbidden'
 *       404:
 *         description: No confidence record found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
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

import { NextRequest } from "next/server";
import { getConfidenceHandler } from "@/api/v2/handlers/confidence";
import { confidenceParamsSchema } from "@/api/v2/schemas/confidence";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ entityType: string; entityId: string }>;
  }
) {
  const startTime = Date.now();
  const { entityType, entityId } = await params;

  try {
    const parsed = confidenceParamsSchema.safeParse({ entityType, entityId });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      logger.warn("Invalid params for GET /api/v2/confidence", {
        entityType,
        entityId,
        issues: parsed.error.issues,
      });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: issue?.message ?? "Invalid confidence params",
          field: issue?.path?.join(".") ?? undefined,
        }),
        { status: 400 }
      );
    }

    logger.info("GET /api/v2/confidence", parsed.data);

    const envelope = await getConfidenceHandler(
      parsed.data.entityType,
      parsed.data.entityId
    );
    if (!envelope) {
      logger.warn("Confidence not found", parsed.data);
      return jsonWithCors(
        createApiError({
          code: "NOT_FOUND",
          message: "Confidence record not found",
        }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(envelope);
    logger.info("GET /api/v2/confidence completed", {
      ...parsed.data,
      duration: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    logger.error(
      `Error in GET /api/v2/confidence/${entityType}/${entityId}`,
      error,
      { entityType, entityId, duration: Date.now() - startTime }
    );
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
