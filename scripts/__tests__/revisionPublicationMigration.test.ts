import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const notificationMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/024_pg_notify_cache_invalidation.sql"
  ),
  "utf8"
);
const publicationMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/051_revision_publication.sql"),
  "utf8"
);

describe("revision publication migration contract", () => {
  // @req REQ-016
  it("keeps cache invalidation on the existing revisions insert trigger", () => {
    expect(notificationMigration).toContain(
      "CREATE TRIGGER revisions_cache_notify"
    );
    expect(notificationMigration).toContain("AFTER INSERT ON revisions");
    expect(notificationMigration).toContain("'cache_invalidate'");
    expect(notificationMigration).toContain("'entity_type', NEW.entity_type");
    expect(notificationMigration).toContain("'entity_id',   NEW.entity_id");
    expect(publicationMigration).not.toContain(
      "CREATE TRIGGER revisions_cache_notify"
    );
  });

  // @req REQ-016
  it("exposes one authenticated atomic publication RPC", () => {
    expect(publicationMigration).toContain(
      "CREATE OR REPLACE FUNCTION publish_revision("
    );
    expect(publicationMigration).toMatch(
      /p_draft_id\s+UUID[\s\S]{0,80}p_reason\s+TEXT/i
    );
    expect(publicationMigration).toContain("RETURNS revisions");
    expect(publicationMigration).toContain("SECURITY DEFINER");
    expect(publicationMigration).toContain(
      "GRANT EXECUTE ON FUNCTION publish_revision(UUID, TEXT) TO authenticated"
    );
    expect(publicationMigration).toContain(
      "REVOKE ALL ON FUNCTION publish_revision(UUID, TEXT) FROM PUBLIC"
    );
  });

  // @req REQ-016
  it("validates the publisher role and reason before locking or mutating rows", () => {
    const roleGate = publicationMigration.indexOf(
      "v_moderator_role NOT IN ('senior_editor', 'admin')"
    );
    const reasonGate = publicationMigration.indexOf(
      "char_length(v_reason) NOT BETWEEN 50 AND 500"
    );
    const draftLock = publicationMigration.indexOf("FOR UPDATE;");
    const firstMutation = publicationMigration.indexOf("INSERT INTO revisions");

    expect(publicationMigration).toContain("v_actor_id := auth.uid()");
    expect(publicationMigration).toContain("FROM contributor_profiles");
    expect(roleGate).toBeGreaterThan(-1);
    expect(reasonGate).toBeGreaterThan(roleGate);
    expect(draftLock).toBeGreaterThan(reasonGate);
    expect(firstMutation).toBeGreaterThan(draftLock);
  });

  // @req REQ-016
  it("locks publication versioning race-safely and resolves live doctrine", () => {
    expect(publicationMigration).toContain("pg_advisory_xact_lock");
    expect(publicationMigration).toContain("COALESCE(MAX(version), 0) + 1");
    expect(publicationMigration).toContain("FROM editorial_doctrine");
    expect(publicationMigration).toContain("superseded_at IS NULL");
    expect(publicationMigration).toContain("published_at IS NOT NULL");
    expect(publicationMigration).toContain("ORDER BY published_at DESC");
    expect(publicationMigration).toContain(
      "No published editorial doctrine is available"
    );
  });

  // @req REQ-016
  it("whitelists the four generic AFRIK entity types and updates only content", () => {
    const mappings = [
      ["people", "afrik_peoples"],
      ["language_family", "afrik_language_families"],
      ["language", "afrik_languages"],
      ["country", "afrik_countries"],
    ];

    for (const [entityType, table] of mappings) {
      expect(publicationMigration).toContain(`WHEN '${entityType}' THEN`);
      expect(publicationMigration).toContain(`UPDATE ${table}`);
    }
    expect(publicationMigration).toContain("SET content = v_draft_fields");
    expect(publicationMigration).toContain("Unsupported revision entity type");
  });

  // @req REQ-016
  it("builds the immutable snapshot from fields, assertions, sources, and doctrine", () => {
    expect(publicationMigration).toContain(
      "v_snapshot := v_live_fields || jsonb_build_object("
    );
    expect(publicationMigration).toContain(
      "'assertions', v_snapshot_assertions"
    );
    expect(publicationMigration).toContain("'sources', v_snapshot_sources");
    expect(publicationMigration).toContain(
      "'doctrine_version_id', v_doctrine_version_id"
    );
    expect(publicationMigration).toContain("snapshot_jsonb");
  });

  // @req REQ-016
  it("preserves unchanged active assertions and their sources in the snapshot", () => {
    const existingAssertions = publicationMigration.indexOf(
      "v_existing_assertion assertions%ROWTYPE"
    );
    const snapshotSources = publicationMigration.indexOf(
      "SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.id)"
    );

    expect(existingAssertions).toBeGreaterThan(-1);
    expect(publicationMigration).toContain("a.superseded_by IS NULL");
    expect(publicationMigration).toContain(
      "NOT (a.field_path = ANY(v_seen_field_paths))"
    );
    expect(publicationMigration).toContain(
      "jsonb_build_array(to_jsonb(v_existing_assertion))"
    );
    expect(publicationMigration).toContain("v_existing_assertion.source_ids");
    expect(publicationMigration).toContain(
      "v_replacement_assertions := v_snapshot_assertions"
    );
    expect(publicationMigration).toContain(
      "FROM jsonb_array_elements(v_replacement_assertions)"
    );
    expect(snapshotSources).toBeGreaterThan(existingAssertions);
  });

  // @req REQ-016
  it("inserts the immutable and fiche revisions before replacing assertions", () => {
    const immutableRevision = publicationMigration.indexOf(
      "INSERT INTO revisions"
    );
    const ficheRevision = publicationMigration.indexOf(
      "INSERT INTO fiche_revisions"
    );
    const assertionInsert = publicationMigration.indexOf(
      "INSERT INTO assertions"
    );
    const assertionSupersede = publicationMigration.indexOf(
      "UPDATE assertions",
      assertionInsert
    );

    expect(immutableRevision).toBeGreaterThan(-1);
    expect(ficheRevision).toBeGreaterThan(immutableRevision);
    expect(assertionInsert).toBeGreaterThan(ficheRevision);
    expect(assertionSupersede).toBeGreaterThan(assertionInsert);
    expect(publicationMigration).toContain(
      "SET superseded_by = v_assertion_id"
    );
  });

  // @req REQ-016
  it("deletes the draft and accepts linked flags with revision notes", () => {
    expect(publicationMigration).toContain("DELETE FROM revision_drafts");
    expect(publicationMigration).toContain("SET status = 'under_review'");
    expect(publicationMigration).toContain("SET status = 'accepted'");
    expect(publicationMigration).toContain("moderator_notes");
    expect(publicationMigration).toContain("v_revision_id::TEXT");
  });

  // @req REQ-016
  it("writes the publication audit entry inside the RPC", () => {
    expect(publicationMigration).toContain("INSERT INTO audit_log");
    expect(publicationMigration).toContain("'revision_published'");
    expect(publicationMigration).toContain("'linked_flags'");
    expect(publicationMigration).toContain("'reason'");
    expect(publicationMigration).toContain("target_id");
    expect(publicationMigration).toContain("details_jsonb");
  });
});
