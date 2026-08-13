import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/035_migration_events.sql"),
  "utf8"
);

describe("035_migration_events.sql migration contract", () => {
  // @req REQ-080
  it("declares the migration_event_type enum idempotently with the four MVP values", () => {
    expect(migration).toContain("CREATE TYPE migration_event_type AS ENUM");
    expect(migration).toContain(
      "('expansion', 'trade_route', 'forced_displacement', 'pastoral_movement')"
    );
    expect(migration).toContain("EXCEPTION WHEN duplicate_object THEN NULL");
  });

  // @req REQ-080
  it("declares migration_events with the id/time/classification constraints", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS migration_events");
    expect(migration).toContain(
      "id                    text PRIMARY KEY CHECK (id ~ '^MGR_[A-Z0-9_]+$')"
    );
    expect(migration).toContain("slug                  text UNIQUE NOT NULL");
    expect(migration).toContain(
      "event_type            migration_event_type NOT NULL"
    );
    expect(migration).toContain(
      "classification_status classification_status NOT NULL"
    );
    expect(migration).toContain("time_start_year       int NOT NULL");
    expect(migration).toContain(
      "time_end_year         int NOT NULL CHECK (time_end_year >= time_start_year)"
    );
    expect(migration).toContain("geometry_geojson      jsonb NOT NULL");
  });

  // @req REQ-080
  it("declares migration_event_peoples referencing afrik_peoples with a composite PK", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS migration_event_peoples"
    );
    expect(migration).toContain(
      "migration_id text NOT NULL REFERENCES migration_events(id) ON DELETE CASCADE"
    );
    expect(migration).toContain(
      "people_id    text NOT NULL REFERENCES afrik_peoples(id)"
    );
    expect(migration).toContain("PRIMARY KEY (migration_id, people_id)");
  });

  // @req REQ-080
  it("declares the (time_start_year, time_end_year) index and the peoples lookup index", () => {
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_migration_events_time"
    );
    expect(migration).toContain(
      "ON migration_events (time_start_year, time_end_year)"
    );
    expect(migration).toContain(
      "CREATE INDEX IF NOT EXISTS idx_migration_event_peoples_people"
    );
    expect(migration).toContain("ON migration_event_peoples (people_id)");
  });

  // @req REQ-080
  it("enables RLS on both tables with public-read and moderator/admin-write policies", () => {
    expect(migration).toContain(
      "ALTER TABLE migration_events ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain(
      "ALTER TABLE migration_event_peoples ENABLE ROW LEVEL SECURITY"
    );
    expect(migration).toContain("FOR SELECT USING (true)");
    expect(migration).toContain("user_roles.role IN ('moderator', 'admin')");
    expect(migration).toContain("DROP POLICY IF EXISTS");
  });

  // @req REQ-080
  it("documents the fabric audit finding for hard-coded entity-type lists", () => {
    expect(migration).toContain("Fabric audit");
    expect(migration).toContain("recompute_confidence");
  });
});
