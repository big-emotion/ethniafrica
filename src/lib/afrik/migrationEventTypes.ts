/**
 * Shared source of truth for the migration `eventType` open enum (Story 12.1).
 * Kept in lockstep with `public/modele-migration.json` `_meta.eventTypeEnum`
 * (asserted equal by `src/lib/afrik/__tests__/migrationEventTypes.test.ts`).
 * Epic 13 extends both together per the Extension contract — no other file
 * may hardcode this list.
 */
// @req REQ-080
export const MIGRATION_EVENT_TYPES = [
  "expansion",
  "trade_route",
  "forced_displacement",
  "pastoral_movement",
] as const;

export type MigrationEventType = (typeof MIGRATION_EVENT_TYPES)[number];
