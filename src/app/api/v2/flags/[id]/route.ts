/**
 * @swagger
 * /api/v2/flags/{public_slug_or_id}:
 *   get:
 *     summary: Get a public editorial flag
 *     description: Returns a flag by UUID or public slug. Responses are mutable and use Cache-Control no-store.
 *     tags: [API v2 - Flags]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: public_slug_or_id
 *         required: true
 *         schema:
 *           type: string
 *         example: flag-7kq3m2
 *         description: Flag UUID or public slug.
 *     responses:
 *       200:
 *         description: Public flag detail.
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: no-store
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FlagDetailResponse'
 *             example:
 *               data:
 *                 id: 9c81ca0d-ae45-4f08-8f53-2ac0a9673abd
 *                 public_slug: flag-7kq3m2
 *                 target_type: people
 *                 target_id: PPL_YORUBA
 *                 target_field_path: demographics.population
 *                 assertion_id: null
 *                 flag_kind: inaccurate
 *                 reason_text: Population figure appears outdated compared with the latest census.
 *                 counter_source_url: https://example.org/census/2024
 *                 counter_source_citation: National Statistics Office, 2024 census, table 12.
 *                 proposed_rewrite: Update the population figure using the 2024 census.
 *                 contributor_id: bdbb6b42-3890-4c80-ac96-f732908d17c7
 *                 severity: null
 *                 auto_generated: false
 *                 status: open
 *                 created_at: "2026-07-24T10:15:30.000Z"
 *                 updated_at: "2026-07-24T11:00:00.000Z"
 *                 resolved_at: null
 *               meta:
 *                 license: CC-BY-SA-4.0
 *                 attribution: EthniAfrica — ethniafrica.com
 *               errors: []
 *       400:
 *         description: Invalid empty identifier.
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
 *                   message: String must contain at least 1 character(s)
 *                   field: identifier
 *       404:
 *         description: No flag matches the UUID or public slug.
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
 *                 - code: NOT_FOUND
 *                   message: Flag not found
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
  handleFlagDetail,
  handleFlagTransition,
  type FlagHandlerResult,
} from "@/api/v2/handlers/flags";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function getAccessToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined
  );
}

function responseFromHandler<T>(result: FlagHandlerResult<T>) {
  return jsonWithCors(result.body, {
    status: result.status,
    headers: {
      ...result.headers,
      ...NO_STORE_HEADERS,
    },
  });
}

// @req REQ-014
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await handleFlagDetail(id);
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in GET /api/v2/flags/[id]", error);
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

/**
 * @swagger
 * /api/v2/flags/{public_slug_or_id}:
 *   patch:
 *     summary: Move a report through the moderation state machine
 *     description: >-
 *       Drives one report through the transitions Postgres allows: open →
 *       under_review, and under_review → accepted | rejected | duplicate.
 *       Terminal states have no exit. Requires a bearer token whose account
 *       holds a moderator role; every applied transition writes an audit_log
 *       entry. See docs/design/moderation-charter.md §4.
 *     tags: [API v2 - Flags]
 *     security:
 *       - SupabaseJwtAuth: []
 *     parameters:
 *       - in: path
 *         name: public_slug_or_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Flag UUID or public slug.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, under_review, accepted, rejected, withdrawn, duplicate]
 *               moderator_notes:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: The updated report.
 *       400:
 *         description: The requested status is not part of the vocabulary.
 *       403:
 *         description: The caller holds no moderator role.
 *       404:
 *         description: No report carries this identifier.
 *       409:
 *         description: The state machine refuses this move from the current state.
 *       500:
 *         description: Internal error.
 */
// @req REQ-042
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await handleFlagTransition(id, body, {
      accessToken: getAccessToken(request),
      clientIp: getClientIp(request),
    });
    return responseFromHandler(result);
  } catch (error) {
    logger.error("Error in PATCH /api/v2/flags/[id]", error);
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// @req REQ-014
export function OPTIONS() {
  return corsOptionsResponse();
}
