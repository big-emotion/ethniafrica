import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

// Test-only Supabase admin client. Mirrors src/lib/supabase/admin.ts but is
// scoped to e2e/* so test infra never imports from src/. Requires the test
// project's service-role key in SUPABASE_SERVICE_ROLE_KEY (NEVER use the prod
// key for tests — see NFR7).
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Tests require a dedicated test Supabase project (local CLI or staging). " +
        "See e2e/README.md."
    );
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
