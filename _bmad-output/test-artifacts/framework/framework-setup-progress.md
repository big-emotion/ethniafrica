---
stepsCompleted:
  [
    "step-01-preflight",
    "step-02-select-framework",
    "step-03-scaffold-framework",
    "step-04-docs-and-scripts",
    "step-05-validate-and-summary",
  ]
lastStep: "step-05-validate-and-summary"
status: "complete"
lastSaved: "2026-05-14"
detectedStack: "fullstack"
framework: "playwright"
ranBy: "Murat (TEA)"
---

# TEA Framework Setup — Africa History (ethniafrica)

## Step 1 — Preflight (complete)

### Stack detection

- `test_stack_type: auto` (per `_bmad/tea/config.yaml`)
- Detected: **fullstack** — Next.js 16 frontend + route handlers in `src/app/api/v2/*` + Supabase BaaS
- Frontend indicators: `next ^16.0.8`, `react ^18.3.1`, `vite ^7.3.1` (Storybook), `package.json`
- Backend indicators: route handlers + Supabase admin client (server-only) + `tsx` migration scripts

### Prerequisites check

- ✅ `package.json` exists
- ✅ No `playwright.config.*` in repo
- ✅ No `cypress.*` or `cypress.json`
- ✅ No `e2e/` folder
- ✅ `@playwright/test ^1.49.0` already in devDependencies
- ✅ `@axe-core/playwright ^4.10.1` already in devDependencies
- ✅ Architecture context available (`architecture.md`, `prd.md`, `ux-design-specification.md`, `epics.md`, `project-context.md`)

### Inputs from TD already loaded

- 25-risk register (3 critical, 12 high) → drives fixture and CI gate design
- 15 ASRs → load-bearing constraints on the scaffold
- ASR-7 reference-device profile (430×812, deviceScaleFactor 2.625, Slow-4G, 4× CPU)
- ASR-11 quarantine: 6+4 pre-existing Vitest failures relocated to `__tests__/known-failing/`
- ASR-12: `make e2e` target separate from `make check`
- ASR-13: Lighthouse mobile + bundle-size CI gates
- ASR-10: a11y-on-Storybook extension to `scripts/a11y-test.ts`
- ASR-14: brand config at `src/lib/brand.ts` consumed by tests

### Decisions carried into step 2

- Framework: **Playwright** (confirmed by `tea_use_playwright_utils: true` config; already a devDep)
- Pact: **disabled** (`tea_use_pactjs_utils: false`; OpenAPI drift gate is the contract-test surrogate)
- Profile: **Full UI+API** (browser tests + API-layer tests)
- Test-data backend: **local Supabase CLI** for the gate; hosted staging Supabase reserved for smoke/perf only

## Step 2 — Framework Selection (complete)

### Choice: Playwright (UI + API-E2E) + Vitest (unit/integration) + axe-core (a11y)

**Rationale:**

- Browser stack: Playwright already in `devDependencies` (`^1.49.0`). Large brownfield Next.js 16 repo, multi-browser matrix per NFR (Chrome / Safari / Firefox / Samsung Internet), heavy API + UI integration, CI speed via parallel sharding required.
- Backend / API: Vitest 4 + happy-dom keeps existing investment; handler tests stay where they are (`src/api/v2/**/__tests__/**`, `src/lib/**/__tests__/**`).
- A11y: `@axe-core/playwright ^4.10.1` already devDep; extend `scripts/a11y-test.ts` (ASR-10).
- Contract testing: disabled (`tea_use_pactjs_utils: false`); single OpenAPI 3.1 producer; OpenAPI drift gate is the surrogate.
- Companion: `@seontechnologies/playwright-utils` for fixture composition (API request, auth-session, recurse polling, file utils).

### Backend test framework

Vitest 4 (existing); no new framework introduced.

## Step 3 — Scaffold Framework (complete)

### Execution mode

`sequential` — config `tea_execution_mode: auto`; single-agent context.

### Files created

| Path                                            | Purpose                                                                                                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`                          | Reference-device profile (ASR-7), 5 projects (setup / mobile-430 / tablet-720 / desktop-800 / moderator-1024), `X-Test-Bypass-Cache` (ASR-3), HTML+JUnit+GitHub reporters, `npm run dev` webServer                     |
| `e2e/global.setup.ts`                           | Pre-flight env check; future: migrations + reference seed                                                                                                                                                              |
| `e2e/support/fixtures.ts`                       | `test.extend` with `testRunId`, `signIn`, `supabaseAdmin` fixtures                                                                                                                                                     |
| `e2e/support/auth.ts`                           | `signInAsRole(role)` — STUB until Supabase Auth migration (ASR-1)                                                                                                                                                      |
| `e2e/support/device-profiles.ts`                | Reference mobile profile + Slow-4G constants (ASR-7)                                                                                                                                                                   |
| `e2e/support/guardrails.ts`                     | Emotion-guardrail helpers — `expectNoPopupsOrWalls`, `expectNoLeaderboardsOrCounters`, `expectNoAutoplayMedia`, `expectTapTargetsAtLeast44px`, `expectClassificationStatusNotRed`, `expectNoPinnedBannerOnLive` (R-10) |
| `e2e/support/clients/supabase-admin.ts`         | Test-only admin client (cached singleton)                                                                                                                                                                              |
| `e2e/support/factories/fiche.ts`                | `seedFiche()` — STUB (ASR-6, blocked by R-2 schema work)                                                                                                                                                               |
| `e2e/support/factories/flag.ts`                 | `seedFlag()` — STUB (blocked by flag schema)                                                                                                                                                                           |
| `e2e/support/factories/key.ts`                  | `seedKey()` — STUB (ASR-5, Phase 4)                                                                                                                                                                                    |
| `e2e/amina/country-page-today-testable.spec.ts` | Today-testable subset — 6 specs against `/fr/pays/COM`                                                                                                                                                                 |
| `e2e/cross-cutting/emotion-guardrails.spec.ts`  | Phase-1 negative-assertion sweep across reading surface URLs (R-10)                                                                                                                                                    |
| `e2e/.env.example`                              | Test environment variables (test-project Supabase only)                                                                                                                                                                |
| `e2e/README.md`                                 | Layout, tags, env, reference device, quarantine notes                                                                                                                                                                  |

### Files modified

| Path               | Change                                                                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.ts` | Added `test.exclude` block — excludes Playwright specs from Vitest, quarantines `scripts/__tests__/migrateAfrikToDatabase.test.ts` (6 known failures), reserves `**/__tests__/known-failing/**` glob for the additional 4 handler failures (ASR-11) |

### Stubs vs. ready-to-run

**Ready today (no schema dependencies):**

- Emotion-guardrail helpers and the cross-cutting suite (against any reading-surface URL)
- Today-testable country-page subset (`/fr/pays/COM`)
- `e2e/global.setup.ts` env check

**Stubs (throw with TODO message until underlying work lands):**

- `signInAsRole` → blocked by ASR-1 (Supabase Auth migration)
- `seedFiche` → blocked by ASR-6 + R-2 (`fiche_revisions` table + per-assertion data model)
- `seedFlag` → blocked by flag schema (Phase 2)
- `seedKey` → blocked by ASR-5 (`api_keys.tier='test'`, Phase 4)

This separation is intentional: framework setup ships testable artifacts NOW, and stub failures point at exactly which architecture deliverable unblocks each persona.

### Open follow-ups for step 4

- `npm` scripts: `e2e`, `e2e:ui`, `e2e:install`, `e2e:debug`
- Makefile target: `make e2e`
- Add `@playwright/test` postinstall — run `npx playwright install --with-deps chromium` in CI
- Install `@seontechnologies/playwright-utils` (per `tea_use_playwright_utils: true`) — deferred to step 4 since not yet imported by the scaffold; we'll add it only when the first test consumes it (KISS)
- CI workflow under `.github/workflows/e2e.yml`
- Lighthouse + bundle-size CI gates (ASR-13)
- `.gitignore` updates for `playwright-report/`, `test-results/`, `.env.local`

## Step 4 — Docs & Scripts (complete)

### Files modified

| Path           | Change                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` | Added scripts: `e2e`, `e2e:ui`, `e2e:debug`, `e2e:headed`, `e2e:install`, `e2e:report`                                              |
| `Makefile`     | Added targets: `e2e`, `e2e-ui`, `e2e-install`; documented why E2E is NOT part of `make check` (ASR-12, NFR maintainability ≤ 5 min) |
| `.gitignore`   | Added `playwright-report/`, `test-results/`, `.playwright-cache/`, `storybook-static/`                                              |

### Files created

| Path                        | Purpose                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `.github/workflows/e2e.yml` | PR + push CI workflow — Playwright on `recette` and `main`, uploads HTML report artifact |

### Pre-existing CI workflows discovered (no overlap)

These already exist and align with the TEA test strategy gates — no duplication needed:

| Workflow                                     | Maps to                                              |
| -------------------------------------------- | ---------------------------------------------------- |
| `.github/workflows/a11y.yml`                 | ASR-10 (a11y on Storybook), R-10 partial             |
| `.github/workflows/lighthouse.yml`           | ASR-13 (Lighthouse mobile gate), R-3, R-11           |
| `.github/workflows/data-integrity.yml`       | X.1-INT-001..005 (AFRIK invariants), R-1             |
| `.github/workflows/openapi-diff.yml`         | X.2-INT-002 (OpenAPI drift), R-13                    |
| `.github/workflows/confidence-recompute.yml` | Confidence recomputation (likely tied to R-2, ASR-2) |

This is a significant finding — Phase 1 CI gates are already largely in place. The TF skill scope is therefore narrower than the test-design's "framework subtotal" estimated; the new wiring is mainly **Playwright e2e** and the **vitest quarantine**.

### Validation hint

- `npm run e2e` will fail today against an unconfigured `.env.local` (good — surfaces the env requirement loudly).
- `npm run e2e -- e2e/cross-cutting/emotion-guardrails.spec.ts` against the running dev server should pass for the country-page subset once env vars are set.

## Step 5 — Validate & Summarize (complete)

### Validation evidence

- ✅ `npx tsc --noEmit` exits 0 — new TS files compile clean
- ✅ `npx playwright test --list` enumerates **12 tests in 3 files** across 1 setup + mobile-430 project
  - 6 tests in `e2e/amina/country-page-today-testable.spec.ts` (today-testable subset)
  - 5 tests in `e2e/cross-cutting/emotion-guardrails.spec.ts` (1 reading-surface URL × 5 assertions)
  - 1 setup test (`e2e/global.setup.ts`)
- ✅ Fixed `outputDir` clash with HTML reporter (changed to `test-results/`)
- ✅ Persona / phase / NFR / emotion-guardrail tags all surface in Playwright's test-listing output

### Completion summary

**Framework selected:** Playwright (UI + API-E2E) + Vitest (unit / integration / API) + axe-core (a11y on Storybook, already wired).

**Artifacts created (14 files):**

```
playwright.config.ts                                 (new)
e2e/
├── global.setup.ts                                  (new)
├── README.md                                        (new)
├── .env.example                                     (new)
├── amina/
│   └── country-page-today-testable.spec.ts          (new)
├── cross-cutting/
│   └── emotion-guardrails.spec.ts                   (new)
└── support/
    ├── auth.ts                                      (new — stub, ASR-1)
    ├── device-profiles.ts                           (new)
    ├── fixtures.ts                                  (new)
    ├── guardrails.ts                                (new)
    ├── clients/
    │   └── supabase-admin.ts                        (new)
    └── factories/
        ├── fiche.ts                                 (new — stub, ASR-6)
        ├── flag.ts                                  (new — stub)
        └── key.ts                                   (new — stub, ASR-5)
.github/workflows/e2e.yml                            (new)
```

**Files modified:**

- `vitest.config.ts` — added `test.exclude` (ASR-11 quarantine + Playwright spec exclusion)
- `package.json` — added 6 npm scripts (`e2e`, `e2e:ui`, `e2e:debug`, `e2e:headed`, `e2e:install`, `e2e:report`)
- `Makefile` — added `e2e`, `e2e-ui`, `e2e-install` targets; documented why E2E is NOT part of `make check` (ASR-12)
- `.gitignore` — added `playwright-report/`, `test-results/`, `.playwright-cache/`, `storybook-static/`

**CI integration confirmed:**

- New `.github/workflows/e2e.yml` runs Playwright on PRs to `recette` and `main`.
- Pre-existing workflows already cover Lighthouse, axe-core a11y, data-integrity, OpenAPI drift, confidence-recompute — no overlap, no duplication.

**Next steps for the user / team:**

1. Provision a **test Supabase project** (local CLI via `supabase start`, or a dedicated hosted test project distinct from prod). Populate `TEST_SUPABASE_*` GitHub secrets.
2. Run `npm run e2e:install` once to fetch Chromium with system deps.
3. Run `npm run e2e -- --grep @phase-1` locally to validate the today-testable subset against `localhost:3000`.
4. Move the 4 additional pre-existing handler-test failures under `__tests__/known-failing/` once identified (run `npm test` to surface them).
5. Hand off to **`bmad-testarch-atdd`** for the R-2 (per-assertion data model) acceptance contract, then per-Phase-1-story acceptance tests.

**Knowledge fragments referenced (in test design, not loaded inline here):**

- `risk-governance.md` (TD step 3)
- `test-levels-framework.md` (TD step 4)
- `data-factories.md` and `fixture-architecture.md` patterns informed the factory + fixture design

**Open assumptions:**

- `signInAsRole`, `seedFiche`, `seedFlag`, `seedKey` are intentionally stubs — they fail loudly with a TODO message pointing at the ASR that unblocks them. This is the right shape: we do not pretend infrastructure exists.
- Vitest exclude pattern targets `scripts/__tests__/migrateAfrikToDatabase.test.ts` by path; the 4 handler-test failures are not yet path-pinned (no actual test run captured them in this workflow). Future move under `__tests__/known-failing/` is sufficient to quarantine them.
- `@seontechnologies/playwright-utils` was NOT installed in this iteration — none of the scaffolded tests consume it yet, so installing would be premature complexity (KISS). Install when the first test imports it.
