---
name: ethniafrica-audit
description: Production-readiness audit for EthniAfrica (this repo). Read-only multi-domain scored assessment that answers five questions — is the project ready for production, is the AFRIK editorial surface sound (data integrity + Source Tier policy), can a new contributor go clone-to-running in one session, what is the security posture (Supabase RLS, CSP, auth, API keys, PII), and is the score close to 8–9/10. Use when the user asks "is it ready", "audit EthniAfrica", "production-readiness check", or invokes /ethniafrica-audit.
metadata:
  author: Big Emotion
  version: "2.0.0"
---

# EthniAfrica Audit

Read-only audit of the project defined in this repo. Produces a scored, evidence-based report and refreshes `docs/PRODUCTION-READINESS-AUDIT.md`.

Inspired by Google SRE's Production Readiness Review — the six PRR engagement axes (architecture & dependencies, instrumentation, emergency response, capacity planning, change management, performance metrics) are folded into the 10-domain rubric below, adapted to the Next.js 15 + Supabase + AFRIK stack.

This skill **never** modifies source, never bumps versions, never tags, never pushes, never deploys, never runs migrations, never writes to external services. It only reads, runs the repo's own gates, and writes the audit doc. Fixing anything it finds is deferred to normal ticketed work or `/ethniafrica-release`.

**Local footprint of a full run** (a clean tree in git terms stays the explicit contract, but these appear on disk):

- `docs/PRODUCTION-READINESS-AUDIT.md` — the only tracked file this skill writes.
- `.next/` — refreshed by `npm run build`.
- `coverage/` — refreshed by `npm run test:coverage`.
- `node_modules/.cache/eslint/` — the lint cache.
- `playwright-report/` and `test-results/` if an e2e gate is run.
- `npx --yes` one-shot tool downloads (knip, ts-prune, jscpd) land in the npx cache, never in `package.json`.

All of the above are gitignored. If any of them shows up in `git status --porcelain`, that itself is a finding (Domain 2).

## When to Activate

- User asks: "is the project production-ready", "is it ready to ship", "audit ethniafrica", "score the project".
- User asks specifically about RLS coverage, AFRIK data integrity, Source Tier compliance, Lighthouse status, security posture, or the overall score.
- User invokes `/ethniafrica-audit`.

## Preconditions

Run from the repo root (`package.json` with `"name": "ethniafrica"`). If not, stop and tell the user to `cd` into the repo.

## Inputs

Optional arguments:

- `--quick` — skip the long/costly gates (full test suite, coverage, production build, e2e). Rely instead on the most recent CI run (`gh run list --workflow ci.yml`) and the newest local artifacts, and mark any domain scored from stale data as such.
- `--no-build` — skip `npm run build` only (useful when iterating; the rest of the full audit still runs).

Default: full audit.

## Workflow

### Step 1 — Snapshot the repo state

Run in parallel via Bash:

- `git status --porcelain` — a dirty tree is auditable but must be reported.
- `git log --oneline -20` — recent cadence.
- `git branch --show-current` — confirm the `recette` (work) vs `main` (release) posture.
- `git tag --sort=-creatordate | head -5` — no tags yet is expected pre-launch; say so explicitly.
- `jq '{name, version, private, packageManager, scripts}' package.json` — version, scripts, package manager.
- `ls .github/workflows/` — workflow surface.
- `ls supabase/migrations/ | sort` — migration order and count; flag any duplicated numeric prefix.
- `ls docs/ docs/runbooks/ docs/adr/` — operational doc surface.

Cheap structural checks specific to this repo:

- `jq empty docs/confluence-spec/config.json` — the spec config must parse, and its `jiraProjectKey` must be `ETNI`.
- `npx --yes js-yaml ferry.config.yaml >/dev/null` (or any YAML parse) — `ferry.config.yaml` must parse and expose `git.base_branch` / `git.target_branch`.
- `ls public/modele-*.json` — the AFRIK strict models must be present; they are the schema every fiche is validated against.
- `git ls-files 'dataset/source/afrik/**/*.json' | wc -l` — fiche count, cross-checked against what the DB migration scripts expect.

### Step 2 — Read the existing audit

Read `docs/PRODUCTION-READINESS-AUDIT.md` (it exists). This skill **updates** that file in place, preserving its scoring rubric and section ordering. Canonical structure:

1. Scope and method
2. The five canonical questions — answered explicitly
3. Overall score (X.X / 10) — one-line verdict
4. Score per domain (table, 10 rows)
5. Strengths
6. Gaps and risks (per domain, with `file:line` evidence), including the **Hardcoded values (P0/P1)** and **Dead code & redundancy** subsections from Steps 3.5 and 3.7
7. Consumer / new-contributor flow — clone → env → migrate → seed → dev → API → admin
8. Security posture — dedicated section (Supabase RLS, CSP, auth, API keys, PII, secrets handling)
9. Performance & accessibility posture — Lighthouse mobile thresholds, axe-core
10. AFRIK data integrity & Source Tier compliance
11. Prioritized action list (15 max, each tied to a Jira ID (`ETNI-*`), an FR number, or an issue)
12. Conclusion

Bump the `Date:` field to today.

### Step 3 — Gather evidence

**Long gates** (skip with `--quick`; `npm run build` also skipped with `--no-build`):

```bash
npm run lint            # eslint over src + scripts, content-cached
npm run typecheck       # tsc --noEmit (strict: false, but noEmit must pass)
npm run format:check    # prettier
npm test                # vitest run
npm run test:coverage   # thresholds from vitest.config.ts
npm run build           # next build — the same build Vercel runs on deploy
```

Known footguns: run `npm ci --legacy-peer-deps` first if `node_modules` is stale after a merged PR — a stale tree is a documented local false-negative here (the legacy peer deps are intentional: Storybook `@storybook/react-vite` vs the Next version). Coverage thresholds come from `vitest.config.ts` — read them, do not assume. A handful of pre-existing failures in `scripts/__tests__/migrateAfrikToDatabase.test.ts` (Supabase mock) are known; report them but do not re-litigate them as new findings.

**Always** (cheap, read-only):

- `gh run list --limit 10 --json workflowName,status,conclusion,headBranch,createdAt` — recent CI health on `recette` and `main` (best-effort; note if `gh` unauthenticated).
- `git ls-files | grep -iE '\.env'` — must return only `.env.example` / `env.dist` style files.
- `git grep -nE '(sk_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|sbp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{30,})' -- ':!*.lock' ':!node_modules'` — must return nothing on tracked files.
- `git grep -nE "uses:\s+[^/\s]+/[^@\s]+@(main|master|v[0-9]+|latest)" .github/workflows/` — third-party Actions must be pinned by SHA (project CLAUDE.md hard rule); every hit is a finding.
- `git grep -nE "TODO|FIXME|XXX|HACK" -- src scripts | wc -l` — code-debt heuristic.
- `git grep -nE "console\.(log|warn|error)" -- src | grep -v "__tests__\|\.test\." | wc -l` — stray console calls; handlers must use `@/lib/api/logger`.
- `npm audit --json --audit-level=moderate` — dependency CVEs, counted by severity.
- Identifier coherence: `ETNI` must be identical in `CLAUDE.md`, `docs/confluence-spec/config.json`, and the ferry workflow inputs; the Confluence `spaceKey` (`ETHNIAFRIC`) and `engineeringRootPageId` must match between `config.json` and any doc that names them.

**Security surface** (read each file, quote `file:line`):

- `src/middleware.ts` — security headers (HSTS, X-Content-Type-Options, Referrer-Policy, CSP). Confirm the CSP nonce is generated **per request**, not a static string.
- `src/lib/api/cors.ts` — allowed origins, methods, credentials posture.
- `src/lib/api/auth.ts` — API key auth uses PBKDF2-SHA256 with iterations ≥ 100 000 and salt ≥ 16 bytes; raw keys are never stored.
- `src/lib/api/rate-limit.ts` — rate limiting wired into the request path, per-key tier backed by the `api_keys` tier migration. In-memory-only limiting on a multi-instance host is a P1.
- `src/lib/supabase/admin.ts` — the service-role client must never reach a browser bundle: `git grep -n 'from "@/lib/supabase/admin"' src/app | grep -vE "(api|admin)/"` must return nothing. The three-client isolation (`client.ts` / `server.ts` / `admin.ts`) is an invariant from `_bmad-output/project-context.md`.
- `sentry.{client,server,edge}.config.ts` — EU DSN (`ingest.de.sentry.io`), PII scrubber in `beforeSend`, no PII in `tags`.
- `.env.example` / `env.dist` lists every required variable (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS_REST_*`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) with no real values.

**Supabase Row Level Security** — this is the data-plane gate; a table without RLS is an open door:

- Enumerate every table: `grep -hoE "CREATE TABLE (IF NOT EXISTS )?[a-z_.]+" supabase/migrations/*.sql | sort -u`.
- For each, confirm `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY` appears in some migration.
- For each RLS-enabled table, confirm at least one `CREATE POLICY` exists, **or** the migration explicitly comments that no write policy is intentional (write denied by default on read-only reference data).
- A table with neither RLS nor a policy is a **P0**.

Report coverage as a table:

```
| Table                        | RLS enabled | Policies | Notes              |
| ---------------------------- | ----------- | -------- | ------------------ |
| afrik_countries              | ?           | ?        | public-read only?  |
| afrik_language_families      | ?           | ?        | public-read only?  |
| afrik_languages              | ?           | ?        | public-read only?  |
| afrik_peoples                | ?           | ?        | public-read only?  |
| afrik_people_countries       | ?           | ?        | join table         |
| contributions                | ?           | ?        | submit / moderate  |
| user_roles                   | ?           | ?        | admin-only writes  |
| api_keys                     | ?           | ?        | admin-only writes  |
| audit_log                    | ?           | ?        | append-only?       |
```

### Step 3.5 — Hardcoded values scan (`src/**`)

EthniAfrica's contract is that a deployment can be tuned through env vars and Supabase config without a code change. Magic numbers and literal defaults embedded in `src/**` are silent coupling that traps an operator into a redeploy.

**Scope:** `src/**/*.ts`, `src/**/*.tsx`. Exclude `*.test.ts(x)`, `__tests__/`, `src/test/`, `src/stories/`, `*.config.ts`.

**Flag:**

1. Magic numbers in runtime logic — timeouts, retries, byte/char limits, pagination caps, confidence-score cutoffs, batch sizes, polling intervals, `* 1000` / `* 60` durations, `slice(0, N)` / `substring(0, N)`, `if (x > N)`.
2. Literal default parameters — `function f(x = 30)`, `opts.timeout ?? 30000`.
3. Hardcoded URLs in non-test code — Supabase, Upstash, OpenAPI server URLs that belong in env.
4. Hardcoded role / tier strings outside the `user_roles` role enum (`reader`, `contributor`, `moderator`, `admin`, `advisor`) and the api-key tier enum — drift between code and DB.

**Skip:** `0`/`1`/`-1`/`2` as indices, exit codes, or booleans; HTTP status codes; loop counters; math identities; numbers inside log templates; AFRIK identifiers (`FLG_*`, `PPL_*`, ISO 639-3, ISO 3166-1) — stable by design.

**Categories** (use these exact buckets): Timeouts / Durations · Retry & Backoff · Size & Truncation Limits · Pagination & Batch Sizes · Cache TTLs · Rate-limit & Quota Thresholds · Confidence & Scoring Thresholds (AFRIK) · Default Parameters · Hardcoded URLs · Hardcoded Roles / Tiers.

**Severity:** **P0** affects production behavior, cost, or differs per deployment (rate-limit windows, request timeouts, Supabase URLs, confidence cutoffs that gate publication). **P1** likely tuned per deployment (cache TTLs, pagination caps). **P2** internal tuning constant unlikely to change.

**Scan:**

```bash
grep -rnE '\b[0-9]{3,}\b' src --include='*.ts' --include='*.tsx' | grep -vE '\.test\.|__tests__|src/test/|src/stories/'
grep -rnE '= [0-9]+[,)]|\?\? [0-9]+|\|\| [0-9]+' src --include='*.ts' --include='*.tsx'
grep -rnE 'setTimeout|slice\(0,|substring\(0,|\.length > [0-9]' src --include='*.ts' --include='*.tsx'
grep -rnE "https?://[a-zA-Z0-9./-]+\.(supabase\.co|upstash\.io|sentry\.io)" src
```

Read each suspect file to confirm the hit is real, capture `file:line`, bucket by category + severity.

**Output:** flat markdown list grouped by category, P0 first. Each line: `**Pn** path:line — value — one-line description`. Include verbatim under section 6 in a subsection **"Hardcoded values (P0/P1)"**. P2 goes to chat only.

**Score impact** — Domain 7 (Architecture & boundaries) and Domain 5 (Deploy coherence): 0 P0 / ≤5 P1 → no penalty; 1–3 P0 or 6–15 P1 → −1 on both; ≥4 P0 or >15 P1 → −2 on both.

### Step 3.6 — AFRIK data integrity & Source Tier compliance

EthniAfrica's editorial doctrine is non-negotiable. This is the domain-critical surface; it gets its own scan.

1. **Strict model adherence** — every `dataset/source/afrik/**/*.json` conforms to the matching `public/modele-*.json` (no skipped, renamed, or added sections). Sample 10 fiches spread across `famille_linguistique/`, `peuples/`, `pays/` and cross-check structure.
2. **Validator run** — `tsx scripts/validateAfrikData.ts`. Parse its output. Two demographic bands apply (per `docs/adr/0001-fr28-demographic-tolerance.md`):
   - **FR28 hard gate** — a fiche's per-country population shares must sum within **[95, 105]%**. Any fiche outside this band is a **P0**; the validator fails.
   - **FR28-strict soft warning** — the doctrinal target is **[99, 101]%**. A fiche inside [95,105] but outside [99,101] is a **P1**. Report the count and the worst offenders; the hard gate will be tightened to [99,101] once every fiche lands inside it, so this count is the migration's burn-down.
   - Report both counts explicitly. Conflating them hides the burn-down.
3. **FLG / PPL / ISO consistency** — every `PPL_*.json` references an existing `FLG_*` parent (folder path and content field agree); every country reference is a valid ISO 3166-1 alpha-3; every language code is a valid ISO 639-3.
4. **Source Tier compliance** (CLAUDE.md Source Tier Policy) — every `sources` entry must carry `tier: 1` or `tier: 2`:
   - **Tier 1** (authorized canon): UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA — cited directly.
   - **Tier 2** (primary source surfaced via Wikipedia): the entry must cite the **primary** source URL, and its `notes` field must record which Wikipedia language versions were cross-checked, so the chain is auditable. A Tier-2 entry with no `notes` chain is a **P1** — it is unauditable.
   - **Tier 3 is forbidden**: a `sources` entry pointing at a Wikipedia article itself, a blog, social media, a forum, AI-generated content, or a secondary aggregator is a **P0**. Detect with:
     ```bash
     grep -rlniE '"url"\s*:\s*"[^"]*(wikipedia\.org|medium\.com|blogspot|wordpress\.com|reddit\.com|x\.com|twitter\.com|facebook\.com|quora\.com)' dataset/source/afrik/
     grep -rln '"tier"' dataset/source/afrik/ | wc -l   # vs total fiche count → fiches with no tier field at all
     ```
   - A fiche with an empty `sources` block, or containing "unknown" / "internet" / "wikipedia" as the source itself, is a **P0** — the claim must be removed, not downgraded.
5. **Database vs source-JSON consistency** — for the sampled fiches, confirm the row in `afrik_peoples` / `afrik_countries` / `afrik_language_families` matches the source `.json` (demographics especially). If `scripts/validateAfrikData.ts` does not cover this, record it as a gap rather than asserting consistency.
6. **CI enforcement** — `.github/workflows/data-integrity.yml` and `editorial-rules.yml` must run these checks on PRs and must **not** be in advisory mode (`continue-on-error: true`) for `recette`/`main`. An advisory data gate is a P1 regardless of how green the local run is.
7. **Known-issues carry-over** — read `/Users/jnk/.claude/projects/-Users-jnk-Documents-Dev-ethniafrica/memory/data_quality_status.md` if present and surface unresolved items (duplicate fiches, FLG mismatches, erroneous fiches) so a known problem is not re-discovered as new.

Include the full result verbatim under section 10 of the audit doc.

### Step 3.7 — Dead code & redundancy scan

EthniAfrica is a single-developer codebase that went through a V1→V2 migration; orphan files, unused exports, and half-integrated patterns accumulate.

**Scope:** `src/**/*.{ts,tsx}` and `scripts/**/*.ts`. Exclude `node_modules/`, `.next/`, `dist/`, `*.d.ts`, `src/stories/`, generated OpenAPI types.

```bash
npx --yes knip --no-progress --reporter compact 2>&1 | tail -80
npx --yes ts-prune -p tsconfig.json 2>&1 | grep -v "(used in module)" | head -60
npx --yes jscpd src/ --min-tokens 50 --min-lines 5 --reporters consoleFull --silent 2>&1 | tail -40
npm run lint 2>&1 | grep -cE "Unused eslint-disable"
```

Run tools via `npx --yes` only — never add them as project deps for an audit.

**Flag:** orphan files not imported anywhere and not entry points (Next routes, `middleware.ts`, sentry configs, `package.json` scripts, stories); unused exports; unused npm dependencies; duplicated blocks (watch the view components and the AFRIK loaders/parsers — they are known to share shape); dead branches; and any surviving V1 import (`entityKeys`, `entityTranslations`, `datasetLoader.server`, `types/ethnicity`) — the V1 surface was deleted, so any reference is dead code.

**Skip:** type-only re-exports from a barrel `index.ts`, test helpers, `_template_*` placeholders used by AFRIK loaders.

**Severity:** **P0** orphan file under `src/app/` (a route nobody reaches), unused npm dep shipping in the production bundle, surviving V1 import. **P1** unused export in `src/lib` or `src/api`, duplicated block ≥30 lines across ≥3 files, unused devDependency. **P2** unused barrel export, duplication <30 lines.

**Output:** grouped flat list, P0 first, capped at the top 30 findings by impact. Include verbatim under section 6 as **"Dead code & redundancy"**, immediately after the hardcoded-values subsection.

**Score impact** — Domain 4 (Correctness & tests) and Domain 7 (Architecture & boundaries): same thresholds as Step 3.5. **Cross-check with Step 3.5:** when the same hotspot appears in both (e.g. an identical literal duplicated across three views), count it once — the duplication finding subsumes the hardcoded one.

### Step 4 — Score the domains

Use this rubric (1–10 each, equal weight). Severity buckets: **P0** blocks production with real users, **P1** must land before GA, **P2** nice to have.

| #   | Domain                             | SRE PRR axis                 | What to look for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | Architecture                 | Service-role client never reachable from a browser bundle (`src/lib/supabase/admin.ts` import scan clean); Supabase Auth + `user_roles` RBAC gates `/admin` and every mutating v2 route; per-request CSP nonce and the header set in `src/middleware.ts`; input validation on every external surface (v2 route param validation via `src/api/v2/utils/validation.ts`, AJV/strict schema on AFRIK ingest); API keys hashed PBKDF2-SHA256 ≥100k iterations, raw keys never stored; rate limiting real and per-tier, not dev-only in-memory; Sentry PII scrubber active with an EU DSN.                                                                             |
| 2   | Secrets hygiene                    | Architecture                 | `.gitignore` covers every `.env` variant through repo rules, not the auditor's global excludes; full-history secret scan clean; workflow credentials supplied only through the GitHub Actions `secrets` context, never inline; a repo-wide secret scanner in CI (agents push autonomously here — its absence is a standing P1); `.env.example` complete and value-free; no audit artifact leaked into `git status`.                                                                                                                                                                                                                                              |
| 3   | CI                                 | Change management            | Recent runs green on `recette`; branch-protection reality stated honestly (an advisory gate is a finding, not a footnote); every third-party action SHA-pinned per the CLAUDE.md hard rule, with Dependabot bumping them; `ci.yml` triggers cover the real merge paths (`pull_request` into `recette` and `main`); the domain-critical workflows (`data-integrity`, `editorial-rules`, `a11y`, `lighthouse`, `openapi-diff`, `e2e`) present and not silently `continue-on-error`.                                                                                                                                                                                |
| 4   | Correctness & tests                | Performance metrics          | Vitest coverage at or above the thresholds declared in `vitest.config.ts`; tests present at each layer per the CLAUDE.md placement conventions (`src/lib/**/__tests__`, `src/api/v2/**/__tests__`, `src/app/api/v2/__tests__`, `src/lib/afrik/parsers/__tests__`); tests exercise the public interface, not internals; known pre-existing failures tracked, not growing; no stray `console.*` outside `@/lib/api/logger`; **no orphan files / unused exports / surviving V1 imports (Step 3.7)**.                                                                                                                                                                |
| 5   | Deploy coherence                   | Change management + Capacity | The deploy model is Vercel-from-git — there is no GitHub deploy workflow, and the docs must say so rather than implying one; the branch model holds (`recette` integrates, `main` releases, tags mark releases and trigger nothing); `docs/DEPLOYMENT.md` matches that reality; every migration in `supabase/migrations/` is recorded as applied (or explicitly pending) in `docs/runbooks/`; no duplicated migration prefix; a rollback path exists for a mid-deploy failure; **P0/P1 hardcoded values from Step 3.5 do not trap an operator into a redeploy**.                                                                                                 |
| 6   | Ferry pipeline                     | Change management            | `ferry.config.yaml` parses and its `git.base_branch` / `git.target_branch` match the branch model; the five `ferry-*.yml` workflows are consistent with each other on the ferry action version; the Jira column names the automation triggers on (`ferry-jira-automation-setup.md`) match the live `ETNI` board; ferry action pins are SHAs and consistent with what CLAUDE.md states; any superseded automation doc carries a SUPERSEDED banner.                                                                                                                                                                                                                |
| 7   | Architecture & boundaries          | Architecture                 | The three-layer v2 API pattern holds (`src/app/api/v2/{resource}/route.ts` → `src/api/v2/handlers/` → `src/api/v2/services/`) with no route querying Supabase directly; the three Supabase clients (`client` / `server` / `admin`) stay isolated per `_bmad-output/project-context.md`; the AFRIK strict models are never extended ad-hoc; `src/lib/api/openapiV2.ts` matches the routes actually served at `/docs/api`; **no untunable magic numbers (Step 3.5)** and **no significant duplication across views/handlers (Step 3.7)**.                                                                                                                          |
| 8   | AFRIK data integrity & Source Tier | Change management            | The Step 3.6 result. All seven checks pass → 9–10; one failure or N/A → 7–8; two failures → 5–6; three or more → ≤4. Any Tier-3 citation or any fiche outside the FR28 hard gate [95,105]% caps this domain at 4 regardless of the rest — the editorial contract is the product.                                                                                                                                                                                                                                                                                                                                                                                 |
| 9   | Performance & accessibility        | Performance metrics          | Lighthouse mobile thresholds enforced in `.lighthouserc.js` (perf ≥ 0.85, a11y = 1.0, best-practices ≥ 0.95) over the canonical routes (home + a country page + a people page); `a11y.yml` axe-core not in advisory mode for `recette`/`main`; mobile-first honoured at the project breakpoints (mobile 430px, tablet md 720px, desktop xl 800px) — this repo is French-only single-locale, so no locale fan-out is expected; Core Web Vitals tracked; `e2e.yml` covers a real user path.                                                                                                                                                                        |
| 10  | Docs & runbooks                    | Emergency response           | `README` and `CLAUDE.md` match reality (no stale dual-API or multi-locale claims — the app is French-only); `_bmad-output/project-context.md` lists the AI-agent invariants; `docs/DEPLOYMENT.md` describes the actual Vercel path; `docs/runbooks/restore-procedure.md` exists and the last restore drill is < 12 months old; `docs/api-contracts.md` matches `src/lib/api/openapiV2.ts`; the declared operational source of truth is not older than the last operational change by > 7 days; every command a doc names exists in `package.json`; named owners for recurring loops (a literal `(owner)` placeholder is a finding); English-docs rule respected. |

Compute overall score = mean of the 10 domain scores, rounded to one decimal.

When two domains surface the same defect, pick **one canonical severity** for it before scoring, count it fully in the most causal domain, and reference it from the others — otherwise the same gap multi-penalizes the mean and the domains' relative order stops meaning anything.

### Step 5 — Answer the five canonical questions

Always open the report with explicit answers:

1. **Is the project ready for production?** Yes / No / Conditional, plus the 1–3 blockers. A promise the system makes to users that nothing delivers is not production-ready no matter the other scores.
2. **Is the AFRIK editorial surface sound?** The domain-critical question for this project. Walk the evidence: validator verdict, FR28 hard-gate failures vs FR28-strict warnings (with counts), Tier-3 citations found (must be zero), fiches with an empty `sources` block, FLG/PPL/ISO referential integrity, and whether `data-integrity.yml` actually gates PRs. A site that publishes uncited ethnographic claims fails this question even at 10/10 everywhere else.
3. **Can a new contributor go clone → running in one session?** Walk it end to end and turn every step that has no test, no doc, or only tribal knowledge into a P1:
   - `git clone` + `npm ci --legacy-peer-deps` (legacy peer deps are intentional — Storybook vs the Next version).
   - `.env.example` → `.env.local`: is every required key documented?
   - `supabase/migrations/` apply cleanly, in order, on a fresh Supabase project?
   - `tsx scripts/migrateAfrikToDatabase.ts` succeeds against an empty DB?
   - A first admin user can be seeded (check for a seed script; if none exists, that is the finding).
   - `npm run dev` boots with no runtime error.
   - `GET /api/v2/countries`, `/api/v2/peoples`, `/api/v2/language-families`, `/api/v2/search?q=wolof` all return 200 with non-empty data.
   - `/docs/api` renders the OpenAPI UI.
   - `/admin` requires Supabase Auth and respects the `user_roles` RBAC (`reader / contributor / moderator / admin / advisor`).
4. **What is the security posture?** One short paragraph + bullets: Supabase RLS coverage (the Step 3 table — any `RLS=No` row is a P0), per-request CSP nonce, API-key PBKDF2 hashing, rate-limit tiering reality, Sentry EU residency + PII scrubbing, service-role isolation, secrets hygiene, supply chain (SHA pinning, Dependabot, scanners), branch-protection reality.
5. **Is the score close to 8–9/10?** Quote the computed score, compare to target, list the top 3 gaps that would close the distance.

### Step 6 — Write the report

Update `docs/PRODUCTION-READINESS-AUDIT.md` in place. Bump the `Date:` field to today. English, per the repo's docs-language rule.

Then output a concise summary to the user (≤ 30 lines): the five answers + the computed score + the top 3 actions. The full detail lives in the file.

### Step 7 — Verification

Before reporting done:

- [ ] All 10 domain scores justified by at least one piece of evidence (command output, `file:line`).
- [ ] The five canonical questions are answered explicitly in section 2 of the report.
- [ ] No score is invented — if a check could not run (`--quick`, `--no-build`, missing credential, unauthenticated `gh`), mark it `N/A` and explain.
- [ ] The Step 3 RLS coverage table is present, and every `RLS=No` row is flagged P0 in section 8.
- [ ] Step 3.5 ran: P0 + P1 hardcoded values listed under "Hardcoded values (P0/P1)", and Domains 5 and 7 reflect the penalty (or the count is stated as below threshold).
- [ ] Step 3.6 ran: all seven AFRIK checks have a verdict in section 10, with FR28 hard-gate and FR28-strict counts reported separately.
- [ ] Step 3.7 ran: P0 + P1 dead-code findings listed under "Dead code & redundancy", and Domains 4 and 7 reflect the penalty. Cross-checked against Step 3.5 to avoid double-counting.
- [ ] Cross-domain defects were harmonized to one canonical severity before the mean was computed.
- [ ] `docs/PRODUCTION-READINESS-AUDIT.md` was updated and its Date field reflects today.
- [ ] `git status --porcelain` shows **only** `docs/PRODUCTION-READINESS-AUDIT.md` changed (plus the disclosed gitignored artifacts).

## Output Format

User-facing summary (printed at end):

```
EthniAfrica Audit — <YYYY-MM-DD>
Score: X.X / 10 (target 8–9)

1. Production-ready? <verdict + 1-line reason>
2. AFRIK editorial surface sound? <FR28 hard/strict counts, Tier-3 count, CI gate>
3. Clone → running in one session? <verdict + the blocking step, if any>
4. Security posture? <one line: RLS + CSP + auth + secrets>
5. Distance to 8–9? <top 3 actions>

Full report: docs/PRODUCTION-READINESS-AUDIT.md
```

## Out of Scope

- Fixing any gap found. The audit only **reports**; releases go through `/ethniafrica-release`, fixes through `/ethniafrica-ticket`.
- Any write against external services — Supabase, Sentry, Upstash, Plausible, Vercel, Confluence, Jira. The audit is local and read-only.
- Running or rolling back migrations; running `tsx scripts/migrateAfrikToDatabase.ts` against any database.
- Generating or rotating API keys, service-role tokens, or session cookies.
- Live end-to-end measurement (running Lighthouse against production, live API probes) — Domains 1–10 score on configuration, budgets, and recorded CI evidence, not live probes.
- Editorial correction of AFRIK fiches. Finding a Tier-3 citation is this skill's job; rewriting the fiche belongs to the `afrik-curator` skill.
- Auditing the Confluence spec tree's content or the Jira board's hygiene — that surface belongs to `/ethniafrica-spec`.
