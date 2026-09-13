# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-12 (fifth revision)
**Branch:** `recette` @ `fa8803b8` · **Version:** 4.8.0 · **Deployed:** yes, releases through `v4.8.0`
**Method:** read-only. Nothing was fixed, bumped, tagged, pushed or deployed by this audit.

---

## 1. Scope and method

Every long gate was run locally in a fresh worktree synced to `origin/recette` (`lint`, `typecheck`,
`format:check`, `test:coverage`, `build`), plus the repo-specific gates (`lint:req`,
`check:action-pins`, `check:workflow-shell`, `check:env-example`, `check:local-paths`,
`check:migration-files`, `check:dead`, `test:charter-contracts`, `check:translation-parity`,
`validateAfrikData.ts`, `checkEditorialRules.ts`, `checkSourceTierCoverage.ts`).

**What this revision measured that the last one marked N/A:** the last 20 GitHub Actions runs and
the logs of every persistently failing workflow, branch protection on `recette` and `main`, and the
real Lighthouse and E2E outcomes recorded by CI. **Its focus, at the operator's request, is dead
code and duplication** — so knip was also run _without_ tests and stories as entry points (in
scratch, config untouched), jscpd was run over `src/`, `scripts/`, `social/tools` and `eslint/`, and
the Python render engine under `social/harness/` was traced by hand, since no tool covers it.

**Corrections to earlier revisions.** "53/53 tables, 98 policies" were gross counts that included
eight dropped tables and superseded policies; the net figure is **45 live tables, 45 with RLS, 69
live policies**. D1-1 was wrong: both tables it named already carry their deny-all comment
(`048_antibot.sql:94`, `050_search_query_log.sql:9`). "Recent runs green" and "budgets enforced in
`.lighthouserc.js`" were configuration readings; measured, neither holds (D3-1, D9-1).

**Still not measured:** live Supabase configuration on either project (`check:migration-state`
needs credentials), the self-hosted PostgREST `db-schemas`/`max-rows`, and the Traefik entrypoint's
forwarded-header policy.

---

## 2. The five canonical questions

### 2.1 Is the project ready for production?

**Yes — it is in production and the release path works — conditional on two P1 security fixes.**
`v4.7.0` and `v4.8.0` both shipped on 2026-09-12 through the GitHub Release → OVH path, and their
production data sync succeeded. Every _required_ merge gate is green: 9 133 tests, 0 validator
errors, 0 editorial-rule errors, RLS on every live table.

The conditions:

1. **D1-2 (P1) — the API key is not enforced for external clients.** The same-origin bypass trusts
   `Origin`/`Referer` (`src/middleware.ts:554-567`, applied at `:783`), which any non-browser client
   sets freely. The code's own comment promises "External clients (curl, partners, other origins)
   must still bring a key"; one forged header defeats it. Impact is bounded — the corpus is public
   and the 60 rpm per-IP limit still applies — but the partner-key product the API documents is not
   what it delivers.
2. **D1-3 (P1) — `npm audit` now reports 2 high** (`js-yaml` GHSA-2883-xcg3-v3hh through
   `swagger-ui-react`), newly published against an unchanged lockfile.

And one systemic caveat: **five workflows are red on every run** (D3-1), including the E2E suite
and Lighthouse. None blocks a merge, which is exactly why they stay red.

### 2.2 Is the AFRIK editorial surface sound?

**Structurally yes; doctrinally frayed, and the fray has grown.**

- `validateAfrikData.ts`: **50/50 checks, 0 errors**, 5 597 warnings (+65) across 1 721 tracked
  fiches and 17 strict models.
- **FR28 hard gate [95,105]: 0 offenders. FR28-strict [99,101]: 0 offenders.** Both fail the build.
- `checkEditorialRules.ts`: **0 errors**, 97 warnings (95 `chronology-symmetry`, 2
  `autonym-required`); `UNDATED_POLITY_CEILING` 95, measured 95.
- **0 untiered sources, 0 empty `sources` arrays.** Tiers: `unverified` 3 320 · `referenced` 1 900
  (+94) · `official` 1 630 · `needs_review` 1 002.
- Under the current policy there is no Tier-3 concept to count: nothing is forbidden, everything is
  labelled, and every source is labelled.

The defects:

- **D8-1 (P1, unchanged)** — `needs_review` is still unstorable in the database
  (`041_one_source_tier_vocabulary.sql:79`) and `recompute_confidence()` still has no `ELSE`
  (`041:132-136`). No later migration touches either.
- **D8-2 (P1, worse)** — workshop vocabulary published verbatim to readers: **3 291 occurrences of
  "domain ruling" in 780 files and 1 057 of "awaits editorial review" in 465 files**, all inside
  reader-facing `notes`, now also in seven English sidecars (`dataset/translations/en/pays/*`).
  `src/lib/editorial/readerRegister.ts` still has no pattern for either phrase.
- **D8-3 (P1, new)** — **the nightly Data Integrity run has failed 5 of 5** since 2026-09-08: the
  `validate` job on one unreachable source URL (FR30/31, checked only on schedule), and the
  `quiz-bank-integrity` job **crashing** on the `server-only` import at `src/lib/supabase/admin.ts:5`,
  so the quiz-bank check has not actually run in that window.
- **D8-4 (P1, new)** — **`editorial-rules.yml` is not a required check** on either branch. The
  decolonial editorial gate reports; it does not block.

### 2.3 Can a new contributor go clone → running in one session?

**Yes.** `check:env-example` verifies `.env.example` against the code in both directions;
migrations are 87 sequential files; `npm run build` passes; the suite is green; the first admin is
`scripts/seedAdmin.ts`. D4-1 from the last revision is resolved — `output/`, `Claude outputs/` and
`skills-lock.json` are now gitignored.

Two small traps remain: **`next-env.d.ts` is tracked but rewritten by every `next build`**
(`.next/dev/types` ↔ `.next/types`), so a contributor alternating `dev` and `build` always has a
dirty tree (D2-1, P2); and `CLAUDE.md` says `npm run lint` is `eslint .` while the script runs
`eslint src scripts` (D10-5).

### 2.4 What is the security posture?

**Strong at the data plane, softer at the edge.**

- **RLS: 45 of 45 live tables**, 69 live policies; three deny-all tables, all with the intent
  commented. All nine live `SECURITY DEFINER` functions pin `search_path`; privileged ones revoke
  `EXECUTE` from `PUBLIC`/`anon`.
- **Service-role isolation holds** — `admin.ts` imports `server-only`; all 15 non-test importers are
  server-side.
- **API keys:** PBKDF2-SHA256 at 600 000 iterations, 16-byte salt, iteration count stored per hash.
  But the key is bypassable by header (D1-2), and the raw key is used as the Upstash rate-limit
  identifier (`src/lib/api/rate-limit.ts:24-26`, D1-6).
- **CSP:** per-request nonce (`middleware.ts:738`), HSTS preload, nosniff, Referrer-Policy,
  `frame-ancestors 'self'`. Gaps: no `Permissions-Policy`, redirect and 401/429 responses carry no
  security headers, `connect-src` lists hosts production never calls (D1-5).
- **Auth callback open redirect** via `/\evil.example` (`src/app/api/auth/callback/route.ts:17-22`,
  D1-4, P2 — needs a valid PKCE exchange).
- **Sentry:** EU DSN enforced (throws in production); the scrubber misses `Authorization`/`Cookie`
  values, `request.cookies`, `data`, `extra` and breadcrumb data (D1-7).
- **Secrets:** clean; gitleaks in CI pinned by digest. **Supply chain:** 0 tag-pinned actions — but
  one SHA pin **does not exist** (D3-2), which `check:action-pins` cannot detect. `npm audit`: 0
  critical, **2 high**, 10 moderate.
- **Branch protection (measured):** both branches require `gitleaks`, `build`, `validate`,
  `openapi-diff`, `axe-core (Storybook)` with `enforce_admins: true`; `main` requires a PR (0
  approvals), `recette` does not and is `strict: false`.

### 2.5 Is the score close to 8–9/10?

**6.5 / 10 — down from 7.9, and most of the drop is measurement, not regression.** Four things
moved the number: CI runs and Lighthouse/E2E were measured instead of read from configuration (D3,
D9); the dead-code gate was shown to be structurally blind (D4, D7); two new P1 security items
(D1); and the provenance defects did not close while one grew (D8).

The three moves that close the most distance:

1. **Make the red gates mean something** — fix or quarantine E2E and Lighthouse, repair the
   Storybook pin and the nightly quiz-bank crash, and require `editorial-rules` (D3-1, D3-2, D8-3,
   D8-4). Worth ~3 points across D3, D8, D9.
2. **Give `check:dead` a production-only tally** and delete what it finds — 27 files, 7 runtime
   dependencies (D4-2). Worth ~2 points across D4 and D7.
3. **Close D8-1 and D8-2** — one migration and one pattern list plus a corpus rewrite.

---

## 3. Overall score

**6.5 / 10** — mean of ten equally weighted domains.

A product whose required gates are honest and whose data plane is locked down, surrounded by a ring
of gates that report without blocking — and a dead-code ratchet that counts exactly what it was told
to count, which turns out not to be the dead code.

---

## 4. Score per domain

| #   | Domain                             | Score | Evidence                                                                                                             |
| --- | ---------------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **8** | 45/45 RLS, definer functions pinned, service-role isolated — but API key bypassable by header (P1), 2 high CVEs      |
| 2   | Secrets hygiene                    | **9** | Only `.env.example` files tracked; gitleaks in CI by digest; `check:env-example` both ways; `next-env.d.ts` P2       |
| 3   | CI                                 | **6** | Required gates green; 5 workflows red on every run; a SHA pin that does not exist; `editorial-rules` not required    |
| 4   | Correctness & tests                | **7** | 9 133 pass / 0 fail, coverage 86.8/80.3/89.9/87.9 — minus 2 for >15 P1 dead-code findings hidden from `check:dead`   |
| 5   | Deploy coherence                   | **7** | v4.7.0 + v4.8.0 deployed and synced; 87 migrations sequential — minus 1 for 3 P0 hardcoded values                    |
| 6   | Ferry pipeline                     | **7** | Config parses, `recette`→`recette`, pins consistent — Ferry Cost Daily 5/5 red on a missing variable                 |
| 7   | Architecture & boundaries          | **6** | Three-layer API and client isolation hold — minus 1 (hardcoded) and minus 2 (dead code + drifted duplication)        |
| 8   | AFRIK data integrity & Source Tier | **5** | 0 errors, FR28 0/0 — two failed checks (vocabulary fork D8-1, CI enforcement D8-3/D8-4) and one N/A (DB vs JSON)     |
| 9   | Performance & accessibility        | **5** | axe-core required and green — Lighthouse 13/15 red (45 failed assertions), E2E 15/15 red, neither required           |
| 10  | Docs & runbooks                    | **5** | `CLAUDE.md` contradicts itself on the gabarit spec; migration-state runbook two releases behind; drill 14 months old |

---

## 5. Strengths

- **The required gates are genuinely hard to fool.** `check:dead` fails below its ceiling as well
  as above; `check:migration-files` refuses holes; `check:env-example` checks both directions;
  `check:local-paths` self-tests its own false positives. Local and CI knip tallies now agree
  exactly (exports 22/22, types 49/49), so the worktree trap no longer distorts them.
- **The data plane is locked down and reasoned.** Every live table has RLS; migration 077 repoints
  policies with `ALTER POLICY` _before_ dropping the old helpers without `CASCADE`, so no policy was
  silently lost; every definer function pins `search_path`.
- **The release path is real and exercised** — two releases in one day, both deployed and both
  followed by a successful production data sync.
- **The test suite is large and real:** 9 133 tests across 873 files, coverage comfortably above
  every threshold, charter contracts (1 043 tests) guarding the design system.
- **The Python render engine documents its own transition honestly** — `ethni_compose_v1.py` and
  `ethni_carrousel2.py` both say, in their headers, what they replace and when the old path goes.
  The defect is that the stated condition has already been met (§6, D7-4).

---

## 6. Gaps and risks

### Domain 1 — Security posture

- **D1-2 (P1)** — API key bypassable with a forged `Referer`/`Origin`
  (`src/middleware.ts:554-567, 783, 800-805`). Browsers send `Sec-Fetch-Site`, which non-browser
  clients can also forge, so the honest fix is to stop treating header provenance as auth: either
  accept that `/api/v2` is keyless-public and say so in the OpenAPI, or have the frontend call
  through a server-side path that never leaves the host.
- **D1-3 (P1)** — `npm audit`: 2 high, `js-yaml` via `swagger-ui-react` ^5.30.2
  (`package.json:114`). An `overrides` pin of `js-yaml >= 4.3.2` avoids npm's suggested major
  downgrade.
- **D1-4 (P2)** — open redirect: `safeDestination` rejects `//` but not `/\`
  (`src/app/api/auth/callback/route.ts:17-22`).
- **D1-5 (P2)** — CSP: no `Permissions-Policy`; 307/308/401/429 responses carry no security headers;
  `connect-src` allows `https://*.upstash.io` and `https://*.supabase.co`, neither called by the
  browser in production (`middleware.ts:137-155`).
- **D1-6 (P2)** — the raw API key becomes the Upstash identifier `key:<apikey>`
  (`rate-limit.ts:24-26`); the rate limiter reads the first `X-Forwarded-For` entry, safe only if
  Traefik strips client-supplied values (unverifiable from the repo).
- **D1-7 (P2)** — Sentry `beforeSend` does not redact `Authorization`/`Cookie`, `request.cookies`,
  `data`, `query_string`, `extra`/`contexts` or breadcrumb data
  (`src/lib/sentry/pii-scrubber.ts:98-170`).
- **D1-8 (P2)** — runtime drift: `engines` and most CI jobs run Node 20; the `Dockerfile` builds
  production on `node:22-alpine`. The Ferry workflows download gitleaks with no checksum
  (`ferry-dev.yml:91` and three siblings).

### Domain 2 — Secrets hygiene

- **D2-1 (P2)** — `next-env.d.ts` is tracked and rewritten by every `next build`; the audit had to
  restore it by hand to leave the tree clean.

### Domain 3 — CI

- **D3-1 (P1)** — **five workflows fail on every run**, all outside the required set:

  | Workflow                 | Record                    | Cause                                                                        |
  | ------------------------ | ------------------------- | ---------------------------------------------------------------------------- |
  | E2E                      | 15/15 failed or cancelled | v4.8.0: fr 57 failed / 138 passed; en 7 failed / 156 skipped                 |
  | Lighthouse               | 13 failed, 2 cancelled    | v4.8.0: 45 failed assertions (perf ≥ 0.85, LCP, TBT, a11y = 1 on two routes) |
  | Storybook deploy         | 15/15 failed              | pinned action SHA does not exist (D3-2)                                      |
  | Data Integrity (nightly) | 5/5 failed                | D8-3                                                                         |
  | Ferry Cost Daily         | 5/5 failed                | `FERRY_SPEND_CAP_EUR` not set                                                |

  A gate that is always red is a gate nobody reads. The previous revision's "recent runs green" was
  true of the required set only.

- **D3-2 (P1)** — `storybook-deploy.yml:65` pins `actions/deploy-pages@d6db9016…`, and GitHub answers
  **422 "No commit found for SHA"**. `check:action-pins` validates the pin's _shape_, not its
  existence — the gate passes on a pin that can never resolve.
- **D3-3 (P2)** — `recette` protection is `strict: false` with no PR requirement, while `main` is
  `strict: true` and requires a PR.

### Domain 4 — Correctness & tests

- **D4-2 (P1)** — **the dead-code ratchet is structurally blind to anything a test or story still
  imports.** `knip.json` declares `**/*.{test,stories}.{ts,tsx}` and `**/__tests__/**` as entry
  points, so a component kept alive only by its own test counts as used. Re-run without them, knip
  reports **27 unreachable files and 7 unreachable runtime dependencies** while the gate reads
  `files 0 / dependencies 0`. Full list under _Dead code & redundancy_.
- **D4-3 (P2)** — 55 `@typescript-eslint/no-unused-vars` warnings (about half in tests), one unused
  `eslint-disable` (`src/hooks/use-globe-camera.ts:214`). `no-unused-vars` is a warning, so they
  accumulate without failing anything; knip does not see unused _locals_.
- **E2E failures** are counted canonically in D3-1 and referenced here.

### Domain 5 — Deploy coherence

- **D5-1 (P2)** — `s-maxage=86400, immutable` on the mutable list endpoint
  `src/app/api/v2/migrations/route.ts:94` (and `[id]:62`); production has no CDN in front of the
  container, so `s-maxage` may be inert everywhere — worth verifying before tuning it.
- Hardcoded-value penalty applied — see _Hardcoded values (P0/P1)_.

### Domain 6 — Ferry pipeline

- **D6-1 (P2)** — Ferry Cost Daily red on a missing repository variable (counted in D3-1);
  `openai/codex-action@a26d2d4` is annotated `# v1` rather than a full version.

### Domain 7 — Architecture & boundaries

- **D7-1 (P1)** — **the ISO alpha-3 → alpha-2 table exists twice and has drifted.**
  `src/lib/countryFlag.ts` maps `ESH`, `MYT`, `REU`; `src/lib/countryNames.ts:5-62` does not. Western
  Sahara, Mayotte and Réunion get a flag but fall back to the corpus name instead of a localized one.
- **D7-2 (P1)** — **the three facet hub pages are copies that have diverged on error handling.**
  `atlas/langues/page.tsx:161` and `atlas/noms/page.tsx:157` wrap their read in `try`/`catch` and
  render an "unavailable" state; `atlas/peuples/page.tsx:161` does a bare `Promise.all`, so a
  database failure there escapes to the error boundary. `noms` also still computes an unused
  `peopleLabels` map on every request (`:195`).
- **D7-3 (P1)** — AFRIK loader Supabase writers copied across five files (`nameRecordJsonLoader`,
  `relationJsonLoader`, `migrationJsonLoader`, `personJsonLoader`, `patronymeJsonLoader`) while
  `provenanceWriter.ts:43-117` already holds its own `findOrCreate*` pair.
- **D7-4 (P1)** — **two generations of the social render engine coexist**, and the documentation
  still points at the retired one. See _Dead code & redundancy_, §social.

### Domain 8 — AFRIK data integrity & Source Tier

- **D8-1 (P1)** — `needs_review` unstorable in `sources.tier`; `recompute_confidence()` has no `ELSE`.
- **D8-2 (P1)** — 3 291 "domain ruling" + 1 057 "awaits editorial review" in reader-facing `notes`.
- **D8-3 (P1)** — nightly validator red on an unreachable URL; nightly quiz-bank check crashes on
  `server-only` and has not run.
- **D8-4 (P1)** — `editorial-rules` not a required check.
- **D8-5 (P2)** — `check:translation-parity` run bare is a survey (1 669 findings, exit 0); it blocks
  only with `--base`/`--staged`, which CI uses. New gaps are blocked; the backlog is not.
- **D8-6 (P2)** — `checkSourceTierCoverage.ts:23` ceiling is 1 010 against 1 002 measured, and fails
  only upward — 8 units of slack, unlike the other two-way ratchets.

### Domain 9 — Performance & accessibility

- **D9-1 (P1)** — Lighthouse budgets are **declared, not enforced**: `lighthouse.yml` runs on PRs to
  `main`, nightly and on dispatch, is not a required check, and is red 13 of 15. The v4.8.0 run
  failed 45 assertions, including `accessibility = 1` on two routes. The `a11y.yml` axe-core gate, by
  contrast, is required and green.

### Domain 10 — Docs & runbooks

- **D10-1 (P1, unchanged)** — the only restore drill is `restore-drill-2025-07-14.md`, ~14 months
  old; `restore-procedure.md:187` sets a quarterly cadence and `:194` says "Nothing since".
- **D10-4 (P1, new)** — **`CLAUDE.md` contradicts itself.** `:120-121` says `GABARITS-SOCIAL.md` is
  "versioned here … it used to be a derived copy"; `:274-284` ("The social gabarit spec is a derived
  copy") still says "generated, never edited here … Fix the source, re-sync." An agent following the
  second will refuse to edit the file the first says is canonical.
- **D10-6 (P1, new)** — `docs/runbooks/migration-state.md` says "Last verified: 2026-08-31", its
  banner counts "81 migration files", lists 084-085 as pending and omits 086-087 — two releases
  after they shipped.
- **D10-2 (P2, unchanged)** — stale counts in `CLAUDE.md`: "081 at last count" (87), "~890 .json
  fiches" (1 721), "96 entries still violate" (95). And its claim that "most of `README.md`" is
  stale on V1 is itself stale: `README.md:85-86` is correct.
- **D10-3 (P2, unchanged)** — `.claude/skills/ethniafrica-audit/SKILL.md` still describes
  Vercel-from-git, the retired Tier 1/2/3 policy, "English by default" and Next.js 15. This revision
  scored against `CLAUDE.md` instead.
- **D10-5 (P2)** — `CLAUDE.md` says `npm run lint` is `eslint .`; the script is `eslint src scripts`.
- **D10-7 (P2)** — `social/harness/README.md:7-10` and `GABARITS-SOCIAL.md:4` name `ethni_render.py`,
  `ethni_card.py` and `ethni_carousel.py` as the engine; the production skill renders with
  `ethni_carrousel2.py` and `ethni_montage.py`.

### Hardcoded values (P0/P1)

**Confidence & Scoring Thresholds (AFRIK)**

- **P0** `src/lib/quiz/eligibility.ts:103`, `src/app/[lang]/atlas/noms/[slug]/page.tsx:77`,
  `src/components/patronymes/PatronymeFicheTitle.tsx:56` — tier subsets that decide eligibility and
  indexing are written inline instead of derived from `SOURCE_TIERS` (`src/types/sources.ts:47`);
  `src/api/v2/schemas/languages.ts:13` re-types the tier enum. `AI_PROVENANCE_WEIGHT = 0.5`
  (`sources.ts:71`) duplicates the SQL weight in `recompute_confidence()`.

**Timeouts / Durations**

- **P0** `src/lib/supabase/requestDeadline.ts:52` — `SUPABASE_BATCH_REQUEST_TIMEOUT_MS = 120_000`,
  no env override (the 10 s request deadline at `:19` has one).

**Hardcoded URLs**

- **P0** `src/middleware.ts:152` — `connect-src` hosts inline (`*.supabase.co`,
  `*.ingest.de.sentry.io`, `*.upstash.io`); the production Supabase is self-hosted, so the list
  differs per deployment. The Sentry EU host is repeated at `src/lib/sentry/pii-scrubber.ts:15`.
- **P1** `src/middleware.ts:54` — `SUPABASE_ORIGIN_FALLBACK`, used only when the env URL is invalid.

**Cache TTLs**

- **P1** `export const revalidate = 3600` repeated in 8 route files and `{ revalidate: 3600 }` in 4
  services (`continentPeopleCounts:21`, `countryFacet:77`, `languageFamilyAtlas:44`,
  `languagesFacet:127`); `revalidate 60` four times; a per-file `CACHE_CONTROL = "s-maxage=3600"` in
  13 route files.

**Pagination & Batch Sizes**

- **P1** default page size `20` inline in 9 handlers/services and `.max(100).default(20)` in 9 zod
  schemas; `MAX_LIMIT = 100` twice.
- **P1** page size `500` as a named constant in 9 query modules plus `CHOICES_PAGE_SIZE = 1000`
  (`sourcesFacet.ts:100`) — if the self-hosted PostgREST `max-rows` is lower, a short page reads as
  the last one and results truncate silently.

**Size & Truncation / Rate-limit**

- **P1** `src/lib/antibot/proofOfWork.ts:24` — challenge TTL 5 min with no env override (difficulty
  has one). Rate-limit windows (`rate-limit.ts:40-43`) are all env-overridable: no finding.

_3 P0 and 6 P1 → −1 on Domains 5 and 7. About 40 P2 internal constants, nearly all named._

### Dead code & redundancy

The CI gate is green and agrees with local (files 0, dependencies 0, exports 22/22, types 49/49).
Everything below is what it cannot see. Each item was confirmed by grepping for importers; four were
re-verified by hand for this report (`GamePlayHost`, `RevisionDrawer`, `DemographicsChart`,
`clientCache`).

**Unreachable at runtime — kept alive only by a test or a story**

- **P1** `package.json` — runtime dependencies nothing in production reaches: `recharts` (only via
  the story-only `DemographicsChart.tsx`), `vaul`, `@radix-ui/react-accordion`, `-progress`,
  `-separator` (only their own `ui/*.tsx`, only stories), `-checkbox` (only a test), `react-is`
  (imported nowhere). Not bundled, but installed in the production image.
- **P1** `src/components/play/GamePlayHost.tsx` — test-only; `MercatorSurface.tsx:7` now imports
  `GamePlayIsland` directly.
- **P1** `src/components/source-transparency/RevisionDrawer.tsx` (~355 lines) and
  `HistoriqueSection.tsx` — test-only. `RevisionDrawer` also duplicates ~75 lines of
  `SourceChainSheet.tsx`; deleting it removes both findings.
- **P1** `src/components/admin/RevisionPublishDialog.tsx`, `play/MercatorProjectionStage.tsx`,
  `fiche/CountrySynthesisBrief.tsx`, `oral-narratives/OralNarrativeForms.tsx`,
  `patronymes/PeopleBorneNamesSection.tsx` — test-only.
- **P1** `colonization/GazeEventNarrativeSection.tsx`, `BorderCrossingTable.tsx`,
  `ImposedNameList.tsx` (+ `imposedNames.ts`), `system/CitationBlock.tsx`
  (+ `citation-formatters.ts`), `HierarchyTree.tsx`, `HierarchyTextIndex.tsx`,
  `compare/CompareShareBar.tsx` — test/story-only, several translated in the 2026-09-05→07 i18n
  sweeps while unused.
- **P1** `src/components/charts/DemographicsChart.tsx` — story-only; the sole reason `recharts` is a
  dependency.
- **P1** `src/components/country/HistoricalFactsSection.tsx` (re-exported by `country/index.ts`) and
  the `PeopleCultureGrid` component (production uses only `splitSourcedProse` from that file).
- **P2** `src/components/ui/{accordion,drawer,progress,separator,table,skeleton,alert,checkbox,pagination,LoadingState}.tsx`
  — shadcn primitives reached only by stories or `charterPrimitives.test.tsx`.

**Dead code inside live modules**

- **P1** `src/lib/cache/clientCache.ts:40,101,148` — `getCachedData`, `setCachedData`, `clearCache`
  have no callers; the whole localStorage cache is dead since the V1 removal. Its only import,
  `CACHE_KEYS` in `afrikLoader.ts:25`, is itself unused.
- **P1** `src/lib/cache/dataVersion.ts:28,43,53` — `getDataVersion`, `incrementAllVersions`,
  `getAllVersions` have no callers. `POST /api/admin/revalidate` still calls `incrementDataVersion`,
  bumping a counter nothing reads.
- **P1** `src/lib/afrikLoader.ts:10-37` — 11 unused imports; `getLanguageFamilies` (`:95`) is
  imported only by its test.
- **P1** `src/api/v2/services/gamesService.ts:54,74` — private helpers `section()` and `asNumber()`
  never called.
- **P1** route files with unused imports: `atlas/familles/[slug]/page.tsx:38`
  (`getLanguageFamilyById`), `atlas/peuples/[slug]/page.tsx:40` (`getPeopleById`),
  `api/docs/route.ts:1` (`NextResponse`).
- **P1** `src/lib/afrik/loaders/{countryJsonLoader:61,familyJsonLoader:70,peopleJsonLoader:103}` —
  three `clear*Cache` exports never called.
- **P1** unused exports in `src/lib`: `ficheSourceLabel.ts:33` `ficheSourceLine`,
  `normalize.ts:17` `getNormalizedFirstLetter`, `validations/contribution.ts:9`
  `contributionTypeSchema`, `atlas/footprintStyle.ts:36,38` `FOOTPRINT_STROKE_WIDTH*`;
  test-only: `hooks/use-consent.tsx` `useOptionalConsent`, `atlas/projectionMorph.ts` `MORPH_VIEWBOX`.
- **P2** `src/types/afrik.ts` (14 types) and `src/types/afrik-frontend.ts` (11 types) — V1-era CSV
  and search shapes; `src/api/v2/schemas/*` — 17 inferred types never imported; 8 unused shadcn
  re-exports.
- **P2** `src/app/docs/api/v2/page.tsx:86` — a "Voir l'API v1" button to `/docs/api/v1`, which only
  redirects back. The one surviving V1 reference in the UI. No V1 _imports_ survive.

**Unreferenced scripts** (invisible to knip, which treats all of `scripts/**` as entries)

- **P2** `scripts/testLoader.ts`, `scripts/checkCountrySynthesis.ts`,
  `scripts/anecdotes/sourceIllustrations.ts`, `scripts/audit/runAudit.ts` (sole entry to
  `auditRunner`/`gapAnalyzer`/`reportGenerator`), and `extractClanNames.ts`,
  `extractNameRecordsFromFiches.ts`, `alignExternalIdentifiers.ts` — named by no npm script, workflow,
  doc or skill.
- **P2** `scripts/setup-hooks.sh` — unreferenced, and running it would overwrite husky's `commit-msg`
  and add a `pre-push` hook `.husky/` does not have.
- **P2** `scripts/ci/checkRlsCoverage.ts` — a CI-shaped gate wired to nothing. Confirm whether it was
  meant to block.

**Duplication** — jscpd (≥ 50 tokens, ≥ 5 lines): `src/` **4.49 %** (13 649 lines, 1 016 clones;
269 outside tests and stories); `scripts/` + `social/tools` + `eslint/` **3.45 %** (74 clones
outside tests).

- **P1** D7-1 — ISO code table duplicated and drifted (`countryNames.ts` ↔ `countryFlag.ts`).
- **P1** D7-2 — facet hub pages copied across `langues`/`peuples`/`noms`, diverged on error handling.
- **P1** D7-3 — AFRIK loader Supabase writers (`upsertSource` ~35 lines, `findOrCreateFicheRevision`
  ~30, `findOrCreateAssertion` ~45) copied across five loaders.
- **P1** `scripts/lib/clanNameSourceTier.ts` ↔ `personCandidateSourceTier.ts` (identical but for
  renames, ~90 lines), `clanNameDetection.ts` ↔ `personCandidateDetection.ts`,
  `extractClanNames.ts` ↔ `extractPersonCandidates.ts`, `clanNameTypes.ts` ↔ `personCandidateTypes.ts`.
- **P2** v2 `[id]` route validation block (~24 lines) in 5 routes; year-range formatting in 3
  components; 5 `dossiers/nommer/*/page.tsx` differing only in slug; three `*-bundle-size.ts`
  scripts; `handlers/countries.ts` ↔ `handlers/peoples.ts` list envelope.
- **P2** 11 hand-rolled NFD accent-strip snippets in `src/` beside the shared `src/lib/normalize.ts`.

**§social — the Python render engine** (`social/harness/`, no dead-code tool covers it; traced by
import graph)

- **P1** D7-4 — two engines coexist. The live path is `ethni_carrousel2.py` → `ethni_compose.py` and
  `ethni_audio.py` → `ethni_montage.py`; none of them imports `ethni_render.py`, `ethni_card.py`,
  `ethni_carousel.py`, `ethni_compose_v1.py`, `ethni_type.py`, `ethni_plaque.py` or `gold_burn.py`
  (~1 950 lines), which only import each other.
  - `ethni_render.py` + `ethni_compose_v1.py` are kept **on purpose** for montages of the retired
    gabarit (production skill, "`ethni_render.py` survit pour les montages de l'ancien gabarit").
  - `ethni_carousel.py` (+ `ethni_card.py`) is kept "until the video engine moves too"
    (`ethni_carrousel2.py:6`). **The video engine has moved** — the stated removal condition is met.
- **P2** `social/harness/hf-workflows/subtitles/scripts/fonts/` holds byte-identical copies
  (same SHA-1) of `Anton-Regular.ttf`, `Montserrat-ExtraBold.ttf` and `TikTokSans-Bold.ttf` from
  `social/harness/fonts/` (~750 KB), used only by the legacy `gold_burn.py` path.
- **P2** the anti-literal gate `test_ethni_tokens.py:193-195` scans only `ethni_carousel.py` and
  `ethni_render.py` — the two retired files. The live modules are clean today (no colour literal in
  `ethni_compose`, `ethni_montage`, `ethni_carrousel2`, `ethni_soustitre`) but unguarded.

**Knip configuration blind spots**

1. Tests and stories as entries hide all "test/story-only" findings above. A second CI tally with
   `knip --production` and its own ratchet would expose them without losing the current one.
2. `scripts/**`, `social/tools/**/*.mjs` and `e2e/**` as entries hide unreferenced scripts; `.sh`
   and `.py` are not analysed at all.
3. `ignoreExportsUsedInFile: true` hides exports used only in their own file (minor).
4. Unused locals are ESLint's job, and `no-unused-vars` is a warning.

_Penalty: >15 P1 → −2 on Domains 4 and 7. Overlap with hardcoded values: none counted twice._

---

## 7. Consumer / new-contributor flow

| Step                                      | Verdict                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `git clone` + `npm ci --legacy-peer-deps` | ✅ legacy peer deps intentional (Storybook vs Next)      |
| `.env.example` → `.env.local`             | ✅ `check:env-example` verifies both directions          |
| `supabase/migrations/` apply in order     | ✅ 87 files, sequential, no duplicate prefix             |
| `npm run build`                           | ✅ passes (Sentry `disableLogger` deprecation warning)   |
| `npm run test` / `make check`             | ✅ 9 133 pass; lint 0 errors; format and typecheck clean |
| Tree clean after `build`                  | ⚠️ `next-env.d.ts` rewritten — D2-1                      |
| First admin seeded                        | ✅ `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts`          |

---

## 8. Security posture

**RLS coverage — 45 live tables, 45 enabled, 69 live policies.** Net of the seven V1 tables dropped
in `007`, `contributions` dropped in `081`, and superseded policies. No `RLS = No` row: **no P0**.

| Table                     | RLS (migration) | Policies | Notes                        |
| ------------------------- | --------------- | -------: | ---------------------------- |
| admin_allowlist           | Yes (074)       |        0 | deny-all, intent commented   |
| afrik_countries           | Yes (019)       |        1 |                              |
| afrik_dossiers            | Yes (082)       |        1 |                              |
| afrik_language_families   | Yes (019)       |        1 |                              |
| afrik_languages           | Yes (019)       |        1 |                              |
| afrik_media               | Yes (073)       |        1 |                              |
| afrik_patronyme_alliances | Yes (061)       |        1 |                              |
| afrik_patronyme_countries | Yes (053)       |        1 |                              |
| afrik_patronyme_peoples   | Yes (053)       |        1 |                              |
| afrik_patronyme_persons   | Yes (064)       |        1 |                              |
| afrik_patronymes          | Yes (053)       |        1 |                              |
| afrik_people_countries    | Yes (019)       |        1 |                              |
| afrik_people_languages    | Yes (054)       |        1 |                              |
| afrik_people_relations    | Yes (030)       |        1 | policy in a `DO` block       |
| afrik_peoples             | Yes (019)       |        1 |                              |
| afrik_translations        | Yes (085)       |        1 |                              |
| antibot_challenges        | Yes (048)       |        0 | deny-all, commented `048:94` |
| api_keys                  | Yes (012)       |        1 |                              |
| assertion_references      | Yes (040)       |        1 |                              |
| assertions                | Yes (015)       |        1 |                              |
| audit_log                 | Yes (009)       |        2 | explicit insert deny         |
| confidence_scores         | Yes (015)       |        1 |                              |
| contributor_profiles      | Yes (026)       |        3 |                              |
| editorial_doctrine        | Yes (017)       |        4 | three explicit `false`       |
| fiche_revisions           | Yes (020)       |        1 |                              |
| flag_reporter_contacts    | Yes (075)       |        0 | deny-all, intent commented   |
| flags                     | Yes (022)       |        3 |                              |
| migration_event_peoples   | Yes (035)       |        4 |                              |
| migration_events          | Yes (035)       |        4 |                              |
| name_records              | Yes (029)       |        4 |                              |
| oral_narrative_links      | Yes (032)       |        1 | `DO` block                   |
| oral_narratives           | Yes (032)       |        1 | `DO` block                   |
| person_countries          | Yes (057)       |        1 |                              |
| person_peoples            | Yes (057)       |        1 |                              |
| persons                   | Yes (057)       |        1 |                              |
| protected_record_audit    | Yes (033)       |        1 |                              |
| protected_records         | Yes (033)       |        1 |                              |
| quiz_generation_runs      | Yes (036)       |        1 |                              |
| quiz_questions            | Yes (036)       |        1 |                              |
| revision_drafts           | Yes (023)       |        4 |                              |
| revisions                 | Yes (021)       |        2 |                              |
| search_query_log          | Yes (050)       |        0 | deny-all, commented `050:9`  |
| source_working_assets     | Yes (034)       |        5 |                              |
| sources                   | Yes (015)       |        1 |                              |
| user_roles                | Yes (008)       |        4 |                              |

**Definer functions:** all nine live `SECURITY DEFINER` functions set `search_path`; privileged ones
revoke `EXECUTE` from `PUBLIC`/`anon`; `erase_contributor_account` is `service_role` only
(`027:90-95`); `publish_revision` checks `auth.uid()` and role in its body (`051:71-84`). The three
`private.is_*` helpers are granted to `anon` so policies can evaluate (`077:120-122`); `private` is
not an exposed schema per `077:7-8` — confirm `PGRST_DB_SCHEMAS` on the VPS.

**Edge and application:** see §2.4 and D1-2 … D1-8. **Secrets:** only `.env.example` and
`e2e/.env.example` tracked; the one pattern hit is a false positive (an encrypted route id in a
parliament URL, `PAT_BABIRYE.json:64`). **Supply chain:** Dependabot weekly on both ecosystems; `npm
audit` 0 critical / 2 high / 10 moderate. **Console discipline:** 25 `console.*` calls outside tests,
4 inside the logger itself, none in a `no-console`-error directory.

---

## 9. Performance & accessibility posture

- **axe-core (`a11y.yml`)** — runs on PRs to `recette` and `main`, required as
  `axe-core (Storybook)`, no `continue-on-error`, green. A real gate.
- **Lighthouse (`.lighthouserc.js`, `lighthouse.yml`)** — 30 URLs, 3 runs each, mobile 360×640,
  simulated 4G; budgets perf ≥ 0.85, a11y = 1, best-practices ≥ 0.95, LCP ≤ 5 500 ms, TBT ≤ 300 ms.
  **Not required, red 13/15;** v4.8.0 failed 45 assertions. The migrations-route CLS/FID budgets are
  inert because that route 404s.
- **E2E (`e2e.yml`)** — does run `npx playwright test` and fails loudly without its secrets. Runs on
  PRs to `main`, nightly and on dispatch; **not required, red 15/15**; v4.8.0: fr 57 failed.

---

## 10. AFRIK data integrity & Source Tier compliance

| Check                                            | Verdict                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1. Strict model adherence (17 models, 1 721)     | ✅ 50/50 validator checks                                                              |
| 2. Validator run                                 | ✅ 0 errors, 5 597 warnings (+65)                                                      |
| — FR28 hard gate [95,105]                        | ✅ **0** offenders (blocking)                                                          |
| — FR28-strict [99,101]                           | ✅ **0** offenders (blocking); only `FR52-coverage` soft (23)                          |
| 3. FLG / PPL / ISO referential integrity         | ✅ all reference checks pass                                                           |
| 4. Source Tier — every source carries a tier     | ✅ 0 untiered, 0 empty `sources`                                                       |
| 4. Source Tier — vocabulary agrees across layers | ❌ **D8-1** — 1 002 `needs_review` unstorable in the DB                                |
| 5. Database vs source JSON                       | N/A — needs credentials; not covered by `validateAfrikData.ts`                         |
| 6. CI enforcement                                | ❌ **D8-3** nightly 5/5 red, quiz-bank check crashing; **D8-4** editorial not required |
| 7. Known issues carry-over                       | ❌ **D8-2** — 4 348 workshop phrases in reader-facing `notes` (was 1 010 counted)      |
| Editorial rules                                  | ✅ 0 errors, 97 warnings; chronology ratchet at ceiling (95/95)                        |
| Translation parity                               | ✅ blocking on diffs in CI; survey backlog 1 669 (D8-5)                                |

Warning motifs: `cites "unknown"` 3 891 (was 3 835), `carries no URL` 1 683 (was 1 674). Tier
distribution: `unverified` 3 320 · `referenced` 1 900 · `official` 1 630 · `needs_review` 1 002.

---

## 11. Prioritized action list

No finding below has a Jira ticket yet; IDs refer to this report.

| #   | Pri | Action                                                                                                                                                                                           |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | P1  | **D1-2** — decide whether `/api/v2` is keyless-public; if not, stop authorizing on `Origin`/`Referer`. Document the answer in the OpenAPI either way.                                            |
| 2   | P1  | **D1-3** — `overrides` pin `js-yaml >= 4.3.2`; re-run `npm audit`.                                                                                                                               |
| 3   | P1  | **D3-2 + D3-1** — repair the Storybook deploy pin; make `check:action-pins` resolve each SHA, not just match its shape. Fix or quarantine E2E; set `FERRY_SPEND_CAP_EUR`.                        |
| 4   | P1  | **D8-3** — make `generateQuizQuestions.ts --check` load without `server-only`; fix or re-tier the unreachable source URL so the nightly run goes green.                                          |
| 5   | P1  | **D8-4** — add `editorial-rules` to the required checks on `recette` and `main`.                                                                                                                 |
| 6   | P1  | **D4-2** — add a `knip --production` tally to `check:dead` with its own ratchet; delete the 27 unreachable files and drop the 7 runtime dependencies it finds.                                   |
| 7   | P1  | **D8-2** — extend the reader-register patterns to "domain ruling" / "awaits editorial review", watch the gate fail, then rewrite the 4 348 occurrences.                                          |
| 8   | P1  | **D8-1** — one migration: admit `needs_review` in `sources.tier` and give `recompute_confidence()` an `ELSE`.                                                                                    |
| 9   | P1  | **D7-1 + D7-2** — one ISO code table; one facet-hub read wrapper (restores the missing error state on `peuples`).                                                                                |
| 10  | P1  | **D9-1** — decide whether Lighthouse budgets gate anything; either make the workflow required on a scoped route set or record the budgets as advisory.                                           |
| 11  | P1  | **D10-4 + D10-6** — resolve the `CLAUDE.md` gabarit-spec contradiction; bring `migration-state.md` up to 087.                                                                                    |
| 12  | P1  | **D7-4** — retire `ethni_carousel.py` + `ethni_card.py` now that their removal condition is met; point `README.md` and `GABARITS-SOCIAL.md` at the live engine; aim the anti-literal gate at it. |
| 13  | P1  | **D10-1** — run and record a restore drill against recette.                                                                                                                                      |
| 14  | P1  | **D7-3** — one assertion writer for the five AFRIK loaders.                                                                                                                                      |
| 15  | P2  | Batch: D1-4 open redirect, D1-6 hash the rate-limit identifier, D1-7 Sentry scrubbing, D2-1 untrack or stabilise `next-env.d.ts`, D10-2/3/5 doc drift, promote `no-unused-vars` to error.        |

---

## 12. Conclusion

**6.5 / 10, down from 7.9 — and the honest reading is that the number moved more than the code
did.** This revision measured what the last one read from configuration: the CI runs, the Lighthouse
and E2E outcomes, branch protection, and what the dead-code ratchet actually counts. Each of those
measurements was less flattering than its configuration.

The core is sound. The required gates are honest, every live table is under RLS, two releases
shipped cleanly in a day, and 9 133 tests pass. What pulls the score down is a pattern rather than a
defect: **gates that exist, run, and do not block** — E2E, Lighthouse, editorial rules, a nightly
quiz check that crashes before checking, an action pin that cannot resolve, a dead-code ratchet
blind to anything a test still imports. The fix is not more gates. It is deciding, gate by gate,
whether each one guards something — and then either making it required or removing it.
