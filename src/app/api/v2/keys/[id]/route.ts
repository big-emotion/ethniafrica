/**
 * @swagger
 * /api/v2/keys/{id}:
 *   delete:
 *     summary: Revoke one of the caller's own API keys
 *     description: >-
 *       Session-authenticated self-service revocation (ETNI-81). Sets
 *       active=false and revoked_at on a key owned by the caller's session
 *       user; already-revoked or foreign key ids both answer 404, so a probe
 *       cannot distinguish "not yours" from "does not exist".
 *     tags: [API v2 - Keys]
 *     security:
 *       - SupabaseJwtAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key UUID.
 *         example: 3fa85f64-5717-4562-b3fc-2c963f66afa6
 *     responses:
 *       200:
 *         description: The key was revoked.
 *       401:
 *         description: Missing or invalid session token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: No key with this id is owned by the caller.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */
import { NextRequest } from "next/server";
import { handleKeyRevoke, type KeyHandlerResult } from "@/api/v2/handlers/keys";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function getAccessToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

function responseFromHandler<T>(result: KeyHandlerResult<T>) {
  return jsonWithCors(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}

// @req REQ-056
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await handleKeyRevoke(
      { accessToken: getAccessToken(request) },
      id
    );
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in DELETE /api/v2/keys/[id]", error);
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// @req REQ-056
export function OPTIONS() {
  return corsOptionsResponse();
}
