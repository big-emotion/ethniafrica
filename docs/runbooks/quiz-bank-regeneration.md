# Runbook — regenerating the quiz question bank

## Why this exists

Improving `scripts/lib/quizGeneration.ts` improves **no question a player
sees**. The questions are persisted rows in `quiz_questions` (migration
`036_quiz_engine.sql`) and `quizService.ts` reads that table; the templates are
only what produced them, once.

Worse, the ordinary sweep will not replace them either. `computeSweepPlan`
skips any `(entity, template)` pair that already has an active question —
deliberately, so the nightly run is idempotent. After a change to
how options are built, that idempotence is exactly what keeps the change out
of the bank.

`--rebuild` is the way through: it revokes every **healthy** active question
with the reason `regenerated`, so the sweep rebuilds it. A question that was
going to be revoked anyway keeps its own reason, because that reason is the
audit trail.

Run this when the generator's output changes — new or reordered distractor
pools, a new template, a changed prompt. Not otherwise: it rewrites the bank.

## What is automatic, and what this runbook is still for

The **ordinary sweep** now runs on both environments without anyone asking:
`recette-data-sync.yml` after a merge into `recette`, and
`production-data-sync.yml` after a production deploy or a manual dispatch.

On production it is a **job of its own**, not a step after the corpus load, and
that is not tidiness. The apply step there has never once run to completion —
v4.2.3 through v4.5.0, five consecutive deploys, each killed at a 20-minute
budget against the 90 minutes recette needs for the identical loader, and each
reported as a bare `cancelled` under a green release. A bank chained behind
that step is a bank that stays empty however carefully the step is written. The
budget is fixed too, but the decoupling is what makes the sweep dependable.

Until then it ran on neither. Recette had a bank only because someone typed the
command, and production never had one at all — which is the failure worth
keeping, because every part of it was green. The corpus loader ran, the deploy
succeeded, the route was built and reachable, and the bank stayed at **zero
rows**, because loading fiches writes no question. The hub reads an empty
`quiz_questions` the way it reads any empty corpus, so it offered the reader an
inert **Bientôt**. Measured on 5 September 2026 through `/api/v2/quiz/scopes`:
54 countries, 24 families and 9 themes, every one at `activeQuestionCount: 0`.

The nightly `--check` could not have caught it. It reads
`secrets.NEXT_PUBLIC_SUPABASE_URL`, which is **recette's**, so the only gate the
bank has was pointed at the one environment that had a bank.

The sweep is idempotent, so automating it can only add what the corpus newly
supports and revoke what it no longer does. **It can never replace a question
that already exists** — which is exactly the case this runbook remains for.
`--rebuild` stays manual and stays per environment.

## The order that matters, and why it is not the obvious one

**A rebuild alone regenerates nothing new.** `evaluateCandidate` refuses any
question whose field path has no `assertions` row behind it (FR66), so a
template added without its provenance produces `no_assertion` for every fiche
and the rebuild comes back with the bank it started from. Provenance first, then
the rebuild — never the reverse.

Per environment, in this order:

1. **Migrations.** `supabase db push`. `046_quiz_stimulus.sql` adds the column
   the inversion templates write; `047_quiz_bank_indexes.sql` is the exception
   below.
2. **`npx tsx scripts/loadPeopleProvenance.ts`** — writes the people assertions.
   Idempotent: a re-run adds only paths that were missing.
3. **`npx tsx scripts/loadCountryProvenance.ts`** — writes the country ones.
   Countries had **no assertion and no confidence score at all** before this
   existed, so on a first run the whole 54 is new.
4. **Check that countries can actually pass the gate**, before blaming the
   templates for generating nothing:

   ```sql
   select count(*) filter (where score * 100 >= 60) as passes, count(*) as total
     from confidence_scores where entity_type = 'country';
   ```

   A low count is an editorial problem, not a software one: FR65 needs a source
   at tier `official` or `referenced`, and no loader may invent one.

5. **`npx tsx scripts/generateQuizQuestions.ts --rebuild`.**
6. **`047_quiz_bank_indexes.sql` last**, after the rebuild has succeeded. It
   builds a unique index over `(entity_id, template_id)` where `revoked_at is
null`; a duplicate already in the bank makes it fail to build, and the
   failure would be read as a broken migration rather than as what it found.

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
- **`npx tsx` cannot run this script.** It imports `src/lib/supabase/admin.ts`,
  which imports `server-only`, which resolves only under the `react-server`
  condition; and `@supabase/realtime-js` needs a native `WebSocket`, which
  arrives in Node 22. The command that works is:

  ```bash
  node --conditions=react-server \
       --env-file=.env.local \
       --import ./node_modules/tsx/dist/loader.mjs \
       scripts/generateQuizQuestions.ts --check
  ```

  On Node 20 it fails with `Cannot find module 'server-only'` or
  `Node.js 20 detected without native WebSocket support`. Check `node --version`
  before blaming the credentials.

## Procedure, per environment

### 1. Record what is there now

```sql
select count(*) from quiz_questions where revoked_at is null;
select template_id, count(*) from quiz_questions
  where revoked_at is null group by template_id order by template_id;
select entity_type, count(*) from quiz_questions
  where revoked_at is null group by entity_type;
```

Keep both numbers. They are the only way to notice that a rebuild came back
with fewer questions than it replaced.

The second query used to group by `audience`. It no longer tells you anything:
every row carries the same value there since the audience axis was retired, and
the column survives only because dropping it needs a migration. Group by
`template_id` instead — that is what varies now.

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

**The one rebuild where that rule did not hold** was the first one after the
audience axis was retired, run on recette on 28 August 2026. A question used to
be stored once per audience, so the bank's 11 879 rows were 2 504 distinct
questions counted four or five times over. That rebuild reported **3 105
generated against 11 879 revoked** — a quarter of what it replaced, and correct.
It is recorded here because the rule above would have called it a disaster.

What said otherwise, and is the check to run on any rebuild that shrinks the row
count: **11 799 of the revocations carried the reason `regenerated`** and the
remaining 80 kept their own (`stale_answer` — every T3 question, because that
same release changed how the main country is read); and the count of _distinct_
`(entity_id, template_id)` pairs **rose from 2 504 to 3 105**. Check that, not
the row count:

```sql
select count(*) from (
  select distinct entity_id, template_id from quiz_questions
   where revoked_at is null
) as distinct_questions;
```

The rise is the `population` fix landing: **T3 went from 20 subjects to 621**,
one per eligible people, because the adapter had been reading `percentage`
where the corpus writes `population`. All five templates now cover all 621
eligible subjects — 621 x 5 = 3 105.

### 4. Verify

```sql
select count(*) from quiz_questions where revoked_at is null;
select revoked_reason, count(*) from quiz_questions
  where revoked_at is not null group by revoked_reason;
```

The active count should be at or near what step 1 recorded — with the one
documented exception above. Then play a full session at `/fr/quiz` and read
four or five questions. Three things to look at:

- the distractors are peoples of the subject's own family _and_ of a country it
  shares, not the same three names on every question;
- a session opens on a people you have heard of and ends on one you have not —
  that is the ladder, and it is computed from population inside the track;
- a country track — `/fr/quiz?pays=GHA` — never answers « Ghana » to « dans
  quel pays ce peuple est-il principalement présent ? ».

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

## Retiring a template

A template is retired in code, but its questions are not. The serving side
resolves a question's theme from `field_path` and never from `template_id`
(`themeOfFieldPath`, `src/lib/quiz/segmentPolicy.ts`), so deleting the
generator removes nothing from the bank: the rows stay active and keep being
served, while `themeOfFieldPath` now answers `null` for them. They then count
in the picker's total and in no theme at all — ghost questions, served in a
whole-corpus run and invisible in a themed one.

So a retirement is two changes, and **the migration goes first in every
environment**. Revoking under the old code drops the questions and lowers a few
counters; deploying the new code without revoking serves the ghosts.

Revoke by `field_path`, not by `template_id` — the path is what the serving
side reads, so it is what defines the ghost:

```sql
update quiz_questions
   set revoked_at = now(), revoked_reason = 'template_retired_<id>'
 where revoked_at is null
   and field_path = '<the path that template read>';
```

Restore with the same marker:

```sql
update quiz_questions set revoked_at = null, revoked_reason = null
 where revoked_reason = 'template_retired_<id>';
```

**Do not run the sweep before the migration.** With the template gone from the
registry, `normalizeFieldPath` no longer recognises its path, so
`decideRevocation` revokes the very same rows under
`gate_failed:entity_missing` — a reason that asserts the fiche disappeared,
which is false. The audit trail then records a cause that never happened, and
the migration afterwards is a no-op that hides it.

Expect scopes to fall under the eight-question floor: measure which, and list
them in the pull request. `078_revoke_iso_code_questions.sql` is the worked
example — 621 rows, and eight scope × theme pairs that left the picker with it.
