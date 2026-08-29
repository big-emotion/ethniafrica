# EthniAfrica — Production Readiness Audit

**Date:** 2026-08-29
**Branch audited:** `recette` @ `faed1a60`. Updated twice the same day as the report was acted on: PR #523 (`d695cf8c`) and PR #525 (`34f6f11c`).
**Method:** read-only. Every repo gate executed locally; CI evidence read from GitHub Actions; branch protection and repository secrets read from the GitHub API. No external service was written to, no migration run, no live production probe.

---

## 1. Scope and method

| Gate                                                                      | Result                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                            | **pass** — 0 errors, 107 warnings                                                                                            |
| `npm run typecheck`                                                       | **pass** after `npm run build`; fails against a stale `.next` — see the Domain 3 note                                        |
| `npm run format:check`                                                    | **pass**                                                                                                                     |
| `npm run test:coverage`                                                   | **pass** — 527 files, **5615 passed, 21 skipped, 0 failed**; 85.2 st / 78.9 br / 88.6 fn / 86.0 li vs thresholds 70/60/70/70 |
| `npm run build`                                                           | **pass**                                                                                                                     |
| `npm run test:charter-contracts`                                          | **pass**                                                                                                                     |
| `npm run lint:req`                                                        | **pass**                                                                                                                     |
| `check:jira-template` / `action-pins` / `env-example` / `migration-files` | **all pass**                                                                                                                 |
| `npx tsx scripts/validateAfrikData.ts`                                    | **exit 0** — 35/35 checks, **0 errors**, 4008 warnings                                                                       |
| `npx tsx scripts/ci/checkEditorialRules.ts`                               | **exit 0**                                                                                                                   |
| `npx tsx scripts/ci/checkSourceTierCoverage.ts`                           | **pass at the ratchet** — 1063 untiered across 469 fiches, ratchet pinned at 1063                                            |
| `npm audit`                                                               | **4 moderate, 0 high, 0 critical** (1482 deps)                                                                               |
| `gh` CI history                                                           | `CI` green; **A11y red and Lighthouse red on PR #520, merged anyway**. A11y green from #523 on; Lighthouse still red         |

Corpus: 886 tracked fiches (26 `famille_linguistique`, 789 `peuples`, 54 `pays`, 12 `relations`, 6 `migrations`, 2 `noms`). 47 migrations, 37 tables, 22 workflows.

**Note on this skill's own rubric.** The audit rubric still describes the retired Tier 1/2/3 policy in which "Tier 3 is forbidden" and a Wikipedia citation is a P0. `CLAUDE.md` supersedes that with the three-value `official` / `referenced` / `unverified` scale under which _nothing is forbidden and everything is labelled_. Domain 8 below is scored against the **current** doctrine. Scoring against the retired one would have manufactured ~2776 false P0s out of citations the project deliberately publishes and marks.

---

## 2. The five canonical questions

### 1. Is the project ready for production?

**Conditional — no.** Three blockers, all unchanged since the 2026-08-27 audit:

1. **The quality gates do not gate.** Branch protection on `recette` and `main` requires only `gitleaks` and `build`. Data Integrity, Editorial Rules, A11y, Lighthouse, E2E and OpenAPI-diff all run and all merge red.
2. **The charter's `accessibility = 1.0` is still not met.** Partially closed the same day by PR #523: axe-core is now green across 402 stories and all 15 live routes. But Lighthouse still scores `/fr/explorer` at 0.96 and `/fr/comprendre/migrations` at 0.98, and its performance budget fails on 11 of 18 URLs.
3. **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is still absent from repository secrets.** `production-data-sync.yml` consumes it and is written to fail rather than skip.

### 2. Is the AFRIK editorial surface sound?

**Yes, structurally — with one stalled burn-down.**

- Validator: **35/35 checks, 0 errors**. Referential integrity is complete: FR26 (FLG folder match), FR27 (PPL duplicates), FR29 (ISO validity), FR52 (classification tree), FR53/FR55/FR57 (name records), REL-1…REL-7 (relations), CR1…CR5 (colonial borders) all pass.
- **FR28 hard gate [95,105] ✅ and FR28-strict [99,101] ✅.** The demographic burn-down is genuinely finished and both bands now fail the build. A fiche cannot drift back out.
- `data-integrity.yml` and `editorial-rules.yml` trigger on PRs into both `recette` and `main` and carry **no `continue-on-error`** — they are correctly configured (they simply are not _required_, which is the Domain 3 blocker).
- **The gap:** 1063 sources sit at `needs_review` across 469 fiches — 53% of the corpus. `needs_review` is deliberately _not_ a member of `SourceTier` (`scripts/codemods/tierStringSources.ts:25`); it is the unresolved state. The CI ratchet is pinned at exactly 1063, so it forbids growth but applies no downward pressure. A further 1190 sources carry no URL and cannot be tiered from the catalogue.
- Under the current doctrine none of this is a violation — the claims publish and are visibly marked. But "one three-value scale everywhere" is not yet true of the corpus.

**No fiche publishes an unmarked claim.** That is the contract, and it holds.

### 3. Can a new contributor go clone → running in one session?

**Yes**, with one documented friction point. Every step is covered by a gate or a runbook; only live API responses need real Supabase credentials, for which there is no local fixture path. Full walk in §7.

### 4. What is the security posture?

**Strong — the strongest domain in this audit.** RLS is enabled with at least one policy on **37 of 37 tables**. The service-role client is kept out of client bundles by `import "server-only"` (a build-time failure, not a convention). API keys are PBKDF2-SHA256 at **600,000 iterations** with a 16-byte salt and a self-describing hash format — six times the 100k bar. The CSP nonce is generated per request. Rate limiting is real Upstash Redis with per-tier sliding windows, fully env-tunable. Sentry enforces EU residency with a **throwing** assert plus a PII scrubber. Detail in §8.

The two real weaknesses are the unpaginated `internal/*` routes reachable through the same-origin bypass, and `style-src 'unsafe-inline'` covering 100% of the public surface.

### 5. Is the score close to 8–9/10?

**No — 7.5 / 10**, and the shape of the remaining gap is now clear.

The audit opened at 7.0, unchanged from 2026-08-27 despite a measurably better codebase, because none of the three blockers had moved. Acting on it the same day moved four domains: #523 turned axe-core green (Domain 9, 4 → 5), and #525 closed the unauthenticated table dumps and the two missing CSP directives (Domain 1, 8 → 9), fixed openapi-diff twice over (Domain 3, 5 → 6), removed 30 dead files and 18 production dependencies (Domain 4, 8 → 9), and left only one route bypassing the three-layer split (Domain 7, 7 → 8).

What remains does **not** divide by difficulty. It divides by authority:

- **Three items need the owner** — branch protection (a governance call), and the `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` and `TEST_SUPABASE_*` secrets. Worth ~0.7.
- **Two need measurement** the repo cannot currently produce: the Lighthouse chunk cannot be named without source maps, and the residual a11y sits on routes the two gates disagree about.
- **One needs a doctrine decision**: the corpus cannot leave the retired tier vocabulary while `validateAfrikData.ts` enforces it.

An agent working alone here, without secrets or branch-protection rights, tops out around **7.7**. See §11.

---

## 3. Overall score

# **7.5 / 10**

The codebase is healthier than the pipeline that ships it. Every gate this project wrote for itself is green or honestly red; the problem remains that almost none of them are allowed to stop a merge.

---

## 4. Score per domain

| #   | Domain                             | Score | One-line justification                                                                                                                       |
| --- | ---------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | RLS 37/37, PBKDF2 600k, per-request nonce, `server-only` guard; `internal/*` dumps deleted and `base-uri`/`form-action` set (#525)           |
| 2   | Secrets hygiene                    | **9** | `gitleaks` required on both branches, clean scan, all Actions SHA-pinned, `check:env-example` verifies both directions                       |
| 3   | CI                                 | **6** | openapi-diff now gates `recette` and sees the whole spec (#525); still only `gitleaks` + `build` required, and E2E is vacuous-green          |
| 4   | Correctness & tests                | **9** | 5622 pass / 0 fail, coverage 85/79/89/86 over 70/60/70/70; the orphan pocket is gone — 30 files and 18 prod deps removed (#525)              |
| 5   | Deploy coherence                   | **6** | Docs and migration hygiene excellent; `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` still missing, breaking prod data sync                          |
| 6   | Ferry pipeline                     | **8** | Config parses, `base=target=recette` matches doctrine, pins SHA                                                                              |
| 7   | Architecture & boundaries          | **8** | Three-layer API now holds for 33/34 routes — only `keys/issue` bypasses it; `user-event` declared; dead browser-client chain left on purpose |
| 8   | AFRIK data integrity & Source Tier | **7** | 35/35 checks, 0 errors, **both FR28 bands clean**; the validator still enforces the _retired_ numeric tier policy — see Domain 8 gaps        |
| 9   | Performance & accessibility        | **5** | axe-core green after #523 (0/402 stories, 15/15 routes); Lighthouse still red — perf on 11 URLs, a11y on 2, TBT, LCP                         |
| 10  | Docs & runbooks                    | **8** | CLAUDE.md and DEPLOYMENT.md match reality; the restore drill is 13.5 months old                                                              |

**Mean: 7.5 / 10**

---

## 5. Strengths

These are worth stating plainly, because they are unusual:

- **RLS coverage is total.** 37 tables, 37 with RLS enabled, 37 with at least one policy. The read-only-by-design tables say so in a migration comment (`019_afrik_rls.sql`) rather than leaving a reader to guess. Three separate greps during this audit _appeared_ to find uncovered tables; all three were regex artifacts (column-aligned whitespace, quoted multi-word policy names, multi-line `CREATE POLICY`). The coverage is real.
- **The FR28 demographic burn-down is finished.** Both the hard band [95,105] and the doctrinal band [99,101] measure zero offenders, so both now fail the build.
- **API-key hashing is genuinely strong.** PBKDF2-SHA256 at 600,000 iterations with a self-describing `pbkdf2v1:{iterations}:{salt}:{hash}` format, so the cost parameter can be raised without invalidating existing keys.
- **`import "server-only"` in `src/lib/supabase/admin.ts`.** The file's own comment records that a prose comment used to stand there and "stopped nothing". The guard is now enforced by the compiler.
- **Nothing is hardcoded that an operator would need to change.** Rate limits, windows, quiz confidence, CORS origin and every Supabase/Upstash/Sentry endpoint are env-driven. Cache TTLs are named module constants documented against the AR18 cache classes. **Zero P0 hardcoded values.**
- **The gates are written by someone who has been burned.** `SOFT_CHECK_NAMES` declares advisory checks in exactly one place; `afrikSyncTarget.ts` refuses if the production target resolves to recette; migration `041` explains why `tier` and `source_kind` multiply rather than branch. The comments record tradeoffs, not narration.
- **Test suite grew 23% and stayed green.** 5615 passing, zero failing. The previously-known `migrateAfrikToDatabase` mock failures are gone rather than quarantined.
- **Supply chain**: every third-party Action SHA-pinned, Dependabot bumping them, 0 high/critical CVEs.

---

## 6. Gaps and risks

### Domain 1 — Security

- **P1** `src/app/api/v2/internal/peoples/route.ts:11` (and `internal/countries`, `internal/language-families`) — calls `getAllAfrikPeoples()` with no page/perPage, returning the whole table. The route comment says "not exposed publicly", but it lives under `/api/v2/*`, where `src/middleware.ts:303` grants a **same-origin bypass** based on `Origin`/`Referer` (`isSameOriginRequest`, line 201). Those headers are only browser-enforced; a non-browser client sets them freely. Net effect: a full unpaginated dump of every people, country and language family, without an API key, bypassing the documented `perPage` maximum.
- **P1** `src/middleware.ts:46-49` — every public localized page (`/fr` and everything under it, i.e. the entire public site) gets `style-src 'self' 'unsafe-inline'` plus `style-src-attr 'unsafe-inline'`. The scoping and the follow-up note are good practice; the weakening still covers 100% of the user-facing surface. `script-src` correctly stays nonce-only (`'unsafe-eval'` is dev-only).
- **P2** `src/middleware.ts:41-53` — the CSP declares no `base-uri` and no `form-action`. Neither falls back to `default-src`, so both are unrestricted.

### Domain 3 — CI

- **P0** **Branch protection requires only `gitleaks` and `build`** on `recette` (`strict: true`, `enforce_admins: true`, `required_approving_review_count: 0`). Data Integrity, Editorial Rules, A11y, Lighthouse, E2E and OpenAPI-diff run on every PR and gate nothing. Everything else in this report about "enforced" rules is conditional on this.
- **P1** **PR #520 merged into `recette` on 2026-08-29 with `Lighthouse Mobile Audit` = fail and `axe-core (Storybook)` = fail.** This is not historical: it is the current head of the integration branch.
- **P1** `.github/workflows/e2e.yml` is still **vacuous-green** — the run reports `pass` in 39 seconds because `TEST_SUPABASE_URL` / `TEST_SUPABASE_ANON_KEY` / `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent from repository secrets. It reports success without executing a single spec.
- **P2** **`npm run typecheck` means different things depending on what is on disk.** `tsconfig.json` includes `.next/types/**/*.ts`, which only exists after a build, so `tsc --noEmit` covers Next's generated route validator only when a build preceded it. Run against a _stale_ `.next` it fails with 15 `TS2307` errors naming routes that no longer exist — observed this audit, and enough to make a local `make check` red for reasons unrelated to the source.
  - **Correction (2026-08-29, post-merge):** an earlier revision graded this **P1** and claimed route types are "never checked in CI". That overstated it. `next.config.ts` sets no `typescript.ignoreBuildErrors`, so `next build` runs its own type check on every PR and the route types _are_ gated — by the build step rather than by `tsc`. The real defect is narrower and local: a developer-experience trap, not a CI gate hole. Action #7 was withdrawn accordingly.
- **P1** `openapi-diff.yml` triggers only on `pull_request: branches: [main]`. A breaking API change merged into `recette` is never diffed until the release PR.
- **P2** `required_approving_review_count: 0` on both branches. Defensible for a solo developer; worth a conscious decision rather than a default.

### Domain 5 — Deploy coherence

- **P0** **`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is not in the repository secrets.** Confirmed by `gh secret list`: `PRODUCTION_SUPABASE_URL` and `PRODUCTION_REVALIDATE_SECRET` are present, its companion is not. `production-data-sync.yml` is written to fail rather than skip when it is absent.
- **P1** `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` are absent — the cause of the E2E finding above.
- **P1** Production migrations remain manual by design, but `docs/runbooks/migration-state.md` records applied state for recette only. Nothing in-repo evidences that `043`–`047` reached the production project, and the two-step rollout rule means "applied and called done" has already happened here.
- **P2** `migrate-recette.yml:60` carries `continue-on-error: true`.

### Domain 7 — Architecture & boundaries

- **P1** Four `/api/v2` routes bypass the mandated route → handler → service split and reach the query layer directly: `internal/peoples`, `internal/countries`, `internal/language-families`, `keys/issue`. 33 of 37 routes honour it.
- **P1** `@testing-library/user-event` is imported by **31 test files** but declared nowhere in `package.json`. It resolves transitively today; a transitive bump breaks the suite.
  - **Correction (2026-08-29, post-merge):** an earlier revision of this report also listed `esbuild` here. That was wrong. `scripts/axis-graph-bundle-size.ts:1` states outright that esbuild is _intentionally_ undeclared, with the reasoning in `scripts/quiz-bundle-size.ts` — it is a transitive dependency of vite/vitest and resolves after `npm ci`. Declaring it would contradict a deliberate, documented decision. Only `user-event` is a genuine gap.
- **P1** **The documented browser Supabase client is dead.** `CLAUDE.md` describes three clients that are "never interchangeable", but `src/lib/supabase/client.ts` has exactly one importer — `src/lib/flags-client.ts` — which in turn is referenced only by tests (one of which asserts it is _not_ statically imported). The shipped app uses `server.ts` and `admin.ts` only. The invariant is sound; the third client is a two-file dead chain.
- **P2** 4.85% duplicated lines (731 clones, 9886 lines) — moderate, improved from 5.69%, no single hotspot severe enough to name.
- **Clean:** OpenAPI coverage is effectively complete — 31 of 37 routes carry `@swagger` JSDoc consumed by `swaggerJsdoc({ apis: [...] })`, 3 more are described by the static `paths` object, and the remaining 3 are the deliberately non-public `internal/*` routes.

### Domain 8 — AFRIK data integrity

- **P1** 1063 sources at `needs_review` across 469 fiches. The ratchet in `scripts/ci/checkSourceTierCoverage.ts` is pinned at exactly 1063: it forbids growth but does not drive descent. Contrast FR28, whose burn-down was actually completed and whose band now blocks.
- **P1** 1190 sources carry no URL and therefore cannot be tiered from the catalogue.
- **P1** **The validator still enforces the retired numeric tier policy, which is why the corpus cannot leave it.** 37 source entries across 19 fiches carry `"tier": 1|2`. Migrating them with migration `041`'s own mapping (`1 → official`, `2 → referenced`) was attempted during this audit and **reverted**: it takes `validateAfrikData.ts` from 35/35 to **31/35 with 36 errors**, across `FR80`, `CR4`, `REL-5` and `FR57-source`.

  The gate requires the old vocabulary outright — `scripts/validateAfrikData.ts:1875`, `:2292`, `:2463`, `:2478`, `:2739` all test `tier === 1 || tier === 2` — and two sites go further and encode the retired _doctrine_: `:1882` and `:2485` demand `tier === 2 && /wikipedia/i.test(notes)`, i.e. the rule that a Tier-2 source must record the Wikipedia cross-check that surfaced it. `CLAUDE.md` explicitly supersedes that rule.

  So this is not a data cleanup. Porting the validator decides what every future fiche is allowed to cite, and it is the reason the corpus and the database speak two vocabularies. It belongs in the spec process and the `afrik-curator` skill, with its own REQ/DEC, not in an audit follow-up. The revert is verified: 35/35, 0 errors.

- **P1** 7 relation fiches cite `"unknown"` as the source domain (`REL_RELIGIOUS_*`, `REL_MIGRATORY_*`). Under the current doctrine these publish at `unverified`, which reads as provenance where there is none.
- **P2** FR52-coverage remains the single advisory check (`SOFT_CHECK_NAMES`), with 23 families reporting unlinked peoples — `FLG_NIGERCONGO` 0 linked / 179 unlinked, `FLG_BANTU` 8 / 166, `FLG_CREOLE` 0 / 20.

### Domain 9 — Performance & accessibility

**Partially closed on 2026-08-29 by PR #523** (`d695cf8c`). What that PR fixed, and what it did not, is recorded here rather than edited out — the difference is the interesting part.

- **✅ Fixed — axe-core is now green**, for the first time: 0 violations across 402 stories _and_ all 15 live routes. Two defects, both a colour that is correct in isolation and broken by context:
  - `--country-terracotta` (`#b64e27`) used as **text** on the fiche's warm ground `#f5ede0` — **4.39:1**. It clears AA on the page parchment (4.79) and on a card (5.11), which is why it survived every spot-check. Now split into a fill token and a `--country-terracotta-ink` mixed for type (5.71 / 6.22 / 6.64).
  - `.home-dyk-chip-kind` fading `--accent-ink` with `opacity: 0.72`, which composites the glyph toward the card and took ocre from 6.41:1 to **3.45:1**. This was the _only_ blocking violation — story violations warn, live-route violations fail — and it arrived the same day, with the anecdote work.
- **P1 — Lighthouse is still red.** Measured on the post-fix run (18 URLs, 3 runs each): `categories.performance` fails on **11**, `total-blocking-time` on **5**, `largest-contentful-paint` on **3**.

  **Where it is, measured.** Read out of the run's own LHR rather than guessed at. The three assembled fiches are the floor — `/fr/explorer/pays/SEN` **0.49**, `/fr/explorer/peuples/PPL_WOLOF` **0.52**, `/fr/explorer/familles/FLG_BANTU` **0.49** — with `/fr/explorer` at **0.63**. Several routes miss by a hair and would move for far less work: `/fr/explorer/pays` 0.84, `/fr/explorer/recherche` 0.84, `/fr/comprendre/noms` 0.83.

  For `SEN`: FCP 1.6 s, **LCP 5.6 s**, **TBT 3040 ms**, TTI 8.9 s, CLS 0. Main-thread time is **4371 ms of "Other"** against just 814 ms of script evaluation, and **a single 12 KB chunk** produces about thirteen long tasks of 270–734 ms — 3962 ms of bootup from a file that does not reach the top ten by size. The LCP element is the `AtlasTargetPicker` button inside `AtlasGlobe`, **88% of it render delay**. The document is **471 KB**.

  A 12 KB script burning four seconds is a computation over a large structure, not parsing. The obvious suspect is that all three fiche pages import `AtlasGlobe` **statically**, while both hubs use `dynamic(…, { ssr: false })` — but `AFRICA_ADMIN0` is imported by the _familles_ page and `familyFootprintRanking.ts`, not by the country fiche, so the hypothesis is **not confirmed** and no refactor was attempted on it. Naming that chunk needs source maps in the Lighthouse job, or a local run with Supabase credentials. This is recorded as a diagnosis, deliberately not as a fix.

- **P1 — `categories.accessibility` still fails on 2 URLs**, down from 4: `/fr/explorer` at **0.96** and `/fr/comprendre/migrations` at **0.98**, both deterministic across three runs.
- **The two a11y gates audit different route sets and disagree.** `/fr/comprendre/migrations` **passes axe and fails Lighthouse**; `/fr/explorer` is not in `a11yRoutes.ts` at all, so axe has never looked at it. A green axe run is therefore not evidence that Lighthouse's `accessibility = 1.0` holds, and the residual 0.96/0.98 is invisible to the gate most people read. Reconciling the two route lists is the cheap next step.
- Both gates are correctly configured — no `continue-on-error`, budgets scoped one URL per route family, thresholds exactly as the charter specifies. They fail because the site fails them, which is the gate working. They just do not block.

### Domain 10 — Docs

- **P1** `docs/runbooks/restore-drill-2025-07-14.md` is the most recent drill — **13.5 months old** against a 12-month bar, and the file itself is labelled "historical record… Not current procedure." The procedure exists; the evidence that it works is stale.
- **P2** `docs/adr/` holds only `0007-atlas-globe-engine.md` and a README. The FR28 tolerance decision this audit's rubric expects at `docs/adr/0001-fr28-demographic-tolerance.md` does not exist; that doctrine lives in `CLAUDE.md` instead. Not wrong — but the ADR directory implies a series that was never written.

### Hardcoded values (P0/P1)

The scan came back **clean of P0 and clean of P1** — this is a strength, not a gap.

- `grep` for hardcoded Supabase / Upstash / Sentry URLs in `src/**` returns **nothing**.
- Rate limiting is exemplary: `DEFAULT_IP_RPM` 60, `DEFAULT_PUBLIC_RPM` 600, `DEFAULT_PARTNER_RPM` 6000, `DEFAULT_WINDOW` "1 m" — every one a named constant overridable by `RATE_LIMIT_IP_RPM` / `_PUBLIC_RPM` / `_PARTNER_RPM` / `_WINDOW`.
- Cache TTLs are named `CACHE_CONTROL` module constants documented against the AR18 cache classes (`s-maxage=86400, immutable` for stable references, `s-maxage=3600` for people data) rather than bare literals.
- **P2 only:** the `s-maxage=3600` string is repeated verbatim across four route files; a shared constant per cache class would make the AR18 policy editable in one place.

Domains 5 and 7 therefore take **no hardcoded-value penalty**.

### Dead code & redundancy

- **P1** ~20 unused shadcn components under `src/components/ui/` (`aspect-ratio`, `avatar`, `calendar`, `carousel`, `chart`, `collapsible`, `command`, `context-menu`, `form`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `popover`, `resizable`, `sidebar`, `slider`, `toggle`, `toggle-group`) pulling **18 unused production dependencies** (11 `@radix-ui/*`, `cmdk`, `embla-carousel-react`, `framer-motion`, `input-otp`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `react-resizable-panels`). Next tree-shakes them out of the shipped bundle, so this is install weight and supply-chain surface rather than a payload regression — hence P1, not P0.
- **P1** `src/lib/api/openapi.ts` — V1 OpenAPI spec, imported by nothing. `openapiV2.ts` is the live one.
- **P1** `src/components/LanguageSelector.tsx` — orphan, and a V1 multilingual artefact in an app that `middleware.ts` pins to `/fr`. Zero references outside itself.
- **P1** `src/lib/supabase/client.ts` → `src/lib/flags-client.ts` — the dead browser-client chain described under Domain 7 (counted once, there).
- **P1** `src/components/family/FamilyDistributionSection.tsx`, `FamilyGeneralInfoSection.tsx`, `FamilySourcesFooter.tsx` and `family/index.ts` — orphaned by the fiche-famille rework. `src/components/layout/MobileMenu.tsx` likewise (the live mobile nav is `MobileNavBar.tsx` — checked specifically, since an orphaned mobile nav would be a mobile-first regression; it is not).
- **P2** `src/App.css` (Vite-era leftover), `src/api/v2/schemas/games.ts`, `src/components/{compare,names,relations}/index.ts` barrels, 11 unused devDependencies, 170 unused exports / 96 unused exported types / **108 named+default duplicate exports**.
- **Clean:** no surviving V1 imports (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`) — the V1 removal held.

**Method note.** `knip`'s largest block (108 entries) is _Duplicate exports_ — symbols exported both named and default — not dead code. Read as "unused", it would have condemned `AutonymExonymHeading`, which a custom ESLint rule (`afh/no-bare-people-name`) _mandates_ using. Its "unused files" list likewise counts `e2e/`, `scripts/` and mockup entry points that have no knip config. Only findings verified by direct reference-grep are listed above.

---

## 7. Consumer / new-contributor flow

| Step                                      | Status | Evidence                                                                                                     |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `git clone` + `npm ci --legacy-peer-deps` | ✅     | documented in CLAUDE.md; the peer-dep conflict is intentional and explained                                  |
| `.env.example` → `.env.local`             | ✅     | `check:env-example` passes, verified both directions                                                         |
| migrations apply in order                 | ✅     | `check:migration-files` — 47 files, no duplicate prefix, no hole                                             |
| corpus load                               | ✅     | `scripts/migrateAfrikToDatabase.ts` + `docs/runbooks/afrik-data-sync.md`                                     |
| first admin seeded                        | ✅     | `scripts/seedAdmin.ts`, documents its own prerequisite                                                       |
| `npm run dev`                             | ✅     | build passes clean                                                                                           |
| `/api/v2/*` returns data                  | ⚠️     | requires real Supabase credentials; no local fixture path                                                    |
| `/docs/api` renders                       | ✅     | route present in the build manifest                                                                          |
| `/admin` gated by RBAC                    | ✅     | `src/middleware.ts` admin block + `user_roles` (5 roles: reader / contributor / moderator / admin / advisor) |

One friction point (`⚠️`): a contributor with no Supabase project cannot exercise the API locally. Everything else is a single documented command.

---

## 8. Security posture

### Supabase Row Level Security — coverage

**37 tables · 37 with RLS enabled · 37 with at least one policy.** No gaps.

| Table group                                                                                                | RLS | Policies | Notes                                                         |
| ---------------------------------------------------------------------------------------------------------- | --- | -------- | ------------------------------------------------------------- |
| `afrik_countries`, `afrik_language_families`, `afrik_languages`, `afrik_peoples`, `afrik_people_countries` | ✅  | 1 each   | public SELECT only; writes are service-role by design (`019`) |
| `afrik_people_relations`                                                                                   | ✅  | ✅       | added by `030`                                                |
| `contributions`                                                                                            | ✅  | 2        | public insert + read-own (`001`)                              |
| `user_roles`                                                                                               | ✅  | 3        | admin-only writes; recursion fix in `038`                     |
| `api_keys`                                                                                                 | ✅  | 1        | admin-only                                                    |
| `audit_log`                                                                                                | ✅  | 3        | append-only                                                   |
| `sources`, `assertions`, `assertion_references`, `confidence_scores`                                       | ✅  | 1–2 each | module-zero fabric                                            |
| `revisions`, `revision_drafts`, `fiche_revisions`, `flags`                                                 | ✅  | 3–4 each | moderation surface                                            |
| `name_records`, `migration_events`, `migration_event_peoples`, `oral_narratives`, `oral_narrative_links`   | ✅  | 1–5 each | atlas modules                                                 |
| `editorial_doctrine`, `source_working_assets`, `contributor_profiles`, `protected_records`, quiz tables    | ✅  | 1–5 each | —                                                             |
| V1 remnants (`ethnic_groups`, `countries`, `languages`, `african_regions`, …)                              | ✅  | ✅       | dead schema, but locked down                                  |

### Other controls

| Control                          | Status | Evidence                                                                                         |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| Service-role isolation           | ✅     | `import "server-only"` in `src/lib/supabase/admin.ts` — a build failure, not a convention        |
| API-key hashing                  | ✅     | PBKDF2-SHA256, **600,000 iterations**, 16-byte salt, self-describing `pbkdf2v1:` format          |
| CSP nonce                        | ✅     | `crypto.randomUUID()` per request (`src/middleware.ts:284`)                                      |
| HSTS / nosniff / Referrer-Policy | ✅     | `max-age=31536000; includeSubDomains; preload`, `nosniff`, `strict-origin-when-cross-origin`     |
| `style-src`                      | ⚠️     | `'unsafe-inline'` on 100% of public pages (scoped and documented, still broad)                   |
| `base-uri` / `form-action`       | ❌     | absent; neither falls back to `default-src`                                                      |
| Rate limiting                    | ✅     | Upstash Redis, per-tier sliding windows (ip / public / partner), fully env-tunable               |
| Sentry                           | ✅     | EU DSN enforced by a **throwing** `assertEuDsn`, PII scrubber in `beforeSend`, 10% prod sampling |
| Secrets in tree                  | ✅     | only `.env.example` and `e2e/.env.example` tracked; pattern scan clean                           |
| Secret scanning in CI            | ✅     | `gitleaks` is a **required** check (scans the working tree, `--no-git`)                          |
| Supply chain                     | ✅     | every third-party Action SHA-pinned; Dependabot weekly; 4 moderate / 0 high / 0 critical CVEs    |
| Unauthenticated dumps            | ❌     | `internal/*` routes, reachable via the same-origin bypass                                        |

---

## 9. Performance & accessibility posture

Budgets are configured exactly as the charter requires and are **not** advisory:

- `categories:performance` ≥ **0.85** — currently failing on multiple routes
- `categories:accessibility` = **1.0** — currently failing
- `categories:best-practices` ≥ **0.95**
- `total-blocking-time` ≤ **300 ms** — currently failing on multiple routes
- 18 URLs, 57 runs, one URL per route family.

`a11y.yml` runs axe-core over Storybook at 430px / 720px / 1200px on `pull_request` into `recette` and `main` plus `push` to `main`, with no `continue-on-error`.

**The current violation:** SERIOUS `color-contrast` on `People/FicheSections — Fiche entière` at all three breakpoints, in the 1-, 5- and 21-country variants. Given the project's standing note that the `--afh-color-*` ramp is a day palette that does not switch at night, and that removing a background can expose inherited contrast, this is most likely a token-inheritance issue on the fiche rather than nine independent defects — but that is a hypothesis for the fix, not a finding of this audit.

E2E (`e2e.yml`) is correctly written but **executes nothing** for want of `TEST_SUPABASE_*` secrets.

---

## 10. AFRIK data integrity & Source Tier compliance

| #   | Check                               | Verdict | Evidence                                                                                                                            |
| --- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Strict model adherence              | ✅      | 9 `public/modele-*.json` present; validator's structural checks (CR5, REL-1/3/4/7, FR55-iso) all pass                               |
| 2   | Validator run                       | ✅      | 35/35 checks, **0 errors**, 4008 warnings                                                                                           |
|     | — FR28 hard gate [95,105]           | ✅      | **0 offenders** — blocking                                                                                                          |
|     | — FR28-strict [99,101]              | ✅      | **0 offenders** — blocking; the burn-down is complete                                                                               |
| 3   | FLG / PPL / ISO consistency         | ✅      | FR26, FR27, FR29, FR52, FR53-ref all pass; no orphan fiches                                                                         |
| 4   | Source Tier compliance              | ⚠️      | No forbidden citations under current doctrine; **1063 `needs_review`**, 1190 without URL, 35 legacy numeric tiers, 1 with no tier   |
| 5   | Database vs source-JSON consistency | N/A     | the validator does not cover this, and a live DB read is out of scope for this audit — recorded as a gap, not asserted              |
| 6   | CI enforcement                      | ⚠️      | `data-integrity.yml` and `editorial-rules.yml` are correctly configured and non-advisory, but **not required** by branch protection |
| 7   | Known-issues carry-over             | ✅      | the duplicate-fiche and FLG-mismatch items from the 2026-04-13 audit no longer reproduce; FR27 and FR26 both pass                   |

**Verdict: sound, with a stalled burn-down.** The editorial contract — every claim published _with_ its provenance, nothing suppressed, nothing unmarked — holds. What has not happened is the descent of the `needs_review` tail, and the corpus still speaks two tier vocabularies where the database speaks one.

---

## 11. Prioritized action list

| #      | Action                                                                                                                                                 | Sev | Domain |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------ |
| 1      | Add `Data Integrity`, `Editorial Rules`, `A11y`, `Lighthouse`, `E2E` to required checks on `recette` and `main`                                        | P0  | 3      |
| ~~2~~  | ~~Fix the SERIOUS `color-contrast` on `People/FicheSections`~~ — **done** (PR #523): axe-core green, 0/402 stories, 15/15 routes                       | ✅  | 9      |
| 3      | Add `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` to repository secrets                                                                                       | P0  | 5      |
| 4      | Add `TEST_SUPABASE_URL` / `_ANON_KEY` / `_SERVICE_ROLE_KEY` so E2E stops reporting vacuous green                                                       | P1  | 3      |
| 5      | Bring `performance` ≥ 0.85 (11 URLs), `total-blocking-time` ≤ 300 ms (5) and `largest-contentful-paint` (3) inside budget                              | P1  | 9      |
| ~~6~~  | ~~Paginate or authenticate `internal/*`~~ — **done** (#525): deleted; they had no callers                                                              | ✅  | 1      |
| ~~7~~  | ~~Move `npm run typecheck` after `npm run build`~~ — **withdrawn**: `next build` already type-checks, so CI was never blind here                       | —   | 3      |
| 8      | Drive the `needs_review` ratchet down from 1063 (and set a descending schedule, as FR28 had)                                                           | P1  | 8      |
| 9      | **Port `validateAfrikData.ts` off the retired tier policy first**, then migrate the 37 numeric values. Blocked, and a doctrine decision — see Domain 8 | P1  | 8      |
| ~~10~~ | ~~Declare `@testing-library/user-event`~~ — **done** (#525). `esbuild` stays undeclared on purpose, see Domain 7                                       | ✅  | 7      |
| ~~11~~ | ~~Extend `openapi-diff.yml` to `recette`~~ — **done** (#525), plus a baseline fix: it was blind to 31 of 34 paths                                      | ✅  | 3      |
| 12     | Run a restore drill and replace the 13.5-month-old record                                                                                              | P1  | 10     |
| ~~13~~ | ~~Delete the ~20 unused shadcn components and their 18 production dependencies~~ — **done** (#525)                                                     | ✅  | 4/7    |
| ~~14~~ | ~~Remove the dead V1/orphan files~~ — **done** (#525). `supabase/client.ts` → `flags-client.ts` left in place on purpose                               | ✅  | 4      |
| ~~15~~ | ~~Add `base-uri 'self'` and `form-action 'self'` to the CSP~~ — **done** (#525)                                                                        | ✅  | 1      |
| 16     | Reconcile `a11yRoutes.ts` with `.lighthouserc.js`: `/fr/explorer` (0.96) is audited by Lighthouse and never by axe                                     | P1  | 9      |
| 17     | Close the residual Lighthouse a11y on `/fr/explorer` (0.96) and `/fr/comprendre/migrations` (0.98)                                                     | P1  | 9      |
| 18     | Emit source maps in the Lighthouse job so a bootup-dominating chunk can be named — the blocker on action 5                                             | P1  | 9      |

**Arithmetic of closing the gap.** Eight actions are now done, taking the mean 7.0 → 7.1 → **7.5**: #2 (contrast), #6, #10, #11, #13, #14, #15, and the baseline half of #11.

What is left splits cleanly by who can do it.

**Needs the owner, worth ~1.3 of the remaining 1.3:**

- **#1 branch protection** — a governance decision. Sequence it _after_ the budgets are green, or it stops every merge. Domain 3 → ~9.
- **#3 `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`** — a secret. Domain 5 → ~9.
- **#4 `TEST_SUPABASE_*`** — secrets. Ends the vacuous-green E2E.

**Needs measurement first:** #5 and #18 (performance; the diagnosis is in Domain 9 and the blocker is naming one chunk), #17 and #16 (the residual a11y, on routes the two gates disagree about).

**Needs a doctrine decision:** #9, and #8 behind it — the corpus cannot leave the retired tier vocabulary while the validator enforces it.

Those three secrets-and-settings items alone are worth roughly **+0.7**; the measurement work is another **+0.4**. The ceiling for an agent working alone on this repo, without secrets or branch-protection rights, is about **7.7**.

**Order matters for action 1.** Making the gates required while Lighthouse is red would stop every merge. Actions 5 and 17 come first, then 1.

---

## 12. Conclusion

EthniAfrica's engineering substance is well above its shipping discipline. The data-plane security is complete and, in places, better than the bar this rubric sets — 600k PBKDF2 iterations, a compiler-enforced service-role boundary, total RLS coverage. The editorial machinery does what the decolonial posture requires: it publishes the claim _and_ its provenance, and it finished the FR28 burn-down it set for itself, which is the hardest kind of quality work to actually complete.

The gap between 7.5 and 9.0 is not craft. It is that the project has built ten gates and wired two of them to the door. A people fiche with a SERIOUS contrast violation reached the integration branch today, past a gate that detected it precisely and was not permitted to stop it. The single highest-leverage change in this document is a branch-protection setting — sequenced after the budgets are green, or it stops every merge.

Acting on this report the same day is itself evidence for that reading. PR #523 closed the contrast defects in an afternoon: the fix was one token split and one deleted `opacity` line. The defects were not hard, and they were not hidden — axe had been naming them on every PR for weeks. Nothing was missing except a gate with the authority to insist.

Two cautions for the next audit. First, tools lie in this repo's shape: three separate greps in this pass appeared to find missing RLS policies (aligned whitespace, quoted multi-word policy names, multi-line `CREATE POLICY`), a dead-code tool appeared to find 108 unused exports that were named-plus-default pairs, and two findings in the first revision of this very document — `esbuild`, and the typecheck ordering — were wrong and are corrected in place above rather than deleted. Where this report says a gap exists, it was confirmed by reading the file; where it was wrong, the correction is left visible.

Second, a green gate is not a green surface. axe-core passes on 15 routes and Lighthouse still scores `/fr/explorer` at 0.96 — a route axe has never been pointed at. The two a11y gates disagree because they audit different lists, and the one most people read is the one that says everything is fine.
