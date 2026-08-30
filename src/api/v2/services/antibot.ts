import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/api/logger";

/**
 * The one thing a proof of work cannot do on its own: refuse a replay.
 *
 * A signed challenge is verifiable without storage — that is its virtue — but
 * a solved one could be resubmitted until it expires. So the server keeps a
 * row per live challenge and deletes it the moment it is spent. A salt is
 * random and tied to no person, address or session, so this table holds no
 * personal data.
 *
 * It rests on Postgres rather than Upstash on purpose. `flagRateLimit` returns
 * `{ allowed: true }` when Upstash is unconfigured — a sensible failure mode
 * for a rate limit, and a disastrous one for a replay guard. Supabase is
 * required to run the application at all, so the hard floor rests on the thing
 * that is always there.
 */

/** Bounded so one request cannot pay for an unbounded backlog. */
const SWEEP_LIMIT = 500;

// @req REQ-012
export async function registerChallenge(
  salt: string,
  expiresAt: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("antibot_challenges").insert({
    salt,
    expires_at: new Date(expiresAt).toISOString(),
  });

  if (error) {
    logger.error("Failed to register an anti-bot challenge", error);
    throw error;
  }
}

/**
 * Spend a challenge, answering whether it was still unspent.
 *
 * The delete is the check: `DELETE … WHERE salt = $1 RETURNING salt` either
 * removes a row or removes nothing, and Postgres settles the race for us. A
 * read-then-delete would let two concurrent submissions both see the row and
 * both proceed.
 */
// @req REQ-012
export async function consumeChallenge(salt: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("antibot_challenges")
    .delete()
    .eq("salt", salt)
    .select("salt");

  if (error) {
    logger.error("Failed to consume an anti-bot challenge", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Drop expired challenges. Called when the next one is issued rather than on a
 * schedule: a cron nobody watches is a cron that has been failing for months,
 * and the table only ever holds live challenges anyway.
 */
// @req REQ-012
export async function sweepExpiredChallenges(): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("antibot_challenges")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .limit(SWEEP_LIMIT);

  // A failed sweep is not a failed request: the table grows a little and the
  // next issue tries again. Log it, do not raise it at the reader.
  if (error) {
    logger.warn("Failed to sweep expired anti-bot challenges", {
      message: error.message,
    });
  }
}
