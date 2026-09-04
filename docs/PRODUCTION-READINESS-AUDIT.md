# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-03 (third revision — first audit taken against a live production database)
**Branch:** `recette` @ `fd87f31b` · **Version:** 4.2.3 · **Deployed:** yes, v4.2.3 is serving
**Method:** read-only. Nothing was fixed, bumped, tagged, pushed or deployed by this audit.

---

## 1. Scope and method

Gates run locally, in full, on this exact tree: `lint`, `typecheck`, `format:check`,
`test`, `test:coverage`, `build`, `lint:req`, `check:action-pins`, `check:workflow-shell`,
`check:env-example`, `check:migration-files`, `check:dead`, `validateAfrikData.ts`,
`checkEditorialRules.ts`. Every one reports through its own exit code, captured directly
rather than through a pipe — see §6, _How this revision was measured_.

Additional scans: `npm audit`, a tracked-file secret sweep, a stray-`console` sweep against
the ESLint-enforced directories, a hardcoded-value scan over `src/**`, and CI evidence read
through `gh`.

**What is new in this revision, and why it matters.** The previous revision derived RLS
coverage by replaying `CREATE TABLE` / `ENABLE ROW LEVEL SECURITY` across the migration
corpus in file order. This one **measured the live production database** over read-only
`SELECT`s against `pg_class` and `pg_policy`. The two disagree, and the migration replay was
wrong: it reported five corpus tables with no RLS. All five have RLS enabled in production.

That is worth stating plainly as a method finding — _replaying migrations is not the same as
reading the database_, and this audit's own previous revision was caught by exactly the class
of defect it exists to find.

**Not run / not verifiable**, marked N/A rather than scored:

- Live Lighthouse and axe probes against production — out of scope; §9 scores budgets and
  recorded CI evidence.
- The Jira board's live column names against `ferry-jira-automation-setup.md` — belongs to
  `/ethniafrica-spec`.
- `check:migration-state` for **recette** — needs credentials this audit did not use.
  Production's ledger was read directly instead and is reported in §10.

---

## 2. The five canonical questions

### 2.1 Is the project ready for production?

**Yes, with one editorial reservation.** It is not a forecast: **v4.2.3 is deployed and
serving** at ethniafrica.com, the schema is at migration `081`, and the corpus is loaded
(800 peoples, 757 languages, 777 names, 54 countries, 24 families).

The reservation is §2.2's: **936 source rows in production carry no tier**, and the project's
own doctrine calls an untiered source a blocking error. Nothing is unsafe; the transparency
contract is simply not being kept for roughly one source in seven.

The infrastructure reservation is closed but recent, and worth naming: **six consecutive
production deploys failed on 2026-09-03** before one succeeded, and the successful one only
succeeded because the migrations had been applied to the server by hand, which made the
migrate job skip the path that was broken. The defect itself is fixed and on `main`
(§6, D5-1), but it has been exercised exactly once, in the configuration that avoids it.

### 2.2 Is the AFRIK editorial surface sound?

**Substantially, with one systematic defect.**

What holds, measured this run:

- `validateAfrikData.ts` — **43/43 checks pass, 0 errors**, 5 427 warnings.
- `checkEditorialRules.ts` — **0 errors**, 2 warnings (both fiches missing an autonym at
  `confidence=missing`, i.e. below the threshold the rule gates on).
- **FR28 and FR28-strict both pass.** CLAUDE.md records that both bands — the hard [95,105]
  and the strict [99,101] — now fail the build, the burn-down having been completed. Zero
  errors means zero offenders in either band. The two counts are no longer distinguishable
  because the strict band _is_ the gate now; that is the intended end state, not an omission.
- Referential integrity: FLG/PPL references, ISO 639-3 and ISO 3166-1 codes all pass as part
  of the 43.
- `data-integrity.yml` and `editorial-rules.yml` are **not** `continue-on-error`; they gate
  PRs into `recette` and `main` for real.

**The defect.** A structural walk of all 1 712 fiches counts 6 711 `sources[]` entries with
this tier distribution:

| tier value     | entries | in the declared scale? |
| -------------- | ------: | ---------------------- |
| `unverified`   |   2 436 | yes                    |
| `referenced`   |   1 699 | yes                    |
| `official`     |   1 553 | yes                    |
| `needs_review` |   1 023 | **no**                 |

CLAUDE.md's Source Tier Policy states that one three-value scale is used everywhere —
"code identifier, DB value, API payload and user-facing label all say the same thing" — and
that **"a `sources` entry with no tier is a blocking error."**

`needs_review` is a fourth value. The database refuses it:

```sql
CHECK (((tier IS NULL) OR (tier = ANY (ARRAY['official','referenced','unverified']))))
```

So those entries do not arrive as `needs_review`. They arrive as **NULL**, and production
holds **936 source rows with no tier at all** — the exact state the doctrine calls blocking.
Measured on production, `sources` splits `unverified` 1 814 · `official` 1 187 ·
`referenced` 1 184 · **NULL 936**.

The gate does not catch it because the validator treats `needs_review` as _a value_ rather
than as _an absence_. `confidence_scores` is unharmed — 981 rows, none NULL, mean 0.619 — so
the untiered sources contribute nothing rather than corrupting the score. The damage is to
the promise, not the arithmetic: a reader following one source in seven reaches a claim whose
provenance the atlas declines to characterise, on a site whose whole argument is that it
characterises provenance.

Second, smaller: **1 675 source entries carry no URL**, so they cannot be tiered from the
catalogue even in principle. This is the bulk of the validator's 5 404 tier warnings; the
remaining 3 728 are entries whose publisher the catalogue resolves to `unverified`.

**No Tier-3-equivalent violation exists**, and the question is now moot by doctrine: the
retired Tier 1/2/3 scale forbade sources; the current scale forbids nothing and labels
everything. An aggregator is cited at `unverified` by design. Note that the audit skill's own
rubric still describes the retired scale — see §6, D10-1.

### 2.3 Can a new contributor go clone → running in one session?

**Yes, and the last real trap was closed today.** Walked against the repo as it stands:

| step                          | verdict                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --legacy-peer-deps`   | works; the legacy flag is intentional (Storybook vs Next 16)                                                                          |
| `.env.example` → `.env.local` | **complete both ways** — `check:env-example` asserts every variable the code reads is documented _and_ every documented entry is read |
| migrations apply in order     | 81 files, no duplicate version or name, no hole (`check:migration-files`)                                                             |
| corpus load                   | `scripts/migrateAfrikToDatabase.ts --target=recette`, documented in the runbook                                                       |
| first admin                   | `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts` exists                                                                                   |
| `npm run dev`                 | boots                                                                                                                                 |
| worktree provisioning         | **`npm run worktree:setup`** (#830, landed today) — clones `node_modules`, copies env files, restores husky                           |

The worktree gap was real until this morning: a fresh worktree resolved `node_modules`
upward into the main checkout, so `vitest`, `tsc` and `eslint` passed against dependencies it
had never installed, while `next build` failed on a missing `.env.local` in a way that reads
like a code defect. This audit hit both before #830 landed.

### 2.4 What is the security posture?

**Strong, and now measured rather than inferred.**

- **RLS: 43 of 43 public tables have it enabled.** Zero exceptions. Measured on production.
- Four RLS tables carry **no policy at all** — `admin_allowlist`, `antibot_challenges`,
  `flag_reporter_contacts`, `search_query_log`. That is deny-all for every role except
  `service_role`, and each one carries a written rationale in its migration. From `075`:
  _"Deliberately no policy. RLS enabled with none denies every role but service_role, which
  is the only correct exposure for a reader's address."_ This is the right posture for a
  table of reporters' email addresses, and the fact that the intent is written down is what
  separates it from an oversight.
- **API keys**: PBKDF2-SHA256 at **600 000 iterations**, 16-byte random salt, raw keys never
  stored (`src/lib/api/auth.ts:15`).
- **CSP nonce is per request** — `crypto.randomUUID()` at `src/middleware.ts:535`, plus HSTS,
  `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
- **Service-role isolation holds**: no import of `@/lib/supabase/admin` anywhere under
  `src/app` outside `api/` and `admin/`.
- **Rate limiting is real and fails closed** — Upstash sliding window, one instance per tier
  (`ip` / `public` / `partner`), and a thrown configuration error when the env vars are
  absent rather than a silent open door.
- **Sentry**: EU DSN asserted at build (`ingest.de.sentry.io`), PII scrubbed in `beforeSend`.
- **Supply chain**: every third-party Action SHA-pinned (`check:action-pins` OK), Dependabot
  bumping weekly, `gitleaks` a required check on both branches.
- **Dependencies**: 10 moderate advisories, **0 high, 0 critical**, all transitive
  (`@opentelemetry/*` via Sentry, Storybook via `uuid`, `exceljs`, `fflate`).

### 2.5 Is the score close to 8–9/10?

**7.6 / 10 — short of the 8–9 target by one domain pair.** Eight domains score 7 or above;
two do not, and both were demonstrated live today rather than inferred:

1. **AFRIK data integrity (5/10)** — the 936 untiered production sources of §2.2.
2. **Deploy coherence (5/10)** — six failed deploys, and a plan gate that had never measured
   anything since it was written.

Closing the distance is §11's top three actions. Fixing the tier defect alone moves the mean
to roughly 8.0.

---

## 3. Overall score

**7.6 / 10** — mean of ten equally weighted domains.

A deployed, well-tested, well-secured product whose two weakest points are the two it talks
about most: the provenance of its sources, and the reliability of shipping.

---

## 4. Score per domain

| #   | Domain                             | Score | Evidence                                                                                                      |
| --- | ---------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | 43/43 RLS measured; PBKDF2 600k; per-request nonce; service-role isolated; rate limit fails closed            |
| 2   | Secrets hygiene                    | **9** | Only `.env.example` tracked; sweep clean; `gitleaks` required; `check:env-example` bidirectional              |
| 3   | CI                                 | **7** | 5 required checks both branches, all pinned; but a required gate measured nothing (D3-1), Storybook Pages red |
| 4   | Correctness & tests                | **9** | 7 316 tests pass; coverage 86/80/90/87 against 70/60/70/70; `check:dead` at ceilings                          |
| 5   | Deploy coherence                   | **5** | Six failed deploys today; production migrated by hand; the fix has run once, in the path that skips it        |
| 6   | Ferry pipeline                     | **8** | `base_branch`/`target_branch` both `recette`, matching doctrine; 8 workflows; `ETNI` consistent               |
| 7   | Architecture & boundaries          | **9** | Three-layer v2 API intact; client isolation holds; 0 P0/P1 hardcoded values; no dead code above ceiling       |
| 8   | AFRIK data integrity & Source Tier | **5** | 43/43 checks, 0 errors — but 1 023 out-of-scale tiers landing as 936 untiered production rows                 |
| 9   | Performance & accessibility        | **8** | Budgets perf ≥ .85 / a11y = 1.0 / bp ≥ .95; axe-core required and green; e2e armed against recette            |
| 10  | Docs & runbooks                    | **7** | CLAUDE.md accurate and corrected today; but the runbook and this skill both carried stale claims              |

---

## 5. Strengths

- **The gates are unusually honest, and getting more so.** `check:env-example` verifies both
  directions. `check:dead` is a ratchet that fails on a count _below_ its ceiling as well as
  above. `check:migration-files` refuses a hole in the sequence. `lint:req` ties every test to
  a catalogued requirement. This is a repo that has been repeatedly burned by gates that
  reported success without measuring, and has responded by making measurement the default.
- **RLS coverage is total** — 43 of 43 tables — and the four deliberate deny-all tables carry
  their reasoning in the migration that created them.
- **The test suite is large and real**: 7 316 passing tests, 721 files, coverage well above
  every declared threshold, and placement conventions actually followed.
- **The editorial doctrine is written down and enforced in code**, not just asserted: the
  reader-facing register rule, the autonym requirement at `confidence >= medium`, the
  two-source rule for contested classifications.
- **`CLAUDE.md` is a genuine operating document.** It records not only what is true but what
  used to be believed and why it was wrong — the retired Tier scale, the dead browser client,
  the two Supabase projects. That is rare and it shortened this audit considerably.

---

## 6. Gaps and risks

### Domain 3 — CI

**D3-1 (P0, fixed today, worth recording).** The `migrate` job's _"refuse a plan wider than
the measurement"_ gate had **never measured anything**. It counted planned migrations with
`grep -cE '^[[:space:]]*[0-9]{3}_...'` over a `plan.txt` produced by
`supabase db push --dry-run | tee plan.txt`. Two independent faults: the CLI prints its plan
on **stderr**, so the file was empty; and it prefixes each entry with a bullet, so the pattern
would not have matched even had the file been populated. `PLANNED` was therefore `0` on every
release, and `0` is never greater than the measurement. Fixed by #838 (pipefail + refuse a
zero plan), #846 (a tested counter with the real output as a fixture) and #850 (`2>&1`).

**D3-2 (P2).** `storybook-deploy.yml` fails on `main`: `actions/deploy-pages@d6db9016…` does
not resolve. Not a required check; the docs site is stale until fixed.

### Domain 5 — Deploy coherence

**D5-1 (P1).** Six consecutive production deploys failed on 2026-09-03 — v4.1.1, v4.2.0,
v4.2.1 (×3), v4.2.2, v4.2.3 — each with a different-looking cause and one root: a stored
connection string that disagreed with the machine. In order: it named the retired hosted
Supabase project; then a port that is not published; then wanted TLS the server does not
offer; then lacked a Supavisor tenant; then carried a password the pooler no longer held.
`PRODUCTION_SUPABASE_DB_URL` has since been removed entirely — the job reads
`POSTGRES_PASSWORD` from the stack's own `.env` over the SSH it already needs, and forwards
to the `supabase-db` container rather than the pooler (#842).

**D5-2 (P1).** The production deploy that finally succeeded did so **because the migrations
had already been applied by hand**, which made the `migrate` job measure a clean ledger and
skip the plan and apply steps entirely. The corrected path is therefore **unexercised in
production**. The next release with genuinely pending migrations is its first real test.

**D5-3 (P1).** `production-data-sync.yml` **exceeded its 20-minute job timeout and was
cancelled** on the v4.2.3 deploy. The data did land — verified table by table against the
corpus on disk — but a load killed mid-flight is indistinguishable from a completed one in
the run list. This is the failure mode the project's own memory already names.

### Domain 8 — AFRIK data integrity

**D8-1 (P0).** 1 023 `sources[]` entries carry `tier: "needs_review"`, a value outside the
declared three-value scale, which the database `CHECK` rejects — so they land as **936
untiered rows in production**. CLAUDE.md calls an untiered source a blocking error; the
validator does not catch it because it treats the fourth value as a value rather than as an
absence. See §2.2.

**D8-2 (P1).** 1 675 source entries carry no URL, so they cannot be tiered from the catalogue
and cannot be followed by a reader.

**D8-3 (P2).** Two fiches — `PPL_MANDE_DU_SUD`, `PPL_KIRDI` — have no autonym. Below the
gating threshold (`confidence=missing`), so correctly a warning, but both are exactly the
kind of fiche the decolonial posture exists for.

### Domain 10 — Docs & runbooks

**D10-1 (P1).** **The audit skill that produced this report is itself stale.** Its rubric
describes a Vercel-from-git deploy model ("there is no GitHub deploy workflow") — production
has been on an OVH VPS driven by a published Release since 4.0.0 — and it enforces the
retired Tier 1/2/3 policy under which "Tier 3 is forbidden" and a Wikipedia citation is a P0.
CLAUDE.md superseded both. This audit scored against current doctrine and ignored the skill
on those two points.

**D10-2 (P1, now fixed).** `docs/runbooks/migration-state.md` recorded production at `049`
while it stood at `061` and needed twenty more. A hand-kept ledger drifts; the database does
not. The runbook now documents the measured path.

### Hardcoded values (P0/P1)

**None.** The scan over `src/**` found no hardcoded Supabase, Upstash or Sentry URL, and no
magic number gating production behaviour. The only literals worth naming are P2 and
chat-only: two UI micro-timings (`ErrorState.tsx:29` 2 000 ms copy feedback,
`RecherchePageContent.tsx:373` 150 ms blur debounce) and seven role-name string literals
outside the role enum. No penalty applied to Domains 5 or 7 from this scan.

### Dead code & redundancy

**None above the recorded ceilings.** `check:dead` (knip + the ratchet in
`scripts/ci/checkDeadCode.ts`) reports every category within budget, with files,
dependencies, devDependencies, unlisted, binaries and duplicates all held at **0**. No
surviving V1 import. No penalty applied to Domains 4 or 7.

### How this revision was measured

Two methodological notes, because both changed a finding:

1. **The gates were run capturing their own exit codes**, not through a pipe. Early in this
   session a compound of the form `npm test 2>&1 | tail -3` reported exit `0` — which was
   `tail`'s status, not the suite's. That is the same vacuous-green shape as D3-1, and it very
   nearly entered this report as a pass.
2. **RLS was measured against the database**, not derived from the migrations. The derivation
   claimed five corpus tables had no RLS. All five do.

---

## 7. Consumer / new-contributor flow

Walked in §2.3. Every step has a documented command that exists in `package.json`, and the
one step that used to depend on tribal knowledge — provisioning a worktree — became
`npm run worktree:setup` today, wired to run automatically on worktree creation.

Remaining friction, both P2: `npm ci` needs `--legacy-peer-deps` and nothing in the repo's
own docs makes that failure self-explaining on first encounter; and the production corpus
load is only reachable by someone who can read the runbook, which is correct but means the
first run is never self-service.

---

## 8. Security posture

Detailed in §2.4. The RLS coverage table, measured on production:

| Scope                                | Tables | RLS enabled | Policies                |
| ------------------------------------ | -----: | ----------- | ----------------------- |
| All `public` tables                  |     43 | **43**      | 39 with ≥1 policy       |
| Deliberate deny-all (documented)     |      4 | yes         | none, by written intent |
| Tables with neither RLS nor a policy |  **0** | —           | —                       |

`afrik_countries`, `afrik_language_families`, `afrik_languages`, `afrik_peoples`,
`afrik_people_countries` and the eight `afrik_patronyme*` / `afrik_media` tables all report
`relrowsecurity = true`.

The one standing item is historical rather than structural: the recette service-role key and
Postgres password are in the public git history and are recorded as disabled rather than
rotated. Production credentials are clean. Tracked in
`docs/runbooks/secret-exposure-audit-2026-09.md`.

---

## 9. Performance & accessibility posture

- **Lighthouse budgets** (`.lighthouserc.js:127–129`): performance ≥ 0.85, accessibility
  = 1.0, best-practices ≥ 0.95.
- **Lighthouse is advisory and nightly by design.** #831 moved it and Playwright off the
  per-PR path after measuring that, over 300 runs on 2026-09-03, Lighthouse concluded 32/32
  failure and Playwright 27/33 while adding a p90 of 20.2 min to a 13.6 min blocking path.
  Neither was ever in branch protection. A permanently red advisory gate is worse than no
  gate; moving them was the right call, and the remaining risk — that nobody reads the
  nightly — is real and unmitigated (**P2**).
- **axe-core is a required check** on both branches, not advisory, and green. Its runtime
  dropped from ~13.6 min to ~6.5 min in #831 via a parallel sweep and restored caches.
- **e2e** is armed against recette (#822) after a period where it skipped every step and
  concluded success.
- Mobile-first breakpoints (430 / 720 / 800) are asserted by the charter contract suite.

---

## 10. AFRIK data integrity & Source Tier compliance

The seven checks, with verdicts:

| #   | Check                                 | Verdict                                                                                                                                      |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Strict-model adherence                | **Pass** — 43/43 validator checks, 16 strict models present                                                                                  |
| 2   | Validator run + FR28 bands            | **Pass** — 0 errors; both [95,105] and [99,101] now gate and pass                                                                            |
| 3   | FLG / PPL / ISO referential integrity | **Pass** — covered by the 43                                                                                                                 |
| 4   | Source Tier compliance                | **Fail** — 1 023 out-of-scale tiers → 936 untiered production rows                                                                           |
| 5   | DB vs source-JSON consistency         | **Pass (sampled)** — corpus counts match production exactly: peoples 800/800, countries 54/54, names 17 forms, patronymes 777 of 780 on disk |
| 6   | CI enforcement not advisory           | **Pass** — `data-integrity.yml` and `editorial-rules.yml` both gate                                                                          |
| 7   | Known-issues carry-over               | **Pass** — the 3 unloaded patronymes and the 52-record editorial tail are both tracked, the latter behind a descending ratchet (#833)        |

Check 4 is the domain's cap. Everything else in this domain is in good order; one systematic
defect holds the score at 5.

---

## 11. Prioritized action list

| #   | Action                                                                                                                                                         | Sev | Domain |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------ |
| 1   | Resolve the 1 023 `needs_review` tiers onto the three-value scale, and make the validator reject a fourth value as an absence rather than accept it as a value | P0  | 8      |
| 2   | Re-measure production's 936 untiered `sources` rows after (1) and confirm the count reaches zero                                                               | P0  | 8      |
| 3   | Exercise the corrected `migrate` path on a release with genuinely pending migrations — it has never run end to end                                             | P1  | 5      |
| 4   | Raise or split `production-data-sync.yml`'s 20-minute budget, and make a cancelled load fail loudly rather than read as complete                               | P1  | 5      |
| 5   | Give the 1 675 source entries without a URL either a locator or an explicit note saying why none exists                                                        | P1  | 8      |
| 6   | Update the `ethniafrica-audit` skill: the deploy model is OVH-on-Release, and the Tier scale is the three-value one                                            | P1  | 10     |
| 7   | Repair `actions/deploy-pages` pin in `storybook-deploy.yml`                                                                                                    | P2  | 3      |
| 8   | Add a nightly-result notification so the moved Lighthouse and Playwright runs are actually read                                                                | P2  | 9      |
| 9   | Rotate, rather than disable, the recette credentials exposed in git history                                                                                    | P2  | 2      |
| 10  | Source an autonym for `PPL_MANDE_DU_SUD` and `PPL_KIRDI`                                                                                                       | P2  | 8      |

---

## 12. Conclusion

**7.6 / 10.** EthniAfrica is in production, tested well beyond its own thresholds, secured
carefully at the data plane, and unusually disciplined about the difference between a gate
that measures and a gate that merely reports. The security and architecture domains are
genuinely strong, and the RLS posture — 43 of 43, with every deliberate exception written
down — is better than most projects of this size achieve.

Two domains hold it below target, and they are the two the project cares most about.

The first is editorial. A source in seven reaches production with no tier, because the corpus
uses a fourth value the database refuses and the validator accepts. On an atlas whose entire
argument is that provenance is published rather than assumed, that is the defect that matters
most — not because anything is unsafe, but because the promise is specific and it is not
being kept for 936 rows.

The second is shipping. Six deploys failed in one day, and the seventh succeeded only along a
path that skipped the broken part. The fixes are real, tested and merged; they are simply not
yet proven where it counts.

Both are closeable. Neither is architectural. The distance from 7.6 to 8–9 is two pieces of
finite work, and the first one is a data migration and a validator rule.
