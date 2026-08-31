-- Migration 037 — Epic 13 colonization event types on migration_event_type (idempotent)
--
-- Story: ETNI-525 [13.1] Event-type enum extension migration
-- Epic:  13 (Colonization & Resistance), FR87, FR89
--
-- Extends Epic 12's open `migration_event_type` enum (created in
-- 035_migration_events.sql) with the four Epic 13 colonization event types,
-- per the Extension contract documented in 035_migration_events.sql: Epic 13
-- adds values via `ALTER TYPE ... ADD VALUE`, in its own migration file,
-- rather than modeling a competing schema (FR87, FR89).
--
-- `ADD VALUE IF NOT EXISTS` is idempotent — re-applying this file is a no-op.
--
-- AR45: applied manually via `supabase db push` by a human — never
-- auto-applied.
-- =============================================================================

ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'fragmentation';
ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'displacement';
ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'imposed_name';
ALTER TYPE migration_event_type ADD VALUE IF NOT EXISTS 'resistance';
