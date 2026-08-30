import { consumeChallenge } from "@/api/v2/services/antibot";
import {
  verifyProof,
  type Proof,
  type ProofVerdict,
} from "@/lib/antibot/proofOfWork";
import { logger } from "@/lib/api/logger";

/**
 * Server-side verification of a report's anti-bot proof.
 *
 * Replaces `src/lib/api/turnstile.ts`, which posted the reader's token and IP
 * to `challenges.cloudflare.com`. Nothing here leaves the service.
 *
 * It keeps that module's three-verdict shape on purpose — `verified` |
 * `rejected` | `unavailable` — so `handleFlagCreate` maps them to 201, 403 and
 * 503 exactly as before, and swapping the mechanism cost the flag handler one
 * import.
 *
 * Two things must both hold: the proof is cryptographically sound (pure, in
 * `proofOfWork.ts`), and the challenge has not already been spent (Postgres,
 * in `services/antibot.ts`). The second is checked last, because it has a side
 * effect: a challenge is burned only once the work behind it is proven, so a
 * bad nonce cannot be used to invalidate someone else's live challenge.
 */

// @req REQ-012
export async function verifyAntibotProof(
  proof: Proof | undefined
): Promise<ProofVerdict> {
  if (!proof) return "rejected";

  const verdict = await verifyProof(proof);
  if (verdict !== "verified") return verdict;

  const unspent = await consumeChallenge(proof.salt);
  if (!unspent) {
    logger.warn("Anti-bot challenge replayed or already spent", {
      tag: "antibot_replay",
    });
    return "rejected";
  }

  return "verified";
}
