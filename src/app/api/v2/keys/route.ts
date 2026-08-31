/**
 * @swagger
 * /api/v2/keys:
 *   get:
 *     summary: List the caller's own API keys
 *     description: >-
 *       Session-authenticated self-service listing (ETNI-81). Requires a
 *       Supabase session access token in the Authorization header — never an
 *       api_keys Bearer key — and returns only keys owned by that session's
 *       user. The raw key is never included; only key_prefix identifies a row.
 *     tags: [API v2 - Keys]
 *     security:
 *       - SupabaseJwtAuth: []
 *     responses:
 *       200:
 *         description: The caller's API keys.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKeySummary'
 *       401:
 *         description: Missing or invalid session token.
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
 *   post:
 *     summary: Create a new API key for the caller
 *     description: >-
 *       Issues a public-tier key owned by the caller's session user. The raw
 *       key is returned once in the response body and is never retrievable
 *       again — only its hash and key_prefix are persisted. Partner and admin
 *       tier keys are not self-service and remain admin-issued.
 *     tags: [API v2 - Keys]
 *     security:
 *       - SupabaseJwtAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label]
 *             properties:
 *               label:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 80
 *           example:
 *             label: Script CI local
 *     responses:
 *       201:
 *         description: The key was created; the raw key is shown only in this response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ApiKeyCreated'
 *       400:
 *         description: Invalid request body.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       401:
 *         description: Missing or invalid session token.
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
import {
  handleKeyCreate,
  handleKeyList,
  type KeyHandlerResult,
} from "@/api/v2/handlers/keys";
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

function internalErrorResponse() {
  return jsonWithCors(
    createApiError({
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    }),
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

// @req REQ-056
export async function GET(request: NextRequest) {
  try {
    const result = await handleKeyList({
      accessToken: getAccessToken(request),
    });
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/keys", error);
    return internalErrorResponse();
  }
}

// @req REQ-056
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors(
      createApiError({
        code: "VALIDATION_ERROR",
        message: "Request body must be valid JSON",
      }),
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const result = await handleKeyCreate(
      { accessToken: getAccessToken(request) },
      body
    );
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/keys", error);
    return internalErrorResponse();
  }
}

// @req REQ-056
export function OPTIONS() {
  return corsOptionsResponse();
}
