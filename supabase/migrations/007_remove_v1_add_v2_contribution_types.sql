-- Migration 007: Remove V1 tables and add V2 contribution types
-- This migration removes the legacy V1 schema (regions, countries, ethnic_groups, etc.)
-- and adds new contribution types for the V2 AFRIK data model.

-- ============================================
-- 1. ADD NEW CONTRIBUTION TYPES (V2 AFRIK)
-- ============================================
-- Note: PostgreSQL enums cannot have values removed without recreating the type.
-- We add the new V2 values; the old V1 values remain in the enum but are unused.

ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'new_people';
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'update_people';
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'new_language_family';
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'update_language_family';

-- ============================================
-- 2. DROP V1 TABLES (dependency order)
-- ============================================

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS ethnic_group_sources CASCADE;
DROP TABLE IF EXISTS ethnic_group_languages CASCADE;
DROP TABLE IF EXISTS ethnic_group_presence CASCADE;
DROP TABLE IF EXISTS ethnic_groups CASCADE;
DROP TABLE IF EXISTS languages CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS african_regions CASCADE;
