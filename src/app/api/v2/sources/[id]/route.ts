/**
 * API v2 - Single source endpoint (Module #0)
 * GET /api/v2/sources/[id]
 *
 * @swagger
 * /api/v2/sources/{id}:
 *   get:
 *     summary: Get a single Module #0 source by id
 *     tags: [API v2 - Module #0]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Source envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SourceResponse'
 *       400:
 *         description: Invalid id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Source not found
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
import { getSourceHandler } from "@/api/v2/handlers/sources";
import { sourceIdParamSchema } from "@/api/v2/schemas/sources";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  try {
    const parsed = sourceIdParamSchema.safeParse({ id });
    if (!parsed.success) {
      logger.warn("Invalid id for GET /api/v2/sources/[id]", { id });
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid source id",
          field: "id",
        }),
        { status: 400 }
      );
    }

    logger.info("GET /api/v2/sources/[id]", { id });

    const envelope = await getSourceHandler(parsed.data.id);
    if (!envelope) {
      logger.warn("Source not found", { id });
      return jsonWithCors(
        createApiError({
          code: "NOT_FOUND",
          message: "Source not found",
        }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(envelope);
    logger.info("GET /api/v2/sources/[id] completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/sources/${id}`, error, {
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
