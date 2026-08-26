# EthniAfrica — Production Readiness Audit

**Date:** 2026-08-26
**Branch audited:** `recette` @ `0e753c07`
**Method:** read-only. Repo gates executed locally; CI evidence read from GitHub Actions; no external service was written to, no migration run, no live production probe.

> **Note on this file.** `docs/PRODUCTION-READINESS-AUDIT.md` did not exist when this audit ran — it was removed with the rest of `docs/` in `0e753c07`. This is a fresh instance of the canonical structure, not an update.

---

## 1. Scope and method

| Gate                                   | Result                                                      |
| -------------------------------------- | ----------------------------------------------------------- |
| `npm run lint`                         | **pass** — 0 errors, 87 warnings                            |
| `npm run typecheck`                    | **pass**                                                    |
| `npm run format:check`                 | **pass** (under the locked prettier 3.8.3 — see note below) |
| `npm run test:coverage`                | **pass** — 3624 passed, 21 skipped, **0 failed**            |
| `npm run build`                        | **pass** — compiled in 8.1s                                 |
| `npx tsx scripts/validateAfrikData.ts` | **exit 0** — 34/34 checks green, 2 830 warnings emitted     |
| `npm audit`                            | 28 vulnerabilities: 15 high, 11 moderate, 2 low, 0 critical |
| `gh` CI history                        | `CI` green; **A11y red**, **Lighthouse red** on the tip     |

**Local prettier drift.** `npm run format:check` fails locally on 25 files, but passes under the version the lockfile pins. Installed `node_modules` carries prettier **3.9.6**; `package-lock.json` pins **3.8.3**; `package.json` declares `^3.8.3`. CI runs `npm ci` and therefore 3.8.3. The failure is a local artefact, **not** a CI finding — but the caret range means any developer running `npm install` today gets 3.9.6 and a red `make check` while CI stays green.

---

## 2. The five canonical questions

### 1. Is the project ready for production?

**Conditional — no, not as it stands.** The engineering substrate is strong; the _release discipline_ is what is not ready. Three blockers:

- **B1.** `assertion_references` (migration `031`) has neither RLS enabled nor any policy. Every other table in the schema has RLS. Under Supabase's default grants on the `public` schema, this table is writable by anyone holding the anon key — which ships in the browser bundle. This is the exact failure mode migration `019`'s own header documents for the AFRIK tables, recurring 12 migrations later.
- **B2.** Branch protection on `main` and `recette` requires only `gitleaks` and `build`. The Data Integrity Gate, Editorial Rules Gate, A11y, Lighthouse, E2E and OpenAPI-diff are **not required checks** — and two of them are red on the current tip and were merged anyway.
- **B3.** The operational documentation set no longer exists. `docs/DEPLOYMENT.md`, `docs/runbooks/`, `docs/adr/` and `_bmad-output/` were all removed in `0e753c07`. There is no deploy procedure, no restore runbook, and no record of which migrations are applied to which of the two Supabase projects.

### 2. Is the AFRIK editorial surface sound?

**Partly — the doctrine is clean where it is machine-checked, and unenforced across 98% of the corpus.**

| Check                                   | Verdict                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| Strict-model adherence                  | ✅ all 9 `public/modele-*.json` present, fiches conform                              |
| FR28 hard gate `[95,105]%`              | ✅ **0 fiches outside**                                                              |
| FR28-strict target `[99,101]%`          | ✅ **0 fiches outside** — the burn-down is complete                                  |
| FLG / PPL / ISO referential integrity   | ✅ (FR26, FR27, FR29, FR52, orphan check all green)                                  |
| **Tier-3 forbidden citations**          | ✅ **0** — no Wikipedia/blog/social/forum URL in any fiche                           |
| Empty or `"unknown"` source blocks      | ✅ none in the people/country/family corpus                                          |
| **Tier recorded on every source entry** | ❌ **19 of 886 fiches (2.1%) carry a `tier` field at all**                           |
| **Sources admitted by the catalogue**   | ❌ **2 799 citations across 803 of 886 fiches (90.6%)** resolve to `review_required` |
| CI gate enforcement                     | ❌ `data-integrity.yml` runs, but is **not a required check**                        |

The FR28 demographic band — which project memory recorded as an open burn-down across ~30 countries — is **fully closed**. Both bands report zero offenders. The `soft: true` flags on FR28 and FR28-strict in `scripts/validateAfrikData.ts:3175,3182` are now vestigial and can be flipped back to enforced.

The real gap is structural. The 867 people/country/family fiches store `content.sources` as an **array of plain strings** (`"Ethnologue – Wolof (wol) : https://…"`). There is no `tier` field to record, so the Source Tier Policy's core rule — _every entry must carry `tier: 1` or `tier: 2`_ — cannot be expressed there at all. Only the newer entity types (relations, colonial events, name records — 19 files) use the structured `{url, tier, notes}` shape that CR1/CR4/REL-5 actually enforce.

In place of tiers, the string-form fiches are checked against a **30-entry domain allowlist** (`config/sources/authorized-source-catalog.json`). The matcher works correctly — in `PPL_WOLOF.json`, the Ethnologue and CIA citations pass and only the two off-catalogue ones are flagged. But a URL outside the catalogue yields `review_required`, which `checkSourceAdmission` pushes to `warnings`, and `ok` is computed as `errors.length === 0`. **Warnings never fail the gate.** So 2 799 unvetted citations publish freely.

A meaningful share of those are likely legitimate — `ansd.sn` (Senegal's national statistics agency) is a primary demographic source that simply is not catalogued. Thirty entries is small for a continent-wide corpus. The finding is not "the sources are bad"; it is that **the project cannot currently tell the difference**, and nothing blocks publication either way.

**Reporting defect.** The validator's own summary prints `✅ Succès: 6 · ⚠️ Avertissements: 0 · ❌ Erreurs: 0` while 34 checks ran and 2 830 warnings were emitted. `dataset/source/afrik/logs/validation_report.json` persists only the 6 legacy checks. An operator reading the summary — or the JSON — sees a clean corpus.

### 3. Can a new contributor go clone → running in one session?

**Almost — one documented blocker and one silent one.**

| Step                                           | Verdict                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `git clone` + `npm ci --legacy-peer-deps`      | ✅                                                                                   |
| `.env.example` → `.env.local`                  | ⚠️ **incomplete — 5 vars referenced in code are missing**                            |
| Apply `supabase/migrations/` in order          | ⚠️ 39 migrations, no duplicate prefixes, but **no doc says which are applied where** |
| `tsx scripts/migrateAfrikToDatabase.ts`        | ⚠️ unverified — running it needs a live DB, out of audit scope                       |
| Seed a first admin                             | ✅ `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts` exists                               |
| `npm run dev`                                  | ✅ build is clean                                                                    |
| `/api/v2/*` return 200                         | ⚠️ unverified live; middleware requires an API key or same-origin                    |
| `/docs/api` renders                            | ✅ route present in the build manifest                                               |
| `/admin` gated by Supabase Auth + `user_roles` | ✅                                                                                   |

`scripts/checkEnvExample.ts` reports `.env.example` is missing **`A11Y_LIVE_BASE_URL`, `NEXT_PUBLIC_DOCTRINE_CHANGELOG_URL`, `QUIZ_MIN_CONFIDENCE`, `SUPABASE_WEBHOOK_SECRET`, `VERCEL_ENV`** and exits **1**. It is wired into **no** CI workflow and **no** `package.json` script — a written gate that has never run. `SUPABASE_WEBHOOK_SECRET` being undocumented is the sharp edge: a contributor cannot know the webhook path exists.

The deeper blocker is B3: with `docs/DEPLOYMENT.md` gone, the migration-application order and the two-database rollout are pure tribal knowledge.

### 4. What is the security posture?

Good primitives, one hole, one sloppy default.

- **RLS** — 27 of 28 live tables have RLS enabled with policies. **`assertion_references` has neither** (B1). Migration `031` contains no `ENABLE ROW LEVEL SECURITY`, no `CREATE POLICY`, no `GRANT`/`REVOKE` at all. The AFRIK tables are correctly locked to public-read with service-role-only writes (`019`).
- **CSP** — nonce is generated **per request** (`src/middleware.ts:99`, `btoa(crypto.randomUUID())`), plus HSTS with preload, `X-Content-Type-Options`, `Referrer-Policy`. Public `/fr/*` pages relax `style-src` to `unsafe-inline`; API and admin routes keep the strict nonce policy.
- **API keys** — PBKDF2-SHA256 at **600 000 iterations**, 16-byte salt, per-key iteration count embedded in the stored hash so legacy keys still validate. Raw keys never stored.
- **Rate limiting** — Upstash Redis-backed, per-tier sliding window, all four knobs env-driven. Returns **500 in production** when Upstash is unconfigured rather than failing open; fails open only on non-production or transient Upstash errors. Correct.
- **Service-role isolation** — clean. All 10 modules importing `@/lib/supabase/admin` are server-side (API routes, services, loaders, and one `"use server"` action). ⚠️ `src/lib/supabase/admin.ts` carries **no `import "server-only"` guard** — the isolation is convention, not enforcement.
- **CORS** — `src/lib/api/cors.ts:4` falls back to **`"*"`** when neither `CORS_ALLOWED_ORIGIN` nor `NEXT_PUBLIC_SITE_URL` is set, and sets `Access-Control-Allow-Credentials: true` **unconditionally**. A deployment that forgets both advertises wildcard CORS on mutating endpoints including `POST /api/contributions`. No `Vary: Origin`.
- **Sentry** — EU residency asserted at boot (`assertEuDsn` throws in production on a non-`ingest.de.sentry.io` DSN), PII scrubber wired via `beforeSend` on all three runtimes, email scrubbing and IP truncation to /24.
- **Secrets** — no tracked `.env` beyond the two examples, full pattern scan clean, gitleaks is a **required** check, every third-party Action SHA-pinned, Dependabot active.
- **Supply chain** — 15 high-severity npm advisories outstanding.

### 5. Is the score close to 8–9/10?

**6.4 / 10 — below target.** The three moves that close most of the distance:

1. Enable RLS + a policy on `assertion_references`, and add `import "server-only"` to `admin.ts` (**B1**).
2. Make `data-integrity`, `editorial-rules`, `a11y` and `lighthouse` required checks — then fix the two that are currently red (**B2, and Domain 9**).
3. Restore a minimal operational doc set: deployment, migration-state-per-database, restore runbook (**B3**).

---

## 3. Overall score

# **6.4 / 10**

A well-engineered codebase with genuinely strong test and type discipline, wrapped in a release process that does not enforce its own rules and no longer documents itself.

---

## 4. Score per domain

| #   | Domain                             | Score  | One-line justification                                                                |
| --- | ---------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 1   | Security posture                   | 7 / 10 | Strong primitives; one table with no RLS, wildcard CORS default, 15 high CVEs         |
| 2   | Secrets hygiene                    | 8 / 10 | Clean scans, gitleaks required, all Actions pinned; `.env.example` missing 5 vars     |
| 3   | CI                                 | 5 / 10 | Excellent workflows, but only `gitleaks`+`build` required; two gates red and merged   |
| 4   | Correctness & tests                | 9 / 10 | 3624 green, 0 failing, coverage well above thresholds, no dead code, no V1 leftovers  |
| 5   | Deploy coherence                   | 5 / 10 | Sequential migrations and tags in place; deploy/runbook/ADR docs all deleted          |
| 6   | Ferry pipeline                     | 9 / 10 | Config coherent with the branch model, all 10 action pins on one consistent SHA       |
| 7   | Architecture & boundaries          | 8 / 10 | Three-layer API and three-client isolation hold; tunables are env-backed              |
| 8   | AFRIK data integrity & Source Tier | 6 / 10 | Zero Tier-3, FR28 fully closed; but 90.6% of fiches cite off-catalogue, gate advisory |
| 9   | Performance & accessibility        | 4 / 10 | Serious contrast violation on `/fr`, bundle 21% over budget, both gates red & merged  |
| 10  | Docs & runbooks                    | 3 / 10 | Deploy/runbook/ADR set deleted; README still describes the removed V1                 |

**Mean: 6.4 / 10**

---

## 5. Strengths

- **Test discipline is genuinely excellent.** 3 624 passing tests, zero failures, coverage at 81.9% statements / 74.7% branches / 84.8% functions / 82.7% lines against 70/60/70/70 thresholds. The pre-existing failures recorded in project memory are gone.
- **Doctrine is encoded as executable rules, not prose.** `@req REQ-NNN` traceability across 2 363 annotations, a custom `afh` ESLint plugin forcing autonyms through `<AutonymExonymHeading>`, `no-console` scoped to server paths, a charter contract suite that auto-discovers new charter tests, and a self-documenting guard against the linter silently disarming itself when its catalogue is missing.
- **Zero Tier-3 citations in 886 fiches.** The forbidden-source rule holds absolutely — no Wikipedia article, blog, forum or social URL is cited anywhere in the corpus.
- **The FR28 demographic burn-down is complete.** Both the hard `[95,105]%` band and the strict `[99,101]%` target report zero offending fiches.
- **Security primitives are correctly chosen and correctly configured** — per-request CSP nonce, PBKDF2 at 600k iterations, Redis-backed tiered rate limiting that 500s rather than failing open in production, EU-resident Sentry with an active PII scrubber.
- **Supply-chain hygiene in CI** — gitleaks as a required check scanning the PR tree, every third-party Action SHA-pinned with a documented rationale, Dependabot bumping the pins.
- **The codebase carries almost no dead weight.** No orphan routes, no unused production dependency, no surviving V1 import. Knip's 57 "duplicate exports" are the named-plus-default convention applied consistently, not dead code.

---

## 6. Gaps and risks

### Domain 1 — Security

- **P0** `supabase/migrations/031_normalized_sources.sql:61` — `assertion_references` created with no RLS, no policy, no grants. Writable by the anon key under Supabase defaults.
- **P1** `src/lib/api/cors.ts:4` — `ALLOWED_ORIGIN` defaults to `"*"`; `Access-Control-Allow-Credentials: true` set unconditionally at line 14. Wildcard + credentials is rejected by browsers, so a deployment missing both env vars silently breaks credentialed cross-origin calls _and_ advertises `*` on `POST /api/contributions`. No `Vary: Origin`.
- **P1** `npm audit` — 15 high-severity advisories outstanding.
- **P2** `src/lib/supabase/admin.ts:5` — no `import "server-only"`. Service-role isolation is currently convention plus review, with no build-time enforcement.

### Domain 3 — CI

- **P0** Branch protection on `main` and `recette` requires only `gitleaks` and `build`. `data-integrity`, `editorial-rules`, `a11y`, `lighthouse`, `e2e` and `openapi-diff` all run but none can block a merge.
- **P1** `scripts/checkEnvExample.ts` exits 1 on the current tree and is referenced by no workflow and no npm script.

### Domain 5 — Deploy coherence

- **P0** No `docs/DEPLOYMENT.md`, no `docs/runbooks/`. No restore procedure, no rollback path, no record of which of the 39 migrations are applied to the recette database versus the production one — a distinction project memory flags as having already caused a divergence.
- **P2** `prettier: "^3.8.3"` — a caret on a formatter. `npm install` resolves 3.9.6, which reformats 25 files and reddens `make check` while CI (on `npm ci` → 3.8.3) stays green. Pin it exactly.

### Domain 8 — AFRIK data integrity

- **P1** 2 799 source citations across **803 of 886 fiches (90.6%)** resolve to `review_required` against the 30-entry authorized catalogue. `checkSourceAdmission` (`scripts/validateAfrikData.ts:1150`) routes these to `warnings`; `ok` is `errors.length === 0`, so the gate passes.
- **P1** Only **19 of 886 fiches** carry a `tier` field. The 867 core fiches store `content.sources` as plain strings, so the "every entry records `tier: 1` or `tier: 2`" rule is structurally inexpressible there.
- **P1** `scripts/validateAfrikData.ts` summary prints `Succès: 6 · Avertissements: 0` after running 34 checks and emitting 2 830 warnings; `validation_report.json` persists only the 6 legacy checks. The report hides its own burn-down.
- **P2** FR52-coverage: people-to-language linkage is sparse — `FLG_NIGERCONGO` 0 linked / 179 unlinked, `FLG_BANTU` 8 / 174, `FLG_COUCHITIQUE` 4 / 54, `FLG_CREOLE` 0 / 20. Soft-gated.
- **P2** FR28 and FR28-strict are still registered `soft: true` (lines 3175, 3182) though both now report zero offenders — the gate can be hardened.

### Domain 9 — Performance & accessibility

- **P1** **`/fr` (home) ships a SERIOUS `color-contrast` violation** on 6 elements — `entry-point-count-peuples`, `entry-point-verb-peuples`, `entry-point-count-pays` and 3 more. These are the entry points introduced two commits ago in `f5115339` (REQ-113). The Lighthouse budget demands `categories:accessibility = 1.0`, so this breaks two gates at once.
- **P1** Quiz play-island bundle is **18.15 KB gzipped against a 15 KB budget** (+21%). `lighthouse.yml` exits 1 on it.
- **P1** One Storybook story also fails axe: `Colonization/EventTimelineMarkers — No events · filters and scrubber only`.
- **P2** `.lighthouserc.js` excludes `/fr/noms` and `/fr/migrations` from the route list on the grounds that they return HTTP 500 in CI. The same CI run's axe live-route sweep reports **`/fr/noms` … ✅ Passed** — the exclusion comment appears stale, leaving two routes silently unmeasured.

### Domain 10 — Docs

- **P0** `0e753c07` removed `CLAUDE.md`, `AGENTS.md`, `docs/adr/`, `docs/runbooks/`, `docs/DEPLOYMENT.md`, `docs/api-contracts.md`, `_bmad-output/` and all module specs. (`CLAUDE.md` was reconstructed this session and is currently untracked.)
- **P1** `README.md` still documents the removed V1: `/api/regions`, `/api/ethnicities`, four locales, "Version actuelle : v1.1.0". It is now actively misleading.
- **P2** Dangling references to deleted docs survive in code comments: `src/middleware.ts:9` cites `docs/adr/0005-home-style-src-attr-scope.md`; `eslint.config.mjs:31` ignores `docs/design/mockups/**`.

### Hardcoded values (P0/P1)

Very few — the tunables that matter are already env-backed. Nothing rises to P0.

- **P1** `src/lib/quiz/eligibility.ts:34` — `DEFAULT_QUIZ_MIN_CONFIDENCE = 80` gates whether a fiche is quizzable. Env-overridable via `QUIZ_MIN_CONFIDENCE`, but that variable is absent from `.env.example`, so the default is effectively invisible to an operator.
- **P2** Cache TTLs are literals spread across 12 route files (`s-maxage=3600` / `86400` / `60`), each a named `CACHE_CONTROL` constant. Consistent and readable, but a policy change means 12 edits.
- **P2** Pagination caps duplicated as `DEFAULT_LIMIT = 20` / `MAX_LIMIT = 100` in `feed/revisions` and `peoples/[id]/revisions`; `MAX_LIMIT = 50` in `search`; `PAGE_SIZE = 20` in two components.

Rate limits (`RATE_LIMIT_IP_RPM`, `_PUBLIC_RPM`, `_PARTNER_RPM`, `_WINDOW`), Supabase URLs, Sentry DSN and site URL are all read from env — no hardcoded external URL exists anywhere in `src/`. **0 P0, 1 P1 → no score penalty.**

### Dead code & redundancy

Materially clean. **0 P0, 0 P1 → no score penalty.**

- **P2** 57 modules export both a named symbol and a default (`ComparisonView, default`). A deliberate convention, but knip cannot distinguish it from drift.
- **P2** 3 unused type exports: `RelationSourceRef` (`src/types/relations.ts`), `StructuredSourceKind` / `EvidenceTier` / `AssertionLocatorType` (`src/types/sources.ts`).
- **P2** `LanguageId` unused in `src/types/afrik-frontend.ts:14`.
- Two same-named `RelationTypeBadge` components exist (`components/fiche/` and `components/relations/`) — worth confirming one is not a stale copy.
- No surviving V1 import (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`): **0 hits**.

---

## 7. Consumer / new-contributor flow

See §2 question 3. Blocking step: `.env.example` is missing 5 variables, and no document describes the migration-application order across the two Supabase projects.

---

## 8. Security posture

See §2 question 4 for the narrative. RLS coverage table:

| Table                    | RLS    | Policies | Notes                                               |
| ------------------------ | ------ | -------- | --------------------------------------------------- |
| afrik_countries          | yes    | 1        | public-read only; service-role writes (`019`)       |
| afrik_language_families  | yes    | 1        | idem                                                |
| afrik_languages          | yes    | 1        | idem                                                |
| afrik_peoples            | yes    | 1        | idem                                                |
| afrik_people_countries   | yes    | 1        | join table, idem                                    |
| afrik_people_relations   | yes    | 1        | idem                                                |
| **assertion_references** | **NO** | **0**    | **P0 — no RLS, no policy, no grants (`031`)**       |
| assertions               | yes    | 2        | ok                                                  |
| api_keys                 | yes    | 1        | admin-only writes                                   |
| audit_log                | yes    | 3        | ok                                                  |
| confidence_scores        | yes    | 2        | ok                                                  |
| contributions            | yes    | 2        | public insert + read-own (`001:245,249`)            |
| contributor_profiles     | yes    | 3        | ok                                                  |
| editorial_doctrine       | yes    | 5        | locked down in `017`                                |
| fiche_revisions          | yes    | 1        | ok                                                  |
| flags                    | yes    | 4        | ok                                                  |
| migration_events         | yes    | 5        | ok                                                  |
| migration_event_peoples  | yes    | 5        | ok                                                  |
| name_records             | yes    | 5        | ok                                                  |
| oral_narratives          | yes    | 1        | ok                                                  |
| oral_narrative_links     | yes    | 1        | ok                                                  |
| protected_records        | yes    | 1        | ok                                                  |
| protected_record_audit   | yes    | 1        | ok                                                  |
| revisions                | yes    | 3        | ok                                                  |
| revision_drafts          | yes    | 4        | ok                                                  |
| source_working_assets    | yes    | 5        | ok                                                  |
| sources                  | yes    | 2        | dropped as V1 in `007`, recreated with RLS in `009` |
| user_roles               | yes    | 5        | admin-only writes; recursion fix in `038`           |

V1 tables (`african_regions`, `countries`, `ethnic_groups`, `ethnic_group_languages`, `ethnic_group_presence`, `ethnic_group_sources`, `languages`) were dropped in `007` and are excluded.

---

## 9. Performance & accessibility posture

Budgets are well specified in `.lighthouserc.js`: mobile emulation (360×640, 4G throttling, 4× CPU slowdown), 3 runs, `performance ≥ 0.85`, `accessibility = 1.0`, `best-practices ≥ 0.95`, `LCP ≤ 5.5s`, `TBT ≤ 300ms`, with tighter CWV budgets scoped to the comparator and migrations routes. Route coverage is thoughtful — one representative per charter route-family plus one assembled fiche per AFRIK entity type. E2E is green across the last five runs.

Neither gate can block a merge, and both are currently red. Details in §6 Domain 9.

---

## 10. AFRIK data integrity & Source Tier compliance

Full verdict in §2 question 2. Summary of the seven checks:

| #   | Check                         | Verdict                                                                                                                                                                                                                                   |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Strict model adherence        | ✅ pass                                                                                                                                                                                                                                   |
| 2   | Validator run (FR28 / strict) | ✅ pass — 0 hard-gate, 0 strict-band offenders                                                                                                                                                                                            |
| 3   | FLG / PPL / ISO consistency   | ✅ pass                                                                                                                                                                                                                                   |
| 4   | Source Tier compliance        | ❌ **fail** — tier absent on 98%, 90.6% off-catalogue                                                                                                                                                                                     |
| 5   | DB vs source-JSON consistency | ⚠️ **N/A** — not covered by the validator; recorded as a gap, not asserted                                                                                                                                                                |
| 6   | CI enforcement                | ❌ **fail** — gate runs but is not a required check                                                                                                                                                                                       |
| 7   | Known-issues carry-over       | ⚠️ project memory records duplicate fiches and FLG mismatches; the corpus now passes FR26/FR27 and the orphan check, so those appear resolved. Memory's "~30 countries pending FR28 re-sourcing" is **stale — that burn-down is closed.** |

Two failures + one N/A → Domain 8 scores **6**. No Tier-3 citation and no FR28 breach exist, so the rubric's cap-at-4 does not apply.

---

## 11. Prioritized action list

| #   | P   | Action                                                                                                                                      | Domain  |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | P0  | Enable RLS + a read policy on `assertion_references`; audit `031` for any other table it created                                            | 1       |
| 2   | P0  | Make `data-integrity`, `editorial-rules`, `a11y`, `lighthouse`, `e2e`, `openapi-diff` required checks                                       | 3       |
| 3   | P0  | Restore `docs/DEPLOYMENT.md` + a migration-state-per-database runbook (recette vs prod)                                                     | 5, 10   |
| 4   | P1  | Fix the `color-contrast` violation on the `/fr` entry points (REQ-113 regression)                                                           | 9       |
| 5   | P1  | Bring the quiz play-island bundle back under 15 KB gzipped (currently 18.15 KB)                                                             | 9       |
| 6   | P1  | Give the string-form `sources` a structured shape carrying `tier`, or extend the tier rule to strings                                       | 8       |
| 7   | P1  | Triage the 2 799 `review_required` citations: grow the 30-entry catalogue, or reject what fails                                             | 8       |
| 8   | P1  | Make `review_required` an error once the catalogue covers the corpus                                                                        | 8       |
| 9   | P1  | Fix the validator summary to count all 34 checks and all warnings; persist them to the JSON report                                          | 8       |
| 10  | P1  | Add the 5 missing vars to `.env.example`; wire `checkEnvExample.ts` into `ci.yml`                                                           | 2, 3    |
| 11  | P1  | Rewrite `README.md` for V2 (French-only, `/api/v2`, no regions/ethnicities)                                                                 | 10      |
| 12  | P1  | Resolve the 15 high-severity npm advisories                                                                                                 | 1       |
| 13  | P1  | Set `CORS_ALLOWED_ORIGIN` explicitly; drop the `"*"` fallback; gate `Allow-Credentials` on a real origin                                    | 1       |
| 14  | P2  | Add `import "server-only"` to `src/lib/supabase/admin.ts`                                                                                   | 1       |
| 15  | P2  | Pin prettier exactly; flip FR28/FR28-strict off `soft: true`; re-test and re-add `/fr/noms` + `/fr/migrations` to the Lighthouse route list | 5, 8, 9 |

---

## 12. Conclusion

EthniAfrica's _code_ is in better shape than its score suggests. The test suite is comprehensive and entirely green, types and lint are clean, the build compiles, the three-layer API boundary and the three-client Supabase isolation both hold, and the editorial doctrine is encoded as executable lint rules and validator checks rather than prose. The corpus contains zero forbidden citations and the demographic burn-down that project memory recorded as open is in fact closed.

What is not ready is the ring around the code. Four domain-critical gates run on every PR and none of them can stop a merge — so a serious accessibility regression on the home page and a 21%-over bundle budget both landed on `recette` this morning with red checks attached. The Source Tier Policy, which is the product's central editorial promise, is enforced on 2% of the corpus and advisory on the rest. And the operational documentation that would tell an operator how to deploy, how to restore, and which migrations are live on which of the two production databases was deleted yesterday.

None of these is expensive to fix. Items 1–3 are a day's work and move the score most; they are the difference between a codebase that is disciplined and a system that is safe to run.
