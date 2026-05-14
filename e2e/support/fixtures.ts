import { test as base, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { signInAsRole, type Role } from "./auth";
import { getSupabaseAdmin } from "./clients/supabase-admin";

type Fixtures = {
  // Per-test UUID. Namespace fixture data so parallel workers cannot collide
  // on Supabase rows (TEA Test Design R-9).
  testRunId: string;
  // Sign in as a role on the current browser context. Anon is a no-op.
  // Use this from beforeEach when a journey starts authenticated.
  signIn: (role: Role) => Promise<void>;
  // Supabase admin client for low-level seeding inside specs. Prefer factories
  // (e2e/support/factories/*) over direct admin access.
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
};

// Note: the second parameter is renamed `provide` (Playwright convention is
// `use`) to dodge a false-positive from eslint-plugin-react-hooks, which
// treats any function literally named `use` as a React Hook call.
export const test = base.extend<Fixtures>({
  testRunId: async ({}, provide) => {
    await provide(randomUUID());
  },
  signIn: async ({ context }: { context: BrowserContext }, provide) => {
    await provide(async (role: Role) => signInAsRole(context, role));
  },
  supabaseAdmin: async ({}, provide) => {
    await provide(getSupabaseAdmin());
  },
});

export { expect } from "@playwright/test";
