import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";

/**
 * GET /api/auth/callback
 * Handles OAuth and magic link callbacks from Supabase Auth.
 * Exchanges the auth code for a session and redirects to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/admin/contributions";

  // Redirect to login if no code provided
  if (!code) {
    const errorUrl = new URL("/admin/login", origin);
    errorUrl.searchParams.set("error", "No authentication code provided");
    return NextResponse.redirect(errorUrl);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorUrl = new URL("/admin/login", origin);
      errorUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(errorUrl);
    }

    // Successful authentication - redirect to intended destination
    return NextResponse.redirect(new URL(redirect, origin));
  } catch (error) {
    console.error("Auth callback error:", error);
    const errorUrl = new URL("/admin/login", origin);
    errorUrl.searchParams.set("error", "Authentication failed");
    return NextResponse.redirect(errorUrl);
  }
}
