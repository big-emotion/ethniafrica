import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { logger } from "@/lib/api/logger";

const SIGN_IN_PATH = "/fr/admin/connexion";
const DEFAULT_DESTINATION = "/fr/admin";

/**
 * Where the callback is allowed to send someone.
 *
 * The parameter used to be followed as given, on the one route that has just
 * established a session — so `?redirect=https://evil.example` handed that
 * session's landing page to another origin. Only a same-site absolute path is
 * accepted now, and `//host` is rejected too: the browser reads it as a
 * protocol-relative URL and leaves the site.
 */
function safeDestination(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }
  return raw;
}

/**
 * GET /api/auth/callback
 *
 * Completes a magic-link sign-in and sends the moderator where they were
 * headed. It no longer touches `contributor_profiles`: that upsert wrote the
 * user id into `id` while every reader queried `user_id`, so it created rows
 * nobody could find — and authorization now reads `admin_allowlist`, which
 * needs no row of its own.
 */
// @req REQ-042
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const destination = safeDestination(searchParams.get("redirect"));

  function refuse(reason: string) {
    const errorUrl = new URL(SIGN_IN_PATH, origin);
    errorUrl.searchParams.set("error", reason);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) return refuse("Lien de connexion incomplet.");

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logger.error("Failed to exchange an auth code for a session", error);
      return refuse("Ce lien de connexion n'est plus valide.");
    }

    return NextResponse.redirect(new URL(destination, origin));
  } catch (err) {
    logger.error("Auth callback error", err);
    return refuse("La connexion n'a pas abouti.");
  }
}
