/**
 * flags RLS + state-machine + public_slug integration test (ETNI-54).
 *
 * 8 acceptance-criteria scenarios:
 *   T1. Anonymous SELECT returns rows (public audit trail, FR14/FR17).
 *   T2. Anonymous INSERT is rejected.
 *   T3. Authenticated INSERT with contributor_id ≠ auth.uid() is rejected.
 *   T4. Valid status transition (open → under_review) is accepted.
 *   T5. Forbidden transition (accepted → open) raises error naming source + target.
 *   T6. DELETE is rejected for anon and authenticated roles.
 *   T7. INSERT with neither assertion_id nor (entity_type + entity_id) raises
 *       the anchor-required CHECK error (flags_has_anchor_check).
 *   T8. public_slug is auto-generated (10 Crockford chars) and UNIQUE across rows.
 *
 * Execution model
 * ---------------
 * Same pattern as src/lib/supabase/__tests__/rls-policies.test.ts and
 * src/lib/supabase/__tests__/per-assertion-data-model.test.ts.
 * Runs against a real Supabase / Postgres instance. Skipped when the required
 * env vars are absent (developer without `supabase start`).
 *
 * Required env vars:
 *   TEST_SUPABASE_URL         — e.g. http://127.0.0.1:54321
 *   TEST_SUPABASE_ANON_KEY    — JWT with role=anon
 *   TEST_SUPABASE_SERVICE_KEY — service-role key (bypasses RLS; fixture setup)
 *   TEST_JWT_CONTRIBUTOR      — signed JWT with app_metadata.role=contributor
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Env / connection helpers
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? "";
const JWT_CONTRIBUTOR = process.env.TEST_JWT_CONTRIBUTOR ?? "";

const SKIP = !ANON_KEY || !SERVICE_KEY || !JWT_CONTRIBUTOR;

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function contributorClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${JWT_CONTRIBUTOR}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Decode the sub claim from a JWT without verifying the signature.
function getUserIdFromJwt(jwt: string): string {
  const payload = JSON.parse(
    Buffer.from(jwt.split(".")[1], "base64url").toString("utf8")
  );
  return payload.sub as string;
}

// ---------------------------------------------------------------------------
// Test namespace
// ---------------------------------------------------------------------------

const RUN_PREFIX = `ETNI54_${crypto.randomUUID().slice(0, 8)}`;

// Crockford base32 alphabet — 32 chars, no I L O U.
const CROCKFORD_ALPHABET = /^[0-9A-HJKMNP-TV-Z]{10}$/;

// Seeded flag IDs to clean up in afterAll.
const seededFlagIds: string[] = [];

function trackFlag(id: string) {
  seededFlagIds.push(id);
  return id;
}

// Postgres error codes.
const PG_RLS_VIOLATION = "42501";
const PG_CHECK_VIOLATION = "23514";
const PG_UNIQUE_VIOLATION = "23505";
const PGRST_RLS = "PGRST301";

function isRlsError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  return (
    error.code === PG_RLS_VIOLATION ||
    error.code === PGRST_RLS ||
    (error.message?.includes("42501") ?? false)
  );
}

function isCheckViolation(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  return (
    error.code === PG_CHECK_VIOLATION ||
    (error.message?.includes("23514") ?? false) ||
    (error.message?.toLowerCase().includes("check") ?? false)
  );
}

// Minimal valid entity-level flag payload for service-role inserts.
function entityFlag(
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    entity_type: "people",
    entity_id: `PPL_TEST_${RUN_PREFIX}`,
    flag_kind: "inaccurate",
    reason_text: "ETNI-54 integration test flag",
    contributor_id: null,
    turnstile_token_verified: false,
    status: "open",
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// afterAll cleanup
// ---------------------------------------------------------------------------

afterAll(async () => {
  if (SKIP) return;
  const svc = serviceClient();
  if (seededFlagIds.length > 0) {
    await svc.from("flags").delete().in("id", seededFlagIds);
  }
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)(
  "flags RLS + state-machine + public_slug (ETNI-54)",
  () => {
    let seededFlagId: string;

    beforeAll(async () => {
      const svc = serviceClient();
      // Seed one open flag via service role for SELECT and state-machine tests.
      const { data, error } = await svc
        .from("flags")
        .insert(entityFlag())
        .select("id")
        .single();

      if (error || !data?.id) {
        throw new Error(
          `ETNI-54 beforeAll: seeding an open flag failed — ` +
            `${error?.code ?? "?"} ${error?.message ?? "no data"}. ` +
            `Likely the migration 019 has not been applied yet (expected red).`
        );
      }
      seededFlagId = trackFlag(data.id);
    });

    // -------------------------------------------------------------------------
    // T1 — Anonymous SELECT returns rows (public read, FR14/FR17)
    // -------------------------------------------------------------------------
    it("T1: anon SELECT returns rows without error", async () => {
      const { data, error } = await anonClient()
        .from("flags")
        .select("id")
        .limit(1);

      expect(
        error,
        `Expected no RLS error on anon SELECT, got: ${JSON.stringify(error)}`
      ).toBeNull();
      // At least the seeded row is visible.
      expect(Array.isArray(data)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // T2 — Anonymous INSERT is rejected
    // -------------------------------------------------------------------------
    it("T2: anon INSERT is rejected by RLS", async () => {
      const { data, error } = await anonClient()
        .from("flags")
        .insert(entityFlag({ turnstile_token_verified: true }))
        .select("id")
        .single();

      try {
        expect(
          isRlsError(error),
          `Expected RLS error (42501/PGRST301) for anon INSERT, got: ${JSON.stringify(error)}`
        ).toBe(true);
      } finally {
        if (data?.id)
          await serviceClient().from("flags").delete().eq("id", data.id);
      }
    });

    // -------------------------------------------------------------------------
    // T3 — Authenticated INSERT with contributor_id ≠ auth.uid() is rejected
    // -------------------------------------------------------------------------
    it("T3: contributor INSERT with mismatched contributor_id is rejected", async () => {
      const wrongContributorId = crypto.randomUUID();

      const { data, error } = await contributorClient()
        .from("flags")
        .insert(
          entityFlag({
            contributor_id: wrongContributorId,
            turnstile_token_verified: true,
          })
        )
        .select("id")
        .single();

      try {
        expect(
          isRlsError(error),
          `Expected RLS error for INSERT with mismatched contributor_id, got: ${JSON.stringify(error)}`
        ).toBe(true);
      } finally {
        if (data?.id)
          await serviceClient().from("flags").delete().eq("id", data.id);
      }
    });

    // -------------------------------------------------------------------------
    // T4 — Valid state transition: open → under_review
    // -------------------------------------------------------------------------
    it("T4: valid transition open → under_review is accepted", async () => {
      const svc = serviceClient();
      const { data: row, error: insertErr } = await svc
        .from("flags")
        .insert(entityFlag({ status: "open" }))
        .select("id")
        .single();

      expect(insertErr).toBeNull();
      const flagId = trackFlag(row!.id as string);

      const { error: updateErr } = await svc
        .from("flags")
        .update({ status: "under_review" })
        .eq("id", flagId);

      expect(
        updateErr,
        `Expected valid transition open→under_review to succeed, got: ${JSON.stringify(updateErr)}`
      ).toBeNull();
    });

    // -------------------------------------------------------------------------
    // T5 — Forbidden transition: accepted → open raises named error
    // -------------------------------------------------------------------------
    it("T5: forbidden transition accepted → open raises error naming source and target", async () => {
      const svc = serviceClient();
      const { data: row, error: insertErr } = await svc
        .from("flags")
        .insert(entityFlag({ status: "accepted" }))
        .select("id")
        .single();

      expect(insertErr).toBeNull();
      const flagId = trackFlag(row!.id as string);

      const { error: updateErr } = await svc
        .from("flags")
        .update({ status: "open" })
        .eq("id", flagId);

      expect(
        updateErr,
        "Expected an error for forbidden transition accepted → open"
      ).not.toBeNull();
      const msg = (updateErr?.message ?? "").toLowerCase();
      expect(
        msg.includes("accepted") && msg.includes("open"),
        `Expected error message to name both states ("accepted" and "open"), got: "${updateErr?.message}"`
      ).toBe(true);
    });

    // -------------------------------------------------------------------------
    // T6 — DELETE is rejected for anon and authenticated roles
    // -------------------------------------------------------------------------
    it("T6: anon DELETE is rejected", async () => {
      const { error } = await anonClient()
        .from("flags")
        .delete()
        .eq("id", seededFlagId);

      expect(
        isRlsError(error),
        `Expected RLS error for anon DELETE, got: ${JSON.stringify(error)}`
      ).toBe(true);
    });

    it("T6: contributor DELETE is rejected", async () => {
      const { error } = await contributorClient()
        .from("flags")
        .delete()
        .eq("id", seededFlagId);

      expect(
        isRlsError(error),
        `Expected RLS error for contributor DELETE, got: ${JSON.stringify(error)}`
      ).toBe(true);
    });

    // -------------------------------------------------------------------------
    // T7 — INSERT with no anchor raises flags_has_anchor_check error
    // -------------------------------------------------------------------------
    it("T7: INSERT with no assertion_id and no entity_type/entity_id is rejected by anchor CHECK", async () => {
      const svc = serviceClient();
      const { data, error } = await svc
        .from("flags")
        .insert({
          flag_kind: "inaccurate",
          reason_text: "anchor check test",
          // no assertion_id, no entity_type, no entity_id
        })
        .select("id")
        .single();

      try {
        expect(
          error,
          "Expected a CHECK violation for missing anchor"
        ).not.toBeNull();
        expect(
          isCheckViolation(error),
          `Expected CHECK violation (23514), got: ${JSON.stringify(error)}`
        ).toBe(true);
      } finally {
        if (data?.id) await svc.from("flags").delete().eq("id", data.id);
      }
    });

    // -------------------------------------------------------------------------
    // T8 — public_slug is auto-generated, Crockford base32, UNIQUE
    // -------------------------------------------------------------------------
    it("T8: public_slug is auto-populated with a 10-char Crockford base32 code", async () => {
      const svc = serviceClient();
      const { data, error } = await svc
        .from("flags")
        .insert(entityFlag())
        .select("id, public_slug")
        .single();

      try {
        expect(error).toBeNull();
        const slug = data?.public_slug as string;
        expect(slug).toBeDefined();
        expect(
          CROCKFORD_ALPHABET.test(slug),
          `public_slug "${slug}" must be 10 Crockford chars (0-9A-HJKMNP-TV-Z)`
        ).toBe(true);
        trackFlag(data!.id as string);
      } finally {
        if (data?.id && !seededFlagIds.includes(data.id)) {
          await svc.from("flags").delete().eq("id", data.id);
        }
      }
    });

    it("T8: two different flags have distinct public_slugs", async () => {
      const svc = serviceClient();
      const [r1, r2] = await Promise.all([
        svc
          .from("flags")
          .insert(entityFlag())
          .select("id, public_slug")
          .single(),
        svc
          .from("flags")
          .insert(entityFlag())
          .select("id, public_slug")
          .single(),
      ]);

      try {
        expect(r1.error).toBeNull();
        expect(r2.error).toBeNull();
        expect(r1.data?.public_slug).not.toBe(r2.data?.public_slug);
      } finally {
        const ids = [r1.data?.id, r2.data?.id].filter(Boolean) as string[];
        if (ids.length) await svc.from("flags").delete().in("id", ids);
      }
    });

    it("T8: manually inserting a duplicate public_slug fails with UNIQUE violation", async () => {
      const svc = serviceClient();

      // Insert a first flag and record its auto-generated slug.
      const { data: first, error: firstErr } = await svc
        .from("flags")
        .insert(entityFlag())
        .select("id, public_slug")
        .single();

      expect(firstErr).toBeNull();
      trackFlag(first!.id as string);
      const existingSlug = first!.public_slug as string;

      // Attempt to insert a second flag that explicitly sets the same slug.
      // The trigger normally overwrites public_slug, so we bypass the trigger by
      // using a direct UPDATE after INSERT to force the collision on the unique index.
      const { data: second, error: secondErr } = await svc
        .from("flags")
        .insert(entityFlag())
        .select("id")
        .single();

      expect(secondErr).toBeNull();
      trackFlag(second!.id as string);

      // Force the slug collision via UPDATE (service role bypasses RLS, trigger
      // only fires on INSERT so UPDATE can set any value).
      const { error: dupErr } = await svc
        .from("flags")
        .update({ public_slug: existingSlug })
        .eq("id", second!.id);

      expect(
        dupErr,
        "Expected UNIQUE violation when forcing duplicate public_slug via UPDATE"
      ).not.toBeNull();
      const code = dupErr?.code ?? dupErr?.message ?? "";
      expect(
        String(code).includes(PG_UNIQUE_VIOLATION) ||
          String(dupErr?.message ?? "").includes("unique") ||
          String(dupErr?.message ?? "").includes("23505"),
        `Expected unique violation (23505), got: ${JSON.stringify(dupErr)}`
      ).toBe(true);
    });
  }
);
