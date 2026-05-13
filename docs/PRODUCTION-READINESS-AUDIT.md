# EthniAfrica — Production Readiness Audit

**Date:** 2026-05-14
**Branch audited:** `recette` (HEAD `e451958`)
**Method:** Read-only multi-axis assessment inspired by Google SRE PRR
(https://sre.google/sre-book/evolving-sre-engagement-model/). The six SRE
engagement axes (architecture & dependencies, instrumentation/metrics, emergency
response, capacity planning, change management, performance metrics) are folded
into the 10-domain rubric below and adapted to the Next.js 15 + Supabase + AFRIK
stack.

The audit is local and offline: no Supabase / Sentry / Upstash / Plausible APIs
were called. No source files were modified. Only this report was written.

---

## 1. Scope and method

Inputs gathered (Step 3):

- `git status` / `git log -20` / `git branch --show-current`
- `npm run type-check`, `npm run lint`, `npm run format:check`, `npm run test`
- `npm audit --audit-level=moderate`
- `git grep` over `console.*`, `TODO|FIXME`, secrets, unpinned actions, admin
  client isolation
- `gh run list` for last 10 CI runs
- Inspection of `src/middleware.ts`, `src/lib/api/{auth,cors,rate-limit,logger}.ts`,
  `sentry.{client,server,edge}.config.ts`, `src/lib/sentry/pii-scrubber.ts`
- All 13 `supabase/migrations/*.sql` for RLS + policy coverage
- Step 3.5 hardcoded-values scan over `src/**/*.{ts,tsx}`
- Step 3.6 AFRIK data-integrity scan over `dataset/source/afrik/`
- All 11 `.github/workflows/*.yml` for advisory-mode flags and action pinning

The audit doc replaces the previous absence (file did not exist before this run).

---

## 2. Overall score

**6.0 / 10 — Conditional.** The frontend, observability, and operational docs
are at production grade. The data plane has a wide-open RLS hole, the editorial
doctrine is materially violated by the dataset, and the gates that should catch
this in CI are running in advisory mode, so the safety net does not actually
catch anything yet.

**Top 3 blockers** (block any production cut):

1. **AFRIK tables have no RLS** — `afrik_countries`, `afrik_peoples`,
   `afrik_languages`, `afrik_language_families`, `afrik_people_countries`
   are exposed to anon read **and write** via the public anon key.
2. **Lighthouse + Data-Integrity workflows in advisory mode**
   (`continue-on-error: true`) — the entire perf/a11y/data gate is decorative.
3. **AFRIK demographics 100 % rule violated on 30 of 54 countries**, 9 of which
   are at 0 %. End-user trust gate. (Step 3.6 §2.)

---

## 3. Score per domain

| #   | Domain                      | Score | One-line verdict                                                                                                                                                                                                           |
| --- | --------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Application security        | 7     | PBKDF2 + per-request CSP nonce + EU Sentry; CSP missing `connect-src` for Supabase, PBKDF2 below current OWASP 2023 (600k).                                                                                                |
| 2   | Supply-chain & secrets      | 6     | No committed secrets; **20 npm vulns** (1 critical, 11 high, 8 moderate); actions tag-pinned, not SHA-pinned.                                                                                                              |
| 3   | Correctness & tests         | 5     | 85 of 3,146 tests fail (3.2 %), but 53 are duplicates from 6 stale `.claude/worktrees/`. Real failures ~18 in `src/`. Coverage not measurable (broken).                                                                    |
| 4   | Code quality & lint         | 5     | TSC clean. ESLint: 559 errors / 503 warnings. Prettier: 101 unformatted files.                                                                                                                                             |
| 5   | Architecture & boundaries   | 6     | 3-layer API pattern + 3-client Supabase isolation respected. **9 P0 + 38 P1 hardcoded values** (Step 3.5) — −1 penalty.                                                                                                    |
| 6   | Data integrity & migrations | 4     | RLS missing on 5 AFRIK tables (P0). 30/54 countries fail demographics. 23 ISO-code errors in PPLs. Wikipedia cited in 8/10 sampled fiches.                                                                                 |
| 7   | Observability & monitoring  | 8     | Sentry EU enforced at startup; PII scrubber for emails + IPs; structured logger; Plausible cookie-less.                                                                                                                    |
| 8   | Performance & accessibility | 6     | Lighthouse mobile config correct (perf 0.85 / a11y 1.0 / bp 0.95) on 3 routes — but **all 6 steps are `continue-on-error: true`**. A11y axe-core last 3 runs green.                                                        |
| 9   | Documentation & runbooks    | 8     | README, CLAUDE.md, project-context.md, DEPLOYMENT.md, api-contracts.md, restore-procedure.md, restore-drill-2025-07-14.md all present.                                                                                     |
| 10  | Release & deployment        | 5     | Semver 1.1.0; recette/main posture clear; **migration 007 not yet applied to prod**; `env.dist` missing Upstash + rate-limit + Sentry vars; Lighthouse / data-integrity gates not enforced; 3 P0 hardcoded values penalty. |

**Mean = 6.0 / 10.**

---

## 4. Strengths

- **Per-request CSP nonce**, HSTS preload, X-CTO, Referrer-Policy wired in
  `src/middleware.ts` (lines 7–23, 32).
- **API key auth** uses PBKDF2-SHA256 with 100,000 iterations and 16-byte salt;
  raw keys never stored, only `key_prefix` + `pbkdf2v1:...` hash
  (`src/lib/api/auth.ts:12-67`).
- **Three-tier rate limiting** (IP / public-key / partner) wired into middleware
  before any other logic; admin keys are unrestricted by design
  (`src/lib/api/rate-limit.ts:82-115`, `src/middleware.ts:27-30`). Misconfig
  fails closed (500), transient Upstash failures fail open with Sentry capture.
- **Sentry EU residency enforced at startup** via `assertEuDsn()` — production
  builds throw if DSN does not target `*.ingest.de.sentry.io`
  (`src/lib/sentry/pii-scrubber.ts:11-34`).
- **PII scrubber** (`beforeSend`) redacts emails and truncates IPv4/IPv6 to /24
  in messages, breadcrumbs, and user data (`src/lib/sentry/pii-scrubber.ts:101+`).
- **Operational docs** complete: `docs/DEPLOYMENT.md`, `docs/runbooks/restore-
procedure.md`, `docs/runbooks/restore-drill-2025-07-14.md` (drill within the
  12-month window), `docs/api-contracts.md`, `docs/infra-data-residency.md`.
- **Three Supabase clients are properly isolated** — `git grep` confirms
  `@/lib/supabase/admin` is only imported from `src/app/api/`,
  `src/lib/audit/log.ts`, `src/lib/api/auth.ts`, and tests. Never reaches a
  client component.
- **No committed secrets** — `git grep` for `sk_live`, `sbp_`, JWT-shaped tokens
  is clean across the repo (excl. `node_modules`, `.next`, `.claude/worktrees`).
- **CI breadth**: 11 workflows including A11y axe-core, Lighthouse mobile,
  OpenAPI breaking-change diff, Data-Integrity gate, Confidence recompute,
  Claude code review, and a Ferry agent loop (refine/dev/review/iterate).

---

## 5. Gaps and risks

### 5.1 Application security (Domain 1)

- **CSP omits `connect-src`** — `src/middleware.ts:15-22` declares
  `default-src 'self'`, `script-src`, `style-src`, `img-src 'self' data:`,
  `frame-ancestors 'self'`, but no `connect-src`. Falls back to
  `default-src 'self'`, which **blocks browser fetches to `*.supabase.co`,
  Sentry DE, Plausible, and Upstash**. Either client-side Supabase calls do not
  exist in production paths (likely, given the SSR-first architecture), or this
  CSP is being silently violated and reported via `report-only`. Either way the
  policy is incomplete.
- **PBKDF2 iterations** at 100,000 — meets NIST SP 800-132 minimum but is below
  current OWASP 2023 recommendation of 600,000 for SHA-256. The hash format
  (`pbkdf2v1:{iterations}:...`) supports per-key upgrade — bumping the constant
  is safe.
- **28 stray `console.*` calls in `src/`** outside `__tests__` /
  `@/lib/api/logger`. Risks PII leaks to CloudWatch/Vercel logs.

### 5.2 Supply chain & secrets (Domain 2)

- **20 npm vulnerabilities** (1 critical, 11 high, 8 moderate). Run
  `npm audit --json --audit-level=moderate` to enumerate. No automated bot
  (Dependabot / Renovate) found in `.github/`.
- **GitHub Actions pinned by tag**, not by SHA: `actions/checkout@v4`,
  `actions/setup-node@v4`, `actions/upload-artifact@v4`,
  `actions/github-script@v7`, `anthropics/claude-code-action@v1`. Tag pins are
  mutable — a hostile maintainer or compromised release could substitute
  malicious code into a build.
- **Ferry actions pinned to `@v0.10.3`** (also tag-pinned, but at least an
  immutable version).
- `env.dist` is **incomplete** — missing `SENTRY_DSN`,
  `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
  `RATE_LIMIT_ADMIN_KEYS`, `RATE_LIMIT_PARTNER_KEYS`,
  `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `CORS_ALLOWED_ORIGIN`. `.env.example` is more
  complete (Sentry, Plausible) but still does not list Supabase or Upstash —
  the two `env.example`-style files are out of sync.

### 5.3 Correctness & tests (Domain 3)

- **53 of 85 failing tests are duplicates** from `.claude/worktrees/`
  (`admin-route-table-names`, `agent-a20ca95d0ee4cb1f2`, `agent-a46d1ce…`,
  `agent-ac9a92…`, `agent-afeeba…`, `fix-all-prs`). `vitest.config.ts` does not
  exclude these. Add `exclude: [".claude/**", "node_modules/**"]` to the
  vitest config.
- **Real `src/` failures** (~18) split as:
  - `src/__tests__/middleware-auth.test.ts` — 6 fails (mock plumbing for
    `Authorization` header).
  - `src/__tests__/middleware.test.ts` — 1 fail (matcher pattern mismatch with
    new `/api/v2/(.*)` entry).
  - `src/api/v2/handlers/__tests__/{countries,languageFamilies,peoples,search}.test.ts`
    — 4 file-level failures (`no-explicit-any` ESLint errors block compile).
  - `src/app/api/admin/contributions/[id]/__tests__/route.test.ts` — 4 fails
    on audit_log emission, **caused by the uncommitted table-rename in
    `route.ts`** (`afrik_peuples` → `afrik_peoples`, `afrik_pays` →
    `afrik_countries`); the rename is **correct** vs the migration but the
    mocks expect the old names.
  - `src/components/country/__tests__/components.test.tsx` — 1 CountryHero
    fail (meaning quote rendering).
  - `scripts/__tests__/migrateAfrikToDatabase.test.ts` — 6 pre-existing
    Supabase-mock failures (per memory `MEMORY.md`).
- **Coverage thresholds** (statements 70 / branches 60 / functions 70 /
  lines 70 in `vitest.config.ts`) cannot be evaluated because the test run
  fails before the v8 reporter writes results. `--quick` mode would have
  skipped this; full mode caught it. **Status: N/A.**
- **28 stray `console.*` calls** in `src/` outside `logger`. Should be replaced
  with `@/lib/api/logger`.
- **16 TODO/FIXME/XXX/HACK markers** in `src/` — low.

### 5.4 Code quality & lint (Domain 4)

- TSC `--noEmit`: **clean**.
- ESLint: **559 errors, 503 warnings (1,062 problems)**. The bulk are
  `no-explicit-any` in test files; the remainder include `tailwind.config.ts`
  using `require()` (forbidden by `no-require-imports`) and several
  `no-unused-vars` warnings in production code (`use-language.tsx:10`,
  `use-list-view.ts:34`, `use-toast.ts:15`, `pii-scrubber.ts:101`,
  `types/afrik-frontend.ts:14`). Lint is currently not a merge gate.
- Prettier: **101 files unformatted**.
- Husky / lint-staged is wired (`package.json:30-37`) but only runs on commit
  diff, so the existing backlog persists.

### 5.5 Architecture & boundaries (Domain 5)

- 3-layer API pattern (route → handler → service) is respected on the audited
  endpoints.
- 3-client Supabase isolation is respected — `@/lib/supabase/admin` reaches
  only `src/app/api/admin/contributions/[id]/route.ts`,
  `src/app/api/v2/keys/issue/route.ts`, `src/lib/audit/log.ts`,
  `src/lib/api/auth.ts`, and tests.
- AFRIK strict-model adherence — section keys / order / shape match
  `public/modele-*.json` on the 10-file sample, **but every sampled fiche is
  missing the `_meta` block** (entity / format / directives). Uniform drift
  across the dataset, not a one-off.
- `_bmad-output/project-context.md` is present and lists AI-agent invariants.

### 5.6 Hardcoded values (P0 / P1) — Step 3.5

**Summary: 9 P0, 38 P1.** Domain 5 and Domain 10 each take a −1 penalty.

#### Timeouts / Durations

- **P0** `src/hooks/use-toast.ts:6` — `TOAST_REMOVE_DELAY = 1000000` — **likely
  a typo bug**: ~16 minutes between toast and removal. Probably meant 1000ms.
- **P1** `src/components/search/SearchModalV2.tsx:73` — `300` — search debounce.
- **P1** `src/components/views/{People,LanguageFamily,Country}View.tsx` — `300` —
  artificial loading delay, duplicated × 3.
- **P1** `src/lib/consent.ts:4,39` — `12` × `30 * 24 * 60 * 60 * 1000` — fixed
  30-day months for consent expiry.
- **P1** `src/middleware.ts:10` — HSTS `max-age=31536000` (1 year).
- **P1** `src/components/ui/sidebar.tsx:16` — sidebar cookie 7-day max-age.

#### Retry & Backoff

- **P0** `src/lib/api/rate-limit.ts:165` — silent fail-open on Upstash error
  with no `RATE_LIMIT_FAIL_MODE=open|closed` knob.
- **P1** `src/lib/cache/clientCache.ts:125` — single retry with no backoff or
  attempt cap.

#### Size & Truncation Limits

- **P1** `src/lib/countryDataTransformer.ts` — `120 / 60 / 140 / 80 / 12 / 3`
  truncation magics (lines 311, 602–607, 713, 720, 879, 920).
- **P1** `src/components/charts/DemographicsChart.tsx:136-138, 212` — top-10 /
  top-15 bucket cutoffs.
- **P1** `src/components/country/EtymologyBlock.tsx:86` — `150` chars.
- **P1** `src/lib/api/auth.ts:14` — `KEY_PREFIX_LENGTH = 20` (cross-references DB).

#### Pagination & Batch Sizes

- **P0** `src/api/v2/utils/validation.ts:19` — `max: number = 100` cap on
  `perPage`. Should be `API_MAX_PER_PAGE` env-driven.
- **P1** Defaults `DEFAULT_PER_PAGE = 20` repeated across
  `src/api/v2/utils/validation.ts:21,23` and `src/lib/afrikLoader.ts:34-35`.
- **P1** `maxItemsMobile = 10` baked into `useListView` and 3 view components.

#### Cache TTLs

- **P0** `src/app/providers.tsx:52` — TanStack Query `staleTime: 60 * 1000`
  global. Controls all client cache freshness.
- **P1** No `Cache-Control` / `s-maxage` set on any `/api/v2/*` route — implicit
  no-cache, blocks edge caching.
- **P1** `src/lib/cache/clientCache.ts` — TTL parameterized but no defaults.

#### Rate-limit & Quota Thresholds

- **P0** `src/lib/api/rate-limit.ts:86` — IP tier `60 req/min`.
- **P0** `src/lib/api/rate-limit.ts:91` — Public-key tier `600 req/min`.
- **P0** `src/lib/api/rate-limit.ts:96` — Partner-key tier `6000 req/min`.

  All three (and the `1 m` window) are hardcoded; a tier rebalance requires a
  redeploy.

#### Confidence & Scoring Thresholds (AFRIK)

- None found — AFRIK classification uses the enum from `009_classification_status_enum.sql`,
  not numeric thresholds in code.

#### Default Parameters

- **P1** `src/lib/api/auth.ts:12` — `PBKDF2_ITERATIONS = 100_000` (below OWASP
  2023 recommendation of 600k).
- **P1** `src/lib/api/auth.ts:13` — `SALT_BYTES = 16`.
- **P1** `src/app/api/auth/callback/route.ts:12` — `"/admin/contributions"`
  hardcoded post-login redirect.
- **P1** `src/app/api/download/route.ts:152` — default `"csv"`.

#### Hardcoded URLs

- **P0** `src/app/providers.tsx:40` — `https://plausible.io/js/script.js`
  hardcoded; bypasses `NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN` indirection already
  built in `src/lib/plausible.ts`. Inconsistency.
- **P1** `"http://localhost:3000"` fallback in `src/app/layout.tsx:40`,
  `src/lib/api/openapi.ts:22`, `src/lib/api/openapiV2.ts:22`.
- **P1** `https://github.com/big-emotion/ethniafrica` repo URL in
  `src/lib/api/openapi.ts:13` and `openapiV2.ts:13`.
- **P1** `ingest.de.sentry.io` in `src/lib/sentry/pii-scrubber.ts:15,18`
  (intentional — GDPR — but should be env-overridable for region migration).

#### Hardcoded Roles / Tiers

- **P0** `src/lib/api/rate-limit.ts:8,18-22` — tier names + limits hardcoded;
  adding a new tier requires a code change.
- **P1** `src/middleware.ts:126` — `roles.includes("admin")` only — `moderator`
  and `advisor` cannot reach `/admin/*` even though the enum supports them.
- **P1** `src/lib/auth/supabase-auth.ts:7` — `UserRole` mirrors DB enum but no
  shared source of truth.

### 5.7 Data integrity & migrations (Domain 6) — Step 3.6

#### RLS coverage (data-plane gate)

| Table                         | RLS enabled | Policies                 | Notes                             |
| ----------------------------- | ----------- | ------------------------ | --------------------------------- |
| `african_regions`             | Yes (001)   | Read-public              | V1 — should be deprecated/dropped |
| `countries`                   | Yes (001)   | Read-public              | V1 — should be deprecated/dropped |
| `languages`                   | Yes (001)   | Read-public              | V1 — should be deprecated/dropped |
| `ethnic_groups`               | Yes (001)   | Read-public              | V1 — should be deprecated/dropped |
| `ethnic_group_presence`       | Yes (001)   | Read-public              | V1 — should be deprecated/dropped |
| `ethnic_group_languages`      | Yes (001)   | Read-public              | V1 — should be deprecated/dropped |
| `sources` (V1)                | Yes (001)   | Read-public              | V1                                |
| `ethnic_group_sources`        | Yes (001)   | Read-public              | V1                                |
| `contributions`               | Yes (001)   | Public insert + read-own | OK                                |
| **`afrik_countries`**         | **NO**      | **NONE**                 | **P0 — anon read+write open**     |
| **`afrik_language_families`** | **NO**      | **NONE**                 | **P0 — anon read+write open**     |
| **`afrik_languages`**         | **NO**      | **NONE**                 | **P0 — anon read+write open**     |
| **`afrik_peoples`**           | **NO**      | **NONE**                 | **P0 — anon read+write open**     |
| **`afrik_people_countries`**  | **NO**      | **NONE**                 | **P0 — anon read+write open**     |
| `user_roles`                  | Yes (007a)  | Self-read + admin-manage | OK                                |
| `sources` (008)               | Yes (008)   | Read-public              | Module-zero fabric                |
| `assertions`                  | Yes (008)   | Read-public              | No write policy = denied          |
| `confidence_scores`           | Yes (008)   | Read-public              | No write policy = denied          |
| `flags`                       | Yes (008)   | Read-public              | No write policy = denied          |
| `revisions`                   | Yes (008)   | Read-public              | No write policy = denied          |
| `editorial_doctrine`          | Yes (008)   | Read-public              | No write policy = denied          |
| `audit_log`                   | Yes (008)   | Admin-read only          | OK                                |
| `api_keys`                    | Yes (011)   | Owner-read               | Write via service-role only       |

`supabase/migrations/006_afrik_schema.sql` ends after `COMMENT ON COLUMN`
statements — there is no `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and no
`CREATE POLICY` for any AFRIK table. The migration leaves the entire dataset
exposed under the `anon` role. **This is the single highest-priority finding
in the audit and is reflected in §7.**

#### AFRIK editorial integrity (Step 3.6 condensed)

| #   | Check                   | Result                                                                                                                        |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Strict-model adherence  | ⚠️ PARTIAL — `_meta` missing in all 10 sampled files (uniform drift)                                                          |
| 2   | Demographics 100 % rule | ❌ FAIL — 30 of 54 countries outside [95, 105] %; 9 at 0 % (BDI, COG, COM, ETH, NGA, RWA, SWZ, TZA, ZAF)                      |
| 3   | FLG/PPL/ISO consistency | ⚠️ PARTIAL — sample clean, dataset has 23 ISO errors (`tw`, `ee`, `ribe`, `"undefined"`, `"Autres (...)"`) + V1 orphan folder |
| 4   | Source citations        | ⚠️ PARTIAL — authorized canon present, but Wikipedia cited in 8 of 10 sampled PPLs                                            |
| 5   | DB vs source-JSON       | ⚪ N/A — offline audit; no diff tool exists                                                                                   |
| 6   | Memory carry-overs      | ✅ PASS — confirmed; no regressions, no new resolutions vs `data_quality_status.md` (2026-04-13)                              |

**File-count drift** — memory says 789 PPL post-cleanup, on-disk count is 798
(+9). Either cleanup was reverted or the memory is stale.

#### Other migration findings

- Migration prefix collision **just resolved** — commit `5eee522` fixed the
  duplicated `008_` prefix and a `user_roles` schema conflict.
- Migration `007_remove_v1_add_v2_contribution_types.sql` is **not yet applied
  to production** (per memory). 14 V1 tables (`african_regions`,
  `countries` (v1), `languages` (v1), etc.) are still present in `001_`.

### 5.8 Observability & monitoring (Domain 7)

- All three Sentry runtimes (client / server / edge) call `assertEuDsn` —
  production throws if DSN does not target EU region.
- `beforeSend` is wired client-side and server-side; **edge config does NOT
  wire `beforeSend`** (`sentry.edge.config.ts` only calls `assertEuDsn`).
  Edge-runtime errors may leak PII.
- `tracesSampleRate` 0.1 in production — reasonable.

### 5.9 Performance & accessibility (Domain 8)

- `.lighthouserc.js` is correctly tuned: 3 routes (home, `/fr/pays/senegal`,
  `/fr/peuples/wolof`), mobile form factor, 4G throttling, thresholds
  `performance ≥ 0.85`, `accessibility = 1.0`, `best-practices ≥ 0.95`.
- **`.github/workflows/lighthouse.yml` runs all 6 of its `build / start / run`
  steps with `continue-on-error: true`** — the gate cannot fail the workflow.
  The comment on line 22-25 says "Advisory mode until repo secrets … are
  configured." That comment has been there long enough that the gate is, for
  practical purposes, decorative.
- Same pattern in `.github/workflows/data-integrity.yml` — 2 steps with
  `continue-on-error: true`. FR32 is not enforced.
- Last 3 `lighthouse.yml` runs report `success` but only because the
  `continue-on-error` swallows every failure. Cannot be cited as evidence of
  thresholds being met.
- Last 3 `a11y.yml` runs are `success` on `main`, `worktree-afrik-data-cleanup`,
  `main`. A11y axe-core appears to be a real gate (no `continue-on-error` in
  `a11y.yml`).

### 5.10 Documentation & runbooks (Domain 9)

All required surface present. Restore drill 2025-07-14 is within the 12-month
window. CLAUDE.md table-name section says
`afrik_familles_linguistiques / afrik_langues / afrik_peuples / afrik_pays`
(French) but the migration uses `afrik_language_families / afrik_languages /
afrik_peoples / afrik_countries` (English). **CLAUDE.md is stale on this
point** — see §6 below.

### 5.11 Release & deployment (Domain 10)

- `package.json` version `1.1.0`. Semver but no release notes in repo (no
  `CHANGELOG.md`).
- `recette` is the working branch, `main` is the base — clear posture.
- No GitHub branch-protection inspection performed (would need `gh api`).
- 6 stale `.claude/worktrees/` directories — operational hygiene; they pollute
  test runs and `find`.

---

## 6. Consumer / new-contributor flow (clone → run → admin)

| Step                                                       | Status | Evidence                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git clone` + `npm ci --legacy-peer-deps`                  | ✅     | `--legacy-peer-deps` is intentional (Next 16 vs Storybook).                                                                                                                                                                        |
| `.env.example` → `.env.local`                              | ⚠️     | Two example files (`env.dist`, `.env.example`) — out of sync. `env.dist` lacks Sentry, Upstash, rate-limit, Plausible vars. Newcomer must merge by hand.                                                                           |
| `supabase/migrations/` apply on fresh DB                   | ⚠️     | 13 migrations apply in order, but the recent `008_` collision (now fixed) shows the order has been fragile. Migration `007_remove_v1_add_v2…` is **not** in production yet — fresh DB will get the V2 schema, prod still on V1+V2. |
| `tsx scripts/migrateAfrikToDatabase.ts` against empty DB   | ⚠️     | 6 pre-existing test failures in the corresponding spec; runtime behavior unverified in this audit.                                                                                                                                 |
| `tsx scripts/seedAdmin.ts`                                 | ⚪     | Not directly verified. Memory references RBAC `reader / contributor / moderator / admin / advisor`.                                                                                                                                |
| `npm run dev` boots cleanly                                | ⚪     | Not run (no-build mode).                                                                                                                                                                                                           |
| `GET /api/v2/{countries,peoples,language-families,search}` | ⚠️     | 4 file-level test failures in handlers due to ESLint `no-explicit-any` blocking compile. Runtime unverified.                                                                                                                       |
| `/docs/api` Swagger renders                                | ⚪     | Spec exists at `src/lib/api/openapiV2.ts` (not verified to render).                                                                                                                                                                |
| `/admin` requires auth + RBAC                              | ⚠️     | Middleware (`src/middleware.ts:104-131`) only allows `admin` role; `moderator` and `advisor` are denied even though the enum exists. **Documented behavior diverges from declared RBAC.**                                          |

**Verdict — partial.** A new contributor can clone and probably get the dev
server up, but: (a) two env files conflict; (b) 4 of 4 V2 handler test files
are red on a fresh checkout; (c) admin route requires the operator to first
log in, then have a `user_roles` row with role exactly `admin` — neither is
documented in DEPLOYMENT.md. **P1.**

---

## 7. Security posture

**Strengths.** Supabase admin client never bundled to the browser; PBKDF2
hashing of API keys; per-request CSP nonce; HSTS preload + X-CTO +
Referrer-Policy on every response; per-tier rate limiting in middleware;
EU-region Sentry enforced at startup; PII scrubber for client + server (not
edge); `.env*` git-ignored; no committed secrets.

**Critical gaps (block production).**

- **P0 — RLS missing on all 5 AFRIK tables.** A request with the public anon
  key can `SELECT *`, `INSERT`, `UPDATE`, `DELETE` on `afrik_countries`,
  `afrik_peoples`, `afrik_languages`, `afrik_language_families`,
  `afrik_people_countries`. The data plane has no defence.
  **Fix:** add `ENABLE ROW LEVEL SECURITY` + a `read_public` policy + leave
  write denied (only service-role inserts) in a new migration `014_afrik_rls.sql`.
- **P0 — Lighthouse + Data-Integrity gates in advisory mode.** Any regression
  in performance, a11y, or AFRIK data integrity passes CI silently.
  **Fix:** remove `continue-on-error: true` from both workflows, gate by repo
  secrets being present.
- **P1 — Edge-runtime Sentry has no `beforeSend`.** Edge errors may carry PII.
  **Fix:** wire `beforeSend` in `sentry.edge.config.ts`.
- **P1 — Actions tag-pinned, not SHA-pinned.** Mutable refs.
  **Fix:** pin `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`,
  `actions/github-script`, `anthropics/claude-code-action` by SHA.
- **P1 — 20 npm vulnerabilities** (1 critical, 11 high). No Dependabot.
- **P1 — CSP omits `connect-src`.** Either incomplete or being silently
  violated.
- **P2 — PBKDF2 below OWASP 2023.** 100k → 600k.

---

## 8. Performance & accessibility posture

- **Lighthouse mobile thresholds defined and correct** (perf ≥ 0.85,
  a11y = 1.0, best-practices ≥ 0.95) on the 3 canonical routes.
- **Workflow runs in advisory mode** — last 3 runs `success` is misleading.
  Cannot certify thresholds are met.
- **A11y axe-core** appears to be a real gate; last 3 runs `success` on
  `main` / `worktree-afrik-data-cleanup`. **Real evidence of a11y health.**
- Mobile-first breakpoints (430 / 720 / 800) are documented and used in the
  country detail view (per memory).

**Verdict.** A11y is on target with evidence. Performance is "probably on
target" — until the gate is real, this is a faith-based statement.

---

## 9. AFRIK data integrity

See §5.7 for the table. Headline: **2 of 6 checks pass cleanly** (memory
carry-overs confirmed; sample-level FLG/PPL/ISO clean). **30/54 countries**
fail demographics, **23 dataset-wide ISO errors** in PPLs, **8/10 sampled
PPLs cite Wikipedia** (explicit doctrine violation), every sampled fiche is
missing the `_meta` block. The Data-Integrity workflow that should catch this
is in advisory mode.

---

## 10. Prioritized action list

**P0 (blocking — must be done before any production cut)**

1. **Add a migration `014_afrik_rls.sql`** that enables RLS on the 5 AFRIK
   tables and adds `FOR SELECT USING (true)` policies. Leave writes denied.
2. **Remove `continue-on-error: true`** from `.github/workflows/lighthouse.yml`
   (6 places) and `.github/workflows/data-integrity.yml` (2 places). Gate the
   build step on the presence of the relevant repo secrets instead.
3. **Fix `TOAST_REMOVE_DELAY = 1_000_000`** in `src/hooks/use-toast.ts:6` (a
   16-minute toast removal — almost certainly a typo).
4. **Externalize the 3 rate-limit tier RPMs + window** in
   `src/lib/api/rate-limit.ts:84-99` to env vars (`RATE_LIMIT_IP_RPM`,
   `RATE_LIMIT_PUBLIC_RPM`, `RATE_LIMIT_PARTNER_RPM`, `RATE_LIMIT_WINDOW`).
5. **Decide and run migration `007_remove_v1_add_v2_contribution_types.sql`**
   on production, or back it out of `recette`. Leaving it in limbo blocks the
   V1→V2 cleanup.
6. **AFRIK demographics** — fix the 9 countries at 0 % (BDI, COG, COM, ETH,
   NGA, RWA, SWZ, TZA, ZAF) and the 21 between 23 % and 90 %. This is the
   end-user trust gate. Use `tsx scripts/validateAfrikData.ts` as the gate.

**P1 (must be done before scaling)**

7. **Wikipedia in PPL `sources`** — sweep and replace with Ethnologue /
   Glottolog / Joshua Project (after doctrine review of the latter). 8 of 10
   sampled fiches affected.
8. **PPL ISO hygiene** — purge 23 invalid `iso_codes` / `currentCountries`
   entries; remove `peuples/V1/` orphan; reconcile 798 vs 789 file-count drift.
9. **Add `connect-src`** to CSP for `*.supabase.co`, `ingest.de.sentry.io`,
   `plausible.io`, Upstash, in `src/middleware.ts:15-22`.
10. **Wire `beforeSend` PII scrubber in `sentry.edge.config.ts`** (currently
    only client + server).
11. **Bump `PBKDF2_ITERATIONS`** to 600,000 in `src/lib/api/auth.ts:12`. Hash
    format already supports per-key upgrade.
12. **Add `exclude: [".claude/**", "node_modules/**"]`** to `vitest.config.ts`
    so worktree pollution stops inflating failure counts.
13. **Reconcile `env.dist` and `.env.example`** — pick one canonical file and
    list every required env var (Supabase, Sentry, Upstash, rate-limit, CORS,
    Plausible).
14. **Pin GitHub actions by SHA**, not by tag. Add Dependabot config.
15. **Reconcile CLAUDE.md** — table names listed are French
    (`afrik_peuples / afrik_pays / …`); migration uses English. Fix CLAUDE.md.

---

## 11. Conclusion

EthniAfrica is **6.0 / 10** — Conditional. The frontend stack, observability,
and operational documentation are at production grade. What blocks shipping
to production today is the **data plane** (RLS missing on every AFRIK table),
the **editorial doctrine breach** (30/54 countries off, Wikipedia cited as
source), and the **silent CI gates** (Lighthouse + Data-Integrity in advisory
mode, so neither the perf nor the data regressions can fail a build).

These are **fixable in a single focused sprint**: 1 migration, 8 lines of
workflow YAML, 1 typo fix, 4 env vars, 30 demographic-row corrections, and a
Wikipedia sweep. None of them require an architectural change. Once they land
**and the audit re-runs at 8.5 / 10 or above**, the project is ready to ship.

The strongest signal in this audit is that the team has built the right
_structure_ — RLS is enabled on every other table, the rate limiter tiers
exist, the Sentry EU enforcement is real, the docs are complete — and is now
within reach of completing the _coverage_.
