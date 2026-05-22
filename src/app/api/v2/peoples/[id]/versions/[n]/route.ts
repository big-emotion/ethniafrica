/**
 * API v2 — Peoples pinned-version snapshot
 * GET /api/v2/peoples/[id]/versions/[n]
 *
 * Equivalent of the conceptual @v{n} syntax — Next.js App Router does not
 * support "@" in path segments so /versions/{n} is the canonical routing.
 *
 * @swagger
 * /api/v2/peoples/{id}/versions/{n}:
 *   get:
 *     summary: Pinned-version snapshot for a people entity
 *     description: >
 *       Returns the full published snapshot at version n. Data is read exclusively
 *       from the immutable revision record — never from the live entity (AR14).
 *       The response carries Cache-Control: s-maxage=31536000, immutable because
 *       pinned data never changes (AR18).
 *     tags: [API v2 - Peoples]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^PPL_[A-Z_]+$'
 *         description: People identifier (PPL_*)
 *         example: PPL_YORUBA
 *       - in: path
 *         name: n
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Version number
 *         example: 3
 *     responses:
 *       200:
 *         description: Pinned-version snapshot envelope
 *         headers:
 *           Cache-Control:
 *             description: "s-maxage=31536000, immutable — pinned data never changes"
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PeopleVersionSnapshotResponse'
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       401:
 *         $ref: '#/components/responses/Module0Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Module0Forbidden'
 *       404:
 *         description: Version not found
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
import { getPeopleRevisionSnapshotHandler } from "@/api/v2/handlers/revisionsHandler";
import { validatePeopleId } from "@/api/v2/utils/validation";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const CACHE_IMMUTABLE = "s-maxage=31536000, immutable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; n: string }> }
) {
  const startTime = Date.now();
  const { id, n } = await params;

  try {
    if (!validatePeopleId(id)) {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Invalid people ID format",
          field: "id",
        }),
        { status: 400 }
      );
    }

    const version = parseInt(n, 10);
    if (isNaN(version) || version < 1) {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: "Version must be a positive integer",
          field: "n",
        }),
        { status: 400 }
      );
    }

    logger.info("GET /api/v2/peoples/[id]/versions/[n]", { id, version });

    const envelope = await getPeopleRevisionSnapshotHandler(id, version);

    if (!envelope) {
      return jsonWithCors(
        createApiError({
          code: "NOT_FOUND",
          message: `People ${id} version ${version} not found`,
        }),
        { status: 404 }
      );
    }

    const response = jsonWithCors(envelope, {
      headers: { "Cache-Control": CACHE_IMMUTABLE },
    });
    logger.info("GET /api/v2/peoples/[id]/versions/[n] completed", {
      id,
      version,
      duration: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/peoples/${id}/versions/${n}`, error, {
      id,
      n,
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
