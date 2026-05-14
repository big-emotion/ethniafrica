import type { BrowserContext } from "@playwright/test";
import { getSupabaseAdmin } from "./clients/supabase-admin";

export type Role = "anon" | "contributor" | "moderator" | "admin" | "advisor";

// ASR-1: test-mode session injection.
// The current admin-cookie model is being deprecated in favor of Supabase Auth
// + OAuth (GitHub / Google / ORCID). Until that migration lands, signInAsRole
// is a stub: anon works without setup, every other role throws.
//
// When the auth migration lands, this implementation must:
//   1. Use admin client to create or fetch a Supabase auth user with the role.
//   2. Mint a session token for that user via the admin API.
//   3. Encode the session as Playwright cookies via ctx.addCookies().
//   4. Optionally return storageState JSON for cross-test reuse.
export async function signInAsRole(
  ctx: BrowserContext,
  role: Role
): Promise<void> {
  if (role === "anon") return;
  // Touch the admin client so misconfiguration surfaces immediately rather
  // than at the first protected page.goto.
  getSupabaseAdmin();
  throw new Error(
    `signInAsRole('${role}') not implemented. ASR-1 (test-mode session injection) ` +
      "is part of the Supabase Auth migration. See TEA test design."
  );
}
