# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-01
**Branch audited:** `recette` @ `0f73b973`. Previous revision audited `c7edce51` on 2026-08-30.
**Method:** read-only. Every repo gate executed locally against this tree; CI evidence read from GitHub Actions; branch protection and repository secrets read from the GitHub API; the full commit history scanned for credentials. No external service was written to, no migration run, no live production probe.

> **Two rubric corrections applied to this run.** The audit skill's own rubric had
> drifted from the repository it audits, and scoring against it unchanged would have
> produced false findings.
>
> - Domain 5 asserted _"the deploy model is Vercel-from-git — there is no GitHub
>   deploy workflow"_. False since PR #656: production is self-hosted on OVH and
>   deploys on a published GitHub Release. Domain 5 was scored against the new model.
> - Step 3.6 imposed the **Tier 1/2/3** policy with Tier 3 forbidden. `CLAUDE.md`
>   superseded it with `official` / `referenced` / `unverified`, under which _nothing
>   is forbidden, everything is labelled_. Tier compliance was scored against the
>   current doctrine.
>
> A third rubric check is a false positive and is recorded rather than actioned: the
> service-role isolation grep flags `src/app/[lang]/compte/profil/actions.ts`, which
> is a `"use server"` Server Action. Its module never reaches a browser bundle. The
> grep predates Server Actions.

> **Route note, carried forward from 2026-08-30.** `/fr/explorer`, `/fr/comprendre`
> and `/fr/jouer` were removed by ETNI-1555 and answer 404; `/fr/comprendre/noms` is
> now `/fr/comprendre/appellations`. Findings from the previous revision that name
> those routes need restating before they can be actioned.

---

## 1. Scope and method

Gates run locally on this exact tree: `lint`, `typecheck`, `format:check`, `test`,
`test:coverage`, `check:action-pins`, `check:env-example`, `check:jira-template`,
`lint:req`, `test:charter-contracts`, `validateAfrikData.ts`, and a full production
build (executed inside the release Docker image, which runs `next build` unchanged).

Additional scans: `knip`, full-history credential enumeration by decoding every JWT in
every blob on every ref, RLS coverage derived from the migration corpus, and
`npm audit`.

Not run this revision: `ts-prune`, `jscpd`, `e2e` locally. Domain 4 and 7 note where
that limits the finding.

---

## 2. The five canonical questions

**1. Is the project ready for production?** **Conditional.** Three blockers, none of
them code quality:

- The recette Supabase `service_role` key is in the public git history and has not
  been rotated (§8). It bypasses RLS entirely.
- `recette` has **no required status checks** configured, so nothing prevents a red
  merge (§8, Domain 3).
- The OVH production host is provisioned but its `/srv/ethniafrica/.env` still carries
  five `REPLACE_ME` values, so the first Release would deploy and fail (§Domain 5).

**2. Is the AFRIK editorial surface sound?** **Yes, with two labelled gaps.**
`validateAfrikData.ts` passes **38/38 checks, 0 errors**, 3 989 warnings, across 899
fiches. No FR28 hard-gate failure. The source-tier vocabulary is the current
three-value scale for the overwhelming majority (1 344 `official`, 1 211 `referenced`,
1 605 `unverified`), but **19 files under `migrations/` still carry retired numeric
tiers**, and 1 031 sources carry `needs_review` whose path into `sources.tier` is
untraced (§10). `data-integrity.yml` and `editorial-rules.yml` gate pull requests and
are **not** advisory.

**3. Can a new contributor go clone → running in one session?** **Yes, with one
caveat.** `.env.example` is complete and `check:env-example` verifies it against the
code in both directions. The caveat is that `UPSTASH_REDIS_REST_*` read as optional
and are not: without them every `/api/v2/*` answers 500 in a production build. Now
documented in `docs/DEPLOYMENT.md`.

**4. What is the security posture?** **Strong in code, weak in credential history.**
46 of 46 tables have RLS enabled — **zero open tables**. Per-request CSP nonce, HSTS,
`X-Content-Type-Options`, `Referrer-Policy`. API keys are PBKDF2-SHA256 with a
self-describing hash and raw keys are never stored. Sentry asserts an EU DSN and
scrubs PII in `beforeSend`. Rate limiting fails **closed**. Against that: a leaked,
unrotated recette service-role key, and no required checks on the integration branch.

**5. Is the score close to 8–9/10?** **No — 6.6/10.** The distance is three specific
things, all of them operational: rotate the leaked recette credentials, restore
required status checks on `recette`, and fix the Lighthouse performance budget that
has been red repo-wide for weeks.

---

## 3. Overall score

**6.6 / 10** — the code is in good shape; the operational envelope around it is not.

---

## 4. Score per domain

| #   | Domain                             | Score | Basis                                                                              |
| --- | ---------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | 46/46 tables with RLS; per-request nonce; PBKDF2; Sentry EU + PII scrub            |
| 2   | Secrets hygiene                    | **4** | Leaked recette `service_role` + DB password in public history, unrotated           |
| 3   | CI                                 | **5** | No required checks on `recette`; Lighthouse red; `migrate-recette` red every run   |
| 4   | Correctness & tests                | **8** | 6 305 tests pass; coverage 85/79/88/86 vs 70/60/70/70; 32 unused files             |
| 5   | Deploy coherence                   | **6** | New Release-triggered OVH pipeline with rollback, but host config incomplete       |
| 6   | Ferry pipeline                     | **8** | `ferry.config.yaml` coherent with the branch model; Jira column names unverified   |
| 7   | Architecture & boundaries          | **8** | Three-layer v2 holds; no hardcoded external URLs; browser Supabase client now dead |
| 8   | AFRIK data integrity & Source Tier | **7** | Validator 38/38, 0 errors; 19 files on retired numeric tiers                       |
| 9   | Performance & accessibility        | **4** | axe-core green; Lighthouse fails perf ≥ 0.85 on 14–15 of 19 routes                 |
| 10  | Docs & runbooks                    | **7** | Deploy docs current; restore drill 13.6 months old, exceeding the 12-month rule    |

Mean = **6.6**.

---

## 5. Strengths

- **RLS coverage is complete.** Every one of the 46 tables created across the 61
  migrations has `ENABLE ROW LEVEL SECURITY`. Eleven have RLS with zero policies —
  that is deny-all, the correct fail-closed posture for tables written only by the
  server (`antibot_challenges`, `search_query_log`, `contributions`).
- **Rate limiting fails closed, deliberately.** `checkUpstashConfigured()` returns 500
  rather than serving unlimited traffic (`src/lib/api/rate-limit.ts:177`).
- **Coverage well above its own thresholds**: 85.17 % statements, 79.24 % branches,
  88.17 % functions, 86.09 % lines, against declared minimums of 70/60/70/70.
- **Supply chain**: every third-party Action is SHA-pinned; `check:action-pins`
  enforces it; Dependabot bumps them.
- **The domain gates are real gates.** No `continue-on-error` on `data-integrity.yml`
  or `editorial-rules.yml`.

---

## 6. Gaps and risks

### Secrets (Domain 2) — P0

- **Recette `service_role` key in the public history**, 4 commits, decoded claims
  `role=service_role ref=shmrjtnfbqzceovroqjj`, valid to 2036. Bypasses RLS entirely.
- **Recette Postgres password** in commit `6d75c125`.
- Cause: 429 agent transcripts under `.entire/` committed before that directory was
  ignored. Vector closed; the history is not. Full analysis and the rotation order:
  [`runbooks/secret-exposure-audit-2026-09.md`](./runbooks/secret-exposure-audit-2026-09.md).
- **Production is clean** — every JWT in every blob on every ref was decoded, and the
  history contains exactly one Supabase identity, recette's.

### CI (Domain 3) — P0

- **`recette` carries no required status checks.** `GET /branches/recette/protection`
  returns no `required_status_checks` block. Twelve checks run and none can block a
  merge. `enforce_admins` is `true`, which protects the branch from force-push but not
  from a red merge.
- **`Apply Migrations — Recette` fails on every run** (six consecutive, from 01:26 on
  2026-09-01). Cause is not the workflow: `check:migration-state` reports three
  **drifted** migrations — `018`, `038`, `039` were edited after being applied.

### Dead code & redundancy (Domains 4, 7) — P1

`knip` reports 32 unused files, 176 unused exports, 1 unused dependency, 11 unused
devDependencies. Confirmed and notable:

- **P1** `src/lib/supabase/client.ts` — the browser Supabase client is unused. The
  "three clients, never interchangeable" invariant in `CLAUDE.md` now describes two.
- **P1** `src/lib/home/accessAxesData.ts`, `src/lib/flags-client.ts`,
  `src/api/v2/schemas/games.ts` — orphaned.
- **P2** `scripts/` carries 10 orphaned one-off scripts (`checkMigration.ts`,
  `convertAfrikToJson.ts`, `testLoader.ts`, …).

**Two knip findings are false positives and must not be actioned:**

- **`sharp` reported as an unused dependency.** It is never imported — Next loads it
  implicitly for `next/image` optimisation. Removing it on knip's word would silently
  degrade image optimisation on the self-hosted host. This is the single most
  dangerous false positive in the report.
- `e2e/support/factories/*` and `e2e/global.setup.ts` are reached through the
  Playwright config, which knip does not follow.

### Hardcoded values (P0/P1)

**No P0.** No hardcoded Supabase, Upstash or Sentry URL exists anywhere in `src/**` —
the scan returns empty. Rate-limit defaults are read from env with documented
fallbacks (`RATE_LIMIT_IP_RPM` and siblings, `src/lib/api/rate-limit.ts:103-111`).
Below the penalty threshold for Domains 5 and 7.

### Code debt (Domain 4) — P2

23 stray `console.*` in `src` outside tests, against a rule that handlers use
`@/lib/api/logger`; 35 `TODO`/`FIXME` markers across `src` and `scripts`;
4 moderate-severity dependency advisories from `npm audit`.

---

## 7. Consumer / new-contributor flow

`git clone` → `npm ci` (the `.npmrc` sets `legacy-peer-deps`, so no flag is needed) →
`cp .env.example .env.local` → migrations → `npm run dev`.

`check:env-example` verifies `.env.example` against the code **in both directions**,
which is why this flow holds: 40 environment references across 1 457 files, all
documented, and every documented entry actually read.

The one trap, now documented rather than tribal: `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are listed among optional subsystems but are mandatory in a
production build — without them every `/api/v2/*` answers 500 while pages render
normally.

---

## 8. Security posture

| Table (46 total)                                                       | RLS enabled | Policies | Notes                          |
| ---------------------------------------------------------------------- | ----------- | -------- | ------------------------------ |
| afrik_countries                                                        | yes         | 1        | public read                    |
| afrik_language_families                                                | yes         | 1        | public read                    |
| afrik_languages                                                        | yes         | 1        | public read                    |
| afrik_peoples                                                          | yes         | 1        | public read                    |
| afrik_people_countries                                                 | yes         | 1        | join table                     |
| api_keys                                                               | yes         | 1        | admin-only writes              |
| audit_log                                                              | yes         | 3        | append-only                    |
| user_roles                                                             | yes         | 3        | admin-only writes              |
| contributions                                                          | yes         | 0        | deny-all; server-written       |
| antibot_challenges                                                     | yes         | 0        | deny-all; server-written       |
| search_query_log                                                       | yes         | 0        | deny-all; server-written       |
| african*regions, countries, ethnic_groups, ethnic_group*\* , languages | yes         | 0        | **dead V1 schema** — see below |

**Zero tables without RLS.** No P0 in this table.

**Dead V1 schema.** Seven tables from the removed V1 surface (`african_regions`,
`countries`, `ethnic_groups`, `ethnic_group_languages`, `ethnic_group_presence`,
`ethnic_group_sources`, `languages`) still exist with RLS and no policies. Inert, not
a security hole, but `CLAUDE.md` states V1 was removed — the schema disagrees.

Other findings:

- **CSP nonce is per request** — `btoa(crypto.randomUUID())` at `src/middleware.ts:435`,
  injected into `script-src` and `style-src` (lines 75, 80).
- **Headers**: HSTS (`:64`), `X-Content-Type-Options: nosniff` (`:67`),
  `Referrer-Policy: strict-origin-when-cross-origin` (`:68`).
- **API keys**: PBKDF2-SHA256, self-describing
  `pbkdf2v1:{iterations}:{salt}:{hash}` (`src/lib/api/auth.ts:8,36`); raw keys never
  stored.
- **Sentry**: EU residency asserted at init — a production build throws if the DSN is
  not `ingest.de.sentry.io` (`sentry.server.config.ts:15`); PII scrubbed in
  `beforeSend` (`:28`).
- **Service-role isolation** holds. The only non-API import is a `"use server"` Server
  Action.
- **Supply chain**: no unpinned third-party Action; no secret-shaped string in any
  tracked file; only `.env.example` and `e2e/.env.example` are tracked env files.
- **Nobody can deploy from a clone**: `deploy-production.yml` triggers only on
  `release: published` on the upstream repo, has no `workflow_dispatch`, and forks
  receive no secrets.

---

## 9. Performance & accessibility posture

- **axe-core: green.** Not advisory.
- **Lighthouse: red, repo-wide, and has been for weeks.** 14–15 of 19 audited routes
  fail `categories.performance minScore >= 0.85`; the fiche routes also breach
  `largest-contentful-paint <= 5500` and `total-blocking-time <= 300`. This is not
  branch-specific: `recette`'s own pull requests fail identically.
- Because it fails everywhere, Lighthouse currently carries **no signal** — it cannot
  distinguish a regression from the baseline. That is the reason Domain 9 scores 4
  rather than the failure count itself.

---

## 10. AFRIK data integrity & Source Tier compliance

| #   | Check                         | Verdict                                                              |
| --- | ----------------------------- | -------------------------------------------------------------------- |
| 1   | Strict model adherence        | **Pass** — validator enforces it across 899 fiches                   |
| 2   | Validator run                 | **Pass** — 38/38 checks, **0 errors**, 3 989 warnings                |
| 2b  | FR28 hard gate [95,105]       | **Pass** — zero fiches outside the band                              |
| 2c  | FR28-strict [99,101]          | **Pass** — burn-down measured at zero; both bands now fail the build |
| 3   | FLG / PPL / ISO consistency   | **Pass** — orphan-fiche and reference checks green                   |
| 4   | Source tier compliance        | **Partial** — see below                                              |
| 5   | DB vs source-JSON consistency | **Not verified** — recorded as a gap, not asserted                   |
| 6   | CI enforcement                | **Pass** — both gates on `pull_request`, neither advisory            |
| 7   | Known-issues carry-over       | Reviewed                                                             |

**Tier vocabulary.** Counts across the corpus: `unverified` 1 605, `official` 1 344,
`referenced` 1 211 — the current three-value scale. Against that:

- **P1 — 19 files under `dataset/source/afrik/migrations/` still carry numeric tiers**
  (`1`, `2`), the doctrine retired by migration `041`. The database constraint is
  `CHECK (tier IS NULL OR tier IN ('official','referenced','unverified'))`, so those
  values have no destination.
- **Open question — 1 031 sources carry `tier: "needs_review"`.** This is deliberate
  and typed (`src/types/afrik.ts:179-192` states it is _not_ a `SourceTier` and marks
  the tail), but the same DB constraint does not accept it, and
  `migrateAfrikToDatabase.ts` writes no tier at all. The two vocabularies live in
  different places. **Tracing the provenance path was not completed — this is recorded
  as an open question with evidence, not as a confirmed defect.**

---

## 11. Prioritized action list

| #   | P   | Action                                                                                                |
| --- | --- | ----------------------------------------------------------------------------------------------------- |
| 1   | P0  | Rotate the recette Supabase `service_role` key; update repo secrets, `.env.local`, Vercel preview     |
| 2   | P0  | Change the recette Postgres password; update `RECETTE_SUPABASE_DB_URL`                                |
| 3   | P0  | Restore required status checks on `recette` (`gitleaks`, `build`, `validate`, `openapi-diff`, `axe`)  |
| 4   | P0  | Fill the five `REPLACE_ME` values in `/srv/ethniafrica/.env` before the first Release                 |
| 5   | P0  | Add the `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` repository secret — the corpus sync fails without it   |
| 6   | P1  | Resolve the three drifted migrations (`018`, `038`, `039`); `Apply Migrations — Recette` is red daily |
| 7   | P1  | Fix or re-baseline the Lighthouse performance budget — a permanently red gate carries no signal       |
| 8   | P1  | Migrate the 19 `migrations/` fiches off numeric tiers onto the three-value scale                      |
| 9   | P1  | Trace `needs_review` from fiche to `sources.tier`; either map it or document that it never lands      |
| 10  | P1  | Run a restore drill — the last one is dated 2025-07-14, 13.6 months ago                               |
| 11  | P1  | Drop the seven dead V1 tables, or record in `CLAUDE.md` why they remain                               |
| 12  | P2  | Delete the confirmed orphans (`flags-client.ts`, `accessAxesData.ts`, `schemas/games.ts`)             |
| 13  | P2  | Decide the fate of `src/lib/supabase/client.ts` and restate the three-client invariant                |
| 14  | P2  | Replace the 23 stray `console.*` in `src` with `@/lib/api/logger`                                     |
| 15  | P2  | Triage the 4 moderate `npm audit` advisories                                                          |

---

## 12. Conclusion

The codebase is healthy: 6 305 tests green, coverage well above its thresholds, a
complete RLS surface, a fail-closed rate limiter, and an editorial validator that
passes 38 of 38 checks over 899 fiches with zero errors.

What holds it at 6.6 is entirely operational, and mostly credential and gate
management rather than engineering. A leaked recette service-role key sits in a public
history and has not been rotated. The integration branch enforces no checks, so the
twelve that run are advice. A performance gate has been red long enough to stop
meaning anything. None of these is hard to fix; each of them has been true for longer
than it should have been.

The deploy story improved materially this revision — production moved off a
rate-limited Vercel plan onto a host with a documented rollback, and the corpus sync
was rescued from a trigger that would have gone silent. That work is not finished
until the host's environment file is complete.
