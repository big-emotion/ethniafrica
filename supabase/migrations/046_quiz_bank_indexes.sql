-- 046_quiz_bank_indexes.sql
-- Epic 10 — the bank grows a second entity type and six more templates
-- (REQ-121), so the indexes 036 shipped no longer match how it is read.
--
-- `idx_quiz_questions_serving (audience, difficulty)` leads on a column that
-- has held one value since the audience axis was retired: it can discriminate
-- nothing, and every serving read scans past it.
--
-- The unique index is the point of this migration. A question is identified by
-- `(entity_id, template_id)` among the rows that are not revoked, and that rule
-- lived **in memory only**, inside `computeSweepPlan`. Two concurrent sweeps
-- would have inserted the same question twice with nothing to stop them, and
-- the bank has already been counted wrong once for a related reason (11 879
-- rows that were 2 504 questions).
--
-- Applied by a human via `supabase db push`, recette first, production second
-- (AR45 runbook). **Apply it after a successful `--rebuild`, not before**: a
-- duplicate already sitting in the bank makes the unique index fail to build,
-- and the failure would be blamed on the migration rather than on what it
-- found.

drop index if exists idx_quiz_questions_serving;

create index if not exists idx_quiz_questions_active_subject
  on quiz_questions (entity_type, entity_id, template_id)
  where revoked_at is null;

create unique index if not exists uq_quiz_questions_active_identity
  on quiz_questions (entity_id, template_id)
  where revoked_at is null;
