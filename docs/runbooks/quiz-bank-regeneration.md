# Runbook — regenerating the quiz question bank

## Why this exists

Improving `scripts/lib/quizGeneration.ts` improves **no question a player
sees**. The questions are persisted rows in `quiz_questions` (migration
`036_quiz_engine.sql`) and `quizService.ts` reads that table; the templates are
only what produced them, once.

Worse, the ordinary sweep will not replace them either. `computeSweepPlan`
skips any `(entity, template, audience)` triple that already has an active
question — deliberately, so the nightly run is idempotent. After a change to
how options are built, that idempotence is exactly what keeps the change out
of the bank.

`--rebuild` is the way through: it revokes every **healthy** active question
with the reason `regenerated`, so the sweep rebuilds it. A question that was
going to be revoked anyway keeps its own reason, because that reason is the
audit trail.

Run this when the generator's output changes — new or reordered distractor
pools, a new template, a changed prompt. Not otherwise: it rewrites the bank.

## Before you start

- The script talks to **one** database, the one its environment points at.
  Both Supabase projects call their environment "production"; that word
  describes the project, not the application. `shmrjtnfbqzceovroqjj` serves
  **recette**. A second project, whose credentials are not in this repo,
  serves production. See `docs/runbooks/afrik-data-sync.md`.
- **Recette first, production second.** Always. The two banks are independent
  and there is no promotion step — the same command is run twice, against two
  environments.
- **A missing environment is not an error.** With `NEXT_PUBLIC_SUPABASE_URL`
  or `SUPABASE_SERVICE_ROLE_KEY` unset the script logs `DRY RUN` and exits 0.
  A green exit is therefore not evidence that anything ran. Read the log line.

## Procedure, per environment

### 1. Record what is there now

```sql
select count(*) from quiz_questions where revoked_at is null;
select audience, count(*) from quiz_questions
  where revoked_at is null group by audience order by audience;
```

Keep both numbers. They are the only way to notice that a rebuild came back
with fewer questions than it replaced.

### 2. Audit the bank before touching it

```bash
npx tsx scripts/generateQuizQuestions.ts --check
```

Read-only, and exits non-zero on any QZ-1..QZ-5 violation. A bank that is
already failing should be understood before it is rewritten — a rebuild would
otherwise be blamed for what it inherited.

### 3. Rebuild

```bash
npx tsx scripts/generateQuizQuestions.ts --rebuild
```

One `quiz_generation_runs` row is written per sweep. Note its id: it is what
identifies this batch afterwards.

The log line states `questions_generated`, `questions_revoked` and
`candidates_rejected`. **`generated` well below `revoked` means the rebuild
lost questions**, not that it improved them — stop and find out why before
going near the other environment. The usual cause is a fiche that has since
stopped passing the FR65 gate, which the counters and the revocation reasons
will show.

### 4. Verify

```sql
select count(*) from quiz_questions where revoked_at is null;
select revoked_reason, count(*) from quiz_questions
  where revoked_at is not null group by revoked_reason;
```

The active count should be at or near what step 1 recorded. Then play a full
session at `/fr/quiz` and read four or five questions: the distractors should
be peoples of the subject's own family or of a country it shares, not the
same three names on every question.

### 5. Only then, production

Repeat steps 1–4 against the production project. Nothing is copied between
the two; the command is simply run again, with production's credentials.

## If it goes wrong

Revocation is soft — `revoked_at` and `revoked_reason` are set, rows are never
deleted — so the previous bank is still there.

```sql
-- Remove the batch this run inserted.
delete from quiz_questions where generation_run_id = '<run id from step 3>';

-- Restore the questions that run revoked.
update quiz_questions
   set revoked_at = null, revoked_reason = null
 where revoked_reason = 'regenerated'
   and revoked_at = '<the revokedAt timestamp of that run>';
```

Restore only the `regenerated` rows. Anything revoked for a gate failure or a
stale answer left the bank on its own merits and must stay out.
