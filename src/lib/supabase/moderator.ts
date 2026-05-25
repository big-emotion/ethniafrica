import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./auth-server";

export type ModeratorRole = "editor" | "senior_editor" | "admin";

export interface ModeratorSession {
  user: User;
  role: ModeratorRole;
}

const CONNEXION_URL = "/fr/compte/connexion";

/**
 * Returns the current authenticated moderator session, or throws a redirect
 * to the sign-in page when the user is unauthenticated or has
 * contributor_profiles.moderator_role = 'none'.
 *
 * Call this at the top of any admin Server Component.
 */
export async function getModeratorSession(): Promise<ModeratorSession> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(CONNEXION_URL);
  }

  const { data, error } = await supabase
    .from("contributor_profiles")
    .select("moderator_role")
    .eq("user_id", user.id);

  if (error || !data || data.length === 0) {
    redirect(CONNEXION_URL);
  }

  const role = data[0].moderator_role as string;

  if (role === "none") {
    redirect(CONNEXION_URL);
  }

  return { user, role: role as ModeratorRole };
}
