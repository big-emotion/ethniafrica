/**
 * @swagger
 * /api/v2/antibot/challenge:
 *   get:
 *     summary: Obtain an anti-bot challenge
 *     description: >-
 *       Issues a signed proof-of-work challenge for a report submission. The
 *       caller's browser searches for a nonce whose SHA-256 of `salt + nonce`
 *       begins with `difficultyBits` zero bits, and sends the result as
 *       `antibot` on POST /api/v2/flags. Open to anyone: issuing a challenge
 *       proves nothing, the cost lies in solving it. Each challenge is
 *       single-use and short-lived. Replaces the third-party check that stood
 *       here — no visitor data leaves the service. See
 *       docs/design/moderation-charter.md §2.
 *     tags: [API v2 - Flags]
 *     security: []
 *     responses:
 *       200:
 *         description: A challenge to solve.
 *         headers:
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: no-store
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   required: [salt, difficultyBits, expiresAt, signature]
 *                   properties:
 *                     salt:
 *                       type: string
 *                       description: Random per-challenge value. Carries no link to a person.
 *                     difficultyBits:
 *                       type: integer
 *                       description: Required leading zero bits. Signed, so it cannot be lowered in transit.
 *                     expiresAt:
 *                       type: integer
 *                       description: Epoch milliseconds after which the challenge is refused.
 *                     signature:
 *                       type: string
 *                       description: HMAC-SHA256 over salt, difficulty and expiry.
 *       503:
 *         description: The challenge store is unreachable.
 */

import {
  handleAntibotChallenge,
  type AntibotHandlerResult,
} from "@/api/v2/handlers/antibot";
import { createApiError } from "@/api/v2/utils/response";
import { corsOptionsResponse, jsonWithCors } from "@/lib/api/cors";
import { logger } from "@/lib/api/logger";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function respond(result: AntibotHandlerResult) {
  return jsonWithCors(result.body, {
    status: result.status,
    headers: NO_STORE_HEADERS,
  });
}

// A challenge is minted per request and must never be shared between readers:
// two people handed the same salt would race, and the second would be refused
// for a replay they did not commit.
// @req REQ-012
export const dynamic = "force-dynamic";

// @req REQ-012
export async function GET() {
  try {
    return respond(await handleAntibotChallenge());
  } catch (error) {
    logger.error("Error in GET /api/v2/antibot/challenge", error);
    return jsonWithCors(
      createApiError({
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// @req REQ-012
export function OPTIONS() {
  return corsOptionsResponse();
}
