/**
 * API v2 — Peoples revision list
 * GET /api/v2/peoples/[id]/revisions
 *
 * @swagger
 * /api/v2/peoples/{id}/revisions:
 *   get:
 *     summary: Revision history for a people entity
 *     description: Cursor-paginated list of published revisions ordered by version DESC. Implements AR10, AR14.
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of revisions per page
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Version number of the last item from the previous page (exclusive upper bound)
 *     responses:
 *       200:
 *         description: Revision list envelope
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PeopleRevisionListResponse'
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
 *         description: People not found
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
import { listPeopleRevisionsHandler } from "@/api/v2/handlers/revisionsHandler";
import { validatePeopleId } from "@/api/v2/utils/validation";
import { createApiError } from "@/api/v2/utils/response";
import { jsonWithCors, corsOptionsResponse } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

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

    const searchParams = request.nextUrl.searchParams;

    const rawLimit = searchParams.get("limit");
    const limitNum = rawLimit ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > MAX_LIMIT) {
      return jsonWithCors(
        createApiError({
          code: "VALIDATION_ERROR",
          message: `limit must be between 1 and ${MAX_LIMIT}`,
          field: "limit",
        }),
        { status: 400 }
      );
    }

    const rawCursor = searchParams.get("cursor");
    let cursor: number | undefined;
    if (rawCursor !== null) {
      const cursorNum = parseInt(rawCursor, 10);
      if (isNaN(cursorNum) || cursorNum < 1) {
        return jsonWithCors(
          createApiError({
            code: "VALIDATION_ERROR",
            message: "cursor must be a positive integer",
            field: "cursor",
          }),
          { status: 400 }
        );
      }
      cursor = cursorNum;
    }

    logger.info("GET /api/v2/peoples/[id]/revisions", {
      id,
      limit: limitNum,
      cursor,
    });

    const envelope = await listPeopleRevisionsHandler(id, limitNum, cursor);

    const response = jsonWithCors(envelope);
    logger.info("GET /api/v2/peoples/[id]/revisions completed", {
      id,
      duration: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    logger.error(`Error in GET /api/v2/peoples/${id}/revisions`, error, {
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
