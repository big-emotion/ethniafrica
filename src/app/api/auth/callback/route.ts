import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";
import { logger } from "@/lib/api/logger";

/**
 * GET /api/auth/callback
 * Handles OAuth and magic-link callbacks from Supabase Auth.
 * Exchanges the auth code for a session, upserts the contributor profile,
 * then redirects to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/admin/contributions";
  const ageConfirmed = searchParams.get("age_confirmed") === "1";

  if (!code) {
    const errorUrl = new URL("/admin/login", origin);
    errorUrl.searchParams.set("error", "No authentication code provided");
    return NextResponse.redirect(errorUrl);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorUrl = new URL("/admin/login", origin);
      errorUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(errorUrl);
    }

    const user = data?.user;
    if (user) {
      const displayName =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split("@")[0] ??
        "contributor";

      const { error: upsertError } = await supabase
        .from("contributor_profiles")
        .upsert(
          { id: user.id, display_name: displayName },
          { onConflict: "id", ignoreDuplicates: true }
        );

      if (upsertError) {
        logger.error("Failed to upsert contributor profile", upsertError);
      }

      if (ageConfirmed) {
        const { error: updateError } = await supabase
          .from("contributor_profiles")
          .update({ age_confirmed_at: new Date().toISOString() })
          .eq("id", user.id)
          .is("age_confirmed_at", null);

        if (updateError) {
          logger.error("Failed to set age_confirmed_at", updateError);
        }
      }
    }

    return NextResponse.redirect(new URL(redirect, origin));
  } catch (err) {
    logger.error("Auth callback error", err);
    const errorUrl = new URL("/admin/login", origin);
    errorUrl.searchParams.set("error", "Authentication failed");
    return NextResponse.redirect(errorUrl);
  }
}
