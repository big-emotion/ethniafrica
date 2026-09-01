import { logger } from "@/lib/api/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether an address may open the moderation console.
 *
 * This is the whole authorization model for the admin. There is no role column
 * to read and no profile to provision first, which is the point: the atlas no
 * longer has public accounts, so authorization has to attach to something that
 * exists before anyone signs in, and an address is the only such thing.
 *
 * It replaces `contributor_profiles.moderator_role`, which could only be set
 * on a row created by a successful sign-in — and the sign-in wrote that row on
 * the wrong column, so the role was unreachable and nobody ever held one.
 *
 * Read on the service-role client on purpose: the table carries RLS with no
 * policy at all. Who may moderate is not public information.
 */
// @req REQ-042
export async function isEmailAllowlisted(
  email: string | null | undefined
): Promise<boolean> {
  const address = email?.trim();
  if (!address) return false;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_allowlist")
    .select("email")
    .eq("email", address)
    .maybeSingle();

  if (error) {
    // An allowlist that cannot be read is not an empty allowlist. Refusing
    // everyone locks the moderators out for as long as the outage lasts;
    // admitting everyone hands the console to whoever asks.
    logger.error("Failed to read the admin allowlist", error);
    return false;
  }

  return Boolean(data);
}
