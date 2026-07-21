---
workflowStatus: "completed"
totalSteps: 5
stepsCompleted:
  [
    "step-01-detect-mode",
    "step-02-load-context",
    "step-03-risk-and-testability",
    "step-04-coverage-plan",
    "step-05-generate-output",
  ]
lastStep: "step-05-generate-output"
nextStep: ""
lastSaved: "2026-05-14"
mode: "system-level"
modeRationale: "User intent is a program-wide, persona+emotional-matrix-driven test strategy sequenced against the UX phase roadmap (Phase 1→5). PRD + ADR + architecture + epics + UX spec all available. sprint-status.yaml exists but user-intent priority overrides file-based routing. Per-epic plans will follow as separate Epic-Level runs."
project: ethniafrica
workingName: Africa History
user: Jnk
detectedStack: "fullstack"
playwrightUtilsProfile: "full-ui-api"
contractTesting: "openapi-drift-only (no Pact)"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
  - CLAUDE.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/risk-governance.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-levels-framework.md
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/test-quality.md (referenced)
  - .claude/skills/bmad-testarch-test-design/resources/knowledge/adr-quality-readiness-checklist.md (referenced)
---

# Test Design — System-Level — Africa History

## Step 1 — Mode Detection & Prerequisites (complete)

### Mode

**System-Level** (Phase 3 — testability review + system-wide test architecture).

### Inputs validated

- `_bmad-output/planning-artifacts/prd.md` (FR1–FR46, NFR set, 5 persona journeys L167–271)
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md` (emotional matrix L50–197, phase roadmap L1211–1237)
- `_bmad-output/planning-artifacts/epics.md` (7 epics / 77 stories)
- `_bmad-output/project-context.md` (carry-forward persistent fact set)
- `CLAUDE.md`

### Inputs flagged as load-bearing

- Quantified persona success thresholds become acceptance assertions:
  - Amina: autonym + confidence chip + sources visible within **10s** on **430px** viewport.
  - Ngozi: pinned URL `@vN` to clipboard within **30s**.
  - Thomas: key request → bulk export within **15 min**.
  - Kofi: flag submit → public URL "promptly" + status visible + contributor credit on resolution.
  - Fatou: single-screen triage decision, no tab-hunting; SLA queue oldest-first default.
- NFR budget (mobile-first reference device, 430px, 4G Android): Lighthouse mobile ≥ 85, LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, page weight ≤ 500KB compressed per fiche.
- A11y: WCAG 2.1 AA via axe-core in CI; contrast ≥ 4.5:1 body / 3:1 UI / 7:1 source-list sheets; `prefers-reduced-motion`; no autoplay.
- Observable negative assertions from "Emotions to Avoid" (UX Spec L142–150) + micro-emotions table (L169–177): no popups/cookie/paywall/signup walls on reading surface; no red on classification-status; no leaderboards/avatar piles; tap targets ≥ 44px; no autoplay.
- The 95% rule: pinned-version UX must not pollute default reading flow.
- AFRIK data discipline for fixtures: 2025 reference year, demographics sum to 100% per country, authorized sources only.

### Repo testability snapshot (will drive Step 3)

- Vitest 4 + happy-dom in place. No Playwright config, no `e2e/` folder. `@playwright/test ^1.49` and `@axe-core/playwright ^4.10.1` in devDeps but only consumed by `scripts/a11y-test.ts`.
- Shipped UI today (testable now): country detail page — `CountryDetailViewV2`, 8 scrollable sections, `country-tokens.css`, Fraunces + Nunito Sans.
- Spec-only primitives (gate Phase 1 E2E): ConfidenceChip, SourceChainSheet, FlagTarget, RevisionDrawer, PinnedVersionBanner, ClassificationBadge, CitationBlock, DoctrineLinkCard.
- TEA config: `tea_use_playwright_utils=true` (package not yet installed), `risk_threshold=p1`, output to `_bmad-output/test-artifacts/test-design`.
- Pre-existing test failures: 6 in `scripts/__tests__/migrateAfrikToDatabase.test.ts` + 4 handler tests (Supabase mock issues). Known, do not touch.

## Step 3 — Testability Review & Risk Assessment (complete)

### 3.1 🚨 Testability Concerns (actionable)

**Controllability**

- **C1. Database state seeding for E2E.** Supabase is shared infra under RLS. No fixture/factory layer exists for tests today. Cannot run persona E2E without a seed/cleanup discipline.
- **C2. Confidence-score recomputation is event-driven** (architecture.md decision §9). E2E tests asserting "confidence moved 74 → 78 after Kofi's flag resolved" need either synchronous recomputation in test mode or a deterministic await primitive. Current design = polling-and-pray → flaky.
- **C3. Auth flow with Supabase Auth + OAuth (GitHub / Google / ORCID).** Moderator (Fatou) and contributor (Kofi) journeys gate on real OAuth providers or a test backdoor. No backdoor exists yet. Existing admin-cookie model is being deprecated — must design test-mode session injection into the new flow.
- **C4. Per-assertion stable IDs.** Per-assertion flagging UI (Kofi journey) gates on assertion-level data-model extension (UX spec L1238 = single hardest blocker). Without `data-assertion-id="…"` on every assertion node + corresponding DB row id, Playwright cannot deterministically tap "this line".
- **C5. Pinned-version (`@vN`) URL fabric.** Ngozi journey requires a fiche with multiple published revisions. No factory exists; will need `seedFiche({ revisions: 3 })` returning `{ ficheId, latestVersion, pinnedUrls[] }`.
- **C6. Wall-clock budget shaping.** Persona thresholds (10s / 30s / 15min / "promptly" / single-screen) are not retry budgets, they are SLOs against a reference 4G Android. Playwright config must encode the network/CPU throttle profile or assertions become meaningless on a fast dev machine.
- **C7. No rate-limit test surface.** Thomas journey needs to provoke and observe rate-limit behavior (10 req/s, 50 000 req/day). A `tier: 'test'` API key with tunable limits + reset endpoint is missing.
- **C8. Edge cache headers.** Country fiches `s-maxage=86400 immutable`; peoples `s-maxage=3600`. Cross-test cache contamination is inevitable without a cache-bypass header or per-run unique URL.

**Observability**

- **O1. No structured `data-testid` discipline yet** on shipped UI (country page uses semantic markup + tokens). Strategy must standardize selectors _before_ the first E2E is written, not after, to avoid the predictable "rewrite every selector" rework cycle.
- **O2. `@/lib/api/logger` is structured** but no test harness for asserting log events on integration tests. Fine for now; flag if we go investigative on a flaky test.
- **O3. CI gate failure modes** (FR26–32, NFR37–39) must produce machine-readable artefacts the Playwright report can consume — otherwise traceability matrix has to be hand-built every release.
- **O4. Sentry scrubbing surface is invisible** — no end-to-end assertion that PII / API keys are stripped before egress. Needed for NFR observability + R-12.

**Reliability**

- **R-rel-1. Parallel-execution data isolation.** Playwright `fullyParallel: true` is the default. With shared Supabase, parallel tests collide on flag IDs, fiche IDs, key IDs unless every fixture namespaces with a per-run UUID prefix and cleans up.
- **R-rel-2. Pre-existing 6+4 failures** (`migrateAfrikToDatabase.test.ts` + handler tests) must be quarantined (e.g. `__tests__/known-failing/` excluded from the gate). New tests must not inherit the broken pattern.
- **R-rel-3. Edge-cache + ISR `revalidate()` on moderation commit** is not yet implemented (open architectural decision §9). Until it ships, integration tests for "confidence updates visible after flag resolves" are unstable.
- **R-rel-4. Test suite ≤ 5 min wall-clock** is the maintainability budget (NFR). E2E must NOT join `make check`; needs a separate `make e2e` target plus selective-testing in CI (`changedFiles ⨯ persona tag`).

### 3.2 Architecturally Significant Requirements (ASRs)

Each ASR is a testability ask on the implementation. Mark **ACTIONABLE** if engineering must build it; **FYI** if it's an existing invariant the test strategy depends on.

| ASR        | Description                                                                                                                                                                                                                   | Type       | Blocks                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **ASR-1**  | Test-mode session injection: `tests/utils/auth.ts → signInAsRole(role)` using Supabase admin client, emitting Playwright `storageState` JSON. Documented as part of the auth migration.                                       | ACTIONABLE | Fatou (Phase 3), Kofi (Phase 2)                                                                                              |
| **ASR-2**  | Synchronous confidence-score recomputation under `TEST_MODE_SYNC_CONFIDENCE=true` env flag (or a `POST /v2/internal/recompute?ficheId=…` test-only hook gated by role).                                                       | ACTIONABLE | Kofi resolution assertion, Fatou flag-close path                                                                             |
| **ASR-3**  | Cache-bypass affordance — `X-Test-Bypass-Cache: 1` header honored only when `process.env.NODE_ENV !== 'production'`, or per-run cache-key salt via header.                                                                    | ACTIONABLE | All E2E that touch `s-maxage` routes                                                                                         |
| **ASR-4**  | `data-assertion-id="…"` on every assertion node in the People fiche + matching `id` on backing DB row.                                                                                                                        | ACTIONABLE | All of Phase 2 (Kofi journey); blocked by the per-assertion data-model migration (hardest Phase-1 blocker per UX spec L1238) |
| **ASR-5**  | API key tier system supports `tier: 'test'` with knob-tunable limits + `POST /v2/internal/keys/{id}/reset-counter` test-only endpoint.                                                                                        | ACTIONABLE | Thomas rate-limit tests (Phase 4)                                                                                            |
| **ASR-6**  | Fiche-revision seeding factory: `seedFiche({ ficheType: 'people', revisions: n })` returns `{ ficheId, latestVersion, pinnedUrls[] }`. Lives in `tests/factories/fiche.ts`.                                                   | ACTIONABLE | Ngozi (Phase 1 partial, full Phase 1)                                                                                        |
| **ASR-7**  | Playwright config encodes the **reference device profile** — viewport 430×812, deviceScaleFactor 2.625, `isMobile: true`, `hasTouch: true`, network throttle `Slow 4G` (1.6 Mbps / 750 Kbps / 150 ms RTT), CPU throttle 4×.   | ACTIONABLE | Amina 10s, NFR perf budget, every reading-surface persona test                                                               |
| **ASR-8**  | Public flag URL pattern `/fr/flags/{id}` resolvable without auth, no test backdoor needed.                                                                                                                                    | FYI        | Kofi roundtrip — already in architecture                                                                                     |
| **ASR-9**  | OpenAPI 3.1 spec is contract of record (FR36, NFR37). Use as schema source for API-layer Playwright tests (zod-derived → API contract).                                                                                       | FYI        | Thomas API surface, all API-layer integration tests                                                                          |
| **ASR-10** | Storybook story required per new UI primitive (NFR37). Reused as the **a11y test substrate** — `scripts/a11y-test.ts` already wires `@axe-core/playwright`; extend to enumerate Storybook stories.                            | ACTIONABLE | Phase 1 a11y gate                                                                                                            |
| **ASR-11** | Pre-existing test failures isolation — relocate to `__tests__/known-failing/` excluded from `vitest run` via `vitest.config.ts` `exclude` pattern.                                                                            | ACTIONABLE | Avoid masking new regressions                                                                                                |
| **ASR-12** | Local dev gate separation — `make check` = lint + type-check + Vitest only (≤ 5 min). `make e2e` = Playwright suite. CI runs both, in parallel jobs.                                                                          | ACTIONABLE | Maintainability NFR (suite ≤ 5 min)                                                                                          |
| **ASR-13** | Lighthouse mobile and bundle-budget gates in CI (per-route LCP / INP / CLS / weight).                                                                                                                                         | ACTIONABLE | NFR perf gate, Phase 1 ship                                                                                                  |
| **ASR-14** | Brand config single-source-of-truth (`src/lib/brand.ts` per architecture.md cross-cutting #8). Tests must derive product name, canonical domain, attribution string from this file so rebrand is config-flip, not test sweep. | ACTIONABLE | Rebrand-readiness, all tests                                                                                                 |
| **ASR-15** | Deterministic timestamp hook — `Date.now()` mockable in test mode (or pass clock via DI through services). Required for "last verified < 30 days" assertions.                                                                 | ACTIONABLE | Confidence + URL-health tests                                                                                                |

### 3.3 ✅ Testability Assessment — what's already strong

- **Three-layer API (route → handler → service)** — clean integration boundary; handler tests can mock the service layer cheaply.
- **Supabase client isolation (3 clients)** — DI substitution at the test boundary is trivial.
- **Zod schemas co-located** under `src/api/v2/schemas/` — fuzz-testable at the schema seam.
- **Mobile-first breakpoints (430/720/800) explicit** — perfect for parameterized viewport runs.
- **AFRIK source `.json` files** under `dataset/source/afrik/**` — deterministic seed bank for fixtures (just remember the strict-models rule; never edit source data, only copy + mutate in tests).
- **`tsx scripts/validateAfrikData.ts`** — already a programmatic invariant check; promote to CI gate (FR26–30).
- **OpenAPI 3.1 as contract of record** + already-generated spec — turn into API-layer test scaffolds with `openapi-typescript` or `playwright-utils api-request`.
- **`@/lib/api/logger` structured** — observable on the server side.
- **Carte vivante on country page already shipped** — testable today for partial Amina + a11y + perf baseline.
- **`@playwright/test` + `@axe-core/playwright` already in devDependencies** — no install fight, just config.

### 3.4 Risk Assessment Matrix

Scoring per `risk-governance.md`: Probability (1–3) × Impact (1–3) = Score (1–9). Categories: TECH / SEC / PERF / DATA / BUS / OPS. Threshold: ≥ 6 demands mitigation; = 9 blocks gate.

| ID       | Cat  | Risk                                                                                                                                                  | P   | I   | Score | Mitigation                                                                                                                                                                                                                                                                                                                                                                          | Phase          | Owner     |
| -------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------- |
| **R-1**  | DATA | AFRIK demographics drift — DB ≠ source `.json` (FR28 invariant). 100%-sum violated → trust thesis breaks.                                             | 2   | 3   | 6     | Promote `validateAfrikData.ts` to CI blocking gate (FR26–30). Weekly cron re-validate. Add Vitest invariant `sum=100 ±0.01` per country.                                                                                                                                                                                                                                            | All            | dev       |
| **R-2**  | TECH | Per-assertion data-model extension not yet shipped — UX spec L1238 names it the single hardest Phase-1 blocker. Phase 2 (Kofi) impossible until done. | 3   | 3   | **9** | Schema migration + `data-assertion-id` (ASR-4) before any flag-UI work. ATDD: failing acceptance test on the contract first.                                                                                                                                                                                                                                                        | Phase 1→2 gate | architect |
| **R-3**  | PERF | Bundle bloat from Phase-1 primitives (ConfidenceChip, SourceChainSheet, RevisionDrawer) breaches ≤ 500 KB per fiche budget.                           | 3   | 3   | **9** | Per-component JS budgets enforced in CI (UX spec §1207: ConfidenceChip ≤ 2 KB gz, SourceChainSheet ≤ 8 KB gz lazy). Lighthouse mobile ≥ 85 CI gate (ASR-13).                                                                                                                                                                                                                        | Phase 1        | dev       |
| **R-4**  | SEC  | Supabase service-role key leak to client bundle (NFR7) — new flag/moderation code is admin-client-heavy.                                              | 2   | 3   | 6     | Existing repo-wide grep gate from project-context.md + a Playwright test that scrapes built `.next/static/**` for `service_role` substrings.                                                                                                                                                                                                                                        | All            | dev       |
| **R-5**  | BUS  | Flag-to-public-URL roundtrip silently fails — Kofi credibility test of Module #0.                                                                     | 2   | 3   | 6     | `kofi.flag-roundtrip.e2e.ts` covers submit → moderate → resolve → contributor credit visible. Email path contract-tested (acknowledgement contains public URL).                                                                                                                                                                                                                     | Phase 2        | dev       |
| **R-6**  | DATA | Pinned-version (`@vN`) snapshot drift — must reproduce byte-for-byte forever. Schema migration breaks old snapshots.                                  | 1   | 3   | 3     | `content_snapshot` JSONB fully-denormalized. Forward-only migrations never mutate existing snapshot shape. Regression test: load `@v1` after 3 migrations, assert byte-equality.                                                                                                                                                                                                    | Phase 1        | architect |
| **R-7**  | SEC  | OAuth misconfig (GitHub/Google/ORCID) → moderator lockout OR unauthorized escalation.                                                                 | 2   | 3   | 6     | Per-role auth E2E set: `fatou.signs-in.spec.ts`, `non-moderator.cannot-escalate.spec.ts`, `expired-session.is-redirected.spec.ts`. ASR-1 storageState fixtures.                                                                                                                                                                                                                     | Phase 3        | dev       |
| **R-8**  | PERF | Cache-TTL semantics confused post-moderation — stale confidence visible after flag resolves.                                                          | 2   | 2   | 4     | Per-fiche cache tags + Vercel ISR `revalidate()` on moderation commit. Integration test asserts invalidation within p95 ≤ 2 s.                                                                                                                                                                                                                                                      | Phase 2        | architect |
| **R-9**  | OPS  | Test data collisions in shared Supabase under parallel CI workers.                                                                                    | 3   | 2   | 6     | Per-run UUID prefix on all test entity IDs; `afterAll` cleanup. Local Supabase CLI for fast feedback (Open Q1 default).                                                                                                                                                                                                                                                             | All            | testarch  |
| **R-10** | BUS  | "Emotions to avoid" silently regress — cookie wall, red classification chip, leaderboard, autoplay slip past code review. Spec violation invisible.   | 3   | 2   | 6     | **Emotion-guardrail suite** (`emotion-guardrails.spec.ts`): no `[role=dialog]` at first paint on reading routes; `getComputedStyle([data-classification-status]).color` is not red-hue; no `[data-engagement-counter]` / `[data-leaderboard]` selectors render; tap-target sweep `min(w,h) ≥ 44px`; no `<video autoplay>` / `<audio autoplay>`. Runs on every reading-surface page. | Phase 1+       | testarch  |
| **R-11** | PERF | Lighthouse mobile < 85 post Phase 1.                                                                                                                  | 3   | 3   | **9** | Lighthouse mobile CI gate; `next/image` mandatory; fonts via `next/font` with `display: swap`; per-component budgets.                                                                                                                                                                                                                                                               | Phase 1        | dev       |
| **R-12** | SEC  | API key leaked in client logging / Sentry payload.                                                                                                    | 2   | 3   | 6     | Sentry `beforeSend` strips `?api_key=`, `Authorization: Bearer …`, `X-API-Key:`. Integration test posts events with secrets, asserts redaction.                                                                                                                                                                                                                                     | Phase 4        | dev       |
| **R-13** | OPS  | OpenAPI 3.1 drift — handler changes without updating `openapiV2.ts` (NFR37).                                                                          | 2   | 3   | 6     | CI drift gate compares generated spec vs `openapiV2.ts`. Existing dual-spec pattern carries the test.                                                                                                                                                                                                                                                                               | All            | dev       |
| **R-14** | TECH | Pre-existing 6+4 test failures mask new regressions in same files.                                                                                    | 3   | 1   | 3     | Quarantine into `__tests__/known-failing/` excluded from `vitest run --gate`. Only move out on explicit fix. (ASR-11)                                                                                                                                                                                                                                                               | All            | testarch  |
| **R-15** | BUS  | 95% rule breach — pinned-version banner pollutes default reading flow.                                                                                | 2   | 2   | 4     | Default-state E2E asserts NO `[data-pinned-banner]` visible on live (`@vN`-less) URL. Negative test in emotion-guardrail suite.                                                                                                                                                                                                                                                     | Phase 1        | dev       |
| **R-16** | DATA | URL-health drift — sourced URLs go 404 silently; confidence stays high while sources rot.                                                             | 3   | 2   | 6     | Weekly cron `tsx scripts/checkSourceUrls.ts` (new); auto-lower confidence + auto-flag. Integration test mocks 404 → asserts confidence drop + flag created.                                                                                                                                                                                                                         | Phase 1+       | dev       |
| **R-17** | TECH | Storybook framework regression — someone reintroduces `@storybook/nextjs` under Next 16.                                                              | 2   | 2   | 4     | `build-storybook` part of `make check`; project-context.md called this out; lint rule blocks the import.                                                                                                                                                                                                                                                                            | Phase 1        | dev       |
| **R-18** | SEC  | CSRF on moderation mutation endpoints.                                                                                                                | 2   | 3   | 6     | Supabase JWT + double-submit cookie pattern. Integration test asserts 403 without token; 401 with expired token.                                                                                                                                                                                                                                                                    | Phase 3        | dev       |
| **R-19** | PERF | `@vN` snapshot rendering slower than live (full JSONB read). Ngozi 30s breach.                                                                        | 2   | 2   | 4     | Pre-rendered HTML cache for pinned versions (immutable → cacheable indefinitely). Integration test asserts pinned p95 ≤ live p95 + 10 %.                                                                                                                                                                                                                                            | Phase 1        | dev       |
| **R-20** | OPS  | E2E suite wall-clock > 5 min (NFR maintainability).                                                                                                   | 3   | 2   | 6     | Shard by persona tag; CI matrix runs in parallel; selective-testing on PRs (git-diff → persona-tag selection); full suite only on main.                                                                                                                                                                                                                                             | All            | testarch  |
| **R-21** | DATA | Authorized-sources discipline regresses — a fiche cites a non-allowlisted source.                                                                     | 2   | 2   | 4     | Lint-style invariant test on source records: every `source.publisher` ∈ {UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA, ...allowlist}. CI gate.                                                                                                                                                                                                                          | All            | dev       |
| **R-22** | BUS  | Authenticity of moderation log — diff drift between "what was disputed" and "what got rewritten" silently breaks Kofi's promise of transparency.      | 1   | 3   | 3     | `fiche_revisions.diff` is computed deterministically; immutable; integration test reproduces diff from snapshots and asserts byte-equality.                                                                                                                                                                                                                                         | Phase 2        | architect |
| **R-23** | SEC  | Public flag URL leaks moderator deliberations or private context (PII in flag body).                                                                  | 2   | 3   | 6     | `flag.body` rendered HTML escapes + linkifies-but-doesn't-execute; moderator-only `notes` field NEVER serialized to public `GET /v2/flags/{id}` response. Integration test asserts response shape.                                                                                                                                                                                  | Phase 2        | dev       |
| **R-24** | OPS  | CI flakiness from network seam to Supabase staging.                                                                                                   | 3   | 1   | 3     | Local Supabase CLI for the gate run; staging Supabase reserved for smoke / perf only. Network mocks for non-fiche routes.                                                                                                                                                                                                                                                           | All            | testarch  |
| **R-25** | TECH | Test code itself violates KISS — over-abstracted page objects, fixtures duplicating production logic.                                                 | 2   | 1   | 2     | Convention enforced in `bmad-testarch-test-review` reviews; pure-function factories; flat `e2e/{persona}/{journey}.spec.ts`; no inheritance hierarchies.                                                                                                                                                                                                                            | All            | testarch  |

### 3.5 Risk findings summary

**Critical (score 9) — block program gates until mitigated:**

- **R-2** Per-assertion data model — single hardest Phase-1 → Phase-2 blocker (UX spec L1238 confirms). All of Phase 2 sits on this.
- **R-3** Bundle bloat from Phase-1 primitives — gates Phase 1 ship.
- **R-11** Lighthouse mobile < 85 — gates Phase 1 ship.

**Mitigation strategy at the program level for the three criticals:**

1. **Failing acceptance test first** on the per-assertion data model contract (ATDD via `bmad-testarch-atdd`) before any UI primitive ships.
2. **Per-component budget gate** (CI fails the PR) before merging the primitive that breaks the budget — no "we'll fix it in a follow-up" allowed.
3. **Lighthouse mobile in CI** as a required check on every PR touching reading-surface routes.

**High (score 6) — require mitigation plan + owner + deadline before Phase 1 closes:**

R-1 (DATA invariants), R-4 (admin-key leak), R-5 (Kofi roundtrip), R-7 (OAuth), R-9 (parallel test isolation), R-10 (emotion-guardrails), R-12 (Sentry scrubbing), R-13 (OpenAPI drift), R-16 (URL health), R-18 (CSRF), R-20 (suite duration), R-23 (PII in flags).

**Medium / Low (score 1–4) — tracked, reviewed quarterly:**

R-6, R-8, R-14, R-15, R-17, R-19, R-21, R-22, R-24, R-25.

**Gate decision implications:**

- **Phase 1 ship gate** must mitigate R-2 (or Phase 2 is dead-on-arrival), R-3, R-11, R-1, R-10 (the emotion-guardrail suite must be in CI before Phase-1 ship), R-13.
- **Phase 2 ship gate** must mitigate R-5, R-23 (PII in public flag), R-8 (cache invalidation), R-18 (CSRF).
- **Phase 3 ship gate** must mitigate R-7 (OAuth role testing).
- **Phase 4 ship gate** must mitigate R-12 (key scrubbing), R-5 carry-over.
- **Cross-cutting**: R-9 + R-20 must be designed into the framework on day 1 (otherwise we ship a test suite that doesn't scale).

## Step 4 — Coverage Plan & Execution Strategy (complete)

### 4.1 Coverage matrix — persona × journey × test level

**Test ID format:** `{EPIC}.{STORY}-{LEVEL}-{SEQ}` per test-levels-framework. Persona tag = `@amina|@kofi|@fatou|@thomas|@ngozi`. Phase tag = `@phase-1..@phase-5`. NFR tag = `@nfr-perf|@nfr-a11y|@nfr-security`. Negative-assertion tag = `@emotion-guardrail`.

Levels: **UNIT** (Vitest), **INT** (Vitest API/handler), **CT** (Component Test — Vitest + Testing Library), **E2E** (Playwright UI flow), **API-E2E** (Playwright API request), **A11Y** (axe-core on Storybook + page), **PERF** (Lighthouse CI + bundle-size check). Re-stating the duplicate-coverage rule from test-levels-framework: prefer the lowest level that can prove the property; only duplicate when each level checks a distinct aspect (logic vs interaction vs UX).

#### Amina — Reading-surface happy path (Phase 1) — **primary**

Source: PRD L167–187 + UX spec L52, L99–113, L130. Quantified threshold: autonym + chip + source affordance visible within **10 s** on **430 px**, no horizontal scroll, ≥ 44 px tap targets, LCP ≤ 2.5 s on 4G.

| Test ID                                            | Scenario                                                                                                                                      | Level         | FR / NFR / Risk               | Priority | Phase |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------- | -------- | ----- |
| `1.1-E2E-001` `@amina @phase-1`                    | Land on PPL fiche → autonym renders first (above the fold)                                                                                    | E2E           | FR3, UX L99                   | **P0**   | 1     |
| `1.1-E2E-002` `@amina @phase-1 @nfr-perf`          | Autonym + ConfidenceChip + source affordance visible within 10 s on 430 px + Slow-4G profile                                                  | E2E           | FR6, FR7, NFR perf, R-3, R-11 | **P0**   | 1     |
| `1.1-E2E-003` `@amina @phase-1`                    | Tap ConfidenceChip → SourceChainSheet opens; primary/secondary/tertiary tier labels visible; first source URL resolves to external origin     | E2E + API-E2E | FR7, FR8                      | **P0**   | 1     |
| `1.1-E2E-004` `@amina @phase-1 @emotion-guardrail` | No popup / cookie wall / signup interstitial on first paint                                                                                   | E2E           | UX L142–150, R-10             | **P0**   | 1     |
| `1.1-E2E-005` `@amina @phase-1 @nfr-a11y`          | `[data-classification-status]` color is not red hue when value ∈ {consensual, contested, colonial-legacy, reconstructive}                     | E2E + A11Y    | UX L171, R-10                 | **P0**   | 1     |
| `1.1-E2E-006` `@amina @phase-1 @emotion-guardrail` | No `[data-leaderboard]`, no `[data-engagement-counter]`, no avatar pile-up on reading surface                                                 | E2E           | UX L194, R-10                 | P1       | 1     |
| `1.1-E2E-007` `@amina @phase-1 @nfr-a11y`          | Every interactive on reading surface has min(width, height) ≥ 44 px (sweep)                                                                   | E2E           | UX L62, NFR a11y              | **P0**   | 1     |
| `1.1-E2E-008` `@amina @phase-1 @emotion-guardrail` | No `<video autoplay>` / `<audio autoplay>` on reading surface; `prefers-reduced-motion` respected on `[data-animated]`                        | E2E           | UX L94, NFR a11y              | P1       | 1     |
| `1.1-CT-001` `@amina @phase-1`                     | `AutonymExonymHeading` renders endonym dominant; exonym subordinate; missing-endonym fallback                                                 | CT            | UX L99, ASR                   | **P0**   | 1     |
| `1.1-CT-002` `@amina @phase-1`                     | `ConfidenceChip` renders %, source count, last-verified date; tap target ≥ 44 px; high/medium/low styling                                     | CT + A11Y     | FR6, FR11, R-3                | **P0**   | 1     |
| `1.1-CT-003` `@amina @phase-1`                     | `SourceChainSheet` lazy-loads ≤ 8 KB gz; tiered grouping; external link `target=_blank rel="noopener noreferrer"`                             | CT            | FR7, FR8, R-3                 | P1       | 1     |
| `1.1-UNIT-001` `@amina @phase-1`                   | Confidence computation pure-fn — sum/avg/weight under varied source mixes (incl. broken-URL penalty)                                          | UNIT          | FR11, R-16                    | P1       | 1     |
| `1.1-API-E2E-001` `@amina @phase-1`                | `GET /v2/peoples/PPL_*` response contains `autonym`, `confidence`, `verifiedAt`, `sourceCount`, `classificationStatus`, and `sources[]` array | API-E2E       | FR6, FR7, FR8, FR23           | **P0**   | 1     |
| `1.1-PERF-001` `@amina @phase-1 @nfr-perf`         | Lighthouse mobile ≥ 85 on reading-surface route in CI (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, weight ≤ 500 KB)                                 | PERF          | NFR perf, R-3, R-11           | **P0**   | 1     |
| `1.1-A11Y-001` `@amina @phase-1 @nfr-a11y`         | axe-core: 0 WCAG 2.1 AA violations on `/fr/pays/COM`, `/fr/peuples/PPL_*`, `/fr/familles/FLG_*`                                               | A11Y          | NFR a11y, FR43                | **P0**   | 1     |

#### Ngozi — Pinned-version pedagogy (Phase 1) — **primary edge**

Source: PRD L255–270 + UX spec L102, L64. Threshold: pinned URL `@vN` to clipboard within **30 s**; 95 % rule (default reading flow untouched).

| Test ID                                            | Scenario                                                                                                                                      | Level         | FR / NFR / Risk | Priority | Phase |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------- | -------- | ----- |
| `1.2-E2E-001` `@ngozi @phase-1`                    | Tap revision-history affordance → `RevisionDrawer` opens; list shows ≥ 1 entry with diff/date                                                 | E2E           | FR20, ASR-6     | **P0**   | 1     |
| `1.2-E2E-002` `@ngozi @phase-1`                    | Tap "citer une version figée" → clipboard contains `…@vN` URL within 30 s p95                                                                 | E2E           | FR19, FR21      | **P0**   | 1     |
| `1.2-E2E-003` `@ngozi @phase-1`                    | Load `…@v1` URL → banner "vous consultez la version du …" visible; content snapshot matches v1                                                | E2E + API-E2E | FR19, R-6       | **P0**   | 1     |
| `1.2-E2E-004` `@ngozi @phase-1`                    | Print preview shows numbered source footnotes; collapsing interactive charts to static images                                                 | E2E           | FR21            | P1       | 1     |
| `1.2-E2E-005` `@ngozi @phase-1 @emotion-guardrail` | **95 % rule**: on live URL (no `@vN`) `[data-pinned-banner]` is NOT visible                                                                   | E2E           | UX L64, R-15    | **P0**   | 1     |
| `1.2-INT-001` `@ngozi @phase-1`                    | `fiche_revisions.content_snapshot` is byte-deterministic — apply migration, re-render `@v1`, hash equality                                    | INT           | R-6, R-22       | **P0**   | 1     |
| `1.2-CT-001` `@ngozi @phase-1`                     | `PinnedVersionBanner` renders date + "voir la version vivante" CTA always visible; tap target ≥ 44 px                                         | CT + A11Y     | UX L104         | **P0**   | 1     |
| `1.2-CT-002` `@ngozi @phase-1`                     | `CitationBlock` (pinned variant) outputs `title + canonical URL + last-verified + CC-BY-SA`; copy fires Clipboard API; offline fallback works | CT            | FR21            | P1       | 1     |
| `1.2-PERF-001` `@ngozi @phase-1 @nfr-perf`         | `@vN` route p95 render ≤ live p95 + 10 % (pre-rendered HTML cache)                                                                            | PERF          | R-19            | P1       | 1     |
| `1.2-API-E2E-001` `@ngozi @phase-1`                | `GET /v2/peoples/{id}?version=N` returns frozen snapshot; missing N returns 404                                                               | API-E2E       | FR19            | **P0**   | 1     |

#### Kofi — Per-assertion flag roundtrip (Phase 2) — **primary**

Source: PRD L188–207 + UX spec L72. Threshold: flag submit → public URL "promptly" + status visible + contributor credit on resolution. Gated by R-2 (per-assertion data-model migration).

| Test ID                                      | Scenario                                                                                                                                                                                                           | Level         | FR / NFR / Risk              | Priority | Phase |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------- | -------- | ----- |
| `2.1-E2E-001` `@kofi @phase-2`               | Long-press / hover assertion → `FlagTarget` icon appears; tap opens `FlagForm` pre-filled with disputed assertion text                                                                                             | E2E           | FR12, FR13, ASR-4            | **P0**   | 2     |
| `2.1-E2E-002` `@kofi @phase-2`               | Submit flag with counter-source URL + optional identity → public flag URL `/fr/flags/{id}` returned and resolvable; status `en cours de modération`; `ClassificationBadge` shows contested marker on the assertion | E2E + API-E2E | FR12, FR14, FR23, R-5        | **P0**   | 2     |
| `2.1-E2E-003` `@kofi @phase-2 @nfr-security` | Public flag URL renders flag body HTML-escaped (XSS guard); moderator `notes` NOT in response                                                                                                                      | E2E + API-E2E | NFR security, R-23           | **P0**   | 2     |
| `2.1-E2E-004` `@kofi @phase-2`               | After moderator resolution, fiche shows contributor credit on changelog (`flagged by Kofi, Atlanta`); confidence recomputed from 74 → 78                                                                           | E2E + INT     | FR16, FR17, R-5, R-2 (ASR-2) | **P0**   | 2     |
| `2.1-INT-001` `@kofi @phase-2`               | `POST /v2/flags` with valid counter-source returns 201 + public URL; without → 400 with Zod error                                                                                                                  | INT           | FR12                         | **P0**   | 2     |
| `2.1-INT-002` `@kofi @phase-2 @nfr-security` | CSRF on `POST /v2/flags` rejects requests without valid double-submit token; expired session → 401                                                                                                                 | INT           | NFR security, R-18           | **P0**   | 2     |
| `2.1-INT-003` `@kofi @phase-2`               | Confidence recomputation triggered after flag resolved; `TEST_MODE_SYNC_CONFIDENCE=true` makes it deterministic (ASR-2)                                                                                            | INT           | FR11, R-2, ASR-2             | **P0**   | 2     |
| `2.1-CT-001` `@kofi @phase-2`                | `FlagTarget` renders inline-on-focus for keyboard / screen-reader; long-press on mobile; hover+icon on desktop                                                                                                     | CT + A11Y     | UX L63, R-10                 | P1       | 2     |
| `2.1-CT-002` `@kofi @phase-2`                | `FlagForm` validates required {what's wrong, counter-source}; optional identity {pseudo, region}                                                                                                                   | CT            | FR12, FR40                   | P1       | 2     |
| `2.1-API-E2E-001` `@kofi @phase-2`           | `GET /v2/flags/{id}` returns status, disputed assertion ref, flagger display name (if disclosed), counter-source — never moderator-private notes                                                                   | API-E2E       | FR14, R-23                   | **P0**   | 2     |
| `2.1-E2E-005` `@kofi @phase-2 @nfr-a11y`     | Notification email sent on resolution contains public URL and contributor credit (intercept via Mailpit or Inbucket fixture)                                                                                       | INT           | FR17                         | P1       | 2     |

#### Fatou — Moderator triage (Phase 3, desktop-first ≥ 1024px)

Source: PRD L208–229 + UX spec L62. Threshold: single-screen decision, no tab-hunting. Auth gated by R-7 (ASR-1).

| Test ID                                            | Scenario                                                                                                                                                                | Level     | FR / NFR / Risk        | Priority | Phase |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------- | -------- | ----- |
| `3.1-E2E-001` `@fatou @phase-3`                    | Sign in as moderator role via test-mode session injection (ASR-1) → land on `/admin/moderation/queue` with oldest-first default and SLA counter                         | E2E       | FR15, FR41, R-7        | **P0**   | 3     |
| `3.1-E2E-002` `@fatou @phase-3`                    | Open a flag → single screen shows: disputed line, flagger counter-source preview, fiche existing sources, assistant-suggested edit, doctrine clause link (if sensitive) | E2E       | FR15, FR16, FR22, FR25 | **P0**   | 3     |
| `3.1-E2E-003` `@fatou @phase-3`                    | Resolve flag → publishes revision; confidence auto-recomputed; public changelog updated; moderation log entry created                                                   | E2E + INT | FR16, FR17, R-2        | **P0**   | 3     |
| `3.1-E2E-004` `@fatou @phase-3`                    | Escalate flag to advisory board → status `en arbitrage — conseil scientifique`; thread visible                                                                          | E2E       | FR15 (extension)       | P1       | 3     |
| `3.1-INT-001` `@fatou @phase-3 @nfr-security`      | Non-moderator session cannot reach `/admin/moderation/**` (403/redirect)                                                                                                | INT + E2E | NFR security, R-7      | **P0**   | 3     |
| `3.1-INT-002` `@fatou @phase-3 @nfr-security`      | CSRF on resolve endpoint rejects without token; expired session → 401                                                                                                   | INT       | NFR security, R-18     | **P0**   | 3     |
| `3.1-INT-003` `@fatou @phase-3`                    | Moderation revision is append-only; cannot be edited after publish                                                                                                      | INT       | FR16, R-6              | **P0**   | 3     |
| `3.1-E2E-005` `@fatou @phase-3 @emotion-guardrail` | Moderator log entries on resolution carry full name attribution, no avatar pile, no engagement counters                                                                 | E2E       | UX L194                | P2       | 3     |

#### Thomas — Public API + developer portal (Phase 4)

Source: PRD L230–251 + UX spec L91. Threshold: key request → bulk export within **15 min**.

| Test ID                                            | Scenario                                                                                                                                                                              | Level     | FR / NFR / Risk       | Priority | Phase |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------- | -------- | ----- |
| `4.1-E2E-001` `@thomas @phase-4`                   | Land on `/docs/api` → Swagger UI loads; license CC-BY-SA-4.0 + attribution block visible                                                                                              | E2E       | FR33, FR35, FR36      | **P0**   | 4     |
| `4.1-E2E-002` `@thomas @phase-4`                   | Self-serve key request → email + key issued; rate-limit displayed                                                                                                                     | E2E + INT | FR34, R-12            | **P0**   | 4     |
| `4.1-API-E2E-001` `@thomas @phase-4`               | `GET /v2/peoples?minConfidence=0.5&languageFamilyId=FLG_NIGER_CONGO` with valid key returns paginated results; each row carries `confidence`, `verifiedAt`, `sources[]`, license meta | API-E2E   | FR33, FR35, FR37      | **P0**   | 4     |
| `4.1-API-E2E-002` `@thomas @phase-4`               | `GET /v2/peoples?sinceVerifiedAfter=…` returns only updated since timestamp                                                                                                           | API-E2E   | FR38                  | P1       | 4     |
| `4.1-API-E2E-003` `@thomas @phase-4 @nfr-security` | Request with invalid key → 401; with key over daily limit → 429 with Retry-After header; rate-limit counters reset via test-only endpoint (ASR-5)                                     | API-E2E   | FR34, NFR scalability | **P0**   | 4     |
| `4.1-INT-001` `@thomas @phase-4`                   | OpenAPI spec served at stable URL; CI drift gate compares `openapiV2.ts` ↔ runtime-introspected schema                                                                                | INT       | FR36, NFR37, R-13     | **P0**   | 4     |
| `4.1-INT-002` `@thomas @phase-4 @nfr-security`     | Sentry payloads emitted from API path strip `?api_key=`, `Authorization: Bearer …`, `X-API-Key:`                                                                                      | INT       | NFR security, R-12    | **P0**   | 4     |
| `4.1-INT-003` `@thomas @phase-4`                   | Bulk export endpoint supports `Accept: text/csv` and `Accept: application/json`; license header on every response                                                                     | INT       | FR35                  | P1       | 4     |
| `4.1-PERF-001` `@thomas @phase-4`                  | API p95 ≤ 300 ms cached / 800 ms uncached on `/v2/peoples` list (k6 or Playwright loop)                                                                                               | PERF      | NFR perf              | P1       | 4     |

#### Cross-cutting — data invariants, CI gates, security guardrails

| Test ID                                 | Scenario                                                                                                                                                       | Level                       | FR / NFR / Risk             | Priority | Phase |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------- | -------- | ----- |
| `X.1-INT-001` `@phase-1+`               | Demographics per country sum to 100% ± 0.01 (AFRIK invariant)                                                                                                  | INT (Vitest, gated on data) | FR28, R-1                   | **P0**   | All   |
| `X.1-INT-002` `@phase-1+`               | Every FLG\_ identifier in source matches parent folder                                                                                                         | INT                         | FR26                        | **P0**   | All   |
| `X.1-INT-003` `@phase-1+`               | No duplicate PPL\_ identifiers in source                                                                                                                       | INT                         | FR27                        | **P0**   | All   |
| `X.1-INT-004` `@phase-1+`               | Every ISO 639-3 / ISO 3166-1 alpha-3 referenced is valid                                                                                                       | INT                         | FR29                        | **P0**   | All   |
| `X.1-INT-005` `@phase-1+`               | Weekly cron `tsx scripts/checkSourceUrls.ts` validates every source URL resolves; broken URL auto-lowers confidence + auto-flags                               | INT (weekly)                | FR30, FR31, R-16            | **P0**   | 1+    |
| `X.1-INT-006` `@phase-1+`               | Authorized-source allowlist invariant (publisher ∈ allowlist)                                                                                                  | INT                         | UX strict source rule, R-21 | P1       | 1+    |
| `X.2-INT-001` `@nfr-security @phase-1+` | Static check blocks `src/lib/supabase/admin.ts` imports from client modules (existing rule); built `.next/static/**` does not contain `service_role` substring | INT (built-artifact scan)   | NFR7, R-4                   | **P0**   | All   |
| `X.2-INT-002` `@nfr-security @phase-1+` | OpenAPI 3.1 drift CI gate fails PR on schema mismatch                                                                                                          | INT                         | NFR37, R-13                 | **P0**   | All   |
| `X.3-CT-001` `@phase-1+`                | Storybook stories for every L3 component render at 430 / 720 / 800 px; axe-core finds 0 violations                                                             | CT + A11Y                   | UX L1203, NFR a11y          | **P0**   | 1+    |

### 4.2 Today-testable subset (Open Q3 resolution)

What can ship E2E **right now** against the live country page (no Phase-1 primitive shipped yet):

- `1.1-E2E-001`-style "autonym renders" but limited to country page (FR1, FR3 surface)
- `1.1-E2E-007` tap-target sweep on country page
- `1.1-E2E-008` no-autoplay assertion on country page
- `1.1-A11Y-001` axe-core on `/fr/pays/COM` (already partially covered by `scripts/a11y-test.ts`)
- `1.1-PERF-001` Lighthouse mobile baseline on `/fr/pays/COM`
- `1.1-E2E-004` emotion-guardrail (no popups) on country page
- `X.1-INT-001` through `X.1-INT-004` AFRIK invariants — promote `scripts/validateAfrikData.ts` to CI gate now

This is the **today bucket** that proves the framework works without waiting on Phase-1 primitives. Recommended first acceptance.

### 4.3 Execution Strategy — PR / Nightly / Weekly

**PR gate (target ≤ 12 min total wall-clock, must remain under 15 min):**

| Job                 | Tool                                 | Scope                                                                                                                                                      | Tags                                                       | Target time |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| `lint+type`         | ESLint (when fixed) + `tsc --noEmit` | All src                                                                                                                                                    | —                                                          | ≤ 2 min     |
| `unit+int`          | Vitest run                           | `src/**/__tests__/**` excl. `known-failing/`                                                                                                               | —                                                          | ≤ 4 min     |
| `data-invariants`   | Vitest gate                          | `X.1-INT-*`                                                                                                                                                | —                                                          | ≤ 1 min     |
| `storybook+axe`     | Storybook build + axe-core           | All L3 components @ 430 / 720 / 800                                                                                                                        | `@nfr-a11y`                                                | ≤ 3 min     |
| `e2e-pr-slice`      | Playwright                           | **P0 tests for routes touched by PR** (selective via git diff) — full reading surface if `src/components/system/**` or `src/components/country/**` touched | `@phase-{N}` matching merged scope, `@nfr-perf` smoke only | ≤ 6 min     |
| `openapi-drift`     | Custom CI                            | `src/lib/api/openapiV2.ts` vs runtime introspection                                                                                                        | —                                                          | ≤ 30 s      |
| `service-role-grep` | grep on `.next/static/**`            | Built artefacts                                                                                                                                            | —                                                          | ≤ 30 s      |

**Nightly (no time cap, runs on `main`):**

- Full Playwright suite — all personas, all phases that have shipped — at three viewports (430 / 720 / 800; +1024 for moderation)
- Lighthouse mobile on every fiche route (sample of 20 fiches rotating)
- Full a11y sweep across `/fr/pays/*`, `/fr/peuples/*`, `/fr/familles/*` with axe
- API perf smoke (p95 budgets per `/v2/*` endpoint)
- CSS bundle-size budget report

**Weekly (cron):**

- `tsx scripts/checkSourceUrls.ts` — URL-health sweep on all sources; broken → auto-lower confidence + auto-flag (X.1-INT-005)
- AFRIK data drift detection (source `.json` ≠ Supabase rows)
- OpenAPI snapshot diff vs last week (for changelog)
- Visual regression on Storybook stories (mobile baseline screenshots)

### 4.4 Resource Estimates (ranges)

**Framework setup (one-off, before any persona test ships):**

- Playwright config + reference device profile (ASR-7) + persona/phase tags + `tests/utils/*` (auth, factories, cache-bypass): **15–25 hours**
- `e2e/fixtures/` (`seedFiche`, `seedFlag`, `seedKey`, `seedSession` per ASRs 1/5/6): **10–18 hours**
- CI matrix wiring (PR slice / nightly / weekly; selective testing): **8–14 hours**
- Lighthouse + bundle-size + axe-on-Storybook CI gates (ASR-10/13): **6–12 hours**
- Quarantining 6+4 pre-existing failures (ASR-11): **2–4 hours**

**Framework subtotal: ~41–73 hours.**

**Phase 1 — reading surface coverage (Amina + Ngozi):**

- P0 tests (~22 in matrix): **30–50 hours**
- P1 tests (~10 in matrix): **15–25 hours**
- P2 tests: **5–10 hours**

**Phase 1 subtotal: ~50–85 hours.**

**Phase 2 — contribution (Kofi):**

- P0 (~9): **20–35 hours** (plus dependency on ASR-2 + ASR-4 landing)
- P1 (~4): **8–15 hours**

**Phase 2 subtotal: ~28–50 hours.**

**Phase 3 — moderation (Fatou):**

- P0 (~5): **15–25 hours** (plus dependency on ASR-1 OAuth migration)
- P1+: **8–14 hours**

**Phase 3 subtotal: ~23–39 hours.**

**Phase 4 — developer portal (Thomas):**

- P0 (~5): **15–25 hours** (plus dependency on ASR-5 test-tier keys)
- P1+: **10–18 hours**

**Phase 4 subtotal: ~25–43 hours.**

**Cross-cutting CI gates:** ~12–20 hours (some absorbed into the framework subtotal).

**Total program test-build investment: ~179–310 hours** spread across Phases 1–4 (~22–39 working days for one focused engineer; ~6–9 weeks calendar at typical part-time test-engineer cadence). Phase 1 is the largest single phase because it lays the framework + the most-traveled surface.

**Maintenance budget:** plan ~10–15 % of build hours per quarter for flake-fighting + selector resilience + perf-budget rebaselines.

### 4.5 Quality Gates

**Per phase ship gate (must all be green):**

- P0 pass rate: **100 %**
- P1 pass rate: **≥ 95 %**
- A11y axe gate: **0 WCAG 2.1 AA violations** on reading-surface routes (NFR a11y)
- Perf gate: **Lighthouse mobile ≥ 85** on every reading-surface route in scope (NFR perf, R-3, R-11)
- Data invariants gate: **all X.1-INT-\* green** (NFR data, R-1)
- Security gate: **service-role grep clean**, **OpenAPI drift clean** (NFR7, NFR37, R-4, R-13)
- Risk gate: **no R-\* with score ≥ 6 in OPEN status** without an approved waiver
- Pre-existing 6+4 failures: quarantined, **not regressed** (R-14)
- Per-phase emotion-guardrail tests (R-10): **100 % pass** before phase ships

**Program-wide coverage target:**

- ≥ 90 % of FR1–FR46 mapped to ≥ 1 test (traceability)
- ≥ 90 % of NFR set mapped to ≥ 1 test
- Per-persona happy-path E2E: 100 % of shipped journey moments covered

**Coverage waivers:**

- Any FR/NFR without a test requires a documented waiver with: reason, expiry date (max 90 days), owner.
- Waivers tracked in the traceability matrix produced by `bmad-testarch-trace` (run after this workflow).

### 4.6 Where the line falls — automation vs. usability (Open Q4 resolution)

The emotional matrix is partially automation-testable and partially human-testable. The strategy makes this explicit:

**In-scope-for-automation (negative assertions on observable proxies):**

- No popups / paywalls / signup walls on reading surface (DOM presence check)
- No red hue on classification-status indicators (computed-style assertion)
- No leaderboards / engagement counters / avatar pile-ups (selector absence)
- Tap targets ≥ 44 px (computed-bbox sweep)
- No autoplay video/audio (DOM attribute check)
- `prefers-reduced-motion` respected (CSS media query honored)
- Performance budgets honored (Lighthouse + bundle size)
- A11y violations = 0 (axe-core)
- All sources resolve to non-404 (weekly cron)
- Pinned banner not visible on live URL (95 % rule)

**Out-of-scope-for-automation, in-scope-for-the-quality-program (UX spec L386 already names this):**

- The felt experience of **dignified recognition** — first-person "this site sees me" moment
- The felt experience of being **heard, not-a-troll** after submitting a flag
- The felt experience of being **respected, not-a-janitor** as a moderator
- Voice / tone calibration — is the copy librarian or marketer?
- Whether the source list actually closes the credibility loop for a target-persona reader
- Whether the citation block makes a teacher's lesson plan feel reproducible

**Coverage mechanism for the human-testable layer:**

- **Think-aloud usability sessions** with 5–8 testers per persona archetype before each phase ships:
  - Phase 1: 5 lycéen/-ne participants on entry-level Android over 4G; 3 teachers
  - Phase 2: 3 diaspora contributors (varied technical comfort)
  - Phase 3: 3 candidate moderators (PhD/postdoc; not employees)
  - Phase 4: 3 third-party developers
- Standard 5-task script per session; record + transcribe; tag observations against the emotional-matrix layers; produce a delta against the negative-assertion suite (anything observed must either become an automated guardrail or a doctrine refinement).
- The qualitative findings feed back into the BMad UX workflow via `bmad-cis-design-thinking` or `bmad-retrospective` — NOT into this test design directly.
- Recommend: budget for usability sessions at **~10 hours per phase** (recruit, run, synthesize). Not estimated in §4.4 because it's a different cost centre.

## Step 5 — Output Generation & Validation (complete)

### Deliverables produced

| File                                                                  | Purpose                                                                                                 | Size       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| `_bmad-output/test-artifacts/test-design/test-design-architecture.md` | Architect/dev contract — testability concerns, ASRs, risk register, mitigation plans                    | ~350 lines |
| `_bmad-output/test-artifacts/test-design/test-design-qa.md`           | QA execution recipe — coverage matrix, execution tiers, effort estimate, tooling                        | ~430 lines |
| `_bmad-output/test-artifacts/test-design/ethniafrica-handoff.md`      | BMAD handoff — story-level integration, data-testid contract, risk-to-story map, next-workflow sequence | ~210 lines |
| `_bmad-output/test-artifacts/test-design/test-design-progress.md`     | This document — workflow audit trail                                                                    | —          |

### Validation against `checklist.md`

- ✅ Prerequisites (System-Level): PRD + ADR + architecture + epics + UX spec all loaded
- ✅ Risk assessment: 25 risks scored, categorized (TECH/SEC/PERF/DATA/BUS/OPS), high-priority (≥6) flagged with mitigation/owner/timeline
- ✅ Coverage matrix: ~66 scenarios across 5 personas + cross-cutting, level-selected, priority-classified
- ✅ Execution strategy: PR / Nightly / Weekly tiers with explicit time budgets
- ✅ Resource estimates: interval ranges only, no false precision
- ✅ Quality gates: P0 100 %, P1 ≥ 95 %, coverage ≥ 90 % of FR/NFR per phase scope
- ✅ Architecture doc structure: Quick Guide (🚨/⚠️/📋) + Risks + Testability Concerns (actionable-first) + Mitigation Plans + Assumptions
- ✅ QA doc structure: Dependencies near top + Risk Assessment brief + Coverage Plan + Execution Strategy + Effort + Implementation Planning + Tooling + Interworking + Appendix
- ✅ Cross-document consistency: same R-IDs, same priorities, same blockers, same dates
- ✅ BMAD handoff: TEA Artifacts Inventory + Epic/Story Integration + data-testid contract + Risk-to-Story map + Workflow sequence
- ✅ CLI sessions: none opened during workflow (no browser exploration required for system-level design)
- ✅ Temp artifacts: all stored under `_bmad-output/test-artifacts/test-design/`
- ⚠️ Architecture doc length: 350 lines (target ≤ 200). Accepted trade-off — program scope (5 personas × 5 phases × 25 risks × 15 ASRs) requires the detail; trimming would lose load-bearing mitigation context.

### Mode used

**Sequential** (config `tea_execution_mode: auto`; single-agent context — no parallel subagent worker available; all three documents authored sequentially by the active TEA agent).

### Key risks and gate thresholds (summary)

- **Critical (score 9):** R-2 (per-assertion data model), R-3 (bundle bloat), R-11 (Lighthouse mobile). All gate Phase 1.
- **High (score 6):** 12 risks across SEC, DATA, BUS, OPS, PERF, TECH categories.
- **Phase 1 ship gate:** Lighthouse mobile ≥ 85 on reading surface, axe-core 0 violations, AFRIK invariants green, emotion-guardrails green, OpenAPI drift clean, service-role grep clean.
- **Pre-implementation blockers (5):** ASR-1, ASR-2, ASR-4, ASR-7, ASR-13. All called out in `test-design-architecture.md` Quick Guide.

### Open assumptions surfaced

1. Local Supabase CLI as the default test-data strategy (Open Q1 — recommended; awaiting team confirmation)
2. Persona/phase tag taxonomy (`@amina @kofi @fatou @thomas @ngozi`, `@phase-N`, `@nfr-*`) as the trace-matrix interface (Open Q2 — proposed)
3. Today-testable subset is the country page + AFRIK invariants (Open Q3 — confirmed by repo state)
4. Automation/usability split (Open Q4 — explicit in §4.6)
5. R-2 may ship behind a feature flag to unblock Phase 1 timing — needs PM/architect decision
