import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isEmailAllowlisted } from "@/lib/auth/adminAllowlist";
import { createServerSupabaseClient } from "./auth-server";

export interface ModeratorSession {
  user: User;
}

const SIGN_IN_URL = "/fr/admin/connexion";

/**
 * The current moderator, or a redirect to the sign-in page.
 *
 * Two things changed here at once, and they are the same change. Authorization
 * used to read `contributor_profiles.moderator_role`, a column on a row that
 * only a successful sign-in created — and the sign-in wrote that row on the
 * wrong key, so the row was never found and the role was unreachable. And the
 * atlas no longer has public accounts to hang a role on. So the gate is now the
 * address itself, checked against `admin_allowlist`.
 *
 * There is no role in the returned session because nothing downstream branches
 * on one: the console offers the same moves to everyone who can open it.
 *
 * Call this at the top of any admin Server Component. It is redundant with the
 * middleware and kept anyway — a middleware matcher is a configuration line,
 * and an authorization that lives only in configuration is one edit away from
 * being gone.
 */
// @req REQ-042
export async function getModeratorSession(): Promise<ModeratorSession> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(SIGN_IN_URL);
  }

  if (!(await isEmailAllowlisted(user.email))) {
    redirect(SIGN_IN_URL);
  }

  return { user };
}
