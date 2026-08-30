/**
 * @swagger
 * /api/v2/flags:
 *   get:
 *     summary: List public editorial flags
 *     description: Returns flags in reverse chronological order using an opaque cursor. Responses are mutable and use Cache-Control no-store.
 *     tags: [API v2 - Flags]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, under_review, accepted, rejected, withdrawn, duplicate]
 *         description: Filter by workflow status.
 *       - in: query
 *         name: kind
 *         schema:
 *           type: string
 *           enum: [inaccurate, missing-source, broken-url, offensive, correction-proposal, other]
 *         description: Filter by flag kind.
 *       - in: query
 *         name: target_type
 *         schema:
 *           type: string
 *         example: people
 *         description: Filter by AFRIK entity type.
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         example: MjAyNi0wNy0yNFQxMDoxNTozMC4wMDBafDljODFjYTBk
 *         description: Opaque cursor returned in meta.pagination.next_cursor.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Cursor-paginated public flags.
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: no-store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlagListResponse'
 *             example:
 *               data:
 *                 - id: 9c81ca0d-ae45-4f08-8f53-2ac0a9673abd
 *                   public_slug: flag-7kq3m2
 *                   target_type: people
 *                   target_id: PPL_YORUBA
 *                   target_field_path: demographics.population
 *                   assertion_id: null
 *                   flag_kind: inaccurate
 *                   reason_text: Population figure appears outdated compared with the latest census.
 *                   counter_source_url: https://example.org/census/2024
 *                   counter_source_citation: National Statistics Office, 2024 census, table 12.
 *                   proposed_rewrite: Update the population figure using the 2024 census.
 *                   contributor_id: bdbb6b42-3890-4c80-ac96-f732908d17c7
 *                   severity: null
 *                   auto_generated: false
 *                   status: open
 *                   created_at: "2026-07-24T10:15:30.000Z"
 *                   updated_at: "2026-07-24T11:00:00.000Z"
 *                   resolved_at: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *                 pagination:
 *                   limit: 20
 *                   next_cursor: MjAyNi0wNy0yNFQxMDoxNTozMC4wMDBafDljODFjYTBk
 *               errors: []
 *       400:
 *         description: Invalid filter or cursor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             example:
 *               data: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors:
 *                 - code: VALIDATION_ERROR
 *                   message: Invalid cursor
 *                   field: cursor
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             example:
 *               data: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors:
 *                 - code: INTERNAL_ERROR
 *                   message: Internal server error
 *   post:
 *     summary: Submit a report on an AFRIK entity
 *     description: >-
 *       Anyone may submit a report for editorial review, subject to anti-bot
 *       verification. A bearer token is optional and decides attribution only:
 *       a report from a session whose account has confirmed its age is credited
 *       to that contributor, and every other report is recorded anonymously
 *       rather than refused. Responses are mutable and use Cache-Control no-store.
 *     tags: [API v2 - Flags]
 *     security:
 *       - SupabaseJwtAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FlagCreateInput'
 *           example:
 *             target_type: people
 *             target_id: PPL_YORUBA
 *             target_field_path: demographics.population
 *             flag_kind: inaccurate
 *             reason_text: Population figure appears outdated compared with the latest census.
 *             counter_source_url: https://example.org/census/2024
 *             counter_source_citation: National Statistics Office, 2024 census, table 12.
 *             proposed_rewrite: Update the population figure using the 2024 census.
 *             antibot:
 *               salt: 9f2c1ab4d7e60358
 *               nonce: "418209"
 *               difficultyBits: 20
 *               expiresAt: 1788080000000
 *               signature: 3b1f…
 *             elapsedMs: 18400
 *     responses:
 *       201:
 *         description: Flag created successfully.
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: no-store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlagCreatedResponse'
 *             example:
 *               data:
 *                 id: 9c81ca0d-ae45-4f08-8f53-2ac0a9673abd
 *                 public_slug: flag-7kq3m2
 *                 status: open
 *                 created_at: "2026-07-24T10:15:30.000Z"
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors: []
 *       400:
 *         description: Invalid request body.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             example:
 *               data: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors:
 *                 - code: VALIDATION_ERROR
 *                   message: String must contain at least 10 character(s)
 *                   field: reason_text
 *       403:
 *         description: Anti-bot verification failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             examples:
 *               ageConfirmationRequired:
 *                 summary: Contributor has not confirmed the age requirement
 *                 value:
 *                   data: null
 *                   meta:
 *                     license: CC-BY-SA-4.0
 *                     attribution: EthniAfrica — ethniafrica.com
 *                   errors:
 *                     - code: AGE_CONFIRMATION_REQUIRED
 *                       message: Age confirmation required (FR45). Complete your profile at /fr/compte/profil.
 *               unauthorized:
 *                 summary: The anti-bot proof was missing, invalid or already spent
 *                 value:
 *                   data: null
 *                   meta:
 *                     license: CC-BY-SA-4.0
 *                     attribution: EthniAfrica — ethniafrica.com
 *                   errors:
 *                     - code: UNAUTHORIZED
 *                       message: vérification anti-bot échouée
 *       429:
 *         description: Contributor flag-submission rate limit exceeded.
 *         headers:
 *           Retry-After:
 *             schema:
 *               type: integer
 *               example: 3600
 *           X-RateLimit-Limit:
 *             schema:
 *               type: integer
 *               example: 5
 *           X-RateLimit-Remaining:
 *             schema:
 *               type: integer
 *               example: 0
 *           X-RateLimit-Reset:
 *             schema:
 *               type: integer
 *               example: 1784887200
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             example:
 *               data: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors:
 *                 - code: RATE_LIMITED
 *                   message: Flag submission rate limit exceeded. Retry after 3600 seconds.
 *       503:
 *         description: Anti-bot verification is temporarily unavailable.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             example:
 *               data: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors:
 *                 - code: UNAVAILABLE
 *                   message: vérification anti-bot temporairement indisponible, veuillez réessayer plus tard
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *             example:
 *               data: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors:
 *                 - code: INTERNAL_ERROR
 *                   message: Internal server error
 */

import { NextRequest } from "next/server";
import {
  handleFlagCreate,
  handleFlagList,
  type FlagHandlerResult,
} from "@/api/v2/handlers/flags";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function responseFromHandler<T>(result: FlagHandlerResult<T>) {
  return jsonWithCors(result.body, {
    status: result.status,
    headers: {
      ...result.headers,
      ...NO_STORE_HEADERS,
    },
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

function getAccessToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

function getClientIp(request: NextRequest): string | undefined {
  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);

  return forwardedIp || request.headers.get("x-real-ip")?.trim() || undefined;
}

// @req REQ-012
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
    const result = await handleFlagCreate(body, {
      accessToken: getAccessToken(request),
      clientIp: getClientIp(request),
    });
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in POST /api/v2/flags", error);
    return internalErrorResponse();
  }
}

// @req REQ-014
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await handleFlagList({
      status: searchParams.get("status") ?? undefined,
      kind: searchParams.get("kind") ?? undefined,
      target_type: searchParams.get("target_type") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/flags", error);
    return internalErrorResponse();
  }
}

// @req REQ-014
export function OPTIONS() {
  return corsOptionsResponse();
}
