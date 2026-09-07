import {
  configuredDifficulty,
  issueChallenge,
  type Challenge,
} from "@/lib/antibot/proofOfWork";
import {
  registerChallenge,
  sweepExpiredChallenges,
} from "@/api/v2/services/antibot";
import {
  createApiError,
  createApiResponse,
  type ApiEnvelope,
} from "@/api/v2/utils/response";
import { serverCopy } from "@/lib/i18n/copy/server";
import type { Language } from "@/types/shared";

/**
 * Hand out one anti-bot challenge (moderation charter §2).
 *
 * Open to anyone, because the thing it guards is open to anyone: a reader
 * reports without an account. Issuing a challenge is cheap and proves nothing,
 * so there is nothing to protect here — the cost lands on solving it, which is
 * the point.
 */

export interface AntibotHandlerDependencies {
  issueChallenge: (options: { difficultyBits: number }) => Promise<Challenge>;
  registerChallenge: (salt: string, expiresAt: number) => Promise<void>;
  sweepExpiredChallenges: () => Promise<void>;
}

const defaultDependencies: AntibotHandlerDependencies = {
  issueChallenge,
  registerChallenge,
  sweepExpiredChallenges,
};

export interface AntibotHandlerResult {
  status: number;
  body: ApiEnvelope<Challenge> | ApiEnvelope<null>;
}

// @req REQ-012
export async function handleAntibotChallenge(
  injectedDependencies: Partial<AntibotHandlerDependencies> = {},
  language: Language = "fr"
): Promise<AntibotHandlerResult> {
  const dependencies = { ...defaultDependencies, ...injectedDependencies };
  const copy = serverCopy[language].flags;

  // Refuse early rather than at submission. Without the signing secret a
  // challenge can still be minted and solved — it is `verifyProof` that
  // answers `unavailable` — so the reader would pay a second of CPU, write
  // their report, and only then be told the service cannot accept it.
  if (!process.env.ANTIBOT_HMAC_SECRET) {
    return {
      status: 503,
      body: createApiError({
        code: "UNAVAILABLE",
        message: copy.antibotUnavailable,
      }),
    };
  }

  const challenge = await dependencies.issueChallenge({
    difficultyBits: configuredDifficulty(),
  });

  // Registered before it is handed out. The other order would let a reader
  // solve a challenge the database never heard of, and the submission would
  // then be refused for a replay that never happened.
  try {
    await dependencies.registerChallenge(challenge.salt, challenge.expiresAt);
  } catch {
    return {
      status: 503,
      body: createApiError({
        code: "UNAVAILABLE",
        message: copy.antibotUnavailable,
      }),
    };
  }

  // Housekeeping, and never the reader's problem: a failed sweep is logged in
  // the service and the response is unaffected.
  await dependencies.sweepExpiredChallenges();

  return { status: 200, body: createApiResponse(challenge) };
}
