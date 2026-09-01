# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-01 (second revision of the day)
**Branch audited:** `recette` @ `79136438` (v4.0.0). The previous revision audited `main` @ `8f2b47ff` earlier the same day and scored 6.9.
**Method:** read-only. Every repo gate executed locally against this tree; CI evidence read from GitHub Actions; branch protection read from the GitHub GraphQL API. No external service was written to, no migration run, no live production probe.

> **What changed since the previous revision.** The revision's single P0 — three migrations
> that no Postgres would accept — **is closed**. `Apply Migrations — Recette` has now
> succeeded five consecutive times. Two of that revision's findings were also re-examined
> and did not survive: the "seven dead V1 tables" were dropped by migration `007` long ago,
> and the `needs_review` tier vocabulary turns out to be a deliberate, gated, burning-down
> placeholder rather than a value with no destination. Both corrections are recorded below
> with their evidence, because a false finding that keeps being re-discovered costs as much
> as a real one that keeps being ignored.

> **Two standing rubric corrections, carried forward.** The audit skill's rubric has drifted
> from the repository it audits; scoring against it unchanged produces false findings.
>
> - Domain 5 asserts _"the deploy model is Vercel-from-git — there is no GitHub deploy
>   workflow"_. False since PR #656: production is self-hosted on OVH and deploys on a
>   published GitHub Release. Domain 5 is scored against the current model.
> - Step 3.6 imposes the **Tier 1/2/3** policy with Tier 3 forbidden and Wikipedia-adjacent
>   domains a P0. `CLAUDE.md` superseded it with `official` / `referenced` / `unverified`,
>   under which _nothing is forbidden, everything is labelled_ — and blogs, social media and
>   community accounts are explicitly admissible at `unverified`. Tier compliance is scored
>   against the current doctrine. Scored against the retired one, this corpus would show 81
>   false P0s.
>
> A third rubric check remains a false positive: the service-role isolation grep flags
> `src/app/[lang]/compte/profil/actions.ts`, a `"use server"` Server Action whose module
> never reaches a browser bundle. The grep predates Server Actions.

---

## 1. Scope and method

Gates run locally on this tree: `lint`, `typecheck`, `format:check`, `test:coverage`,
`build`, `lint:req`, `check:jira-template`, `check:action-pins`, `check:env-example`,
`check:migration-files`, `test:charter-contracts`, `validateAfrikData.ts`,
`checkEditorialRules.ts`.

Additional scans: `knip`, `jscpd`, `npm audit`, RLS coverage derived from the migration
corpus by replaying every `CREATE TABLE` / `DROP TABLE` in file order, and a full walk of
the 954 fiche JSON files counting tiers inside every `sources[]` array.

**Not run / not verifiable this revision**, and marked N/A rather than scored:
`check:migration-state` (it refuses to report without database credentials — correct design,
not a defect); `ts-prune`; `e2e` locally (CI evidence used instead); the state of
`/srv/ethniafrica/.env` on the OVH host (no SSH from an audit); DB-vs-JSON row consistency
(no database credentials used).

---

## 2. The five canonical questions

**1. Is the project ready for production?** **Yes, conditionally** — and for the first time
in this document's history, no P0 is open.

The previous revision's blocker is gone. Migrations `063`, `065` and `066` built a GIN index
over the raw two-argument `extensions.unaccent(...)`, which Postgres rejects because an index
expression requires an `IMMUTABLE` function. PR #676 folded all three through the
`public.afrik_unaccent(TEXT)` wrapper that migration `052` created for exactly this purpose.
Verified two ways: the only surviving raw calls in the corpus are inside `044` (a function
body, already applied) and inside the wrapper's own definition at
`supabase/migrations/066_afrik_search_patronymes.sql:80`, which is where it belongs — and
`Apply Migrations — Recette` has succeeded **five consecutive times** (16:21, 15:37, 14:50,
13:45, 12:29). Recette's schema has caught up to its own code.

What remains is a conditional, not a blocker: **Lighthouse fails on every branch**, and has
for the whole day. That is a signal problem more than a performance problem — see question 5.

**2. Is the AFRIK editorial surface sound?** **Yes.** This is the strongest domain in the
audit and it improved this revision.

`validateAfrikData.ts` passes **40/40 checks with 0 errors** (4 022 warnings, all advisory
FR52 coverage). `checkEditorialRules.ts` reports **0 errors, 97 warnings**. FR28 passes on
both the hard band [95,105] and the strict band [99,101].

A full walk of the corpus — 954 fiche files, **5 283 `sources[]` entries** — finds
**zero entries with no tier**. That is the gate the doctrine actually cares about, and it is
clean. Distribution: `unverified` 1 623, `official` 1 370, `referenced` 1 223,
`needs_review` 1 031, plus 37 retired numeric tiers across 19 files.

**Zero fiches cite `wikipedia.org` as a `sources.url`.** 81 entries cite a blog, Facebook,
Reddit or X — 80 of them correctly labelled `unverified`, which is precisely what the current
doctrine prescribes for community and amateur knowledge, and precisely what the retired
doctrine would have deleted. One (`PPL_AKUAPEM.json`, an X post) sits at `needs_review`.
Zero fiches carry an empty `sources` block.

`data-integrity.yml` and `editorial-rules.yml` gate pull requests and neither is advisory.

**3. Can a new contributor go clone → running in one session?** **Yes.** The caveat that
qualified this answer in the previous revision — migrations not applying on a fresh project —
is resolved. `.npmrc` sets `legacy-peer-deps` so plain `npm ci` works; `check:env-example`
verifies `.env.example` against the code **in both directions** (41 references across 1 538
files, all documented, every documented entry actually read); `check:migration-files` reports
70 files with no duplicate version and no hole. The two silent traps
(`UPSTASH_REDIS_REST_*` mandatory in production despite reading as optional;
`ANTIBOT_HMAC_SECRET` not inert when unset) are documented rather than tribal.

**4. What is the security posture?** **Strong.** **41 of 41 live tables have RLS enabled —
zero open tables.** Per-request CSP nonce (`src/middleware.ts:435`), HSTS,
`X-Content-Type-Options`, `Referrer-Policy`. API keys are PBKDF2-SHA256 at **600 000
iterations** with a 16-byte salt (`src/lib/api/auth.ts:15,16`); raw keys are never stored.
Sentry asserts an EU DSN and scrubs PII in `beforeSend` across client, server and edge. Rate
limiting fails **closed** (`src/lib/api/rate-limit.ts:199`). Every third-party Action is
SHA-pinned. No secret-shaped string exists in any tracked file; only `.env.example` and
`e2e/.env.example` are tracked env files. `npm audit`: 4 moderate, **0 high, 0 critical**.

**5. Is the score close to 8–9/10?** **7.6/10**, up from 6.9. It is now within reach of the
target, and one domain accounts for most of the remaining distance.

Three actions close it: repair or re-baseline the Lighthouse budget (+4 on Domain 9, worth
+0.4 alone), run a restore drill (Domain 10), and route `keys/issue` through the service
layer that already exists for it (Domain 7). That arithmetic lands at 8.2.

---

## 3. Overall score

**7.6 / 10** — up from 6.9. The application code and the editorial corpus are both in good
shape; a permanently red performance gate is now the largest single drag.

---

## 4. Score per domain

| #   | Domain                             | Score | Basis                                                                                        |
| --- | ---------------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | 41/41 live tables with RLS; per-request nonce; PBKDF2 600k; Sentry EU + PII scrub            |
| 2   | Secrets hygiene                    | **8** | Tracked files clean; the rotation now carries a written completion record                    |
| 3   | CI                                 | **9** | All required checks green; `recette` + `main` protected; migrate-recette green 5×            |
| 4   | Correctness & tests                | **8** | 6 668 tests pass, 0 failures; coverage 84.8/79.0/88.3/85.7 vs 70/60/70/70                    |
| 5   | Deploy coherence                   | **8** | Migrations apply again; 70 files, no dup, no hole; DEPLOYMENT.md matches the OVH reality     |
| 6   | Ferry pipeline                     | **8** | `ferry.config.yaml` coherent with the branch model; Jira column names unverified             |
| 7   | Architecture & boundaries          | **7** | Three-layer holds except `keys/issue`; 4.85 % duplication; the "three clients" are two       |
| 8   | AFRIK data integrity & Source Tier | **8** | 40/40 checks, 0 errors; **0 of 5 283 sources untiered**; 0 Wikipedia citations               |
| 9   | Performance & accessibility        | **4** | axe and e2e green; Lighthouse red on every branch, all day                                   |
| 10  | Docs & runbooks                    | **7** | Deploy + secret runbooks current; restore drill 13.6 months old, exceeding the 12-month rule |

Mean = **7.6**.

Cross-domain defects were harmonised before the mean was computed. Lighthouse is counted
once, in Domain 9, and referenced from Domain 3 without re-penalising it. The `keys/issue`
boundary break is counted once, in Domain 7, and referenced from Domain 1.

---

## 5. Strengths

- **No P0 is open.** The first revision of this document able to say so.
- **RLS coverage is complete.** Replaying every `CREATE TABLE` and `DROP TABLE` in file
  order leaves **41 live tables, all 41 with `ENABLE ROW LEVEL SECURITY`**. The two tables
  with RLS and zero policies — `antibot_challenges`, `search_query_log` — are deny-all by
  design, the correct fail-closed posture for server-written tables.
- **Every source in the corpus carries a tier.** 5 283 entries, zero untiered. Under a
  doctrine whose entire gate is _"every source carries an explicit tier"_, this is the
  measurement that matters, and it is perfect.
- **The full suite is green.** 6 668 tests pass across 647 files, 21 skipped, **zero
  failures**; `lint` (0 errors), `typecheck`, `format:check` and `build` all clean. Coverage
  sits well above its declared thresholds: 84.84 % statements, 79.02 % branches, 88.27 %
  functions, 85.67 % lines against minimums of 70/60/70/70.
- **Every repo-specific gate passes**: `lint:req`, `check:jira-template`,
  `check:action-pins`, `check:env-example`, `check:migration-files`, and
  `test:charter-contracts` (51 files, 617 tests).
- **Rate limiting fails closed, deliberately** — `checkUpstashConfigured()` returns 500
  rather than serving unthrottled traffic.
- **Both integration and release branches are protected**, requiring the same five contexts
  (`gitleaks`, `build`, `validate`, `openapi-diff`, `axe-core (Storybook)`) and refusing
  force pushes.

---

## 6. Gaps and risks

### Lighthouse is red everywhere, and therefore carries no signal (Domain 9) — P1

Every one of the five most recent `lighthouse.yml` runs failed, across five different
branches (`ferry/ETNI-1391`, `feat/axis-entry-descriptions`,
`feat/etni-1420-index-quiz-questions`, `fix/vercel-standalone-output`). On the same commits,
`a11y.yml` and `e2e.yml` were **green every time**.

The problem is no longer primarily that the routes are slow — it is that a gate which fails
on every branch cannot distinguish a regression from the baseline. It has been red long
enough that it now functions as noise, and the repo's own workflow comment at
`.github/workflows/lighthouse.yml:49` asserts the opposite of its lived behaviour: _"gate is
enforced — no continue-on-error masks failures."_ It is enforced, and it is ignored, which is
the worst of both.

The previous revision established the shape of the underlying work and it still holds: the
failing routes are two distinct populations. Four score 0.78–0.83 — near-misses a few points
short of the 0.85 budget. Three score 0.47–0.49 with total-blocking-time at 2 101 / 2 598 /
3 350 ms against a 300 ms budget. A TBT of two to three seconds is main-thread JavaScript,
not payload weight: that group is the globe. The two populations need different work, and
conflating them has been costing effort.

**The decision this needs is not engineering, it is whether to re-baseline.** A budget nobody
can meet is a budget, not a bug.

### `keys/issue` bypasses the service layer that exists for it (Domain 7) — P1

`src/app/api/v2/keys/issue/route.ts` queries Supabase directly — `.from("api_keys")` at
`:55` and an `.insert(...)` at `:79`, against a `createAdminClient()` imported at `:37`. It
is the **only** one of the 21 v2 route groups that does this; every other route delegates.

What makes it worth fixing rather than tolerating is that **both layers already exist**:
`src/api/v2/handlers/keys.ts` and `src/api/v2/services/keyService.ts` are present and
populated. This is not a missing abstraction, it is one route that walks around the
abstraction — on the single most security-sensitive table in the schema, with the
service-role client.

### The "three Supabase clients" are two (Domain 7) — P2

`CLAUDE.md` documents three clients that are "never interchangeable". In practice
`src/lib/supabase/client.ts` (browser, anon key) is imported by exactly one module,
`src/lib/flags-client.ts` — which `knip` reports as an orphan file reached by nothing. The
browser client is therefore live only through dead code. Either the invariant should be
restated as two clients, or the browser path should be reconnected deliberately.

### Dead code & redundancy (Domains 4, 7) — P1/P2

`knip` reports **32 unused files, 189 unused exports, 107 unused exported types, 4 unlisted
dependencies, 1 unused dependency, 11 unused devDependencies**. `jscpd` measures **4.85 %
duplicated lines** (821 clones over 1 324 files), which is low and carries no penalty.

- **P1 — 4 unlisted dependencies.** `esbuild`, imported by three `scripts/*-bundle-size.ts`,
  and `tinyglobby`, by `src/app/[lang]/__tests__/loaderCoverage.test.ts`. These resolve today
  only because a transitive hoist provides them. The previous revision opened with an
  incident of exactly this shape — a hoisted `ajv@6` where `^8` was declared — which produced
  two false failures and cost a full re-run. Unchanged since.
- **P1 — confirmed orphans**: `src/lib/flags-client.ts`, `src/lib/home/accessAxesData.ts`,
  `src/api/v2/schemas/games.ts`, and three empty barrels
  (`src/components/{compare,names,relations}/index.ts`).
- **P2 — `scripts/` carries 10 orphaned one-off scripts** (`checkMigration.ts`,
  `convertAfrikToJson.ts`, `testLoader.ts`, `loadCountryProvenance.ts`, …).

**Known false positives — do not action:**

- **`sharp` reported as an unused dependency.** Never imported; Next loads it implicitly for
  `next/image` optimisation. Removing it on knip's word would silently degrade image
  optimisation on the self-hosted host.
- **The bulk of the 189 "unused exports" are components that are demonstrably rendered** —
  `ConfidenceChip`, `AutonymExonymHeading`, `ActionLink`, the whole `quiz/` and `play/`
  families. They are exported both named and default and consumed via one form only; knip
  reports the other. Treat this list as a lead, never as a delete-list.
- `e2e/support/factories/*` and `e2e/global.setup.ts` are reached through the Playwright
  config, which knip does not follow; `docs/design/mockups/*` are built by `node build.js`.

### Hardcoded values (P0/P1)

**No P0, and below the penalty threshold for Domains 5 and 7.** The scan for hardcoded
Supabase, Upstash and Sentry URLs across `src/**` returns **empty**. The literals worth
naming are all documented contract values rather than deployment-varying configuration:

- Seven pagination defaults (`perPage ?? 20`, `limit ?? 20`) across the v2 handlers —
  documented API defaults.
- Cache-control TTLs (`s-maxage=3600`, `s-maxage=86400, immutable`) — these are the AR18
  cache classes, named as such in the OpenAPI annotation directly above each constant.

### Code debt (Domain 4) — P2

80 lint warnings (0 errors); 23 stray `console.*` in `src` outside tests against a rule that
handlers use `@/lib/api/logger`; 36 `TODO`/`FIXME` markers; 4 moderate `npm audit` advisories,
none high or critical.

`next-env.d.ts` remains tracked while `next build` regenerates it, so every build leaves the
tree dirty. It is one of only two modified files in `git status` at the end of this audit.

### Two findings from the previous revision that did not survive re-examination

Recorded so they are not re-discovered a third time.

**The seven "dead V1 tables" do not exist.** The previous revision reported
`african_regions`, `countries`, `ethnic_groups`, `ethnic_group_languages`,
`ethnic_group_presence`, `ethnic_group_sources` and `languages` as surviving V1 schema with
RLS and no policies, and raised a P1 to drop them. **Migration `007` already drops all of
them**, at `007_remove_v1_add_v2_contribution_types.sql:21-28`. The error came from counting
`CREATE TABLE` statements without replaying `DROP TABLE`; the corpus creates 48 tables and
leaves **41** live. `sources` appears in that drop list and is legitimately live — `007`
drops the V1 table and `009_module_zero_fabric.sql:9` recreates it as the Module Zero table.
Any future RLS count must replay both statements in file order.

**`needs_review` is not vocabulary drift — it is a gated ratchet.** The previous revision
flagged 1 031 sources carrying `tier: "needs_review"` as an open question, on the grounds
that the DB `CHECK` constraint does not accept the value. It does not need to. The chain is
deliberate and complete at every link:

- `scripts/codemods/tierStringSources.ts:25` states outright that `needs_review` _"is
  deliberately not a member of `SourceTier`"_ — it is the honest placeholder emitted when
  neither the source catalogue nor the domain rulings can settle a tier.
- `src/lib/afrik/loaders/provenanceWriter.ts:70` maps it to `NULL` on the way to the
  database: `tier: isSourceTier(source.standing) ? source.standing : null`.
- The constraint is `CHECK (tier IS NULL OR tier IN ('official','referenced','unverified'))`
  (`041_one_source_tier_vocabulary.sql:79`) — `NULL` is explicitly permitted.
- And it is **actively burning down under a CI gate**:
  `scripts/ci/checkSourceTierCoverage.ts` declares `NEEDS_REVIEW_RATCHET = 1063` with the
  comment _"DESCENDING RATCHET … Lower it whenever a classification pass clears sources;
  NEVER raise it."_ The corpus stands at **1 031**, thirty-two below the ratchet. The gate
  runs in `data-integrity.yml:44`.

The same gate's `TIERS_WITH_AUTHORITY` set explicitly admits numeric `1` and `2`, which is
why the 37 remaining numeric tiers across 19 files do not fail the build. They are a known,
tolerated tail rather than an unnoticed defect — worth migrating, but not a finding.

**A third claim was tested this revision and found sound.** `recompute_confidence()` scores
source quality with a `CASE` over `tier` that has no `ELSE`, so a `NULL` tier falls through
it and `COALESCE(v_avg_source_quality, 0)` zeroes the quality term — while `v_source_count`
still counts that source toward the volume term. The ordering this produces is the correct
one: five untiered sources score `0.50`, five honestly-labelled `unverified` sources score
`0.62`. Declining to label is **not** rewarded over labelling weakly, which is what the
doctrine requires. The residual observation is only that half the score (the 0.50 volume
term) is blind to authority by construction — **P2, by design, not a defect.**

---

## 7. Consumer / new-contributor flow

`git clone` → `npm ci` (`.npmrc` sets `legacy-peer-deps`, so no flag is needed) →
`cp .env.example .env.local` → migrations → `npm run dev`.

`check:env-example` verifies `.env.example` against the code **in both directions** — 41
environment references across 1 538 files, all documented, and every documented entry
actually read. That bidirectionality is why this flow holds rather than rotting.

The step that failed in the previous revision now passes: migrations apply cleanly and in
order, verified by five consecutive green `Apply Migrations — Recette` runs.

Two traps remain, both documented rather than tribal:

- `UPSTASH_REDIS_REST_URL` / `_TOKEN` read as optional but are mandatory in a production
  build — without them every `/api/v2/*` answers 500 while pages render normally.
- `ANTIBOT_HMAC_SECRET` is not inert when unset: `GET /api/v2/antibot/challenge` answers 503
  and every report dialog fails, while the build stays green.

---

## 8. Security posture

**48 tables are created across the 70 migrations; `007` drops 8 and `009` recreates one,
leaving 41 live. All 41 have RLS enabled. Zero open tables, zero P0 in this table.**

| Table                                                                | RLS enabled | Policies | Notes                    |
| -------------------------------------------------------------------- | ----------- | -------- | ------------------------ |
| afrik_countries                                                      | yes         | 1        | public read              |
| afrik_language_families                                              | yes         | 1        | public read              |
| afrik_languages                                                      | yes         | 1        | public read              |
| afrik_peoples                                                        | yes         | 1        | public read              |
| afrik_people_countries / \_languages / \_relations                   | yes         | 1 each   | join tables              |
| afrik_patronymes + \_peoples / \_countries / \_persons / \_alliances | yes         | 1 each   | public read              |
| persons, person_peoples, person_countries                            | yes         | 1 each   | public read              |
| sources                                                              | yes         | 3        | Module Zero provenance   |
| assertions, assertion_references, confidence_scores                  | yes         | 1–2 each | provenance fabric        |
| api_keys                                                             | yes         | 1        | admin-only writes        |
| user_roles                                                           | yes         | 5        | admin-only writes        |
| audit_log                                                            | yes         | 3        | append-only              |
| flags, migration_events, name_records, editorial_doctrine            | yes         | 5 each   | moderated write paths    |
| revisions, revision_drafts, fiche_revisions                          | yes         | 1–4 each | editorial workflow       |
| contributions, contributor_profiles                                  | yes         | 2–3      | submit / moderate        |
| protected_records, protected_record_audit                            | yes         | 1 each   | rights & consent         |
| oral_narratives, oral_narrative_links, source_working_assets         | yes         | 1–5 each | editorial assets         |
| quiz_questions, quiz_generation_runs                                 | yes         | 1 each   | generated content        |
| antibot_challenges, search_query_log                                 | yes         | **0**    | deny-all; server-written |

Other findings, all verified this run:

- **CSP nonce is per request** — `btoa(crypto.randomUUID())` at `src/middleware.ts:435`,
  injected into `script-src` and `style-src` (`:75`, `:80`).
- **Headers**: HSTS (`:64`), `X-Content-Type-Options: nosniff` (`:67`),
  `Referrer-Policy: strict-origin-when-cross-origin` (`:68`).
- **API keys**: PBKDF2-SHA256, 600 000 iterations, 16-byte salt
  (`src/lib/api/auth.ts:15,16`), self-describing format
  `pbkdf2v1:{iterations}:{salt}:{hash}`; raw keys never stored.
- **Sentry**: EU residency asserted at init on all three runtimes — a production build throws
  if the DSN is not `ingest.de.sentry.io`; PII scrubbed in `beforeSend` via
  `@/lib/sentry/pii-scrubber`.
- **Service-role isolation holds.** The only non-API import is a `"use server"` Server
  Action (`src/app/[lang]/compte/profil/actions.ts`), which never reaches a browser bundle.
- **Supply chain**: no unpinned third-party Action; `npm audit` reports 4 moderate, 0 high,
  0 critical.
- **Nobody can deploy from a clone**: `deploy-production.yml` triggers only on
  `release: published`, has no `workflow_dispatch`, and forks receive no secrets.
- **Branch protection** (read from GraphQL, which has proved reliable where REST has not):

  ```
  main     force=false del=false strict=true  admin=true  checks=[gitleaks, build, validate, openapi-diff, axe-core (Storybook)]
  recette  force=false del=false strict=false admin=true  checks=[gitleaks, build, validate, openapi-diff, axe-core (Storybook)]
  ```

  `strict: false` on `recette` is deliberate: with parallel Ferry sessions merging
  continuously, requiring "up to date with base" on the integration branch makes every merge
  stale every other open PR.

- **Residual (Domain 2, P2)**: the recette credentials leaked in git history were remediated
  by **disabling the legacy key system, not by rotating the JWT signing key** — a distinction
  `docs/runbooks/secret-exposure-audit-2026-09.md` now records explicitly, along with what was
  done and how it was verified. The leaked `service_role` JWT remains cryptographically valid
  until 2036 and is inert only for as long as legacy keys stay disabled. **Legacy keys must
  never be re-enabled on the recette project.** The previous revision's P1 — "no completion
  record" — is closed; this is the documented, accepted residual.

---

## 9. Performance & accessibility posture

- **axe-core: green, and not advisory.** Green on all five most recent runs.
- **E2E (Playwright): green** on all five most recent runs.
- **Lighthouse: red on every branch, all day.** See §6 — this is the domain's whole story
  and the largest single drag on the score.
- **Two a11y gates audit different route lists.** A green axe run is not evidence that
  Lighthouse's `categories:accessibility = 1.0` assertion passes; the previous revision
  measured one route at 0.98 while axe was green on the same tree. Neither gate substitutes
  for the other.
- Mobile-first is honoured at the project breakpoints (mobile 430px, tablet `md` 720px,
  desktop `xl` 800px); the app is French-only, so no locale fan-out is expected.

---

## 10. AFRIK data integrity & Source Tier compliance

**954 fiche JSON files** tracked under `dataset/source/afrik/`, carrying **5 283 `sources[]`
entries**.

| #   | Check                         | Verdict                                                          |
| --- | ----------------------------- | ---------------------------------------------------------------- |
| 1   | Strict model adherence        | **Pass** — 15 strict models present; validator enforces them     |
| 2   | Validator run                 | **Pass** — 40/40 checks, **0 errors**, 4 022 advisory warnings   |
| 2b  | FR28 hard gate [95,105]       | **Pass** — zero fiches outside the band                          |
| 2c  | FR28-strict [99,101]          | **Pass** — burn-down at zero; both bands fail the build          |
| 3   | FLG / PPL / ISO consistency   | **Pass** — orphan-fiche and reference checks green               |
| 4   | Source tier compliance        | **Pass** — **0 of 5 283 entries untiered**; see below            |
| 5   | DB vs source-JSON consistency | **Not verified** — recorded as a gap, not asserted               |
| 6   | CI enforcement                | **Pass** — both gates on `pull_request`, neither advisory        |
| 7   | Known-issues carry-over       | Reviewed; `checkEditorialRules.ts` reports 0 errors, 97 warnings |

**The gate the doctrine actually sets is clean.** _"Nothing is forbidden. Everything is
labelled"_ makes the blocking condition a source with no stated tier. There are none:
5 283 entries, 5 283 tiers.

**Tier distribution:** `unverified` 1 623 · `official` 1 370 · `referenced` 1 223 ·
`needs_review` 1 031 (a gated, descending placeholder — §6) · numeric `1`/`2` 37 across 19
files (knowingly admitted by the gate's `TIERS_WITH_AUTHORITY` set).

**Wikipedia and the aggregator question.** Zero fiches cite `wikipedia.org` as a source URL.
81 entries cite blogs, Facebook, Reddit or X — 80 at `unverified`, 1 at `needs_review`. Under
the current doctrine this is **correct behaviour, not a finding**: `unverified` exists
precisely to carry "aggregators, tertiary encyclopedias, blogs, social media, community
accounts", and excluding them would itself be the colonial filter the posture rejects. The
claim is published _and_ its provenance is visible through `ConfidenceChip`. The 43 files
that mention Wikipedia do so in `notes`, which is the auditable cross-check chain
`CLAUDE.md` prescribes.

**Coverage of untiered sources across fiches**: 469 of 952 fiches with sources carry at
least one `needs_review` entry; **6 rest entirely on them** (`PPL_GONJA`, `PPL_GUAN`,
`PPL_HALPULAAR`, `PPL_HUMBE`, `PPL_KABYE`, `PPL_HARATINE`). Those six are the highest-value
targets for the next classification pass, since they are the fiches whose confidence score
currently draws no quality credit at all.

**Note on §5.** DB-vs-JSON row consistency was not verified: no database credentials were
used in this audit, by design.

---

## 11. Prioritized action list

| #   | P   | Action                                                                                                                         |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | P1  | Decide Lighthouse: repair the three globe routes (TBT 2–3 s) or re-baseline the budget. A gate red everywhere is noise         |
| 2   | P1  | Route `src/app/api/v2/keys/issue/route.ts` through `handlers/keys.ts` + `services/keyService.ts`, which already exist          |
| 3   | P1  | Declare the 4 unlisted deps (`esbuild`, `tinyglobby`) — hoist-luck is exactly what broke `ajv` last revision                   |
| 4   | P1  | Run a restore drill; the only one on record is 2025-07-14, 13.6 months ago and self-labelled "the first, and to date the last" |
| 5   | P1  | Split the Lighthouse route list from the axe list, or align them — a green axe run does not predict Lighthouse a11y            |
| 6   | P1  | Verify `/srv/ethniafrica/.env` on the OVH host is complete before the next Release (not auditable from here)                   |
| 7   | P2  | Classify the 6 fiches resting entirely on `needs_review` sources; lower `NEEDS_REVIEW_RATCHET` from 1 063 to match             |
| 8   | P2  | Migrate the 37 numeric tiers in 19 fiches onto the three-value scale, then drop `1`/`2` from `TIERS_WITH_AUTHORITY`            |
| 9   | P2  | Restate the "three Supabase clients" invariant in `CLAUDE.md` as two, or reconnect the browser client deliberately             |
| 10  | P2  | Delete the confirmed orphans (`flags-client.ts`, `accessAxesData.ts`, `schemas/games.ts`, the 3 empty barrels)                 |
| 11  | P2  | Untrack or commit `next-env.d.ts` — every `next build` currently dirties the tree                                              |
| 12  | P2  | Replace the 23 stray `console.*` in `src` with `@/lib/api/logger`; triage the 4 moderate advisories                            |
| 13  | P2  | Prune the 10 orphaned one-off scripts under `scripts/`                                                                         |
| 14  | P2  | Add a periodic assertion on branch protection — it vanished silently once, and nothing in CI reports on its own enforcement    |
| 15  | P2  | Verify DB-vs-JSON row consistency in a run that is allowed database credentials                                                |

---

## 12. Conclusion

**This is the first revision of this document with no open P0.** The blocker that defined the
previous one — three migrations building a GIN index on a function Postgres will not accept
there — was fixed by folding all three through the `IMMUTABLE` wrapper migration `052` had
created for exactly that purpose, and the migration job has been green five times since.
Recette's schema and recette's code are back in agreement, which means claims about what
recette serves are verifiable again.

The codebase underneath is healthy: 6 668 tests green with zero failures, coverage well above
its thresholds, `lint`/`typecheck`/`format`/`build` clean, every repo-specific gate passing,
41 of 41 live tables under RLS, PBKDF2 at 600 000 iterations, a fail-closed rate limiter, and
an editorial validator passing 40 of 40 checks with zero errors.

The editorial surface deserves particular note, because it is the product. Five thousand two
hundred and eighty-three source citations, and **not one of them lacks a stated tier**. The
doctrine's gate is not "reject weak sources" but "every source carries an explicit tier", and
against that gate the corpus is perfect. The 81 blog, Facebook and Reddit citations sitting
at `unverified` are the doctrine working as designed, not leaking — and a rubric written
against the retired Tier 1/2/3 policy would have reported all 81 as P0s.

What holds the score at 7.6 is almost entirely **a performance gate that fails on every
branch**. Lighthouse has been red all day across five different branches while axe and e2e
were green on the same commits, and the workflow file asserts that its enforcement is
meaningful. It is enforced and it is ignored — which means the repository currently cannot
tell a performance regression from its own baseline. That is now the most valuable single
thing to fix, and it may well be fixed by lowering the budget rather than by raising the
performance.

One process note worth carrying forward. Two findings from the previous revision did not
survive re-examination: the "seven dead V1 tables" had been dropped by migration `007` all
along, and the `needs_review` tier turned out to be a deliberate placeholder with a mapper, a
permissive constraint and a descending CI ratchet behind it. Both were produced by a static
read that stopped one step short — counting `CREATE TABLE` without replaying `DROP TABLE`,
and reading a value's absence from an enum without following it to its writer. A third
suspicion raised this revision — that the confidence formula rewards leaving a source
unlabelled — was tested against the actual arithmetic and proved false. The corpus and the
schema both reward being followed to the end.
