import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const readMigration = (file: string): string =>
  fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations", file),
    "utf8"
  );

const PINNING = "076_pin_function_search_path.sql";
const EXPOSURE = "077_unexpose_privileged_functions.sql";

const escapeForRegex = (literal: string): string =>
  literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The functions the Supabase security linter reported with a mutable
 * search_path on the recette project (shmrjtnfbqzceovroqjj) on 2026-09-02.
 *
 * The inventory is the point of this test. Pinning nineteen of the twenty
 * leaves the escalation path open on exactly the one nobody thought about,
 * and the linter only says so again once the migration has already shipped.
 */
const MUTABLE_SEARCH_PATH_FUNCTIONS = [
  "audit_assertion_changes()",
  "audit_log_enforce_append_only()",
  "enforce_alliance_source()",
  "enforce_assertion_required()",
  "enforce_name_record_sources()",
  "enforce_person_sources()",
  "flags_compute_slug(UUID, INTEGER)",
  "flags_enforce_state_machine()",
  "flags_set_public_slug()",
  "protected_record_audit_append_only()",
  "protected_record_public_state(protected_records)",
  "recompute_confidence(TEXT, TEXT)",
  "recompute_confidence_all()",
  "revisions_enforce_append_only()",
  "revisions_notify_cache_invalidation()",
  "trg_flags_recompute_confidence()",
  "trg_revisions_recompute_confidence()",
  "update_api_key_last_used(TEXT)",
  "update_updated_at_column()",
  "validate_people_historical_affiliation(JSONB)",
];

/**
 * Trigger functions carry no EXECUTE requirement at fire time — the privilege
 * is checked when the trigger is created, never when it runs — so revoking
 * their grants costs nothing and takes them off the RPC surface.
 */
const TRIGGER_FUNCTIONS = [
  "audit_assertion_changes()",
  "audit_log_enforce_append_only()",
  "enforce_alliance_source()",
  "enforce_assertion_required()",
  "enforce_name_record_sources()",
  "enforce_person_sources()",
  "flags_enforce_state_machine()",
  "flags_set_public_slug()",
  "log_protected_record_state_change()",
  "protected_record_audit_append_only()",
  "revisions_enforce_append_only()",
  "revisions_notify_cache_invalidation()",
  "trg_flags_recompute_confidence()",
  "trg_revisions_recompute_confidence()",
  "update_updated_at_column()",
];

/** The three predicates every role-gated RLS policy calls. */
const POLICY_PREDICATES = [
  "is_admin",
  "is_moderator_or_admin",
  "is_protected_records_editor",
];

/**
 * Every policy whose expression names one of those predicates, as measured on
 * recette. The last one lives in `storage`, not `public`, which is why it is
 * the one an audit reading only the public schema misses — and dropping a
 * predicate a storage policy still calls fails the whole migration.
 */
const PREDICATE_POLICIES = [
  ["public.user_roles", "user_roles_admin_insert"],
  ["public.user_roles", "user_roles_admin_update"],
  ["public.user_roles", "user_roles_admin_delete"],
  ["public.name_records", "name_records_write_moderator_insert"],
  ["public.name_records", "name_records_write_moderator_update"],
  ["public.name_records", "name_records_write_moderator_delete"],
  ["public.migration_events", "migration_events_write_moderator_insert"],
  ["public.migration_events", "migration_events_write_moderator_update"],
  ["public.migration_events", "migration_events_write_moderator_delete"],
  [
    "public.migration_event_peoples",
    "migration_event_peoples_write_moderator_insert",
  ],
  [
    "public.migration_event_peoples",
    "migration_event_peoples_write_moderator_update",
  ],
  [
    "public.migration_event_peoples",
    "migration_event_peoples_write_moderator_delete",
  ],
  ["public.protected_records", "protected_records_editorial_select"],
  ["public.protected_record_audit", "protected_record_audit_editorial_select"],
  ["storage.objects", "protected_records_storage_editorial_select"],
];

describe("076 — pinning every mutable search_path", () => {
  // @req REQ-054
  it("pins all twenty functions the linter reported", () => {
    const migration = readMigration(PINNING);

    const unpinned = MUTABLE_SEARCH_PATH_FUNCTIONS.filter(
      (signature) =>
        !new RegExp(
          `ALTER\\s+FUNCTION\\s+public\\.${escapeForRegex(
            signature
          )}\\s+SET\\s+search_path\\s*=`,
          "i"
        ).test(migration)
    );

    expect(unpinned).toEqual([]);
  });

  // @req REQ-054
  it("pins to a fixed list that still ends with pg_temp", () => {
    const migration = readMigration(PINNING);
    const pins = migration.match(/SET\s+search_path\s*=[^;]+/gi) ?? [];

    expect(pins).toHaveLength(MUTABLE_SEARCH_PATH_FUNCTIONS.length);
    for (const pin of pins) {
      expect(pin.trim()).toMatch(/pg_temp$/);
    }
  });

  // @req REQ-054
  it("redefines no function, so no behaviour rides along with the pin", () => {
    const migration = readMigration(PINNING);

    expect(migration).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
  });
});

describe("077 — taking privileged functions off the RPC surface", () => {
  // @req REQ-054
  it("revokes EXECUTE from PUBLIC, not only from anon and authenticated", () => {
    const migration = readMigration(EXPOSURE);

    const stillGranted = [
      ...TRIGGER_FUNCTIONS,
      "update_api_key_last_used(TEXT)",
    ].filter(
      (signature) =>
        !new RegExp(
          `REVOKE\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${escapeForRegex(
            signature
          )}\\s+FROM\\s+PUBLIC\\s*,\\s*anon\\s*,\\s*authenticated`,
          "i"
        ).test(migration)
    );

    expect(stillGranted).toEqual([]);
  });

  // @req REQ-054
  it("never revokes EXECUTE on a predicate an RLS policy evaluates", () => {
    const migration = readMigration(EXPOSURE);

    for (const predicate of POLICY_PREDICATES) {
      expect(migration).not.toMatch(
        new RegExp(`REVOKE\\s+EXECUTE[^;]*\\b${predicate}\\b`, "i")
      );
    }
  });

  // @req REQ-054
  it("rehomes each predicate in a schema PostgREST does not expose", () => {
    const migration = readMigration(EXPOSURE);

    expect(migration).toMatch(/CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+private/i);
    expect(migration).toMatch(
      /GRANT\s+USAGE\s+ON\s+SCHEMA\s+private\s+TO\s+[^;]*authenticated/i
    );

    for (const predicate of POLICY_PREDICATES) {
      expect(migration).toMatch(
        new RegExp(
          `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+private\\.${predicate}\\(\\)`,
          "i"
        )
      );
      expect(migration).toMatch(
        new RegExp(
          `DROP\\s+FUNCTION\\s+IF\\s+EXISTS\\s+public\\.${predicate}\\(\\)`,
          "i"
        )
      );
    }
  });

  // @req REQ-054
  it("repoints every policy that calls a predicate before dropping it", () => {
    const migration = readMigration(EXPOSURE);

    const stillPointingAtPublic = PREDICATE_POLICIES.filter(
      ([table, policy]) =>
        !new RegExp(
          `ALTER\\s+POLICY\\s+${policy}\\s+ON\\s+${escapeForRegex(table)}\\b`,
          "i"
        ).test(migration)
    );

    expect(stillPointingAtPublic).toEqual([]);

    const firstDropAt = migration.search(
      /DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.is_/i
    );
    const lastRepointAt = migration.toUpperCase().lastIndexOf("ALTER POLICY");
    expect(lastRepointAt).toBeLessThan(firstDropAt);
  });

  // @req REQ-054
  it("leaves publish_revision callable by signed-in users", () => {
    const migration = readMigration(EXPOSURE);

    expect(migration).not.toMatch(/REVOKE[^;]*publish_revision/i);
  });
});
