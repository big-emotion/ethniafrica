/**
 * Shared source of truth for the migration `eventType` open enum (Story 12.1).
 * Kept in lockstep with `public/modele-migration.json` `_meta.eventTypeEnum`
 * (asserted equal by `src/lib/afrik/__tests__/migrationEventTypes.test.ts`)
 * and with the SQL migration's `ADD VALUE` labels (asserted by
 * `src/lib/afrik/__tests__/colonialEventTypes.test.ts`, Story 13.1).
 * Epic 13 extends both together per the Extension contract — no other file
 * may hardcode this list.
 */
// @req REQ-080
export const MIGRATION_EVENT_TYPES = [
  "expansion",
  "trade_route",
  "forced_displacement",
  "pastoral_movement",
  // Epic 13 (ETNI-525) — colonization event types, added via
  // supabase/migrations/037_colonization_event_types.sql.
  "fragmentation",
  "displacement",
  "imposed_name",
  "resistance",
] as const;

export type MigrationEventType = (typeof MIGRATION_EVENT_TYPES)[number];

/**
 * The four Epic 13 event types (Story 13.1) rendered by the colonization
 * module's timeline (Story 13.12, ETNI-536) — a fixed subset of
 * `MIGRATION_EVENT_TYPES`, not a competing list.
 */
export const COLONIAL_EVENT_TYPES = [
  "fragmentation",
  "displacement",
  "imposed_name",
  "resistance",
] as const;

export type ColonialEventType = (typeof COLONIAL_EVENT_TYPES)[number];
