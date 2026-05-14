import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "../clients/supabase-admin";

export type KeyTier = "free" | "test";

export type SeededKey = {
  apiKey: string;
  tier: KeyTier;
  reset: () => Promise<void>;
  cleanup: () => Promise<void>;
};

export type SeedKeyOptions = {
  tier?: KeyTier;
  // Override per-second / per-day limits. `test` tier supports tunable knobs.
  limitPerSecond?: number;
  limitPerDay?: number;
  testRunId: string;
};

// ASR-5: test API-key tier with tunable limits + reset endpoint.
// Stub until the api_keys schema + test-tier knob land (Phase 4).
export async function seedKey(opts: SeedKeyOptions): Promise<SeededKey> {
  getSupabaseAdmin();
  const apiKey = `test_${randomUUID().replace(/-/g, "")}`;
  throw new Error(
    `seedKey(tier=${opts.tier ?? "test"}) not implemented. ` +
      `Depends on api_keys schema + test-tier (Phase 4 work). Would issue key=${apiKey}.`
  );
}
