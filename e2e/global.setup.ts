import { test as setup } from "@playwright/test";

// Setup project — runs once before any test project.
// Today it only validates that the test environment is wired before we spend
// time spinning up workers. Extend later to:
//   - apply Supabase migrations on a clean local CLI database
//   - seed reference data (FLG_*, ISO codes) that every test relies on
//   - mint long-lived session tokens for role fixtures (once ASR-1 lands)
setup("env-and-migrations", async () => {
  const requiredEnv = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = requiredEnv.filter(
    (k) => !process.env[k] && !process.env[k.replace("NEXT_PUBLIC_", "")]
  );
  if (missing.length > 0) {
    throw new Error(
      `E2E setup: missing required env: ${missing.join(", ")}. ` +
        "See .env.example and e2e/README.md."
    );
  }
});
