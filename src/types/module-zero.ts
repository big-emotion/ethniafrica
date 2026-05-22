/**
 * TypeScript row types for the Module #0 / per-assertion schema tables.
 * Reflects the post-018 layout (ETNI-207).
 *
 * Naming: *Row = direct DB column names; *Insert = required-only shape for
 * inserts; *Record = camelCase application-layer shape.
 */

// ---------------------------------------------------------------------------
// fiche_revisions
// ---------------------------------------------------------------------------

export interface FicheRevisionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  version: number;
  content_snapshot: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
}

export interface FicheRevisionInsert {
  id?: string;
  entity_type: string;
  entity_id: string;
  version: number;
  content_snapshot: Record<string, unknown>;
  published_at?: string | null;
}

// ---------------------------------------------------------------------------
// assertions (post-018 additions)
// ---------------------------------------------------------------------------

export interface AssertionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  field_path: string;
  statement: string | null;
  position: string | null;
  source_ids: string[] | null;
  confidence_level: "high" | "medium" | "low" | "contested" | null;
  fiche_revision_id: string;
  authored_at: string | null;
  authored_by: string | null;
  superseded_by: string | null;
}

// ---------------------------------------------------------------------------
// flags (post-018 additions)
// ---------------------------------------------------------------------------

export interface FlagRow {
  id: string;
  entity_type: string;
  entity_id: string;
  flag_type: string;
  description: string | null;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  created_by: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  auto_generated: boolean;
  /** FK to assertions(id). NULL = entity-level flag. */
  assertion_id: string | null;
  /** Optional field path within the assertion being flagged. */
  assertion_field_path: string | null;
}
