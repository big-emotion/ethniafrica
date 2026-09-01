import { createHash, randomBytes } from "node:crypto";

import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * How long a verification link stays good.
 *
 * A day is long enough to survive an evening and a night, and short enough
 * that a link forwarded or left in a mailbox stops working before it is worth
 * finding. The report itself is already public either way — the link only ever
 * decides whether an address may be written to.
 */
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * What happened when a reader followed their verification link.
 *
 * `already-verified` is deliberately not an error: following the same link
 * twice is what happens when someone clicks it, closes the tab, and clicks it
 * again from the same e-mail. They should see their report, not a failure.
 */
// @req REQ-012
export type VerificationOutcome =
  | { status: "verified"; publicSlug: string }
  | { status: "already-verified"; publicSlug: string }
  | { status: "expired" }
  | { status: "unknown" };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function publicSlugOf(flagId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("flags")
    .select("public_slug")
    .eq("id", flagId)
    .maybeSingle();

  return data?.public_slug ?? null;
}

/**
 * Attach an optional reply address to a report that has already been created.
 *
 * Returns the raw token to put in the e-mail, or null when there is nothing to
 * send. Every failure is null rather than a throw: the report is committed by
 * the time this runs, and losing the address must never lose the report.
 */
// @req REQ-012
export async function createReporterContact(
  flagId: string,
  email: string | null | undefined
): Promise<string | null> {
  const address = email?.trim();
  if (!address) return null;

  const token = randomBytes(32).toString("base64url");
  const supabase = createAdminClient();

  const { error } = await supabase.from("flag_reporter_contacts").insert({
    flag_id: flagId,
    email: address,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
  });

  if (error) {
    logger.error("Failed to record a reporter contact", error, { flagId });
    return null;
  }

  return token;
}

/**
 * Spend a verification link.
 *
 * The stamp is the single-use marker, and the update carries
 * `verified_at IS NULL` so two simultaneous clicks cannot both count as the
 * first one.
 */
// @req REQ-012
export async function verifyReporterContact(
  token: string | null | undefined
): Promise<VerificationOutcome> {
  const raw = token?.trim();
  if (!raw) return { status: "unknown" };

  const supabase = createAdminClient();
  const { data: contact, error } = await supabase
    .from("flag_reporter_contacts")
    .select("flag_id, expires_at, verified_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();

  if (error) {
    logger.error("Failed to read a reporter contact", error);
    return { status: "unknown" };
  }

  // A token nobody issued and a token that no longer exists are the same
  // answer, so a probe learns nothing from the difference.
  if (!contact) return { status: "unknown" };

  if (contact.verified_at) {
    return {
      status: "already-verified",
      publicSlug: await publicSlugOf(contact.flag_id),
    };
  }

  if (new Date(contact.expires_at).getTime() < Date.now()) {
    return { status: "expired" };
  }

  const { error: stampError } = await supabase
    .from("flag_reporter_contacts")
    .update({ verified_at: new Date().toISOString() })
    .eq("flag_id", contact.flag_id)
    .is("verified_at", null);

  if (stampError) {
    logger.error("Failed to stamp a reporter contact", stampError, {
      flagId: contact.flag_id,
    });
    return { status: "unknown" };
  }

  return {
    status: "verified",
    publicSlug: await publicSlugOf(contact.flag_id),
  };
}

/**
 * The address a decision may be sent to, or null.
 *
 * An unverified address is withheld on purpose: anyone can type someone else's
 * address into the report form, and the atlas owes that person exactly one
 * message — the verification they can ignore — and nothing else.
 */
// @req REQ-042
export async function getVerifiedReporterEmail(
  flagId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("flag_reporter_contacts")
    .select("email, verified_at")
    .eq("flag_id", flagId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to resolve a reporter contact", error, { flagId });
    return null;
  }

  return data?.verified_at ? (data.email as string) : null;
}
