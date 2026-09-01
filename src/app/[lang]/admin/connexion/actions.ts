"use server";

import { headers } from "next/headers";

import { isEmailAllowlisted } from "@/lib/auth/adminAllowlist";
import { createServerSupabaseClient } from "@/lib/supabase/auth-server";

export type AdminSignInState = {
  status: "idle" | "sent" | "invalid";
  message: string;
};

/**
 * The same sentence whether or not the address may moderate.
 *
 * Telling a stranger "cette adresse n'est pas autorisée" would turn this form
 * into a way to enumerate the moderators. So the only thing the page ever says
 * is that *if* the address can get in, a link is on its way.
 */
const NEUTRAL_ANSWER: AdminSignInState = {
  status: "sent",
  message:
    "Si cette adresse peut accéder à la modération, un lien vient de lui être envoyé.",
};

/** Deliberately loose: Supabase and the allowlist are the real checks. */
const LOOKS_LIKE_AN_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

/**
 * Ask for a sign-in link to the moderation console.
 *
 * This is the only sign-in surface left in the atlas. Reporting costs no
 * account, so there is no contributor to register, no password to reset and no
 * SSO provider to fall back on — an address is either on `admin_allowlist` or
 * it is not.
 *
 * `shouldCreateUser` is true on purpose: the allowlist is the gate, so an
 * authorized person should not additionally have to have registered first. The
 * account Supabase creates carries no privileges of its own.
 */
// @req REQ-042
export async function requestAdminSignInLink(
  _previous: AdminSignInState,
  formData: FormData
): Promise<AdminSignInState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!LOOKS_LIKE_AN_ADDRESS.test(email)) {
    return {
      status: "invalid",
      message: "Saisissez une adresse e-mail pour recevoir le lien.",
    };
  }

  if (!(await isEmailAllowlisted(email))) return NEUTRAL_ANSWER;

  const supabase = await createServerSupabaseClient();
  const destination = `${await requestOrigin()}/api/auth/callback?redirect=${encodeURIComponent("/fr/admin")}`;

  // A refusal from Supabase — a rate limit, an outage — is not reported back
  // either. It would be the one answer a stranger cannot provoke, and so the
  // one that tells them the address is real.
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: destination },
  });

  return NEUTRAL_ANSWER;
}
