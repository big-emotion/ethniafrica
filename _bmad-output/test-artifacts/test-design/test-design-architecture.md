---
workflowStatus: "completed"
totalSteps: 5
stepsCompleted:
  - step-01-detect-mode
  - step-02-load-context
  - step-03-risk-and-testability
  - step-04-coverage-plan
  - step-05-generate-output
lastStep: "step-05-generate-output"
nextStep: ""
lastSaved: "2026-05-14"
workflowType: "testarch-test-design"
mode: "system-level"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
  - CLAUDE.md
---

# Test Design for Architecture: Africa History (EthniAfrica) — Program-Wide

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review by Architecture / Dev. Serves as the contract between the test architecture function and engineering on what must land before persona-level test development can ship.

**Date:** 2026-05-14
**Author:** Murat (TEA) — Master Test Architect
**Status:** Architecture Review Pending
**Project:** ethniafrica (working name: Africa History)
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md` (FR1–FR46, NFR set, persona journeys L167–271)
**ADR Reference:** `_bmad-output/planning-artifacts/architecture.md`
**UX Spec Reference:** `_bmad-output/planning-artifacts/ux-design-specification.md` (emotional matrix L50–197, phase roadmap L1211–1237)
**Epics Reference:** `_bmad-output/planning-artifacts/epics.md` (7 epics / 77 stories)

---

## Executive Summary

**Scope.** Program-wide E2E + integration + a11y + perf test architecture for the Africa History brownfield V2 stack, driven by the five persona journeys (Amina, Kofi, Fatou, Thomas, Ngozi) and the UX emotional matrix, sequenced against the five-phase UX roadmap.

**Business context** (from PRD):

- **Mission:** decolonial knowledge surface for African peoples / languages / countries. Module #0 (Sources & Verification) is the trust fabric that makes every other module credible.
- **Problem:** existing encyclopedias either erase autonyms, hide provenance, or paywall reach. Africa History's thesis is that radical transparency + autonym primacy + free open data wins target-persona trust.
- **GA target:** see phase roadmap; Phase 1 (Amina + Ngozi reading surface) is the MVP gate.

**Architecture** (from ADR / architecture.md):

- **Stack:** Next.js 16 App Router (SSR + edge cache) + Supabase (PostgreSQL) + 3-layer API (route → handler → service) + OpenAPI 3.1 as contract of record.
- **Auth migration:** admin-cookie → Supabase Auth + OAuth (GitHub / Google / ORCID), `user_roles` table.
- **Versioning model:** append-only `fiche_revisions` with byte-deterministic `content_snapshot` JSONB; pinned-version URLs `@vN`.
- **Verification fabric (Module #0):** ~12 new tables (`sources`, `flags`, `confidence_scores`, `verification_log`, `fiche_revisions`, `doctrine_versions`, etc.).
- **Mobile-first reference device:** entry-level Android over 4G, 430 px design width; breakpoints 430 / 720 / 800; moderation surface desktop ≥ 1024.

**Expected scale** (from NFR set):

- 100 k MAU on Supabase Pro + Vercel Pro · 1 000 concurrent API connections · 10× corpus headroom (→ 10 k fiches) without schema change · 20× traffic spike absorbed by edge cache.
- API: 10 req/s, 50 000 req/day free-tier key; p95 ≤ 300 ms cached / 800 ms uncached; ≥ 95 % edge-cache-hit on reference data.

**Risk summary:**

- **Total risks identified:** 25
- **Critical (score 9):** 3 — R-2 (per-assertion data model), R-3 (bundle bloat), R-11 (Lighthouse < 85). All gate Phase 1.
- **High (score 6):** 12 — span SEC, DATA, BUS, OPS, PERF, TECH.
- **Medium/Low (score ≤ 4):** 10.
- **Test build effort:** ~179–310 hours across Phases 1–4 (framework ~41–73 h + per-phase ~28–85 h). Single-engineer calendar: ~6–9 weeks part-time.

---

## Quick Guide

### 🚨 BLOCKERS — Architecture/Dev Must Resolve (No Persona E2E Without These)

Pre-implementation critical path. These must land before per-persona acceptance tests can be written.

1. **ASR-4: Per-assertion stable IDs in fiche content** — `data-assertion-id="…"` on every assertion DOM node + matching `id` on the backing DB row. Required by the per-assertion data-model migration that the UX spec L1238 names as the single hardest Phase-1 blocker. **Owner:** architect. **Without this, all of Phase 2 (Kofi journey) is dead-on-arrival.**

2. **ASR-1: Test-mode session injection** — `tests/utils/auth.ts → signInAsRole(role)` using Supabase admin client, emitting Playwright `storageState` JSON. Must be part of the Supabase Auth migration. **Owner:** dev (auth migration owner). **Without this, Fatou (Phase 3) cannot be tested at all and Kofi flag submission cannot be tested deterministically.**

3. **ASR-2: Synchronous confidence-score recomputation in test mode** — `TEST_MODE_SYNC_CONFIDENCE=true` env or `POST /v2/internal/recompute?ficheId=…` test-only hook gated by role. **Owner:** dev. **Without this, Kofi resolution assertions ("confidence moved 74 → 78") and Fatou flag-close path are flaky-by-construction.**

4. **ASR-7: Playwright reference-device profile** — viewport 430×812, deviceScaleFactor 2.625, `isMobile: true`, `hasTouch: true`, Slow-4G throttle, 4× CPU. **Owner:** testarch. **Without this, the Amina 10 s persona threshold is meaningless on a fast dev machine.**

5. **ASR-13: Lighthouse mobile + bundle-budget CI gates** — Lighthouse mobile ≥ 85 per reading-surface route; per-component JS budgets (ConfidenceChip ≤ 2 KB gz, SourceChainSheet ≤ 8 KB gz lazy). **Owner:** dev. **Without this, R-3 + R-11 ship to production.**

**What we need from team:** Resolve these five items pre-implementation or persona-level test development is blocked.

---

### ⚠️ HIGH PRIORITY — Team Should Validate (TEA Provides Recommendation, You Approve)

1. **R-2: Per-assertion data-model migration** — TEA recommendation: schema migration + `data-assertion-id` (ASR-4) lands as the _first_ Phase-1 story; failing acceptance test on the contract is written via `bmad-testarch-atdd` _before_ any UI primitive ships. **Approver:** architect.
2. **R-9: Test-data isolation in shared Supabase under parallel CI** — TEA recommendation: per-run UUID prefix on every test entity ID + `afterAll` cleanup hook + **local Supabase CLI** for fast feedback loop (Open Q1 default). **Approver:** dev + testarch.
3. **R-7: OAuth (GitHub / Google / ORCID) misconfig** — TEA recommendation: per-role auth E2E set (`fatou.signs-in`, `non-moderator.cannot-escalate`, `expired-session.is-redirected`) with `storageState` fixtures via ASR-1. **Approver:** dev (auth migration).
4. **R-10: "Emotions to avoid" silently regress** — TEA recommendation: a dedicated `emotion-guardrails.spec.ts` suite running on every reading-surface page checking absence of cookie wall / popup / red classification / leaderboard / engagement counter / autoplay / sub-44 px tap target, plus the 95 % rule (no `[data-pinned-banner]` on live URL). **Approver:** dev + UX lead.
5. **R-13: OpenAPI 3.1 drift** — TEA recommendation: CI drift gate comparing runtime-introspected schema vs `src/lib/api/openapiV2.ts`. **Approver:** dev.
6. **R-23: PII leakage in public flag URL** — TEA recommendation: response shape contract test asserting moderator-private notes never serialize to `GET /v2/flags/{id}`; HTML escape on flag body. **Approver:** dev (Module #0 owner).

**What we need from team:** Review recommendations and approve (or counter-propose). Each item directly affects the persona test plan and cannot be silently re-scoped.

---

### 📋 INFO ONLY — Solutions Already Defined

1. **Test-stack decision** — Vitest for unit / integration / API (matches existing), Playwright for E2E + API-E2E (already in devDeps), axe-core for a11y (already in devDeps), Lighthouse CI for perf. No new framework introduced.
2. **Tooling** — `@playwright/test ^1.49`, `@axe-core/playwright ^4.10.1`, `@seontechnologies/playwright-utils` to be added (`tea_use_playwright_utils: true` already configured). Test-data factories in `tests/factories/*.ts` (pure functions + Supabase admin seeding).
3. **Tiered CI/CD** — PR (≤ 12 min: lint + type + Vitest + data invariants + a11y on Storybook + selective Playwright slice + OpenAPI drift + service-role grep), nightly (full Playwright + Lighthouse + axe sweep + perf), weekly (URL-health cron, drift detection, visual regression).
4. **Coverage** — ~75 test scenarios in the system-level matrix across 5 personas + cross-cutting. P0 ≈ 36, P1 ≈ 22, P2 ≈ 6, P3 ≈ 2 (with priorities re-classified per epic in subsequent epic-level runs).
5. **Quality gates** — P0 = 100 % pass, P1 ≥ 95 %, 0 axe violations on reading surface, Lighthouse mobile ≥ 85, all X.1-INT-_ (AFRIK data invariants) green, no R-_ score ≥ 6 in OPEN status without waiver.
6. **Pre-existing failure quarantine** (ASR-11) — relocate 6 + 4 known failures to `__tests__/known-failing/` excluded from gate via `vitest.config.ts`. No silent regression masking.

**What we need from team:** Acknowledge. These are solutions, not asks.

---

## For Architects and Devs — Open Topics

### Risk Assessment

**Total risks identified:** 25 (3 critical, 12 high, 10 medium/low). Full register below.

#### Critical Risks (Score 9) — Gate-blocking

| Risk ID  | Cat  | Description                                                                                                                                | P   | I   | Score | Mitigation                                                                                                                                          | Owner     | Timeline          |
| -------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | --- | --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------- |
| **R-2**  | TECH | Per-assertion data-model extension not yet shipped (UX spec L1238 = single hardest Phase-1 blocker). Phase 2 (Kofi) impossible until done. | 3   | 3   | **9** | Schema migration + `data-assertion-id` (ASR-4) before any flag-UI work. ATDD: failing acceptance test on the contract first.                        | architect | Phase 1 mid       |
| **R-3**  | PERF | Bundle bloat from Phase-1 primitives (ConfidenceChip, SourceChainSheet, RevisionDrawer) breaches ≤ 500 KB per fiche.                       | 3   | 3   | **9** | Per-component JS budgets in CI (UX spec §1207: ConfidenceChip ≤ 2 KB gz; SourceChainSheet ≤ 8 KB gz lazy). Lighthouse mobile ≥ 85 CI gate (ASR-13). | dev       | Phase 1 ship gate |
| **R-11** | PERF | Lighthouse mobile < 85 after Phase 1 lands (compound JS + font + image weight).                                                            | 3   | 3   | **9** | Lighthouse mobile CI gate; `next/image` mandatory; fonts via `next/font` with `display: swap`; per-component budgets enforced.                      | dev       | Phase 1 ship gate |

#### High-Priority Risks (Score 6) — Mitigation Required

| Risk ID  | Cat  | Description                                                                                                | P   | I   | Score | Mitigation                                                                                                                              | Owner    | Timeline |
| -------- | ---- | ---------------------------------------------------------------------------------------------------------- | --- | --- | ----- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| **R-1**  | DATA | AFRIK demographics drift — DB ≠ source `.json` (FR28 invariant). 100 % sum violated → trust thesis breaks. | 2   | 3   | 6     | Promote `validateAfrikData.ts` to CI blocking gate (FR26–30). Weekly cron re-validate. Add Vitest invariant `sum=100±0.01` per country. | dev      | Phase 1  |
| **R-4**  | SEC  | Supabase service-role key leak to client bundle (NFR7) — new flag/moderation code is admin-heavy.          | 2   | 3   | 6     | Existing repo-wide grep gate + Playwright scrape of `.next/static/**` for `service_role` substrings.                                    | dev      | All      |
| **R-5**  | BUS  | Flag-to-public-URL roundtrip silently fails — Kofi credibility test of Module #0.                          | 2   | 3   | 6     | `kofi.flag-roundtrip.e2e.ts` covers submit → moderate → resolve → contributor credit visible. Email path contract-tested.               | dev      | Phase 2  |
| **R-7**  | SEC  | OAuth misconfig → moderator lockout OR unauthorized escalation.                                            | 2   | 3   | 6     | Per-role auth E2E + `storageState` fixtures via ASR-1.                                                                                  | dev      | Phase 3  |
| **R-9**  | OPS  | Test-data collisions in shared Supabase under parallel CI.                                                 | 3   | 2   | 6     | Per-run UUID prefix on test IDs; `afterAll` cleanup. Local Supabase CLI for fast feedback.                                              | testarch | All      |
| **R-10** | BUS  | "Emotions to avoid" silently regress.                                                                      | 3   | 2   | 6     | `emotion-guardrails.spec.ts` suite (no popups / red / leaderboards / autoplay / sub-44 px / pinned-banner-on-live).                     | testarch | Phase 1+ |
| **R-12** | SEC  | API key leaks in client logging / Sentry payload.                                                          | 2   | 3   | 6     | Sentry `beforeSend` strips key patterns; integration test posts events with secrets, asserts redaction.                                 | dev      | Phase 4  |
| **R-13** | OPS  | OpenAPI 3.1 drift — handler changes without updating `openapiV2.ts` (NFR37).                               | 2   | 3   | 6     | CI drift gate.                                                                                                                          | dev      | All      |
| **R-16** | DATA | URL-health drift — sourced URLs go 404 silently.                                                           | 3   | 2   | 6     | Weekly cron `tsx scripts/checkSourceUrls.ts`; auto-lower confidence + auto-flag.                                                        | dev      | Phase 1+ |
| **R-18** | SEC  | CSRF on moderation mutations.                                                                              | 2   | 3   | 6     | Supabase JWT + double-submit cookie; integration test asserts 403 without / 401 expired.                                                | dev      | Phase 3  |
| **R-20** | OPS  | E2E suite wall-clock > 5 min (NFR maintainability).                                                        | 3   | 2   | 6     | Shard by persona tag; CI matrix parallel; selective-testing on PRs (git-diff). Full suite only on main.                                 | testarch | All      |
| **R-23** | SEC  | Public flag URL leaks moderator deliberations / PII.                                                       | 2   | 3   | 6     | Response shape contract test: moderator-private `notes` never in public response; flag body HTML-escaped.                               | dev      | Phase 2  |

#### Medium-Priority Risks (Score 3–4)

| Risk ID | Cat  | Description                                                       | P   | I   | Score | Mitigation                                                                                                                                                                     | Owner     |
| ------- | ---- | ----------------------------------------------------------------- | --- | --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| R-6     | DATA | Pinned-version snapshot drift across schema migrations            | 1   | 3   | 3     | Fully-denormalized `content_snapshot` JSONB; forward-only migrations never mutate prior snapshot shape. Regression test loads `@v1` after 3 migrations, asserts byte-equality. | architect |
| R-8     | PERF | Stale confidence visible post-moderation due to edge cache        | 2   | 2   | 4     | Per-fiche cache tags + Vercel ISR `revalidate()` on commit; integration test asserts invalidation within p95 ≤ 2 s.                                                            | architect |
| R-15    | BUS  | 95 % rule breach — pinned-banner pollutes default reading flow    | 2   | 2   | 4     | Default-state E2E asserts no `[data-pinned-banner]` on live URL (negative test in emotion-guardrails).                                                                         | dev       |
| R-17    | TECH | Storybook framework regression (`@storybook/nextjs` reintroduced) | 2   | 2   | 4     | `build-storybook` in `make check`; lint rule blocks import.                                                                                                                    | dev       |
| R-19    | PERF | `@vN` snapshot render slower than live (full JSONB read)          | 2   | 2   | 4     | Pre-rendered HTML cache for pinned versions. Integration test asserts pinned p95 ≤ live p95 + 10 %.                                                                            | dev       |
| R-21    | DATA | Authorized-source allowlist regresses                             | 2   | 2   | 4     | Lint-style invariant: every `source.publisher` ∈ allowlist. CI gate.                                                                                                           | dev       |

#### Low-Priority Risks (Score 1–2)

| Risk ID | Cat  | Description                                                                    | P   | I   | Score | Action                                                                                                     |
| ------- | ---- | ------------------------------------------------------------------------------ | --- | --- | ----- | ---------------------------------------------------------------------------------------------------------- |
| R-14    | TECH | Pre-existing 6+4 failures mask new regressions                                 | 3   | 1   | 3     | Quarantine into `__tests__/known-failing/` (ASR-11). Move out only on explicit fix.                        |
| R-22    | BUS  | Diff drift between disputed line and rewritten line                            | 1   | 3   | 3     | Deterministic `fiche_revisions.diff`; integration test reproduces from snapshots, asserts byte-equality.   |
| R-24    | OPS  | CI flakiness from network seam to Supabase staging                             | 3   | 1   | 3     | Local Supabase CLI for the gate. Staging reserved for smoke / perf.                                        |
| R-25    | TECH | Test code violates KISS — over-abstracted page objects, duplicating prod logic | 2   | 1   | 2     | Enforced via `bmad-testarch-test-review`; pure-function factories; flat `e2e/{persona}/{journey}.spec.ts`. |

#### Risk Category Legend

- **TECH**: Technical / architecture (flaws, integration, scalability, framework regression)
- **SEC**: Security (access controls, auth, data exposure, CSRF, key leakage)
- **PERF**: Performance (LCP / INP / CLS / bundle / Lighthouse)
- **DATA**: Data integrity (AFRIK invariants, snapshot drift, URL rot, source discipline)
- **BUS**: Business / UX promise (Kofi roundtrip, emotion-guardrail, 95 % rule, diff authenticity)
- **OPS**: Operations (parallel-test isolation, OpenAPI drift, suite duration, CI seam)

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS — Architecture Team Must Address**

#### 1. Blockers to Fast Feedback (What Architecture Must Provide)

| Concern                                                                   | Impact                                                     | What Architecture Must Provide                                                                                                                  | Owner            | Timeline                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| **C1. No DB-state seeding layer for E2E**                                 | Cannot run persona E2E reliably                            | Local Supabase CLI scaffolding + `tests/utils/seed.ts` with admin-client factories; `dbReset()` between specs                                   | dev + testarch   | Pre-Phase-1                                 |
| **C2. Confidence-score recomputation is event-driven, no test-mode sync** | Kofi resolution assertions are flaky-by-construction       | `TEST_MODE_SYNC_CONFIDENCE=true` env flag OR `POST /v2/internal/recompute?ficheId=…` test-only role-gated endpoint (ASR-2)                      | dev              | Pre-Phase-2                                 |
| **C3. Auth migration in progress, no test backdoor designed**             | Fatou + Kofi journeys cannot sign in deterministically     | `signInAsRole(role)` test util that mints Supabase Auth session via admin client → emits Playwright `storageState` JSON (ASR-1)                 | dev (auth owner) | Pre-Phase-3 (must land with auth migration) |
| **C4. No per-assertion stable IDs in fiche content**                      | Cannot deterministically tap an assertion to flag it       | `data-assertion-id="…"` on every assertion DOM node + matching DB row `id` (ASR-4). UX spec L1238 confirms this is the hardest Phase-1 blocker. | architect        | Pre-Phase-2 (gates Kofi)                    |
| **C5. No fiche-revision seeding factory**                                 | Ngozi journey untestable (no `@vN` to read)                | `seedFiche({ ficheType, revisions: n })` → `{ ficheId, latestVersion, pinnedUrls[] }` (ASR-6)                                                   | testarch         | Pre-Phase-1 (gates Ngozi)                   |
| **C6. No reference-device throttle profile**                              | Persona thresholds (Amina 10 s) meaningless on dev machine | Playwright config encodes viewport 430×812, deviceScaleFactor 2.625, Slow-4G, 4× CPU (ASR-7)                                                    | testarch         | Pre-Phase-1 (gates all reading-surface E2E) |
| **C7. No test API-key tier**                                              | Thomas rate-limit tests untestable                         | `api_keys.tier='test'` with tunable limits + `POST /v2/internal/keys/{id}/reset-counter` (ASR-5)                                                | dev              | Pre-Phase-4                                 |
| **C8. No edge-cache-bypass header**                                       | Cross-test cache contamination                             | `X-Test-Bypass-Cache: 1` honored only when `NODE_ENV !== 'production'` (ASR-3)                                                                  | dev              | Pre-Phase-1                                 |

#### 2. Architectural Improvements That Would Make the System More Testable

1. **Brand config single-source-of-truth** (`src/lib/brand.ts`, per architecture.md cross-cutting #8)
   - Current problem: product name, canonical domain, attribution string scattered across routes / metadata / OG / sitemap
   - Required change: single config consumed by every surface, including tests
   - Impact if not fixed: rebrand (Africa History vs alternative) becomes a test-rewrite, not a config flip (ASR-14)
   - Owner: architect
   - Timeline: Phase 1

2. **Deterministic timestamp hook**
   - Current problem: `Date.now()` used directly; assertions like "last verified < 30 days" depend on wall clock
   - Required change: clock injection via DI or `TEST_MODE_CLOCK=2026-05-14T00:00:00Z` env var (ASR-15)
   - Impact if not fixed: time-sensitive tests will drift; URL-health tests will false-alarm
   - Owner: dev
   - Timeline: Phase 1

3. **Storybook story per L3 component is the a11y test substrate**
   - Current problem: `scripts/a11y-test.ts` exists but is not wired to enumerate Storybook stories
   - Required change: extend `scripts/a11y-test.ts` to crawl Storybook's `stories.json` and run axe against each, at 430 / 720 / 800 (ASR-10)
   - Impact if not fixed: a11y violations slip into the design system before reaching the page
   - Owner: dev + testarch
   - Timeline: Phase 1

4. **`make e2e` target separate from `make check`**
   - Current problem: NFR caps `make check` at 5 min; adding E2E would breach that
   - Required change: `make e2e` runs the Playwright suite; `make check` runs lint + type + Vitest only (ASR-12)
   - Impact if not fixed: developer feedback loop slows to a crawl, or `make check` gets skipped
   - Owner: testarch
   - Timeline: Pre-Phase-1

---

### Testability Assessment Summary — What Works Well

#### Strong Foundations (FYI)

- ✅ **Three-layer API (route → handler → service)** — clean integration boundary, cheap handler tests.
- ✅ **Supabase client isolation (3 clients)** — DI substitution at test boundary is trivial.
- ✅ **Zod schemas co-located** under `src/api/v2/schemas/` — fuzz-testable at the schema seam.
- ✅ **Mobile-first breakpoints (430 / 720 / 800) explicit** — perfect for parameterized viewport runs.
- ✅ **AFRIK source `.json` files** under `dataset/source/afrik/**` — deterministic seed bank for fixtures (strict-models rule: never edit source, only copy + mutate in tests).
- ✅ **`tsx scripts/validateAfrikData.ts`** already exists — promote to CI gate (FR26–30).
- ✅ **OpenAPI 3.1 as contract of record** — API-layer test scaffolds derive directly.
- ✅ **`@/lib/api/logger` is structured** — observable on the server side.
- ✅ **Carte vivante on country page already shipped** — testable today (partial Amina + a11y + perf baseline) — the "today bucket" that proves framework works without waiting on Phase-1 primitives.
- ✅ **`@playwright/test` + `@axe-core/playwright` already in devDependencies** — no install fight, just config.

#### Accepted Trade-offs (No Action Required, Phase 1)

- **Pre-existing 6 + 4 test failures** (`migrateAfrikToDatabase`, handler tests, Supabase mock issues) — quarantine, not fix. Project-context.md explicit. Not a regression risk if quarantined cleanly (ASR-11).
- **No contract testing (Pact)** — Africa History is a single producer with one OpenAPI 3.1 spec; no microservice consumer/provider pair. The OpenAPI drift CI gate (R-13 mitigation) is the contract-testing surrogate. Reopen if a second consumer service materializes.
- **No visual-regression in PR gate** — too slow / brittle for the ≤ 12 min PR budget. Run weekly in the visual-regression cron only (mobile-viewport baselines committed to repo).
- **Storybook is `@storybook/react-vite`** (not `@storybook/nextjs`) — project-context.md non-negotiable; framework constraint accepted.
- **French-only `Language = "fr"`** — multilingual shape preserved in code, but tests only cover French. Reopening English / Spanish / Portuguese is a coordinated change with new test scope.

---

### Risk Mitigation Plans — Critical Risks (Score 9)

#### R-2: Per-assertion data-model extension (Score: 9) — CRITICAL

**Mitigation strategy:**

1. Schema migration extends fiche content to per-assertion granularity (one row per assertion, FK to fiche revision).
2. Render layer emits `data-assertion-id="{uuid}"` on every assertion DOM node (ASR-4).
3. Failing acceptance test on the contract written _first_ via `bmad-testarch-atdd` before any UI primitive ships.
4. Phase 2 (Kofi flagging) story creation gated on this migration landing on `main`.
5. The migration is shipped to `main` behind a feature flag if necessary; UI primitives ship after the flag is on.

**Owner:** architect
**Timeline:** Phase 1, mid-cycle (before any of ConfidenceChip / FlagTarget / SourceChainSheet finalizes its data contract)
**Status:** Planned
**Verification:** Failing E2E `2.1-E2E-001` (long-press an assertion → `FlagTarget` appears) flips to green only after the migration lands and the render layer emits the attribute.

#### R-3: Bundle bloat from Phase-1 primitives (Score: 9) — CRITICAL

**Mitigation strategy:**

1. Per-component JS budgets enforced in CI (UX spec §1207): ConfidenceChip ≤ 2 KB gz, SourceChainSheet ≤ 8 KB gz lazy-loaded.
2. `next/dynamic` import for SourceChainSheet (and RevisionDrawer) so they ship outside the fiche initial bundle.
3. CI bundle-budget gate: `next build` + size-limit + per-route + per-component check. PR fails on breach.
4. Fonts via `next/font` with `display: swap`; no third-party fonts.
5. Storybook check: every L3 component story has its built size measured against budget.

**Owner:** dev
**Timeline:** Phase 1 ship gate
**Status:** Planned
**Verification:** CI bundle-budget report green; `1.1-PERF-001` Lighthouse mobile ≥ 85 green; `next build` output total ≤ 500 KB compressed per fiche route.

#### R-11: Lighthouse mobile < 85 after Phase 1 (Score: 9) — CRITICAL

**Mitigation strategy:**

1. Lighthouse CI gate runs on every PR touching reading-surface routes (`src/app/[lang]/{pays,peuples,familles}/**`, `src/components/system/**`, `src/components/country/**`).
2. Per-route LCP / INP / CLS budgets enforced.
3. `next/image` mandatory; no render-blocking third-party scripts; analytics `async defer`.
4. Reading-surface progressive enhancement: SSR-meaningful content, hydration second, no broken degradation.
5. Lighthouse runs against the **reference-device profile** (ASR-7) — same throttle / viewport as the persona acceptance E2E. No "fast laptop" gaming.

**Owner:** dev
**Timeline:** Phase 1 ship gate
**Status:** Planned
**Verification:** CI Lighthouse mobile report ≥ 85 on `/fr/pays/COM`, `/fr/peuples/PPL_*`, `/fr/familles/FLG_*`; INP ≤ 200 ms; CLS ≤ 0.1; weight ≤ 500 KB.

---

### Risk Mitigation Plans — High Risks (Score 6, abbreviated)

Each high risk has a documented mitigation in the matrix above. Owner + timeline assignments confirmed at the Phase-1 kickoff. Below are the ones that need explicit pre-implementation work:

- **R-9 (test-data isolation)** — TEA owns. Per-run UUID prefix convention + `afterAll` cleanup + local Supabase CLI scaffolding. Lands with framework setup (ASR-12).
- **R-10 (emotion-guardrails)** — TEA owns. `emotion-guardrails.spec.ts` lands as part of Phase 1 framework. Adds new assertions as new "emotions to avoid" surface in UX retros.
- **R-1 (AFRIK demographics)** — Dev owns. Lifts `validateAfrikData.ts` into CI as a blocking step. Pre-Phase-1.
- **R-13 (OpenAPI drift)** — Dev owns. CI gate compares runtime spec vs `openapiV2.ts`. Pre-Phase-1.
- **R-16 (URL-health)** — Dev owns. New `scripts/checkSourceUrls.ts`; weekly cron. Phase 1+.
- **R-20 (suite duration)** — TEA owns. Sharding + selective-testing wired into CI on day 1.

---

### Assumptions and Dependencies

#### Assumptions

1. **Phase ordering follows UX spec L1211–1237.** Phase 1 = reading surface (Amina + Ngozi). Phase 2 = contribution (Kofi). Phase 3 = moderation (Fatou). Phase 4 = developer portal (Thomas). Phase 5 = growth.
2. **The Africa History rebrand is "possible but deferred"** (architecture.md cross-cutting #8). Test strategy must reference brand via `src/lib/brand.ts` config, not hardcoded strings. ASR-14.
3. **Code license / rate-limit substrate / analytics substrate / error tracking** are still **open architectural decisions** per architecture.md §3. They don't block test design but each will shape one or more integration tests when resolved.
4. **TDD is mandatory** per project-context.md L97; this means **failing acceptance tests precede implementation**. The test design is therefore an architectural input, not a post-implementation activity.
5. **Pre-existing 6 + 4 failures** are out of scope unless the task is explicitly to fix them. They get quarantined, not fixed in this workflow.
6. **Mobile-first is non-negotiable.** All reading-surface tests run at 430 px first; tablet / desktop are widening passes, not separate features.
7. **Local Supabase CLI is the test-data default** (Open Q1) — staging Supabase reserved for smoke + perf only.

#### Dependencies

| Dependency                                               | Required by             | Phase             |
| -------------------------------------------------------- | ----------------------- | ----------------- |
| ASR-4: Per-assertion stable IDs + data-model migration   | Phase 2 story creation  | End of Phase 1    |
| ASR-1: Test-mode session injection (auth backdoor)       | Fatou journey tests     | Phase 3 kickoff   |
| ASR-2: Synchronous confidence recomputation in test mode | Kofi resolution tests   | Phase 2 kickoff   |
| ASR-3: Edge-cache-bypass header                          | All reading-surface E2E | Phase 1 framework |
| ASR-5: Test API-key tier + reset endpoint                | Thomas rate-limit tests | Phase 4 kickoff   |
| ASR-6: Fiche-revision seeding factory                    | Ngozi journey tests     | Phase 1 framework |
| ASR-7: Playwright reference-device profile               | All reading-surface E2E | Phase 1 framework |
| ASR-10: a11y-on-Storybook extension                      | a11y gate               | Phase 1 framework |
| ASR-13: Lighthouse + bundle-budget CI gates              | Phase 1 ship gate       | Phase 1 framework |
| ASR-14: `src/lib/brand.ts` config                        | Rebrand readiness       | Phase 1           |
| ASR-15: Deterministic clock hook                         | Time-sensitive tests    | Phase 1 framework |

#### Risks to the Test Plan Itself

- **Risk:** ASR-4 (per-assertion IDs) slips past Phase 1 ship.
  - **Impact:** Phase 2 (Kofi) cannot start; the entire contribution surface is gated.
  - **Contingency:** TEA can pre-write Phase 2 E2E specs in a _failing/quarantined_ state (ATDD) so the second the data model lands, the spec turns green with one render-layer change. This is the right move and aligns with TDD.

- **Risk:** Open architectural decision on rate-limit substrate (Upstash vs Vercel vs Supabase edge) blocks Thomas tests.
  - **Impact:** Phase 4 (Thomas) rate-limit tests can be designed but not run until substrate chosen.
  - **Contingency:** Pre-write the assertions; mark the test file as `test.fixme()` until substrate ships.

- **Risk:** Local Supabase CLI vs hosted-staging strategy creates a parity gap.
  - **Impact:** Tests green locally, red in CI (or vice versa).
  - **Contingency:** Use the **same migrations + seed scripts** on both. Add a smoke job that runs a tiny subset against hosted staging nightly to catch parity drift.

- **Risk:** Lighthouse CI proves expensive in CI minutes (especially at PR scale).
  - **Impact:** PR budget breaches 15 min.
  - **Contingency:** Lighthouse only on PRs that touch reading-surface paths (selective testing); full Lighthouse only on `main` nightly.

---

**End of Architecture Document**

**Next Steps for Architecture Team:**

1. Review **🚨 BLOCKERS** section (5 ASRs) and assign owners + timelines.
2. Validate the **R-2 mitigation strategy** — the per-assertion data model is the program's single hardest blocker; the test architecture and the implementation plan must agree on the contract before either side proceeds.
3. Confirm the **local Supabase CLI** decision for test-data strategy (Open Q1 from handoff) or counter-propose.
4. Acknowledge **R-3 / R-11 mitigation** — per-component budgets enforced by CI, no "ship now, fix later" carve-outs.
5. Provide feedback on the **emotion-guardrails suite** (R-10) — does the UX team agree that the observable proxies in §4.6 (`test-design-qa.md`) are the right set, or are there additions / removals?

**Next Steps for the Test / QA function:**

1. Wait for pre-implementation blockers (ASR-1, 2, 4, 7, 13) to be resolved or gated.
2. Refer to companion QA doc (`test-design-qa.md`) for the test scenario register, execution strategy, and effort estimate.
3. Begin **framework setup** today (Playwright config + reference device profile + persona/phase tags + factories + CI matrix + quarantine of pre-existing failures + Lighthouse + bundle-size gates) — this is the ~41–73 h "framework subtotal" and it does not depend on any unblocked ASR.
4. Start writing the **today-testable subset** (§4.2 in `test-design-qa.md`) immediately — country-page partial Amina + a11y + perf baseline + AFRIK invariants — to prove the framework works before Phase-1 primitives land.
