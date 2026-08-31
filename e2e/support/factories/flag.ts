import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "../clients/supabase-admin";

export type FlagStatus =
  | "pending"
  | "in_review"
  | "resolved"
  | "rejected"
  | "escalated";

export type SeededFlag = {
  flagId: string;
  publicUrl: string;
  status: FlagStatus;
  cleanup: () => Promise<void>;
};

export type SeedFlagOptions = {
  ficheId: string;
  assertionId: string;
  status?: FlagStatus;
  testRunId: string;
};

// Stub — depends on the flags + per-assertion data model (R-2, ASR-4).
// When that schema lands, this factory inserts a flag row, optionally
// resolves it with a moderation entry, and returns the public URL.
export async function seedFlag(opts: SeedFlagOptions): Promise<SeededFlag> {
  getSupabaseAdmin();
  const flagId = randomUUID();
  throw new Error(
    `seedFlag(fiche=${opts.ficheId}, assertion=${opts.assertionId}) not implemented. ` +
      `Depends on flags + assertions schema (Phase 1/2 work). Would create flag id=${flagId}.`
  );
}
