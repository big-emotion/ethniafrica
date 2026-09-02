-- Migration 078 — revoke the ISO-code questions left by the retired T5 template
--
-- Context: T5 asked « Quel code ISO 639-3 désigne la langue X ? ». It is
-- retired in code under games charter §8 — technical vocabulary belongs in the
-- reveal, never in the stem — and its kill test: a registry identifier is not a
-- name, so the round could only be recalled, never reasoned about. On the fiche
-- PPL_BANTU it was also plainly wrong, interpolating a family gloss behind
-- « la langue » and answering `swh`, which is Swahili.
--
-- Why the code change alone is not enough. The serving side resolves a
-- question's theme from `field_path`, never from `template_id`
-- (src/api/v2/services/quizService.ts, themeOfFieldPath in
-- src/lib/quiz/segmentPolicy.ts). Retiring the template removes the generator
-- and nothing else: the 621 rows already in the bank stay active and keep being
-- served, while themeOfFieldPath now answers null for them — counted in the
-- picker's total and in no theme at all. Ghost questions.
--
-- Filtering on `field_path` rather than `template_id` for the same reason: it
-- is the column the serving side reads, so it is the column that defines the
-- ghost. A row at this path under some other template id would be just as
-- unreachable.
--
-- The revocation is soft. The RLS policy quiz_questions_public_read filters on
-- `revoked_at is null`, so the rows leave the serving surface and the search
-- index (069, partial index) at once, without losing the audit trail. Rollback
-- is `set revoked_at = null, revoked_reason = null` on this reason marker.
--
-- Idempotent through `where revoked_at is null`, so a replay is a no-op.
--
-- ORDER MATTERS, and it is asymmetric. Apply this BEFORE the code reaches an
-- environment. Revoking under the old code drops 621 questions and lowers a few
-- counters; deploying the new code without revoking serves 621 ghosts. And do
-- not run scripts/generateQuizQuestions before this migration: with T5 gone
-- from the registry, normalizeFieldPath no longer recognises this path, so
-- decideRevocation would revoke the same rows under `gate_failed:entity_missing`
-- — a reason that means « the fiche disappeared » and would be a lie.
--
-- Two-step rollout: recette first, production second (both Supabase projects
-- are labelled "production"; see docs/runbooks/migration-state.md).
--
-- Measured on recette before writing this: 621 active rows at this path, and
-- 8 scope × theme pairs fall under the 8-question floor as a result — the
-- countries Eswatini, Comores, Somalie, Algérie and Égypte, and the families
-- Tuu, Kx'a and Nilo-saharienne, all on the « Langues » theme. They were
-- playable only on the strength of a broken question; the picker already
-- withholds a pair it cannot fill, so they leave it with no new error state.

UPDATE quiz_questions
   SET revoked_at     = now(),
       revoked_reason = 'template_retired_t5'
 WHERE revoked_at IS NULL
   AND field_path = 'content.languages.isoCodes';

-- Migration 046 documents this column as « Null on T1-T5 and T12 ». That file
-- is applied and must not be edited — check:migration-state would class it as
-- drifted — so the correction is a fresh comment here.
COMMENT ON COLUMN quiz_questions.stimulus_fr IS
  'Verbatim corpus fragment an inversion round quotes above its stem. '
  'Null on T1-T4 and T12, which name their subject in prompt_fr.';
