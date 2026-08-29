-- 046_quiz_stimulus.sql
-- Epic 10 — the inversion templates (T6-T11, REQ-121).
--
-- A round whose answer is the subject has to show the reader something first:
-- a verbatim fragment of the fiche's own prose. T1-T5 and T12 name their
-- subject inside `prompt_fr` and set nothing up, so the column is nullable and
-- stays null for them rather than carrying an empty string.
--
-- Not folded into `prompt_fr`. The card renders that as its <legend>, in bold
-- display type; a 400-character paragraph in there is unreadable, and the two
-- pieces are a stimulus and a stem, which the games charter §2 keeps apart.
--
-- Applied by a human via `supabase db push`, recette first, production second
-- (AR45 runbook). Rebuilding the bank afterwards is a separate, deliberate step
-- — see docs/runbooks/quiz-bank-regeneration.md.

alter table quiz_questions
  add column if not exists stimulus_fr text;

comment on column quiz_questions.stimulus_fr is
  'Verbatim fiche prose shown above the stem, for templates whose answer is the subject. Null on T1-T5 and T12.';
