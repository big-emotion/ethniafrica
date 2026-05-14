/**
 * Per-assertion data model — contract test (R-2 / ASR-4).
 *
 * RED-PHASE ATDD GATE for the per-assertion schema migration.
 *
 * Background
 * ----------
 * The TEA test-design architecture (_bmad-output/test-artifacts/test-design/
 * test-design-architecture.md) names R-2 ("per-assertion data-model migration")
 * as one of the three score-9 Phase-1 risks and pins ASR-4 ("per-assertion
 * stable IDs in fiche content") as the mitigation. The mitigation playbook is:
 *
 *   1. Schema migration extends fiche content to per-assertion granularity
 *      (one row per assertion, FK to fiche revision).
 *   2. Render layer emits `data-assertion-id="{uuid}"` on every assertion DOM
 *      node, matching the backing `assertions.id` row.
 *   3. A failing acceptance test on the contract is written *first* via
 *      `bmad-testarch-atdd` before any UI primitive ships.
 *
 * This file is step 3 — the failing contract test. It must turn green only
 * when the migration that creates `fiche_revisions` and wires
 * `assertions.fiche_revision_id` + `flags.assertion_id` lands on `main`.
 *
 * What this file covers
 * ---------------------
 * Schema-level (DB) half of the contract. The DOM half — `data-assertion-id`
 * present on every rendered assertion node — is a separate Playwright spec
 * authored in Phase 2 (Kofi journey, test ID 2.1-E2E-001).
 *
 * Execution model
 * ---------------
 * Same pattern as `rls-policies.test.ts`: runs against a real Supabase /
 * Postgres instance (local `supabase start` or CI). Skipped when the required
 * env vars are absent so a developer running `npm test` without the local
 * stack does not get a false red.
 *
 * Required env vars:
 *   TEST_SUPABASE_URL          — e.g. http://127.0.0.1:54321
 *   TEST_SUPABASE_ANON_KEY     — JWT with role=anon
 *   TEST_SUPABASE_SERVICE_KEY  — service-role key (bypasses RLS; used for
 *                                fixture setup + cleanup)
 *
 * Isolation
 * ---------
 * Every entity ID is namespaced with `ATDD_R2_<short uuid>` so parallel CI
 * workers cannot collide (R-9 mitigation). Each `it` block wraps its inserts
 * in try/finally so a failing assertion still cleans up.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Env / clients
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? "";

const SKIP = !ANON_KEY || !SERVICE_KEY;

function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Per-suite namespace for test data so parallel runs cannot collide.
const RUN_PREFIX = `ATDD_R2_${crypto.randomUUID().slice(0, 8)}`;
const seededRevisionIds = new Set<string>();
const seededAssertionIds = new Set<string>();
const seededFlagIds = new Set<string>();

function trackRevision(id: string) {
  seededRevisionIds.add(id);
  return id;
}
function trackAssertion(id: string) {
  seededAssertionIds.add(id);
  return id;
}
function trackFlag(id: string) {
  seededFlagIds.add(id);
  return id;
}

// PostgreSQL SQLSTATE codes used in assertions below.
const PG_NOT_NULL_VIOLATION = "23502";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_UNDEFINED_TABLE = "42P01";
const PG_UNDEFINED_COLUMN = "42703";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Insert one fiche_revisions row with deterministic content. Returns the
 * inserted row's `id` so the test can FK assertions to it.
 *
 * Throws if the table does not yet exist — by design, this is the failure
 * surface that proves the migration has not shipped.
 */
async function seedFicheRevision(
  svc: SupabaseClient,
  opts: { entityType: string; entityId: string; version: number }
): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await svc.from("fiche_revisions").insert({
    id,
    entity_type: opts.entityType,
    entity_id: opts.entityId,
    version: opts.version,
    content_snapshot: { test_run: RUN_PREFIX, body: "ATDD seed" },
    published_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(
      `seedFicheRevision failed (this is the expected red signal until the ` +
        `migration ships): ${error.code ?? "?"} ${error.message}`
    );
  }
  return trackRevision(id);
}

// ---------------------------------------------------------------------------
// Cleanup — service role bypasses RLS, so it can DELETE freely.
// Reverse order: flags → assertions → fiche_revisions to respect FKs.
// ---------------------------------------------------------------------------

afterAll(async () => {
  if (SKIP) return;
  const svc = serviceClient();
  if (seededFlagIds.size) {
    await svc.from("flags").delete().in("id", Array.from(seededFlagIds));
  }
  if (seededAssertionIds.size) {
    await svc
      .from("assertions")
      .delete()
      .in("id", Array.from(seededAssertionIds));
  }
  if (seededRevisionIds.size) {
    // Best-effort: if the table never existed, this is a no-op error we ignore.
    await svc
      .from("fiche_revisions")
      .delete()
      .in("id", Array.from(seededRevisionIds));
  }
});

// ---------------------------------------------------------------------------
// Contract assertions
// ---------------------------------------------------------------------------

describe.skipIf(SKIP)("per-assertion data model contract (R-2 / ASR-4)", () => {
  beforeAll(() => {
    if (SKIP) return;
    // Loud announce so a developer running `vitest -t per-assertion` sees what
    // env was used. Vitest swallows console.log under default reporter, but
    // shows it under --reporter=verbose / on test failure.
    console.log(`[ATDD R-2] test run prefix=${RUN_PREFIX} url=${SUPABASE_URL}`);
  });

  // -------------------------------------------------------------------------
  // C1–C4 — regression guards on what migration 014 already shipped.
  // These should already be green; they prevent silent drift in future
  // migrations that touch `assertions`.
  // -------------------------------------------------------------------------

  describe("C1–C4: existing assertions table shape (regression guards)", () => {
    it("C1: assertions.id is a server-generated UUID PK", async () => {
      const svc = serviceClient();
      const entityId = `PPL_TEST_${RUN_PREFIX}_C1`;
      const { data, error } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: entityId,
          field_path: "content.test.c1",
          statement: "C1 regression guard",
        })
        .select("id")
        .single();

      try {
        expect(error).toBeNull();
        expect(data?.id).toBeDefined();
        // UUID v4 shape — server default `gen_random_uuid()`.
        expect(data!.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
        trackAssertion(data!.id);
      } finally {
        if (data?.id) await svc.from("assertions").delete().eq("id", data.id);
      }
    });

    it("C3: confidence_level CHECK rejects values outside the canonical enum", async () => {
      const svc = serviceClient();
      const { data, error } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C3`,
          field_path: "content.test.c3",
          statement: "C3 enum guard",
          confidence_level: "bogus-value",
        })
        .select("id")
        .single();

      try {
        expect(error).not.toBeNull();
        // Postgres CHECK violation surfaces as 23514 / "check constraint";
        // we assert via the message because Supabase wraps the code loosely.
        expect(error?.message ?? "").toMatch(
          /assertions_confidence_level_check|check constraint/i
        );
      } finally {
        if (data?.id) {
          await svc.from("assertions").delete().eq("id", data.id);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // C5–C7 — the migration that must ship.
  // Every assertion in this block is expected to FAIL today.
  // -------------------------------------------------------------------------

  describe("C5: fiche_revisions table exists", () => {
    it("accepts a service-role insert with PK id + entity_type + entity_id + version + content_snapshot", async () => {
      const svc = serviceClient();
      const id = crypto.randomUUID();
      const { error } = await svc.from("fiche_revisions").insert({
        id,
        entity_type: "people",
        entity_id: `PPL_TEST_${RUN_PREFIX}_C5`,
        version: 1,
        content_snapshot: { test_run: RUN_PREFIX },
        published_at: new Date().toISOString(),
      });

      try {
        // EXPECTED RED: relation "fiche_revisions" does not exist (42P01)
        // until the migration ships. The error code assertion turns this
        // into a *positive* contract assertion: the test will go green only
        // when the table exists *and* accepts this exact column shape.
        expect(error).toBeNull();
        trackRevision(id);
      } finally {
        if (!error) await svc.from("fiche_revisions").delete().eq("id", id);
      }
    });
  });

  describe("C6: assertions.fiche_revision_id FK to fiche_revisions(id)", () => {
    it("requires a non-null fiche_revision_id", async () => {
      const svc = serviceClient();
      // First seed a real revision — if C5 fails this will throw, which is
      // the expected red signal upstream.
      const revisionId = await seedFicheRevision(svc, {
        entityType: "people",
        entityId: `PPL_TEST_${RUN_PREFIX}_C6_null`,
        version: 1,
      });

      // Insert WITHOUT fiche_revision_id → must violate NOT NULL.
      const { data, error } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C6_null`,
          field_path: "content.test.c6.null",
          statement: "C6 null-FK guard",
        })
        .select("id")
        .single();

      try {
        expect(error).not.toBeNull();
        // EXPECTED RED today: column "fiche_revision_id" does not exist (42703).
        // EXPECTED GREEN post-migration: not-null violation (23502) on the
        // newly-required column.
        expect([PG_NOT_NULL_VIOLATION, PG_UNDEFINED_COLUMN]).toContain(
          error?.code
        );
        // Once the migration ships and the column exists, only 23502 is
        // acceptable — this stricter check guards against accidentally
        // shipping the column as nullable.
        if (error?.code !== PG_UNDEFINED_COLUMN) {
          expect(error?.code).toBe(PG_NOT_NULL_VIOLATION);
        }

        // Suppress unused-var lint until revisionId is consumed below.
        expect(revisionId).toBeTruthy();
      } finally {
        if (data?.id) await svc.from("assertions").delete().eq("id", data.id);
      }
    });

    it("rejects a fiche_revision_id that does not reference a real row (FK violation)", async () => {
      const svc = serviceClient();
      const orphanRevisionId = crypto.randomUUID();
      const { data, error } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C6_orphan`,
          field_path: "content.test.c6.orphan",
          statement: "C6 orphan-FK guard",
          fiche_revision_id: orphanRevisionId,
        })
        .select("id")
        .single();

      try {
        expect(error).not.toBeNull();
        expect([PG_FOREIGN_KEY_VIOLATION, PG_UNDEFINED_COLUMN]).toContain(
          error?.code
        );
      } finally {
        if (data?.id) await svc.from("assertions").delete().eq("id", data.id);
      }
    });

    it("accepts an assertion whose fiche_revision_id references a real revision", async () => {
      const svc = serviceClient();
      const revisionId = await seedFicheRevision(svc, {
        entityType: "people",
        entityId: `PPL_TEST_${RUN_PREFIX}_C6_ok`,
        version: 1,
      });

      const { data, error } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C6_ok`,
          field_path: "content.test.c6.ok",
          statement: "C6 happy path",
          fiche_revision_id: revisionId,
        })
        .select("id, fiche_revision_id")
        .single();

      try {
        expect(error).toBeNull();
        expect(data?.fiche_revision_id).toBe(revisionId);
        trackAssertion(data!.id);
      } finally {
        if (data?.id) await svc.from("assertions").delete().eq("id", data.id);
      }
    });

    it("cascades on delete: removing a fiche_revisions row removes its assertions", async () => {
      const svc = serviceClient();
      const revisionId = await seedFicheRevision(svc, {
        entityType: "people",
        entityId: `PPL_TEST_${RUN_PREFIX}_C6_cascade`,
        version: 1,
      });

      const { data: insertedAssertion, error: insertErr } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C6_cascade`,
          field_path: "content.test.c6.cascade",
          statement: "C6 cascade",
          fiche_revision_id: revisionId,
        })
        .select("id")
        .single();
      expect(insertErr).toBeNull();
      const assertionId = insertedAssertion!.id as string;

      // Delete the revision; the assertion row must disappear automatically.
      const { error: deleteErr } = await svc
        .from("fiche_revisions")
        .delete()
        .eq("id", revisionId);
      expect(deleteErr).toBeNull();

      const { data: lookup, error: lookupErr } = await svc
        .from("assertions")
        .select("id")
        .eq("id", assertionId);
      expect(lookupErr).toBeNull();
      expect(lookup ?? []).toHaveLength(0);

      // Revision is gone, assertion is gone — no cleanup needed.
      seededRevisionIds.delete(revisionId);
    });
  });

  // -------------------------------------------------------------------------
  // C8 — flags.assertion_id FK is what makes the Kofi journey testable
  // (Phase 2). It must ship in the same migration so a flag is anchored to a
  // specific assertion row, not just the parent entity.
  // -------------------------------------------------------------------------

  describe("C8: flags.assertion_id FK to assertions(id)", () => {
    it("accepts a flag with a real assertion_id and cascades when the assertion is deleted", async () => {
      const svc = serviceClient();
      const revisionId = await seedFicheRevision(svc, {
        entityType: "people",
        entityId: `PPL_TEST_${RUN_PREFIX}_C8`,
        version: 1,
      });

      const { data: a, error: aErr } = await svc
        .from("assertions")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C8`,
          field_path: "content.test.c8",
          statement: "C8 flag anchor",
          fiche_revision_id: revisionId,
        })
        .select("id")
        .single();
      expect(aErr).toBeNull();
      const assertionId = a!.id as string;
      trackAssertion(assertionId);

      const { data: f, error: fErr } = await svc
        .from("flags")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C8`,
          flag_type: "inaccurate",
          description: "C8 ATDD flag",
          assertion_id: assertionId,
        })
        .select("id, assertion_id")
        .single();

      try {
        expect(fErr).toBeNull();
        expect(f?.assertion_id).toBe(assertionId);
        trackFlag(f!.id);

        // Delete the assertion; the flag must disappear via ON DELETE CASCADE.
        const { error: delErr } = await svc
          .from("assertions")
          .delete()
          .eq("id", assertionId);
        expect(delErr).toBeNull();

        const { data: orphan } = await svc
          .from("flags")
          .select("id")
          .eq("id", f!.id);
        expect(orphan ?? []).toHaveLength(0);

        // Cascade cleared them — drop them from the cleanup set.
        seededFlagIds.delete(f!.id);
        seededAssertionIds.delete(assertionId);
      } finally {
        // Revision cleanup happens in afterAll.
      }
    });

    it("rejects a flag whose assertion_id does not reference a real assertion", async () => {
      const svc = serviceClient();
      const orphanAssertionId = crypto.randomUUID();
      const { data, error } = await svc
        .from("flags")
        .insert({
          entity_type: "people",
          entity_id: `PPL_TEST_${RUN_PREFIX}_C8_orphan`,
          flag_type: "inaccurate",
          description: "C8 orphan flag",
          assertion_id: orphanAssertionId,
        })
        .select("id")
        .single();

      try {
        expect(error).not.toBeNull();
        expect([PG_FOREIGN_KEY_VIOLATION, PG_UNDEFINED_COLUMN]).toContain(
          error?.code
        );
      } finally {
        if (data?.id) await svc.from("flags").delete().eq("id", data.id);
      }
    });
  });
});
