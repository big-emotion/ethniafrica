-- Migration 036 — Epic 10 Smart Quiz engine schema (idempotent)
--
-- Story: ETNI-490 [10.1] Quiz engine schema (migration `0NN_quiz_engine.sql`)
-- Epic:  10 (Smart Quiz), FR65, AR2-pattern, AR45
--
-- Creates the quiz_audience enum, quiz_generation_runs, quiz_questions, the
-- partial serving index, and RLS policies exactly as sketched in the Epic 10
-- spec (_bmad-output/planning-artifacts/module-specs/epic-10-smart-quiz.md,
-- "New Supabase tables (migration sketch)").
--
-- Module 0 reuse (009_module_zero_fabric.sql): entity_type stays plain TEXT
-- (no enum — same convention followed by 035_migration_events.sql for
-- 'migration'), and assertion_id references the existing assertions(id)
-- table. No competing entity_type or assertions definitions are introduced
-- here.
--
-- Fully idempotent — safe to re-run against an environment where it has
-- already been applied. Applied by a human via `supabase db push`, never
-- automatically (AR45 runbook).
-- =============================================================================

do $$ begin
  create type quiz_audience as enum
    ('children','teens','adults','university','professionals');
exception when duplicate_object then null; end $$;

create table if not exists quiz_generation_runs (
  id                 uuid primary key default gen_random_uuid(),
  ran_at             timestamptz not null default now(),
  confidence_threshold smallint not null,
  questions_generated  integer not null default 0,
  questions_revoked    integer not null default 0,
  candidates_rejected  integer not null default 0,
  notes              text
);

comment on table quiz_generation_runs is
  'Auditable history of quiz-bank generation sweeps (publicly readable). ETNI-490, Epic 10.';

create table if not exists quiz_questions (
  id                  uuid primary key default gen_random_uuid(),
  template_id         text not null,                    -- 'T1'..'T5'
  audience            quiz_audience not null,
  difficulty          smallint not null check (difficulty between 1 and 5),
  entity_type         text not null,                    -- Module 0 TEXT convention (009)
  entity_id           text not null,                    -- e.g. PPL_xxxxx
  field_path          text not null,
  prompt_fr           text not null,
  options_fr          jsonb not null,                   -- array of 4 strings
  correct_option      smallint not null check (correct_option between 0 and 3),
  explanation_fr      text not null,
  assertion_id        uuid not null references assertions(id),
  source_ids          uuid[] not null,
  confidence_at_generation smallint not null,
  generation_run_id   uuid not null references quiz_generation_runs(id),
  generated_at        timestamptz not null default now(),
  revoked_at          timestamptz,
  revoked_reason      text
);

comment on table quiz_questions is
  'Generated quiz questions, revocable and publicly readable while revoked=null. Module-private to Epic 10 — no other epic depends on this table. ETNI-490.';

create index if not exists idx_quiz_questions_serving
  on quiz_questions (audience, difficulty)
  where revoked_at is null;
create index if not exists idx_quiz_questions_entity
  on quiz_questions (entity_type, entity_id);

alter table quiz_questions enable row level security;
alter table quiz_generation_runs enable row level security;

drop policy if exists quiz_questions_public_read on quiz_questions;
create policy quiz_questions_public_read on quiz_questions
  for select using (revoked_at is null);
-- writes: service-role only (no insert/update policies for anon/authenticated)
drop policy if exists quiz_runs_public_read on quiz_generation_runs;
create policy quiz_runs_public_read on quiz_generation_runs
  for select using (true);   -- generation audit is public (transparency posture)
