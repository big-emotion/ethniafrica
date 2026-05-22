/**
 * RLS Policy Integration Test Suite — migrations 008–011
 *
 * Runs against a real Supabase/Postgres instance (local dev stack or CI).
 * Set the following env vars before running:
 *   TEST_SUPABASE_URL        — e.g. http://127.0.0.1:54321
 *   TEST_SUPABASE_ANON_KEY   — JWT with role=anon
 *   TEST_SUPABASE_SERVICE_KEY — service-role key (bypasses RLS; used for fixture setup)
 *   TEST_JWT_READER          — signed JWT with app_metadata.role=reader
 *   TEST_JWT_CONTRIBUTOR     — signed JWT with app_metadata.role=contributor
 *   TEST_JWT_MODERATOR       — signed JWT with app_metadata.role=moderator
 *   TEST_JWT_ADMIN           — signed JWT with app_metadata.role=admin
 *
 * These are emitted automatically by `supabase start`; see README §Testing.
 *
 * AC coverage:
 *   • For each of 9 tables × 5 roles: one SELECT + one INSERT attempt.
 *   • Disallowed operations return Postgres error code 42501 (insufficient_privilege).
 *   • Allowed operations return error: null.
 *   • Suite target: ≤ 60 s.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ---------------------------------------------------------------------------
// Environment / connection helpers
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";

const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? "";

/** Build a Supabase client authenticated with an explicit JWT. */
function clientWithJwt(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anonymous (unauthenticated) client. */
function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Service-role client — bypasses RLS; used only for fixture setup/teardown. */
function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Skip guard
// ---------------------------------------------------------------------------

const SKIP =
  !ANON_KEY ||
  !SERVICE_KEY ||
  !process.env.TEST_JWT_READER ||
  !process.env.TEST_JWT_CONTRIBUTOR ||
  !process.env.TEST_JWT_MODERATOR ||
  !process.env.TEST_JWT_ADMIN;

// ---------------------------------------------------------------------------
// Policy matrix
// ---------------------------------------------------------------------------
// Derived directly from migrations 008–011.
//
// read.allowed  — whether a SELECT returns rows (not an RLS error)
// write.allowed — whether an INSERT succeeds (not an RLS error)
//
// Key insight from migrations:
//   • sources, assertions, confidence_scores, flags, revisions,
//     editorial_doctrine — public SELECT policy, no write policy ⟹
//     all roles can read, nobody can write.
//   • audit_log — SELECT only for users whose uid() is in user_roles with
//     role='admin', no write policy.
//   • user_roles — SELECT for own row, ALL for admins, no plain write policy.
//   • api_keys — SELECT for own row (auth.uid() = user_id), no write policy.
// ---------------------------------------------------------------------------

type RoleKey = "anon" | "reader" | "contributor" | "moderator" | "admin";

interface OpPolicy {
  allowed: boolean;
  /** Explains the expected row-count semantics when this is not obvious from
   *  allowed:true/false alone (e.g. empty result vs. non-empty, per-row filtering). */
  note?: string;
}

interface TablePolicy {
  read: OpPolicy;
  write: OpPolicy;
}

type PolicyMatrix = Record<string, Record<RoleKey, TablePolicy>>;

const ALLOW: OpPolicy = { allowed: true };
const DENY: OpPolicy = { allowed: false };

// Per-row filtering: authenticated users may SELECT but see only their own rows.
// Test JWTs have no seeded entry in these tables → zero rows returned, no RLS error.
// allowed:true means "no 42501 RLS error", not "rows returned".
// Ref: migration 007a_user_roles.sql policy "Users can read their own roles":
//   USING (auth.uid() = user_id)
const USER_ROLES_ALLOW_READ: OpPolicy = {
  allowed: true,
  note: "migration 007a_user_roles.sql: USING (auth.uid() = user_id) — zero rows expected because test JWT has no seeded user_roles entry; error: null confirms RLS does not block the query",
};

// Ref: migration 011_api_keys.sql policy api_keys_read_owner:
//   USING (auth.uid() = user_id)
const API_KEYS_ALLOW_READ: OpPolicy = {
  allowed: true,
  note: "migration 011_api_keys.sql: api_keys_read_owner USING (auth.uid() = user_id) — zero rows expected because test JWT has no seeded api_keys entry; error: null confirms RLS does not block the query",
};

const POLICY_MATRIX: PolicyMatrix = {
  sources: {
    anon: { read: ALLOW, write: DENY },
    reader: { read: ALLOW, write: DENY },
    contributor: { read: ALLOW, write: DENY },
    moderator: { read: ALLOW, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  assertions: {
    anon: { read: ALLOW, write: DENY },
    reader: { read: ALLOW, write: DENY },
    contributor: { read: ALLOW, write: DENY },
    moderator: { read: ALLOW, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  confidence_scores: {
    anon: { read: ALLOW, write: DENY },
    reader: { read: ALLOW, write: DENY },
    contributor: { read: ALLOW, write: DENY },
    moderator: { read: ALLOW, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  flags: {
    anon: { read: ALLOW, write: DENY },
    reader: { read: ALLOW, write: DENY },
    contributor: { read: ALLOW, write: DENY },
    moderator: { read: ALLOW, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  revisions: {
    anon: { read: ALLOW, write: DENY },
    reader: { read: ALLOW, write: DENY },
    contributor: { read: ALLOW, write: DENY },
    moderator: { read: ALLOW, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  editorial_doctrine: {
    anon: { read: ALLOW, write: DENY },
    reader: { read: ALLOW, write: DENY },
    contributor: { read: ALLOW, write: DENY },
    moderator: { read: ALLOW, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  // audit_log — SELECT restricted to admins only (see migration 008)
  audit_log: {
    anon: { read: DENY, write: DENY },
    reader: { read: DENY, write: DENY },
    contributor: { read: DENY, write: DENY },
    moderator: { read: DENY, write: DENY },
    admin: { read: ALLOW, write: DENY },
  },
  // user_roles — SELECT for own row (auth.uid() = user_id); admin can do ALL.
  // See USER_ROLES_ALLOW_READ note for why ALLOW yields zero rows in tests.
  user_roles: {
    anon: { read: DENY, write: DENY },
    reader: { read: USER_ROLES_ALLOW_READ, write: DENY },
    contributor: { read: USER_ROLES_ALLOW_READ, write: DENY },
    moderator: { read: USER_ROLES_ALLOW_READ, write: DENY },
    admin: { read: USER_ROLES_ALLOW_READ, write: ALLOW },
  },
  // api_keys — SELECT for own rows only (auth.uid() = user_id); no write policy.
  // See API_KEYS_ALLOW_READ note for why ALLOW yields zero rows in tests.
  api_keys: {
    anon: { read: DENY, write: DENY },
    reader: { read: API_KEYS_ALLOW_READ, write: DENY },
    contributor: { read: API_KEYS_ALLOW_READ, write: DENY },
    moderator: { read: API_KEYS_ALLOW_READ, write: DENY },
    admin: { read: API_KEYS_ALLOW_READ, write: DENY },
  },
};

// ---------------------------------------------------------------------------
// Minimal valid insert payloads per table
// The service client seeds these before the suite; each test issues its own
// INSERT with the role-under-test to verify the write policy.
// ---------------------------------------------------------------------------

const INSERT_PAYLOADS: Record<string, Record<string, unknown>> = {
  sources: { title: "RLS test source", tier: "primary" },
  assertions: {
    entity_type: "test",
    entity_id: "rls-test",
    field_path: "test.field",
    statement: "RLS test assertion",
  },
  confidence_scores: {
    entity_type: "test",
    entity_id: "rls-test",
    score: 0.9,
  },
  flags: {
    entity_type: "test",
    entity_id: "rls-test",
    flag_kind: "inaccurate",
  },
  revisions: { entity_type: "test", entity_id: "rls-test" },
  editorial_doctrine: {
    slug: `rls-write-test-${Date.now()}`,
    title: "RLS write test",
    mdx_source: "test",
  },
  audit_log: { action: "rls-test-write" },
  user_roles: { role: "reader" },
  api_keys: {
    key_hash: `rls-test-hash-${Date.now()}`,
    name: "rls-test-key",
  },
};

// ---------------------------------------------------------------------------
// Postgres RLS error codes
// ---------------------------------------------------------------------------

/** Postgres error code for "insufficient_privilege" (RLS violation). */
const RLS_ERROR_CODE = "42501";

/** Supabase REST API returns HTTP 403 / 401 for RLS denials on INSERT; the
 *  error code surfaced by postgrest is PGRST301 or the underlying pg code.
 *  PGRST116 ("no rows returned for .single()") is intentionally excluded —
 *  it signals a query-shape mismatch, not an RLS denial, and would cause DENY
 *  tests to pass even when no RLS policy exists on the table. */
function isRlsError(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  return (
    error.code === RLS_ERROR_CODE ||
    // PostgREST wraps the Postgres error; message contains the code string
    (error.message?.includes("42501") ?? false) ||
    // HTTP-level denial code used by PostgREST for INSERT denials
    error.code === "PGRST301"
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("RLS policies — migrations 008–011", { timeout: 60_000 }, () => {
  if (SKIP) {
    it.skip("skipped: TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_SUPABASE_SERVICE_KEY / TEST_JWT_* env vars not set", () => {});
    return;
  }

  let svc: SupabaseClient;

  // Seed a source row so confidence_scores / assertions foreign keys resolve.
  let seededSourceId: string | null = null;
  let seededAssertionId: string | null = null;

  beforeAll(async () => {
    svc = serviceClient();

    // Seed a source row
    const { data: sourceRow } = await svc
      .from("sources")
      .insert({ title: "RLS seed source", tier: "primary" })
      .select("id")
      .single();
    seededSourceId = sourceRow?.id ?? null;
    if (!seededSourceId) {
      throw new Error(
        "beforeAll: seeding sources failed — seededSourceId is null; RLS suite cannot run reliably"
      );
    }

    // Seed an assertion row. After migration 014 the confidence_scores table
    // is entity-scoped (no FK on assertion_id), so this row is no longer a
    // strict prerequisite — we keep it to exercise assertion INSERT/SELECT
    // shape and to back fill `source_ids` against the seeded source.
    const { data: assertionRow } = await svc
      .from("assertions")
      .insert({
        entity_type: "seed",
        entity_id: "seed",
        field_path: "seed",
        statement: "seed assertion",
        source_ids: [seededSourceId],
      })
      .select("id")
      .single();
    seededAssertionId = assertionRow?.id ?? null;
    if (!seededAssertionId) {
      throw new Error(
        "beforeAll: seeding assertions failed — seededAssertionId is null"
      );
    }
  });

  afterAll(async () => {
    if (!svc) return;
    // Clean up seeded rows — cascades handle FK children
    if (seededAssertionId) {
      await svc.from("assertions").delete().eq("id", seededAssertionId);
    }
    if (seededSourceId) {
      await svc.from("sources").delete().eq("id", seededSourceId);
    }
  });

  // Build role → client map at describe time (env vars already checked above)
  const roleClients: Record<RoleKey, () => SupabaseClient> = {
    anon: () => anonClient(),
    reader: () => clientWithJwt(process.env.TEST_JWT_READER!),
    contributor: () => clientWithJwt(process.env.TEST_JWT_CONTRIBUTOR!),
    moderator: () => clientWithJwt(process.env.TEST_JWT_MODERATOR!),
    admin: () => clientWithJwt(process.env.TEST_JWT_ADMIN!),
  };

  const tables = Object.keys(POLICY_MATRIX) as (keyof typeof POLICY_MATRIX)[];
  const roles = Object.keys(roleClients) as RoleKey[];

  for (const table of tables) {
    for (const role of roles) {
      const policy = POLICY_MATRIX[table][role];

      // ---- READ -------------------------------------------------------
      it(`${table} | ${role} | SELECT — ${policy.read.allowed ? "allowed" : "denied"}`, async () => {
        const client = roleClients[role]();
        const { error } = await client.from(table).select("id").limit(1);

        if (policy.read.allowed) {
          const hint = policy.read.note ? ` (${policy.read.note})` : "";
          expect(
            error,
            `Expected no error for ${role} SELECT on ${table}${hint}`
          ).toBeNull();
        } else {
          expect(
            isRlsError(error),
            `Expected RLS error (42501) for ${role} SELECT on ${table}, got: ${JSON.stringify(error)}`
          ).toBe(true);
        }
      });

      // ---- WRITE ------------------------------------------------------
      it(`${table} | ${role} | INSERT — ${policy.write.allowed ? "allowed" : "denied"}`, async () => {
        const client = roleClients[role]();

        // Build payload; patch in FK ids where needed
        const basePayload = { ...INSERT_PAYLOADS[table] };
        // After migration 014, assertions use a UUID[] source_ids column
        // and confidence_scores is entity-scoped (no assertion_id FK).
        if (table === "assertions" && seededSourceId) {
          basePayload.source_ids = [seededSourceId];
        }
        // Make slugs/keys unique per run to avoid unique-constraint false failures
        if (table === "editorial_doctrine") {
          (basePayload as Record<string, unknown>).slug =
            `rls-write-${role}-${Date.now()}`;
        }
        if (table === "api_keys") {
          (basePayload as Record<string, unknown>).key_hash =
            `rls-hash-${role}-${Date.now()}`;
        }

        const { data, error } = await client
          .from(table)
          .insert(basePayload)
          .select("id")
          .single();

        if (policy.write.allowed) {
          expect(
            error,
            `Expected no error for ${role} INSERT on ${table}`
          ).toBeNull();
          expect(data).not.toBeNull();
          // Clean up the row we just inserted
          if (data?.id) {
            await svc.from(table).delete().eq("id", data.id);
          }
        } else {
          expect(
            isRlsError(error),
            `Expected RLS error (42501) for ${role} INSERT on ${table}, got: ${JSON.stringify(error)}`
          ).toBe(true);
        }
      });
    }
  }
});
