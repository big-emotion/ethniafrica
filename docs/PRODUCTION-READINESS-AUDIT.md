# EthniAfrica — Production Readiness Audit

**Date:** 2026-07-21
**Branch audited:** `main` (HEAD `035d033f`, `v2.0.0`)
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

Gates actually executed this run (none skipped — full audit, no `--quick`):

| Gate                    | Result                                                   |
| ----------------------- | -------------------------------------------------------- |
| `npm run lint`          | ✅ 0 errors, 107 warnings                                |
| `npm run typecheck`     | ✅ pass                                                  |
| `npm run format:check`  | ✅ pass                                                  |
| `npm test`              | ✅ 1237 passed / 21 skipped, 118 files, 0 failed         |
| `npm run test:coverage` | ❌ **cannot run** — `@vitest/coverage-v8` not installed  |
| `npm run build`         | ✅ pass                                                  |
| `validateAfrikData.ts`  | ⚠️ exit 1 — FR26 only, from an untracked local directory |
| `checkEditorialRules`   | ✅ 0 errors, 8 warnings                                  |
| `npm audit`             | ⚠️ 9 high, 14 moderate, 2 low, 0 critical                |

Also inspected: all 22 `supabase/migrations/*.sql` for RLS + policy coverage;
all 20 `.github/workflows/*.yml` for advisory-mode flags and action pinning;
`src/middleware.ts`, `src/lib/api/{auth,cors,rate-limit,logger}.ts`,
`sentry.{client,server,edge}.config.ts`; Step 3.5 hardcoded-values scan and
Step 3.7 dead-code scan over `src/**` and `scripts/**`; Step 3.6 AFRIK scan over
all 867 fiches.

**Repo hygiene:** `git status --porcelain` was empty before and after the run.
All build artifacts (`.next/`, `coverage/`, `playwright-report/`,
`test-results/`) are gitignored. Only this file was written.

---

## 2. The five canonical questions

### 2.1 Is the project ready for production?

**No — conditional on three blockers.** The public read path (browse peoples,
countries, families, search, the v2 API, `/docs/api`) is in good shape and the
security infrastructure is genuinely strong. But **the entire moderation
capability is non-functional**, and the editorial contract that is the product's
whole reason for existing is violated in the dataset.

1. **Contribution moderation is unreachable by every user, via two independent
   defects** (§8.1). Nobody can approve or reject a contribution.
2. **80 Tier-3 citations across 73 fiches** — blogs and Reddit threads cited as
   sources, in direct violation of the Source Tier Policy (§10.4).
3. **Coverage cannot run at all** — `@vitest/coverage-v8` is absent, so the
   thresholds declared in `vitest.config.ts` gate nothing (§6.3).

The public site could ship today. The contribution/moderation loop could not, and
the dataset should not be presented as source-compliant until §10.4 is cleared.

### 2.2 Is the AFRIK editorial surface sound?

**No — one P0.** This is the domain-critical question, and the result is mixed in
an important way: the _quantitative_ discipline is now excellent, the
_provenance_ discipline is not.

| Check                       | Verdict                                                        |
| --------------------------- | -------------------------------------------------------------- |
| Strict model adherence      | ✅ 867/867 fiches match `public/modele-*.json` exactly         |
| FR28 hard gate `[95,105]%`  | ✅ **0 failures**                                              |
| FR28-strict `[99,101]%`     | ✅ **0 warnings** — burn-down complete                         |
| FLG / PPL / ISO referential | ✅ FR26/27/29/32 + orphans all pass on tracked files           |
| Empty `sources` block       | ✅ 0 fiches                                                    |
| **Tier-3 citations**        | ❌ **80 entries across 73 fiches (8.4 %)**                     |
| **`tier:` field present**   | ❌ **0 of 867 fiches** — the field does not exist in the model |
| CI enforcement              | ✅ `data-integrity.yml` + `editorial-rules.yml` both enforced  |

The FR28 story is a real win: the previous audit recorded 30 of 54 countries
off-target with 9 at 0 %. Both bands now pass cleanly, so the ADR-0001 hard gate
can be tightened to `[99,101]%` immediately.

The failure is provenance. `sources` is an array of **free-text prose strings**,
not the structured objects the Source Tier Policy assumes — so `tier: 1|2` has
nowhere to live, and no fiche carries one. Consequently nothing detects that 73
fiches cite `kwekudee-tripdownmemorylane.blogspot.com`, `*.wordpress.com`, or
`reddit.com` threads. The `editorial-rules.yml` gate passes them because it never
checks tiers at all.

Worth stating plainly: the _substance_ is largely sound — 709 fiches (81 %) cite
at least one Tier-1 canon organisation (Ethnologue, CIA, UNFPA, UNESCO, IWGIA).
The Wikipedia sweep clearly worked: **0 Wikipedia URLs remain**. The gap is a long
tail of blog citations and the absence of any machine-checkable tier attribution.

> **Detection note:** the audit skill's own suggested grep
> (`"url"\s*:\s*"[^"]*wikipedia\.org..."`) returns **zero hits** here and is a
> false negative — it assumes `sources` entries are objects with a `url` key. They
> are plain strings. Any future tier gate must scan the string bodies.

### 2.3 Can a new contributor go clone → running in one session?

**Almost — one blocking step, and the admin path is a dead end.**

| Step                                                       | Verdict                                             |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `git clone` + `npm ci --legacy-peer-deps`                  | ✅ documented; peer-dep flag is intentional         |
| `.env.example` → `.env.local`                              | ⚠️ **missing 2 vars** (§6.2)                        |
| `supabase/migrations/` apply in order                      | ⚠️ ordering ambiguity — 7 duplicate prefixes (§6.5) |
| `tsx scripts/migrateAfrikToDatabase.ts`                    | ✅ script present                                   |
| Seed a first admin user                                    | ✅ `scripts/seedAdmin.ts` exists                    |
| `npm run dev`                                              | ✅ build passes                                     |
| `GET /api/v2/{countries,peoples,language-families,search}` | ✅ all 4 routes present, 3-layer pattern intact     |
| `/docs/api` renders OpenAPI UI                             | ✅ served from `openapiV2.ts`                       |
| `/admin` requires auth + respects RBAC                     | ❌ **broken — see §8.1**                            |

`scripts/checkEnvExample.ts` exits 1 and correctly reports two variables
referenced in code but absent from `.env.example`:
`NEXT_PUBLIC_DOCTRINE_CHANGELOG_URL` and `SUPABASE_WEBHOOK_SECRET`. **That script
is wired into no workflow**, so CI never runs the check it was written for. A new
contributor hits this as a runtime surprise.

### 2.4 What is the security posture?

**Strong infrastructure, two authorization defects.** The preventive controls are
genuinely well built — this is the strongest domain in the audit. RLS is now
complete across all 25 tables including the 5 AFRIK tables that were the previous
audit's headline P0; migration `017_afrik_rls.sql` closed it and documents the
out-of-band prod/staging application. Full detail in §8.

- **RLS coverage:** ✅ 25/25 tables, every one with policies or a documented
  service-role-only write posture.
- **CSP:** ✅ per-request nonce (`crypto.randomUUID()` per invocation,
  `src/middleware.ts:70`), plus HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  and a `connect-src` allow-list.
- **API keys:** ✅ PBKDF2-SHA256, **600 000** iterations, 16-byte random salt,
  self-describing hash, raw keys never stored (`src/lib/api/auth.ts:15-16`).
- **Rate limiting:** ✅ real Upstash Redis sliding-window, per-tier — not
  in-memory.
- **Sentry:** ✅ EU DSN enforced at boot by `assertEuDsn`, PII scrubber on
  `beforeSend` across client/server/edge.
- **Service-role isolation:** ✅ no `@/lib/supabase/admin` import reaches a
  browser bundle (sole hit is a test file).
- **Secrets:** ✅ history scan clean, only `.env.example` tracked, **all**
  third-party Actions SHA-pinned, Dependabot active.
- ❌ **Authorization is broken in two places** (§8.1) — both fail _closed_
  (lockout, not bypass), so this is an availability defect, not a data leak.
- ⚠️ Two parallel RBAC systems (`user_roles` vs
  `contributor_profiles.moderator_role`).
- ⚠️ 9 high / 14 moderate npm CVEs.
- ⚠️ No repo-wide secret scanner in CI — a standing P1 given agents push here
  autonomously.

### 2.5 Is the score close to 8–9/10?

**No — 5.7 / 10 against a target of 8–9.** The distance is dominated by three
things, all of which are cheap-to-medium to close:

1. **Clear the 80 Tier-3 citations and give `sources` a real `tier` field**
   (Domain 8: 4 → 8, +0.4 overall). This is the single highest-value action — it
   is the product's core promise.
2. **Fix the two authorization defects** (Domain 1 + 7, +0.3). Both are
   one-line-class fixes with large functional impact.
3. **Install `@vitest/coverage-v8` and reconcile the docs with reality**
   (Domains 4/5/10, +0.5) — coverage gating, `DEPLOYMENT.md`'s four missing
   scripts, `migrations.md`'s 1-of-22 coverage, and the stale multilingual claims.

---

## 3. Overall score

**5.7 / 10 — Conditional.**

The security infrastructure and the AFRIK quantitative discipline are at or near
production grade, and both of the previous audit's data-plane blockers (AFRIK RLS,
FR28 demographics) are fully resolved. What holds the score down is a different
class of problem: the moderation flow does not work at all, the editorial
provenance contract is unenforced and violated, and a layer of accumulated
migration drift (a never-shipped V2 people view, a duplicate admin tree, a
duplicate OpenAPI spec) has not been swept.

**Movement since 2026-05-14:** 6.0 → 5.7. The small net drop is not a regression —
it reflects a materially deeper audit. Two of three prior blockers were fixed, but
this run scanned provenance in the fiche _bodies_ (finding the Tier-3 tail) and
traced the admin auth path end-to-end (finding the lockout), neither of which the
previous run reached.

---

## 4. Score per domain

| #   | Domain                             | Score | One-line verdict                                                                             |
| --- | ---------------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | 7/10  | Excellent preventive controls; two fail-closed authorization defects                         |
| 2   | Secrets hygiene                    | 7/10  | Clean history, all Actions SHA-pinned; no CI secret scanner, `.env.example` incomplete       |
| 3   | CI                                 | 7/10  | Broad enforced gate surface; Lighthouse advisory, a11y/openapi skip `recette`, Storybook red |
| 4   | Correctness & tests                | 5/10  | 1237 green tests, but coverage cannot run and mocks hid both auth defects                    |
| 5   | Deploy coherence                   | 4/10  | `DEPLOYMENT.md` cites 4 non-existent scripts; `migrations.md` covers 1 of 22; 7 dup prefixes |
| 6   | Ferry pipeline                     | 8/10  | Config, branch model, and 8 workflows coherent; recent runs green                            |
| 7   | Architecture & boundaries          | 4/10  | 3-layer API + client isolation hold; two RBAC systems, dup admin tree, dup OpenAPI spec      |
| 8   | AFRIK data integrity & Source Tier | 4/10  | FR28 fully clean; **capped at 4** by 80 Tier-3 citations                                     |
| 9   | Performance & accessibility        | 6/10  | Correct budgets, axe-core enforced; Lighthouse gate is decorative                            |
| 10  | Docs & runbooks                    | 5/10  | Good runbook/ADR surface; stale multilingual claims, French deploy doc, drill >12 months     |

**Mean: 5.7 / 10.**

Cross-domain defects were harmonized to one canonical severity before averaging:
the `user_roles` recursion is counted in full under Domain 1 and referenced from 4
and 7; the Tier-3 finding is counted in full under Domain 8 and referenced from 3.

---

## 5. Strengths

These are real and worth protecting:

- **RLS is complete and deliberate.** All 25 tables enabled, with public-read /
  service-role-write documented as an intentional posture rather than an oversight
  (`017_afrik_rls.sql:16-22`). The previous audit's #1 blocker is gone.
- **Crypto and transport controls exceed the bar.** PBKDF2 at 600 000 iterations
  (6× the 100 k minimum), 16-byte salts, per-request CSP nonce, HSTS, EU-resident
  Sentry with active PII scrubbing.
- **Rate limiting is production-real.** Upstash Redis sliding-window, per-tier,
  with a clear configuration-error-vs-transient-failure distinction
  (`rate-limit.ts:101`).
- **Supply chain is disciplined.** Every third-party Action SHA-pinned — zero
  violations of the CLAUDE.md hard rule — with Dependabot bumping them.
- **AFRIK demographics are now fully compliant.** Both FR28 bands pass with zero
  failures and zero warnings; the ADR-0001 burn-down is complete.
- **Strict-model adherence is exact.** All 867 fiches match their model's section
  set — no skipped, renamed, or added sections, across three entity types.
- **The Wikipedia sweep succeeded.** Zero Wikipedia URLs remain in the corpus.
- **The v2 API layering holds.** No route queries Supabase for data; the sole
  in-route client use (`flags/route.ts:51`) is `auth.getUser()`, which is correct.
- **Test suite is green and meaningful in volume.** 1237 passing across 118 files,
  and the 6 previously-known `migrateAfrikToDatabase` failures are fixed.
- **Ferry is coherent.** `base_branch`/`target_branch` both `recette`, matching the
  documented doctrine.

---

## 6. Gaps and risks

### 6.1 Two parallel RBAC systems (Domain 1, 7) — P0

`user_roles` (enum: reader/contributor/moderator/admin/advisor) and
`contributor_profiles.moderator_role` (enum: none/editor/senior_editor/admin) both
exist and are consulted by different code paths for the same decision.
`src/middleware.ts:168` gates `/fr/admin` on the latter;
`src/app/api/admin/contributions/route.ts:19` gates the API on the former. Both are
currently broken (§8.1). Migration `019_moderator_schema.sql:148-205` routes its
own policy checks through `contributor_profiles`, suggesting `user_roles` was
already being worked around rather than fixed.

### 6.2 `.env.example` incomplete and unchecked in CI (Domain 2, 5) — P1

`checkEnvExample.ts` exits 1 reporting `NEXT_PUBLIC_DOCTRINE_CHANGELOG_URL` and
`SUPABASE_WEBHOOK_SECRET` missing. The script is referenced by **no** workflow.

### 6.3 Coverage gate is inoperative (Domain 4) — P0

`vitest.config.ts` declares thresholds (statements 70, branches 60, functions 70,
lines 70), but `npm run test:coverage` aborts with
`MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'`. No coverage
number can be produced, so the declared thresholds enforce nothing and the true
coverage level is **unknown**. Scored as a gap, not assumed-passing.

### 6.4 Tests mock away the defects they should catch (Domain 4) — P1

`src/lib/auth/__tests__/supabase-auth.test.ts` fully mocks the Supabase client, so
`getUserRoles` "passes" while the real query would error. Neither auth defect in
§8.1 is reachable by any existing test. This is precisely the "over-mocking proves
nothing" failure mode — the tests assert the mock's behaviour, not the system's.

### 6.5 Migration numbering collisions (Domain 5) — P1

Seven files share a prefix with another: `007`/`007a`, `015`/`015a`, `018` ×2
(`018_per_assertion_fiche_revisions`, `018_revisions_ddl`), `019` ×4
(`019_flags_full_ddl`, `019_moderator_schema`, `019_pg_notify_cache_invalidation`,
`019_search_vectors`). Apply order within a collision group is undefined by
filename, and `019_flags_full_ddl` and `019_moderator_schema` both touch policies.

### 6.6 `docs/migrations.md` documents 1 of 22 migrations (Domain 5, 10) — P1

The "Migration log" contains a single entry (013). Migrations 001–012 and 014–020
have no applied/pending record, no rollback note, and no story link.

### 6.7 `docs/DEPLOYMENT.md` is stale and in French (Domain 5, 10) — P1

It references five scripts, of which **four do not exist**: `verifyDeployment.ts`,
`migrateEnrichedData.ts`, `parseCountryDescriptions.ts`,
`parseEnrichedCountryCSV.ts`, `matchCSVAndDescriptions.ts` (only `seedAdmin.ts`
resolves). It is also written in French, violating the global English-docs rule.

### 6.8 Stale multilingual claims (Domain 10) — P1

`CLAUDE.md:11` and `CLAUDE.md:111` describe a "multilingual interface
(fr/en/es/pt)" with "Pages under `src/app/[lang]/`", and `README.md:54` carries a
"Multilingue" section. The app is French-only: `src/middleware.ts:51-61`
308-redirects every non-`fr` locale segment, and `src/lib/translations.ts` contains
only an `fr` block.

### 6.9 Restore drill is over 12 months old (Domain 10) — P1

`docs/runbooks/restore-drill-2025-07-14.md` is the most recent drill, dated
2025-07-14 — 12 months and 7 days before this audit. The rubric requires < 12
months.

### 6.10 Editorial gate mis-scopes log artifacts (Domain 8) — P2

`checkEditorialRules.ts` treats `dataset/source/afrik/logs/*.json` as fiches; 6 of
its 8 warnings are `audit-report`, `validation_report`, and `migration_errors_*`
files. Only 2 warnings are real (`PPL_MANDE_DU_SUD`, `PPL_KIRDI` lack autonyms —
notable since _Kirdi_ is itself a colonial exonym). Noise here can mask a genuine
warning.

### 6.11 Local validator false positive (Domain 8) — P2

`validateAfrikData.ts` exits 1 on FR26 because of an untracked
`dataset/source/afrik/peuples/V1/` directory containing only a `.DS_Store`. Git
does not track it, so CI is unaffected — but a developer's local run is red for a
non-issue. The validator should skip directories with no `.json` children.

### 6.12 Hardcoded values (P0/P1) — Step 3.5

**Hardcoded Roles / Tiers**

- **P0** `src/lib/api/rate-limit.ts:17-27` — `RATE_LIMIT_ADMIN_KEYS` /
  `RATE_LIMIT_PARTNER_KEYS` resolve a key's tier by matching the **raw key**
  against comma-separated env lists, bypassing the canonical `api_keys.tier` column
  added by `012_api_keys_tier.sql:7-8`. Two sources of truth for one authorization
  decision, and raw key material in env vars.
- **P1** `src/lib/supabase/moderator.ts:5` — inline union
  `"editor" | "senior_editor" | "admin"` omits `'none'`, which migration 019
  declares; line 44 then compares `role === "none"` only by casting through
  `string`.
- **P1** `src/app/api/v2/keys/issue/route.ts:64,91,106` — `"public"` tier literal
  inlined three times instead of referencing `ApiKeyTier`.

**Hardcoded URLs**

- **P1** `src/lib/api/cors.ts:4` — `?? "*"` fallback for
  `Access-Control-Allow-Origin` while line 13 unconditionally sets
  `Allow-Credentials: true`. Practical impact is limited (methods are `GET,OPTIONS`
  over public data, and browsers reject `*` + credentials), but the fallback should
  never be the unsafe value.
- **P1** `src/middleware.ts:20` — inline CSP `connect-src` host list; a Sentry
  region change or vendor swap silently breaks the app.
- **P1** `src/app/layout.tsx:40` and `src/lib/api/openapiV2.ts:18` —
  `"http://localhost:3000"` fallbacks feeding `metadataBase` and the published
  OpenAPI `servers[0].url` respectively.

**Rate-limit & Quota Thresholds**

- **P0** `src/lib/api/rate-limit.ts:54-57` — `60 / 600 / 6000 rpm` and a `"1 m"`
  window. Named and env-overridable, but no env is _required_, so these defaults
  are what runs in production today and they gate cost.

**Confidence & Scoring Thresholds (AFRIK)**

- **P0** `src/components/source-transparency/UnauditedDisclaimer.tsx:5` —
  `STALE_THRESHOLD_MONTHS = 18`, no env/config path. This is an editorial-policy
  value deciding whether a public fiche renders "à re-vérifier"; changing doctrine
  requires a code deploy.

**Cache TTLs** — P1: `src/middleware.ts:9` (`max-age=31536000` HSTS, inline);
`api/v2/sources/route.ts:63`; `api/v2/feed/revisions/route.ts:106`;
`api/v2/peoples/[id]/versions/[n]/route.ts:74`; `revalidate = 3600` repeated
verbatim across four `[lang]` route files; and
`[lang]/signalements/[slug]/page.tsx:13` diverging to `60` with no comment.

**Pagination & Batch Sizes** — P1: `src/api/v2/utils/validation.ts:21,23` (bare
`return 20` twice); `HistoriqueSection.tsx:37` (`?limit=100` inline, silently
truncating revision history with no "load more"); `RecherchePageContent.tsx:249`
(`&limit=6` inline); `module-zero-batch.ts:60` (`CHUNK_SIZE = 500`, coupled to
PostgREST URL limits).

**Size & Truncation / Default Parameters** — P1: `src/lib/api/auth.ts:15` (600 000
PBKDF2 iterations run in middleware on every authenticated `/api/v2/*` request,
untunable despite direct latency cost); `auth.ts:17` (`KEY_PREFIX_LENGTH = 20` must
stay in lockstep with the DB `key_prefix` column, unenforced); `validation.ts:19`
(`max: number = 100` — every v2 list endpoint inherits this cap implicitly).

**Counts:** P0 = 3, P1 = 19, P2 = 22. Per the Step 3.5 rubric (>15 P1), Domains 5
and 7 each take **−2**.

### 6.13 Dead code & redundancy — Step 3.7

**P1** `src/app/admin/{login,contributions}/page.tsx` — a second, non-localized
admin route tree duplicating `src/app/[lang]/admin/connexion/`.
`middleware.ts:156` gates only `pathname.startsWith("/fr/admin")`, so the
moderator-role check never runs for `/admin/*` — and this is the tree the OAuth
callback redirects into by default (`api/auth/callback/route.ts:14`). _Rated P1,
not P0:_ the page is a `"use client"` shell whose data comes from
`/api/admin/contributions`, which does enforce auth server-side and returns
401/403. No data leaks. The defect is a duplicated, ungated shell and RBAC
inconsistency.

**P1** `src/components/people/` — 11 components (`PeopleDetailViewV2`,
`PeopleHero`, `PeopleOriginBlock`, `ProseWithChip`, `PeopleCountriesSection`,
`PeopleCultureGrid`, `PeopleHistoryTimeline`, `PeopleLanguageSection`,
`PeopleRelatedPeoplesSection`, `PeopleSourcesFooter`, `index.ts`) that only import
each other. The live route renders `@/components/detail/PeopleDetailView` instead.
An entire V2 people view that never shipped.

**P1** `src/lib/api/openapi.ts` — orphan with zero importers, and a near-clone of
`openapiV2.ts` (jscpd: 154 duplicated lines across 5 blocks). Two OpenAPI specs
free to drift apart silently.

**P1** Orphan files: `src/lib/supabase/queries/afrik/flags.ts`
(`getActiveSourceFlags` has no callers), `src/components/LanguageSelector.tsx`,
`src/components/layout/MobileMenu.tsx` (both leftovers from the English-removal
cutover).

**P1** Dead exports: `clientCache.ts:40,101,~160`
(`getCachedData`/`setCachedData`/`clearCache` — ~150 lines of localStorage TTL
machinery, only `CACHE_KEYS` is consumed); `dataVersion.ts:28,43,53`;
`admin-queries.ts:44,62`; `response.ts:123` (`createResponse`);
`afrikLoader.ts:583` (`clearV2Cache`); `normalize.ts:39` (`normalizeToKey`);
`clearCountryCache`/`clearLanguageFamilyCache`/`clearPeopleCache` exported 6×
across `src/lib/afrik/loaders/` with zero call sites.

**P1** Duplication ≥30 lines:
`components/views/{Country,LanguageFamily,People}View.tsx` (66L + 62L + 38L clones
across all three); `[lang]/compte/{connexion,inscription}` (130 duplicated lines);
`[lang]/{familles,pays}/[slug]/page.tsx` (71L of versioned-slug plumbing);
`source-transparency/{RevisionDrawer,SourceChainSheet}.tsx` (69L);
`opengraph-image.tsx` ↔ `twitter-image.tsx` (60L of ~100);
`types/afrik-frontend.ts:84-122` ↔ `types/afrik.ts:187-225` (39L identical type
block guaranteed to drift).

**P1** Unused dependencies: `framer-motion`, `date-fns` (zero import sites
anywhere); `@hookform/resolvers`, `react-hook-form`, `cmdk`,
`embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`,
`vaul` and 14 `@radix-ui/react-*` packages (reachable only from unreferenced
`src/components/ui/*`); devDeps `puppeteer` and `@types/xlsx` (the export route
uses `exceljs`).

**P2** 44 unreferenced shadcn primitives in `src/components/ui/`; `src/App.css`;
in-file duplication in `ContributionFormFields.tsx` and the afrik query mappers;
~35 exported types with no importers.

**Counts:** P0 = 0, P1 = 21, P2 = 8. Per the Step 3.7 rubric (>15 P1), Domains 4
and 7 each take **−2**.

**Cross-check with Step 3.5** — three hotspots appear in both scans and are counted
**once**, the duplication finding subsuming the hardcoded one: `openapi.ts`'s
localhost fallback (the whole file is dead); the `20/100` pagination constants
duplicated across `revisions`/`feed/revisions`/`validation`/`afrikLoader`; and the
identical `NEXT_PUBLIC_SITE_URL` expression inside the og/twitter image clone.

**Verification discipline:** the scan discarded **3 220** raw tool hits as framework
false positives — 2 936 knip rows from `.claude/worktrees/`, `storybook-static/`,
and `playwright-report/`; Deno edge functions and Playwright fixtures knip cannot
see; and 288 ts-prune rows that are Next.js convention exports (`default`,
`metadata`, `generateMetadata`, `revalidate`, `register`). Only verified findings
are listed above.

---

## 7. Consumer / new-contributor flow

See §2.3 for the step-by-step verdict. Summary: the read path is clean end to end;
two environment variables are undocumented; migration apply-order is ambiguous
within four collision groups; and the admin destination is a dead end until §8.1 is
fixed.

---

## 8. Security posture

### 8.1 The two authorization defects — P0

Both are **fail-closed** (they lock legitimate users out; they do not admit
anyone). Neither is a data-exposure risk. Together they make contribution
moderation impossible.

**(a) `contributor_profiles` is written on the wrong key — blocks `/fr/admin`.**

`019_moderator_schema.sql` declares:

```sql
id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id  UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
```

The OAuth callback upserts on the **primary key**, never setting `user_id`:

```ts
// src/app/api/auth/callback/route.ts:44
.upsert({ id: user.id, display_name: displayName }, ...)
```

Every consumer looks the row up by `user_id` — `src/middleware.ts:169-170` and
`src/lib/supabase/moderator.ts:36` both use `.eq("user_id", user.id)`. Profiles
created by OAuth therefore have a **NULL `user_id`** and can never match. Result:
`moderatorRole` is `undefined`, and `middleware.ts:174` redirects every user to
`/fr?message=acces_moderateurs_requis`. **No one can reach `/fr/admin`.** The same
NULL also defeats the RLS policies at `019_moderator_schema.sql:148-205`, which all
key on `cp.user_id = auth.uid()`.

**(b) `user_roles` RLS is self-referential — blocks the admin API.**

`007a_user_roles.sql:48-58` defines:

```sql
CREATE POLICY "Admins can manage all roles" ON user_roles FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
```

A policy **on** `user_roles` whose `USING` clause selects **from** `user_roles` —
the classic Postgres infinite-recursion footgun (error 42P17). No later migration
drops or redefines these policies, and no `SECURITY DEFINER` helper exists for this
table. `getUserRoles` uses the session-scoped SSR client (anon key, so RLS applies)
and swallows the error:

```ts
// src/lib/auth/supabase-auth.ts:43-58
const { data, error } = await supabase.from("user_roles").select("role")...
if (error || !data) return [];   // ← recursion error becomes "no roles"
```

So `isAdmin()` returns `false` for everyone, and
`src/app/api/admin/contributions/route.ts:21` returns **403 to every caller**.

> **Confidence:** the schema/code defects are confirmed by direct file reading. The
> runtime manifestation of (b) is **inferred** from Postgres RLS semantics —
> executing against the live database is outside this audit's read-only,
> no-external-calls scope. (a) requires no such inference: the column mismatch is
> unambiguous.

### 8.2 Supabase Row Level Security coverage

All 25 tables have RLS enabled. Eight V1 tables (`african_regions`, `countries`,
`languages`, `ethnic_groups`, `ethnic_group_*`) were dropped by
`007_remove_v1_add_v2_contribution_types.sql:21-28` and are omitted below.

| Table                     | RLS | Policies | Notes                                                 |
| ------------------------- | --- | -------- | ----------------------------------------------------- |
| `afrik_countries`         | ✅  | 1        | Public read; writes service-role only (documented)    |
| `afrik_language_families` | ✅  | 1        | Public read; writes service-role only                 |
| `afrik_languages`         | ✅  | 1        | Public read; writes service-role only                 |
| `afrik_peoples`           | ✅  | 1        | Public read; writes service-role only                 |
| `afrik_people_countries`  | ✅  | 1        | Join table; public read                               |
| `contributions`           | ✅  | 2        | Public insert + read-own                              |
| `user_roles`              | ✅  | 2        | ❌ **self-referential admin policy — §8.1(b)**        |
| `api_keys`                | ✅  | 1        | Admin-only                                            |
| `audit_log`               | ✅  | 3        | Append-only, admin read                               |
| `contributor_profiles`    | ✅  | 3        | ⚠️ policies key on `user_id`, which OAuth leaves NULL |
| `assertions`              | ✅  | 2        | Module-zero fabric                                    |
| `sources`                 | ✅  | 3        | Module-zero fabric                                    |
| `confidence_scores`       | ✅  | 2        | Module-zero fabric                                    |
| `editorial_doctrine`      | ✅  | 5        | Locked down by `015a`                                 |
| `flags`                   | ✅  | 4        | Contributor insert/withdraw                           |
| `revisions`               | ✅  | 3        | Moderator insert                                      |
| `revision_drafts`         | ✅  | 4        | Moderator-scoped                                      |
| `fiche_revisions`         | ✅  | 1        | Public read                                           |

No table is missing RLS. **There are zero `RLS=No` rows** — the previous audit's P0
is fully closed.

### 8.3 Supply chain

Zero unpinned third-party Actions. Dependabot configured for 2 ecosystems. Secret
scan clean over tracked files. `npm audit`: 0 critical, **9 high**, 14 moderate, 2
low — worth a triage pass. No repo-wide secret-scanning workflow exists; given that
agents push to this repo autonomously, adding one remains a standing P1.

---

## 9. Performance & accessibility posture

- **Lighthouse budgets are correct** — `.lighthouserc.js:35-37` sets performance ≥
  0.85, accessibility = 1.0, best-practices ≥ 0.95.
- ❌ **but the gate is decorative**: `lighthouse.yml:77` sets
  `continue-on-error: true`. The workflow's own comment says to "flip back to
  enforced once merges settle". Until then a perf or a11y regression cannot fail a
  PR.
- ✅ **axe-core is enforced** (`a11y.yml`, no `continue-on-error`) — but it
  triggers only on `main`, so a regression is caught _after_ it lands on the
  release branch rather than on the `recette` PR that introduced it.
- ✅ **e2e enforced** on both `main` and `recette`, covering a real user path.
- ✅ Mobile-first honoured at the documented breakpoints (mobile 430, tablet md
  720, desktop xl 800); `use-mobile.tsx:3` uses 768 consistently. Single-locale
  French, so no locale fan-out is expected.
- ⚠️ `openapi-diff.yml` triggers only on `main`, so an API contract break reaches
  the release branch before it is diffed.
- ⚠️ `storybook-deploy.yml` is currently **failing** on `main`.

---

## 10. AFRIK data integrity & Source Tier compliance

### 10.1 Strict model adherence — ✅

All 867 fiches (789 PPL + 24 FLG + 54 PAYS) match their model section-for-section.
Sampled across all three types: PPL fiches carry exactly
`appellations, ethnicities, origins, organization, languages, culture,
historicalRole, demography, sources`; FLG carry
`decolonialHeader, generalInfo, associatedPeoples, linguisticCharacteristics,
historyAndOrigins, distribution, sources`; PAYS carry
`historicalNames, kingdoms, majorPeoples, culture, historicalFacts, sources,
demographics`. No skipped, renamed, or added sections.

### 10.2 Validator run — ✅ (both demographic bands)

- **FR28 hard gate `[95,105]%` — 0 failures.**
- **FR28-strict `[99,101]%` — 0 warnings.**
- FR26 FLG folder match — ❌ locally only, from the untracked `peuples/V1/`
  `.DS_Store` directory (§6.11). Not reproducible in CI.
- FR27 duplicates, FR29 ISO validity, FR32 population drift, orphan fiches — all ✅.

**Both bands are clean, so ADR-0001's hard gate can be tightened from `[95,105]` to
`[99,101]` now.** That is the migration's stated end state and the burn-down is
complete.

### 10.3 FLG / PPL / ISO referential integrity — ✅

Every `PPL_*.json` resolves to an existing `FLG_*` parent in both folder path and
content field; all country references are valid ISO 3166-1 alpha-3; all language
codes valid ISO 639-3.

### 10.4 Source Tier compliance — ❌ P0

**80 Tier-3 source entries across 73 fiches (8.4 % of the corpus):**

| Forbidden source  | Entries |
| ----------------- | ------- |
| `*.blogspot.com`  | 25      |
| `*.wordpress.com` | 16      |
| `reddit.com`      | 4       |
| (remainder)       | 35      |

Representative violations:

- `peuples/FLG_NILOTIQUE/PPL_JIE_SUD.json` —
  `kwekudee-tripdownmemorylane.blogspot.com`
- `peuples/FLG_NILOTIQUE/PPL_ITESO.json` — `mzeelimasierra.wordpress.com`
- `peuples/FLG_NIGERCONGO/PPL_SOLONGO.json` — `reddit.com/r/Angola`
- `peuples/FLG_NIGERCONGO/PPL_SWAHILI_OMAN.json` — `reddit.com/r/Oman`

The full 73-fiche list spans FLG_BANTU (17), FLG_NIGERCONGO (22), FLG_BENOUECONGO
(7), FLG_TCHADIQUE (5), and 10 other families.

**Structural cause:** `content.sources` is an array of **free-text prose strings**,
not objects. There is no `tier` field on any of the 867 fiches, because the strict
models do not define one. The Source Tier Policy is therefore unrepresentable in
the current data model and unenforceable by any gate.

**Not violations** (checked and cleared): `archive.org` on `PPL_KUNG.json` is the
Internet Archive hosting a 1969 ethnographic film — a legitimate primary source.
**Zero Wikipedia URLs remain** corpus-wide; the sweep worked.

**Mitigating context:** 709 fiches (81 %) cite at least one Tier-1 canon
organisation. The problem is a long tail, not a systemic absence of good sourcing.

Per the rubric, any Tier-3 citation caps this domain at **4/10**.

### 10.5 Database vs source-JSON consistency — ⚠️ not covered

`validateAfrikData.ts` validates the JSON corpus against itself and the models; it
does **not** compare against `afrik_peoples` / `afrik_countries` /
`afrik_language_families` rows. Verifying this would require live Supabase
credentials, which is outside this audit's scope. **Recorded as a gap rather than
asserted consistent.**

### 10.6 CI enforcement — ✅

`data-integrity.yml` and `editorial-rules.yml` both trigger on `pull_request` and
`push` for `main` and `recette`, and **neither uses `continue-on-error`**. The gates
are real. Their limitation is coverage, not enforcement: neither checks source
tiers.

### 10.7 Known-issues carry-over

The recorded data-quality audit (2026-04-13) noted 924 PPL fiches with duplicates
and FLG mismatches. The corpus now holds **789** PPL fiches with FR27 (duplicates)
and FR26 (FLG match) both passing on tracked files — that cleanup appears complete.
Two autonym gaps remain open (`PPL_MANDE_DU_SUD`, `PPL_KIRDI`).

---

## 11. Prioritized action list

| #   | Action                                                                                                            | Pri | Domain | Est |
| --- | ----------------------------------------------------------------------------------------------------------------- | --- | ------ | --- |
| 1   | Fix `contributor_profiles` upsert to write `user_id` (not `id`); backfill NULL `user_id` rows                     | P0  | 1, 7   | XS  |
| 2   | Replace the self-referential `user_roles` admin policy with a `SECURITY DEFINER` helper                           | P0  | 1      | S   |
| 3   | Remove 80 Tier-3 citations from 73 fiches (delegate to `afrik-curator`)                                           | P0  | 8      | L   |
| 4   | Add `tier` to `sources` in `public/modele-*.json`; extend `checkEditorialRules.ts` to gate it                     | P0  | 8      | M   |
| 5   | `npm i -D @vitest/coverage-v8` so the declared thresholds actually gate                                           | P0  | 4      | XS  |
| 6   | Resolve the two RBAC systems into one (`contributor_profiles.moderator_role` is the better-designed of the two)   | P0  | 1, 7   | M   |
| 7   | Resolve tier from `api_keys.tier` instead of raw-key env lists (`rate-limit.ts:17-27`)                            | P0  | 1      | S   |
| 8   | Delete the duplicate `/admin/*` tree; redirect the OAuth callback to `/fr/admin/*`                                | P1  | 7      | S   |
| 9   | Drop `continue-on-error` from `lighthouse.yml:77`; add `recette` to `a11y.yml` + `openapi-diff.yml` triggers      | P1  | 3, 9   | XS  |
| 10  | Wire `checkEnvExample.ts` into `ci.yml`; add the 2 missing vars to `.env.example`                                 | P1  | 2, 5   | XS  |
| 11  | Tighten ADR-0001 FR28 hard gate from `[95,105]` to `[99,101]` — the burn-down is complete                         | P1  | 8      | XS  |
| 12  | Rewrite `docs/DEPLOYMENT.md` in English against the real Vercel-from-git path; drop the 4 dead script refs        | P1  | 5, 10  | M   |
| 13  | Backfill `docs/migrations.md` for the 21 undocumented migrations; renumber the 7 colliding prefixes               | P1  | 5      | M   |
| 14  | Correct the multilingual claims in `CLAUDE.md:11,111` and `README.md:54` to French-only                           | P1  | 10     | XS  |
| 15  | Delete dead code: `components/people/` (11 files), `lib/api/openapi.ts`, 3 orphans, ~12 dead exports, unused deps | P1  | 4, 7   | M   |

Deferred to a follow-up cycle: triage the 9 high-severity npm CVEs; add a CI secret
scanner; schedule the overdue restore drill; scope `checkEditorialRules.ts` to
exclude `logs/`; make `validateAfrikData.ts` skip `.json`-free directories.

---

## 12. Conclusion

EthniAfrica has a **strong security foundation and a now-clean quantitative data
discipline**. Both blockers from the 2026-05-14 audit are genuinely resolved: RLS
covers all 25 tables including the five AFRIK tables that were wide open, and the
FR28 demographics that failed on 30 of 54 countries now pass both the hard gate and
the strict band with zero exceptions. The preventive controls — 600 k-iteration
PBKDF2, per-request CSP nonces, Redis-backed tiered rate limiting, EU-resident
Sentry with PII scrubbing, universal SHA-pinning — are better than most projects at
this stage.

What stands between this and a production cut is not infrastructure. It is that
**the moderation loop does not work** — two independent, fail-closed authorization
defects mean no human can approve a contribution — and that **the editorial
contract is unenforced in the place it matters most**. A site whose premise is
rigorous, decolonial, primary-sourced ethnography currently cites Blogspot posts
and Reddit threads in 73 of its fiches, and its data model has no way to express
the tier attribution its own doctrine mandates. The CI gates are real and enforced;
they simply do not check for this.

The good news is the leverage. Items 1, 2, 5, and 11 are XS-to-S changes with
outsized impact, and items 3 and 4 are well-scoped editorial work on a corpus that
is already 81 % Tier-1-sourced. Closing the first seven actions would move the score
from **5.7 to roughly 7.6**, and clearing the documentation drift behind them
reaches the 8–9 target.

One honest caveat on method: this audit is static. The `user_roles` recursion is
inferred from Postgres RLS semantics rather than observed, and database-vs-JSON
consistency was not verifiable without live credentials. Both are flagged as such
above rather than scored as if confirmed.
