# EthniAfrica — Audit Action Tickets (target 8.5 / 10)

Generated from `docs/PRODUCTION-READINESS-AUDIT.md` (2026-05-14, score 6.0).
Each ticket lists score impact, files to touch, acceptance criteria, and an
estimate. Together they take the audit from **6.0 → ~8.5**.

| ID            | Title                                                                | Pri | Score Δ    | Estimate |
| ------------- | -------------------------------------------------------------------- | --- | ---------- | -------- |
| ETNI-AUDIT-1  | Enable RLS on all `afrik_*` tables                                   | P0  | +3 (D6)    | S        |
| ETNI-AUDIT-2  | Promote Lighthouse + Data-Integrity gates from advisory to enforced  | P0  | +2 (D8)    | S        |
| ETNI-AUDIT-3  | Fix `TOAST_REMOVE_DELAY` typo (1,000,000 → 1,000)                    | P0  | bug        | XS       |
| ETNI-AUDIT-4  | Externalize rate-limit tier RPMs and window                          | P0  | +1 (D5)    | S        |
| ETNI-AUDIT-5  | Resolve V1 cleanup: apply `007_remove_v1_*` or revert                | P0  | +1 (D10)   | M        |
| ETNI-AUDIT-6  | Fix AFRIK country demographics (30/54 off, 9 at 0 %)                 | P0  | +1 (D6)    | L        |
| ETNI-AUDIT-7  | Sweep Wikipedia citations from PPL fiches                            | P1  | +0.5 (D6)  | M        |
| ETNI-AUDIT-8  | Purge invalid ISO codes + V1 orphan from PPL dataset                 | P1  | +0.5 (D6)  | M        |
| ETNI-AUDIT-9  | Add `connect-src` to CSP; wire Sentry `beforeSend` on edge runtime   | P1  | +0.5 (D1)  | XS       |
| ETNI-AUDIT-10 | Bump `PBKDF2_ITERATIONS` to 600,000                                  | P1  | +0.5 (D1)  | XS       |
| ETNI-AUDIT-11 | Exclude `.claude/worktrees/**` from Vitest + fix admin route mocks   | P1  | +1 (D3)    | S        |
| ETNI-AUDIT-12 | Reconcile `env.dist` and `.env.example` into a single canonical file | P1  | +0.5 (D10) | XS       |
| ETNI-AUDIT-13 | Pin GitHub Actions by SHA + add Dependabot config                    | P1  | +0.5 (D2)  | S        |
| ETNI-AUDIT-14 | `npm audit fix` for 1 critical + 11 high CVEs                        | P1  | +0.5 (D2)  | S        |
| ETNI-AUDIT-15 | Reconcile CLAUDE.md table names with actual schema                   | P2  | doc        | XS       |

**Projected score after all P0 + P1 land: ~8.5 / 10.**

Estimate scale: XS = ≤30 min · S = ≤2 h · M = ≤1 day · L = ≤3 days.

---

## ETNI-AUDIT-1 · Enable RLS on all `afrik_*` tables

**Type:** Security bug · **Priority:** P0 · **Domain:** 6 (Data integrity)
**Score impact:** +3 (Domain 6 from 4 → 7)

### Problem

Migration `006_afrik_schema.sql` creates 5 AFRIK tables but never calls
`ALTER TABLE … ENABLE ROW LEVEL SECURITY` and never declares any policy.
Anyone holding the public anon key (which is shipped in the browser bundle as
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) can `SELECT *`, **`INSERT`**, **`UPDATE`**,
**`DELETE`** on:

- `afrik_countries`
- `afrik_language_families`
- `afrik_languages`
- `afrik_peoples`
- `afrik_people_countries`

Every other table in the schema (V1 entities, module-zero fabric, `api_keys`,
`user_roles`) has RLS enabled. AFRIK is the outlier.

### Acceptance criteria

- [ ] New migration `supabase/migrations/014_afrik_rls.sql` exists.
- [ ] `ALTER TABLE … ENABLE ROW LEVEL SECURITY` called for the 5 tables.
- [ ] `CREATE POLICY <name>_read_public ON <table> FOR SELECT USING (true);`
      added for the 5 tables.
- [ ] No write policy added — service-role writes (which bypass RLS) remain
      the only path. Loaders in `src/lib/afrik/loaders/*` continue to work.
- [ ] Verified locally with `supabase db reset` — anon key cannot
      `INSERT` into any AFRIK table; anon `SELECT` still returns rows.
- [ ] Re-run `/ethnia-audit` — RLS table in §5.7 shows all rows green.

### Files

- `supabase/migrations/014_afrik_rls.sql` (new)

### Verification

```sql
-- as anon key
INSERT INTO afrik_countries (id, iso3, name_fr) VALUES ('x', 'XXX', 'X');
-- expected: ERROR: new row violates row-level security policy
SELECT count(*) FROM afrik_countries;
-- expected: existing row count
```

---

## ETNI-AUDIT-2 · Promote Lighthouse + Data-Integrity gates from advisory to enforced

**Type:** CI · **Priority:** P0 · **Domain:** 8 (Perf & a11y) + Domain 10
**Score impact:** +2 (Domain 8 from 6 → 8)

### Problem

`.github/workflows/lighthouse.yml` runs all 6 of its `build / start / run`
steps with `continue-on-error: true`. The comment on line 22 claims this is
"until repo secrets are configured." Repo secrets _are_ now configured (last
runs use them) but the flag was never removed. The same pattern exists in
`.github/workflows/data-integrity.yml` (2 steps).

Result: any perf regression, a11y regression, or AFRIK data integrity
regression (FR32) lands silently. The audit cannot verify that the published
Lighthouse thresholds (perf ≥ 0.85, a11y = 1.0, bp ≥ 0.95) are actually met.

### Acceptance criteria

- [ ] Remove all 6 occurrences of `continue-on-error: true` from
      `.github/workflows/lighthouse.yml`.
- [ ] Remove both occurrences of `continue-on-error: true` from
      `.github/workflows/data-integrity.yml`.
- [ ] Add a guard step that checks `${{ secrets.NEXT_PUBLIC_SUPABASE_URL != '' }}`
      and exits cleanly (not in advisory mode) if the secret is absent — for
      forks / dependabot PRs.
- [ ] Open one PR that intentionally violates a threshold, confirm CI fails red.
- [ ] Restore the threshold; confirm CI passes green.
- [ ] Update the comment on line 22 to reflect the new behavior.

### Files

- `.github/workflows/lighthouse.yml`
- `.github/workflows/data-integrity.yml`

---

## ETNI-AUDIT-3 · Fix `TOAST_REMOVE_DELAY` typo (1,000,000 → 1,000)

**Type:** Bug · **Priority:** P0 · **Domain:** 4 (Code quality)

### Problem

`src/hooks/use-toast.ts:6` declares `TOAST_REMOVE_DELAY = 1000000` (≈ 16
minutes). Almost certainly a typo for `1000` (1 second) or `5000` (5 seconds).
Toasts pile up in DOM for 16 minutes after dismissal, causing accessibility
regressions for screen readers and possible memory pressure on long sessions.

### Acceptance criteria

- [ ] Change to `TOAST_REMOVE_DELAY = 5000` (matches shadcn/ui default).
- [ ] Add a one-line comment explaining the value.
- [ ] Manual smoke: trigger 3 toasts in sequence, confirm they leave the DOM
      within ~5 s of dismissal.

### Files

- `src/hooks/use-toast.ts:6`

---

## ETNI-AUDIT-4 · Externalize rate-limit tier RPMs and window

**Type:** Tech debt · **Priority:** P0 · **Domain:** 5 (Architecture)
**Score impact:** +1 (Domain 5 from 6 → 7)

### Problem

`src/lib/api/rate-limit.ts:84-99` hardcodes the three tier RPMs (60 / 600 /
6,000) and the `1 m` window. Re-tuning quotas (a routine Ops decision)
requires a code change and a redeploy. The tier names themselves are also
hardcoded.

### Acceptance criteria

- [ ] New env vars (with defaults preserving today's behavior):
  - `RATE_LIMIT_IP_RPM` (default 60)
  - `RATE_LIMIT_PUBLIC_RPM` (default 600)
  - `RATE_LIMIT_PARTNER_RPM` (default 6000)
  - `RATE_LIMIT_WINDOW` (default `"1 m"`)
- [ ] `src/lib/api/rate-limit.ts:getLimiters()` reads these once at startup.
- [ ] Add the 4 vars to the canonical env file (see ETNI-AUDIT-12).
- [ ] Unit test: monkey-patch envs, confirm `Ratelimit` is constructed with
      the patched values.
- [ ] Document the vars in `docs/DEPLOYMENT.md`.

### Files

- `src/lib/api/rate-limit.ts:84-99`
- `src/lib/api/__tests__/rate-limit.test.ts`
- `.env.example` (or whichever survives ETNI-AUDIT-12)
- `docs/DEPLOYMENT.md`

---

## ETNI-AUDIT-5 · Resolve V1 cleanup: apply `007_remove_v1_*` or revert

**Type:** Tech debt · **Priority:** P0 · **Domain:** 10 (Release)
**Score impact:** +1 (Domain 10 from 5 → 6)

### Problem

Migration `007_remove_v1_add_v2_contribution_types.sql` exists in the repo
but per memory is **not yet applied to production**. Production still has 7
V1 tables (`african_regions`, `countries` (v1), `languages`, `ethnic_groups`,
`ethnic_group_presence`, `ethnic_group_languages`, `ethnic_group_sources`)
plus the V1 contribution-type enum values. A fresh dev DB diverges from
production. Any new V2 contribution type (per CLAUDE.md memory:
`new_people / update_people / new_country / update_country / new_language_family /
update_language_family`) cannot be relied on.

### Acceptance criteria (pick one path)

**Path A — apply** (preferred if no V1 consumers remain):

- [ ] Backup production via `pg_dump`.
- [ ] Apply migration 007 in a staging environment first; smoke-test V2
      contribution flows.
- [ ] Apply to production.
- [ ] Document the cutover in `docs/runbooks/v1-removal-cutover-2026-05.md`.

**Path B — revert** (if V1 consumers remain in production):

- [ ] Add a follow-up migration `008_v1_compat_shim.sql` (or revert 007 with
      a `git revert`).
- [ ] Open a tracking ticket for the eventual V1 removal with a date.

### Files

- `supabase/migrations/007_remove_v1_add_v2_contribution_types.sql`
- `docs/runbooks/v1-removal-cutover-2026-05.md` (new, Path A)

---

## ETNI-AUDIT-6 · Fix AFRIK country demographics (30/54 off, 9 at 0 %)

**Type:** Editorial bug · **Priority:** P0 · **Domain:** 6 (Data integrity)
**Score impact:** +1 (Domain 6 from 7 → 8 — after ETNI-AUDIT-1)

### Problem

`tsx scripts/validateAfrikData.ts` reports 30 of 54 country fiches outside
the [95, 105] % demographics window. Worst offenders:

- **At 0 %** (no demographic data at all): BDI, COG, COM, ETH, NGA, RWA, SWZ, TZA, ZAF
- **Severe under-100 %**: MOZ 23, MWI 32, AGO 37, NER 44, NAM 50, STP 50, SSD 60, GAB 60, COD 66, GMB 68, GNB 68

This is the public-facing trust gate. End users compare these numbers against
their lived experience.

### Acceptance criteria

- [ ] For each of the 30 countries, audit each `PPL_*.json` referencing it
      and ensure `demographics.percentageInCountry` values sum to 100 ± 5.
- [ ] Use only authorized sources (UN, UNFPA, CIA, SIL Ethnologue, Glottolog,
      UNESCO, IWGIA, INSEE-equivalent national statistics offices).
- [ ] Cite each demographic figure in the corresponding PPL fiche `sources`.
- [ ] `tsx scripts/validateAfrikData.ts` reports 0 demographic failures.
- [ ] Re-run loader `tsx scripts/migrateAfrikToDatabase.ts` against staging;
      confirm DB and source agree.
- [ ] Update `data_quality_status.md` memory entry.

### Files

- `dataset/source/afrik/peuples/FLG_*/PPL_*.json` (many)
- `dataset/source/afrik/pays/{BDI,COG,COM,ETH,NGA,RWA,SWZ,TZA,ZAF,MOZ,MWI,AGO,NER,NAM,STP,SSD,GAB,COD,GMB,GNB,...}.json`

---

## ETNI-AUDIT-7 · Sweep Wikipedia citations from PPL fiches

**Type:** Editorial bug · **Priority:** P1 · **Domain:** 6
**Score impact:** +0.5

### Problem

8 of 10 sampled PPL fiches cite Wikipedia in their `sources` block —
explicitly forbidden by the editorial doctrine in CLAUDE.md ("Never invent
data — use authorized sources only"). Authorized canon: UN, UNFPA, CIA, SIL
Ethnologue, Glottolog, UNESCO, IWGIA. Joshua Project also appears 6× and is
not on the authorized list — needs a doctrine call.

### Acceptance criteria

- [ ] Grep for `wikipedia` (case-insensitive) across `dataset/source/afrik/`.
- [ ] For each hit, replace the Wikipedia citation with an authorized source
      that supports the same claim, OR remove the claim if no authorized
      source supports it.
- [ ] Add a doctrine note to `_bmad-output/project-context.md` stating
      explicitly that Wikipedia is not an authorized source.
- [ ] Open a sub-ticket for "Joshua Project: authorized or not?" with a
      proposed doctrine update.
- [ ] Re-run sample-of-10 audit; expect 0/10 Wikipedia hits.

### Files

- `dataset/source/afrik/peuples/FLG_*/PPL_*.json`
- `_bmad-output/project-context.md`

---

## ETNI-AUDIT-8 · Purge invalid ISO codes + V1 orphan from PPL dataset

**Type:** Editorial bug · **Priority:** P1 · **Domain:** 6
**Score impact:** +0.5

### Problem

23 dataset-wide errors in PPL ISO fields:

- 2-letter codes where ISO 639-3 expects 3: `tw` in `PPL_AKUAPEM/AKYEM/TWIFO`,
  `ee` in `PPL_TONGU`, `ribe` in `PPL_MIJIKENDA`.
- Literal `"undefined"` in `currentCountries` of `PPL_SHAMBAA, SHIRAZI (×4),
SOLI, SUBIYA (×3), KOUZIE, MAHN (×2), NEYO, NIABOUA, WONNIN`.
- Freeform strings (`"Autres"`, `"Autres (NGA, GHA, FRA)"`, …) in `PPL_EWE/FON/IBIBIO`.

Plus: `dataset/source/afrik/peuples/V1/` is an orphan folder with no matching FLG.
File-count drift: memory says 789 PPLs post-cleanup, on-disk count is 798.

### Acceptance criteria

- [ ] Fix the 23 ISO entries.
- [ ] Remove `peuples/V1/` (or move under a valid FLG\_\*).
- [ ] Reconcile 798 vs 789 — either re-run cleanup or update memory.
- [ ] `tsx scripts/validateAfrikData.ts` reports 0 ISO/structural errors.
- [ ] Update `data_quality_status.md` memory entry.

### Files

- `dataset/source/afrik/peuples/FLG_*/PPL_{AKUAPEM,AKYEM,TWIFO,TONGU,MIJIKENDA,SHAMBAA,SHIRAZI,SOLI,SUBIYA,KOUZIE,MAHN,NEYO,NIABOUA,WONNIN,EWE,FON,IBIBIO}.json`
- `dataset/source/afrik/peuples/V1/` (delete)

---

## ETNI-AUDIT-9 · Add `connect-src` to CSP; wire Sentry `beforeSend` on edge runtime

**Type:** Security · **Priority:** P1 · **Domain:** 1 (Application security)
**Score impact:** +0.5 (D1 from 7 → 7.5)

### Problem

Two related gaps:

1. `src/middleware.ts:15-22` declares CSP with `default-src 'self'` but no
   explicit `connect-src`. Browser fetches to `*.supabase.co`,
   `ingest.de.sentry.io`, `plausible.io`, and Upstash fall back to
   `default-src 'self'` and **are blocked**. Either client-side calls don't
   exist (and the policy is correct but misleading) or the policy is being
   silently violated.
2. `sentry.edge.config.ts` does not wire the `beforeSend` PII scrubber that
   client and server configs use. Edge-runtime errors may leak emails / IPs
   to Sentry.

### Acceptance criteria

- [ ] Add to CSP in `src/middleware.ts`:
      `connect-src 'self' https://*.supabase.co https://*.ingest.de.sentry.io https://plausible.io https://*.upstash.io`
- [ ] Test in browser: confirm Supabase calls succeed, no CSP violations in
      console.
- [ ] Add `beforeSend: beforeSend as Parameters<typeof Sentry.init>[0]["beforeSend"]`
      to `sentry.edge.config.ts` (mirrors `sentry.server.config.ts`).
- [ ] Trigger a deliberate edge-runtime error containing an email; confirm
      it arrives at Sentry redacted.

### Files

- `src/middleware.ts:15-22`
- `sentry.edge.config.ts`

---

## ETNI-AUDIT-10 · Bump `PBKDF2_ITERATIONS` to 600,000

**Type:** Security · **Priority:** P1 · **Domain:** 1
**Score impact:** +0.5 (already counted in ETNI-AUDIT-9)

### Problem

`src/lib/api/auth.ts:12` declares `PBKDF2_ITERATIONS = 100_000`. Meets NIST
SP 800-132 minimum but is below the current OWASP 2023 recommendation of
600,000 for PBKDF2-SHA256. The hash format `pbkdf2v1:{iterations}:{salt}:{hash}`
already supports per-key iteration count, so existing keys keep validating
and new keys use the higher count. **Zero migration required.**

### Acceptance criteria

- [ ] Change `PBKDF2_ITERATIONS = 100_000` to `600_000`.
- [ ] Add unit test: hash a key, verify it round-trips with the new count.
- [ ] Add a regression test: hash with old value (100k) stored, verify
      `validateApiKey()` still accepts it.
- [ ] Document in `docs/api-contracts.md` under API key auth.

### Files

- `src/lib/api/auth.ts:12`
- `src/__tests__/auth.test.ts` (or equivalent)

---

## ETNI-AUDIT-11 · Exclude `.claude/worktrees/**` from Vitest + fix admin route mocks

**Type:** Tech debt · **Priority:** P1 · **Domain:** 3 (Tests)
**Score impact:** +1 (D3 from 5 → 6)

### Problem

Two issues compound:

1. `vitest.config.ts` has no `exclude` pattern for `.claude/worktrees/`. The
   6 stale agent worktrees contribute 53 of 85 failing tests — pure noise.
2. The uncommitted change in `src/app/api/admin/contributions/[id]/route.ts`
   correctly renames table references from French (`afrik_peuples`,
   `afrik_pays`) to English (`afrik_peoples`, `afrik_countries`) — matching
   the migration — but the mocks in
   `src/app/api/admin/contributions/[id]/__tests__/route.test.ts` still expect
   the French names, producing 4 test failures.

### Acceptance criteria

- [ ] Add to `vitest.config.ts`:
      `exclude: ['node_modules/**', 'dist/**', '.next/**', '.claude/**']`
- [ ] Update mocks in `__tests__/route.test.ts` to match the new English
      table names.
- [ ] Commit the fixed `route.ts` and updated mocks together.
- [ ] `npm run test` reports 0 failures in `src/app/api/admin/contributions/`.
- [ ] Total `src/` failure count drops from ~18 to <5 (the residual 6
      pre-existing `migrateAfrikToDatabase` mock failures remain — open a
      separate ticket for those).

### Files

- `vitest.config.ts`
- `src/app/api/admin/contributions/[id]/route.ts`
- `src/app/api/admin/contributions/[id]/__tests__/route.test.ts`

---

## ETNI-AUDIT-12 · Reconcile `env.dist` and `.env.example` into a single canonical file

**Type:** DX · **Priority:** P1 · **Domain:** 10 (Release)
**Score impact:** +0.5 (D10 from 6 → 6.5 — after ETNI-AUDIT-5)

### Problem

The repo has two example env files with overlapping but inconsistent content:

- `.env.example` (2 KB) — has Sentry + Plausible + comments, missing Supabase + Upstash
- `env.dist` (586 B) — has Supabase + revalidate secret, missing Sentry + Upstash + rate-limit + Plausible

A new contributor cannot use either alone. Neither file mentions
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`RATE_LIMIT_ADMIN_KEYS`, `RATE_LIMIT_PARTNER_KEYS`, or `CORS_ALLOWED_ORIGIN`.

### Acceptance criteria

- [ ] Delete `env.dist`.
- [ ] `.env.example` is the single canonical file and lists every env var the
      app reads, grouped by feature with a one-line comment per var.
- [ ] Required vs optional clearly marked.
- [ ] After ETNI-AUDIT-4 lands, `.env.example` includes the 4 new
      `RATE_LIMIT_*` vars.
- [ ] `docs/DEPLOYMENT.md` references only `.env.example`.
- [ ] CI sanity check: a script `scripts/checkEnvExample.ts` parses
      `.env.example` and confirms every `process.env.X` reference in `src/`
      is documented.

### Files

- `env.dist` (delete)
- `.env.example`
- `docs/DEPLOYMENT.md`
- `scripts/checkEnvExample.ts` (new, optional but recommended)

---

## ETNI-AUDIT-13 · Pin GitHub Actions by SHA + add Dependabot config

**Type:** Security · **Priority:** P1 · **Domain:** 2 (Supply chain)
**Score impact:** +0.5 (D2 from 6 → 6.5)

### Problem

All third-party actions are tag-pinned (`actions/checkout@v4`,
`actions/setup-node@v4`, `actions/upload-artifact@v4`,
`actions/github-script@v7`, `anthropics/claude-code-action@v1`). Tags are
mutable — a hostile maintainer or compromised release can substitute
malicious code into a build. SLSA recommends SHA-pinning for security-relevant
actions.

No Dependabot or Renovate config detected.

### Acceptance criteria

- [ ] Replace every `@v4` / `@v7` / `@v1` tag with the corresponding SHA,
      with the version as a trailing comment:
      `uses: actions/checkout@<sha>  # v4.2.2`.
- [ ] Add `.github/dependabot.yml` configuring:
  - `package-ecosystem: github-actions` weekly
  - `package-ecosystem: npm` weekly grouped by type
- [ ] Document SHA-pin policy in `CONTRIBUTING.md` (or CLAUDE.md).
- [ ] Verify all workflows still pass on a test PR.

### Files

- All `.github/workflows/*.yml` (except Ferry — already version-pinned)
- `.github/dependabot.yml` (new)

---

## ETNI-AUDIT-14 · `npm audit fix` for 1 critical + 11 high CVEs

**Type:** Security · **Priority:** P1 · **Domain:** 2
**Score impact:** +0.5 (D2 from 6.5 → 7 — after ETNI-AUDIT-13)

### Problem

`npm audit --json --audit-level=moderate` reports 20 vulnerabilities:
1 critical, 11 high, 8 moderate.

### Acceptance criteria

- [ ] Run `npm audit --json --audit-level=moderate` and capture the list.
- [ ] For each: try `npm audit fix` first. For breaking changes, evaluate
      and decide (upgrade vs document accepted risk vs override).
- [ ] After fix: `npm audit --audit-level=moderate` reports 0 high+critical.
- [ ] `npm run test`, `npm run build`, `npm run type-check` all green.
- [ ] If any CVE cannot be fixed, document in `docs/security-exceptions.md`
      with rationale and review date.

### Files

- `package.json` / `package-lock.json`
- `docs/security-exceptions.md` (new, only if needed)

---

## ETNI-AUDIT-15 · Reconcile CLAUDE.md table names with actual schema

**Type:** Doc · **Priority:** P2 · **Domain:** 9 (Docs)

### Problem

`CLAUDE.md` "Database Tables" section lists French table names
(`afrik_familles_linguistiques`, `afrik_langues`, `afrik_peuples`,
`afrik_pays`). The migration `006_afrik_schema.sql` uses English
(`afrik_language_families`, `afrik_languages`, `afrik_peoples`,
`afrik_countries`). The French names also appear in `MEMORY.md` Country page
section. Caused the bug fixed by ETNI-AUDIT-11.

### Acceptance criteria

- [ ] Update CLAUDE.md "Database Tables" to use the actual English names.
- [ ] Audit MEMORY.md for the same drift; update.
- [ ] Add a one-line note to `_bmad-output/project-context.md` if absent.

### Files

- `CLAUDE.md`
- `/Users/jnk/.claude/projects/-Users-jnk-Documents-Dev-ethniafrica/memory/MEMORY.md`
- `_bmad-output/project-context.md`

---

## Suggested execution order

**Sprint 1 (data plane safe to ship)** — ETNI-AUDIT-1, 2, 3, 11, 15.
After this sprint: RLS closed, gates real, the two test-noise issues fixed,
docs aligned. Score ≈ 7.0.

**Sprint 2 (data quality)** — ETNI-AUDIT-6, 7, 8, 5.
After this sprint: editorial doctrine actually upheld, V1 cleanup decided.
Score ≈ 8.0.

**Sprint 3 (hardening)** — ETNI-AUDIT-4, 9, 10, 12, 13, 14.
After this sprint: rate limits tunable, CSP/edge complete, OWASP-grade
hashing, env discoverable, supply chain hardened. **Score ≈ 8.5.**
