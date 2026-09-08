# EthniAfrica — Production Readiness Audit

**Date:** 2026-09-08 (fourth revision)
**Branch:** `recette` @ `c5421944` · **Version:** 4.6.0 · **Deployed:** yes, tags through `v4.6.0`
**Method:** read-only. Nothing was fixed, bumped, tagged, pushed or deployed by this audit.

---

## 1. Scope and method

Every gate in `package.json` was run locally against a tree synced to `origin/recette`, plus the
repo-specific checks (`lint:req`, `check:action-pins`, `check:workflow-shell`, `check:env-example`,
`check:migration-files`, `check:dead`, `test:charter-contracts`, `check:translation-parity`,
`validateAfrikData.ts`, `checkEditorialRules.ts`) and `npm run build`.

Measured, not assumed: 53 tables enumerated from `supabase/migrations/*.sql` for RLS coverage; the
AFRIK warning corpus parsed out of `dataset/source/afrik/logs/validation_report.json` rather than
read off the summary line; tier values counted across the corpus rather than trusted from doctrine.

**Not measured this revision** (marked N/A where it affects a score): live deploy probes, live
Lighthouse runs, branch-protection settings, and the state of either Supabase project. Domains 5
and 9 are therefore scored on configuration and recorded evidence only.

**A caveat on the working copy.** The checkout carried untracked scratch when audited — generated
media under `output/`, three editorial documents, and one stale test file. Two gates are red
locally _because of it_, and neither red belongs to the repository. This is itself a finding
(D4-1); it is not a defect in the tracked code.

---

## 2. The five canonical questions

### 2.1 Is the project ready for production?

**Yes, with one editorial reservation.** It is already in production — `v4.6.0` is tagged and the
release path is exercised. Every gate that guards correctness, security, architecture and data
integrity passes on the tracked tree: 8 983 tests green, 0 validator errors, 0 editorial-rule
errors, dead code exactly at its ratchets, all third-party Actions SHA-pinned, RLS on all 53 tables.

The reservation is not a blocker but it is the product's own promise: **1 002 sources sit at a
`needs_review` standing that the relational schema cannot store** (§2.2, D8-1), and **1 010
occurrences of workshop vocabulary are published verbatim to readers** in `sources[].notes` (D8-2).
Neither breaks the build. Both weaken exactly the claim the atlas sells — that every statement
carries auditable provenance.

### 2.2 Is the AFRIK editorial surface sound?

**Structurally yes, doctrinally frayed at two seams.**

The good news is unambiguous. `validateAfrikData.ts` reports **50/50 checks passed, 0 errors**
across 1 721 tracked fiches against 17 strict models. `checkEditorialRules.ts` reports **0 errors,
97 warnings**. `check:translation-parity` passes. The chronology ratchet sits at exactly its
ceiling (`UNDATED_POLITY_CEILING = 95`, measured 95) — held, not drifting.

The 5 532 warnings resolve to two motifs, and it is worth being precise because the summary line
invites a misreading. They are **not** fiches citing a source literally named "unknown". They are
sources whose _domain ruling_ is unknown:

| Motif                                                       | Occurrences | Files |
| ----------------------------------------------------------- | ----------: | ----: |
| `cites "unknown", which publishes at tier unverified`       |       3 835 | 1 377 |
| `carries no URL, so it cannot be tiered from the catalogue` |       1 674 |   860 |
| `FR52-coverage` people-to-language (soft)                   |          23 |     — |

1 671 of 1 721 fiches carry at least one. Tier distribution across the corpus:

| Standing       | Count |
| -------------- | ----: |
| `unverified`   | 3 319 |
| `referenced`   | 1 806 |
| `official`     | 1 622 |
| `needs_review` | 1 002 |

Under the current Source Tier policy — _nothing is forbidden, everything is labelled_ — an
`unverified` source is a published, visibly-marked outcome, not a defect. Half the corpus resting
there is a coverage statement, not a failure. **Two things are defects:**

- **D8-1 — the vocabulary forks between the corpus and the database.** `needs_review` is a
  deliberate, well-built fourth standing in the TypeScript and UI layers: `src/types/afrik.ts:184`
  documents why it is _not_ a `SourceTier`,
  `src/components/source-transparency/SourceChainSheet.tsx:104` closes the tier list with it, and
  `src/app/api/v2/sources/route.ts:43` publishes it in the OpenAPI enum. But
  `supabase/migrations/041_one_source_tier_vocabulary.sql:79` constrains `sources.tier` to
  `official | referenced | unverified` (or NULL), and `recompute_confidence()` at `041:132–136` is
  a `CASE` with **no `ELSE`** — an unclassified source yields NULL, which `AVG()` silently skips. A
  `needs_review` source therefore contributes _nothing_ to confidence rather than contributing
  _little_. Today this is latent, because fiche sources live in the JSONB passthrough and never
  meet the CHECK; it becomes real the moment they are normalised.
- **D8-2 — the workshop is talking to the reader.** `CLAUDE.md` states that `sources[].notes` is
  published verbatim with no sanitising layer, and that pipeline vocabulary is banned there
  precisely because it "reads as ordinary French" and slips the gate. The same slip has now
  happened in English: **780 files contain "domain ruling"** and **458 contain "awaits editorial
  review"** (1 010 occurrences), in notes such as _"No domain ruling covers
  migrationpartnershipfacility.eu; the tier awaits editorial review."_ The `reader-facing-register`
  rule passes because `INTERNAL_REGISTER_PATTERNS` does not cover this phrasing. The doctrine's own
  words apply: _the reader is owed the silence itself, never the reason the workshop has not filled
  it yet._

### 2.3 Can a new contributor go clone → running in one session?

**Yes, with one trap.** `check:env-example` verifies `.env.example` against the code in both
directions and passes, so the environment surface is honest. `npm run build` succeeds. Migrations
are 87 files, sequential, no duplicate prefix, `check:migration-files` green.

The trap is D4-1: a fresh checkout that acquires any generated output — and the media production
workflow writes `output/` directly into the repo — turns `format:check` red with **457 offenders,
of which zero are tracked files**. A contributor running `make check` sees a red gate that CI never
sees and that no source file caused. `.gitignore` alone does not fix this, because Prettier reads
`.prettierignore`.

### 2.4 What is the security posture?

**Strong, and measured rather than asserted.**

- **RLS is total: 53 of 53 tables** have `ENABLE ROW LEVEL SECURITY`, backed by 98 policies. Four
  tables are deliberately deny-all (RLS on, no policy — denying every role but `service_role`):
  `admin_allowlist` and `flag_reporter_contacts` carry their reasoning in the migration that
  created them (`074:46`, `075:55`). `search_query_log` and `antibot_challenges` do not — the
  posture is correct, the intent is undocumented (P2).
- **No secret material in tracked files.** The pattern sweep is clean; only `.env.example` and
  `e2e/.env.example` are tracked.
- **Supply chain:** every third-party Action is SHA-pinned (0 unpinned). `npm audit`: **0 critical,
  0 high, 10 moderate**.
- **Service-role isolation holds** — no import of `@/lib/supabase/admin` from `src/app` outside
  `api/` and `admin/`.
- **The logger discipline holds.** The only `console.*` calls inside the directories where
  `no-console` is an error are the three inside `src/lib/api/logger.ts` itself, which is the
  logger's implementation.
- No hardcoded Supabase / Upstash / Sentry URLs in `src/`.

Not verified this revision: branch-protection settings, and the live configuration of either
Supabase project.

### 2.5 Is the score close to 8–9/10?

**7.9 / 10 — just under the band, up from 7.6 on 2026-09-03.** The three gaps that close the
distance are D8-1 and D8-2 (one migration and one pattern list, worth ~1.5 points on Domain 8) and
the documentation drift in D10.

---

## 3. Overall score

**7.9 / 10** — mean of ten equally weighted domains.

A product whose engineering gates have become genuinely hard to fool, and whose remaining weakness
is now concentrated in one place: the distance between the provenance doctrine as written and the
provenance data as stored.

---

## 4. Score per domain

| #   | Domain                             | Score | Evidence                                                                                           |
| --- | ---------------------------------- | ----: | -------------------------------------------------------------------------------------------------- |
| 1   | Security posture                   | **9** | 53/53 tables RLS + 98 policies; service-role isolated; all Actions SHA-pinned; 0 high/critical CVE |
| 2   | Secrets hygiene                    | **9** | Only `.env.example` + `e2e/.env.example` tracked; pattern sweep clean; `check:env-example` green   |
| 3   | CI                                 | **8** | 25 workflows, no gate in advisory mode on the merge paths; recent runs green; branch rules N/A     |
| 4   | Correctness & tests                | **9** | 8 983 pass / 0 fail on tracked code; coverage 86.7/80.3/89.9/87.7 vs 70/60/70/70; dead at ceiling  |
| 5   | Deploy coherence                   | **7** | 87 migrations sequential, no duplicate prefix; release path tagged to v4.6.0; live deploys N/A     |
| 6   | Ferry pipeline                     | **8** | `ferry.config.yaml` parses; `base_branch`=`target_branch`=`recette` per doctrine; 8 workflows      |
| 7   | Architecture & boundaries          | **9** | Three-layer v2 API intact; client isolation holds; no hardcoded service URLs; dead code at ceiling |
| 8   | AFRIK data integrity & Source Tier | **6** | 50/50 checks, 0 errors — but tier vocabulary forks from the DB (D8-1) and leaks to readers (D8-2)  |
| 9   | Performance & accessibility        | **8** | Budgets enforced in `.lighthouserc.js`; axe-core required; live measurement N/A this revision      |
| 10  | Docs & runbooks                    | **6** | Three CLAUDE.md counts stale; audit doc 4 versions behind; restore drill ~14 months old            |

---

## 5. Strengths

- **The gates have stopped being foolable.** `check:dead` fails on a count _below_ its ceiling as
  well as above. `check:env-example` verifies both directions. `check:migration-files` refuses a
  hole in the sequence. `UNDATED_POLITY_CEILING` is a descending ratchet that must be lowered in
  the same change that improves the data. This is a repo repeatedly burned by gates that reported
  success without measuring, and it has answered by making measurement the default.
- **RLS coverage is complete and reasoned** — 53 of 53 tables, and the deny-all tables are a
  deliberate posture, half of them with the reasoning written into the migration.
- **The test suite is large and real**: 8 983 passing tests across 855 files, coverage comfortably
  above every declared threshold, placement conventions actually followed.
- **`needs_review` is good design, not an accident.** The TypeScript layer explains why it is not a
  tier, the UI gives it its own standing rather than folding it into `unverified`, and the OpenAPI
  publishes it. The defect is that the database was never told.
- **`CLAUDE.md` remains a genuine operating document** — it records not only what is true but what
  used to be believed and why it was wrong. It shortened this audit considerably, and every
  inaccuracy found in it this round is a stale _count_, never a stale _doctrine_.

---

## 6. Gaps and risks

### Domain 4 — Correctness & tests

- **D4-1 (P1) — two gates are red locally for reasons no source file caused.**
  `npm run format:check` reports 457 offenders, **zero of them tracked**: generated renders under
  `output/`, and three untracked editorial documents. `npm run test:coverage` fails on 2 tests in
  the untracked `src/components/dossiers/__tests__/DossierNavigation.test.tsx`, written against a
  `DossierDirectory` that now renders _"Les dossiers sont en cours de réécriture."_ Excluding it,
  the suite is 8 983 pass / 0 fail. A gate that is permanently red for irrelevant reasons is a gate
  developers learn to ignore. The fix needs **`.prettierignore`**, not only `.gitignore`.

### Domain 8 — AFRIK data integrity & Source Tier

- **D8-1 (P1) — `needs_review` exists in the corpus, the types and the API, but not in the
  database.** 1 002 sources carry it. `supabase/migrations/041_one_source_tier_vocabulary.sql:79`
  admits only three values; `recompute_confidence()` at `041:132–136` is a `CASE` with no `ELSE`,
  so the standing yields NULL and is skipped by `AVG()` rather than weighted low. Latent while
  fiche sources stay in JSONB; a correctness bug the moment they are normalised.
- **D8-2 (P1) — workshop vocabulary is published verbatim to readers.** 780 files contain "domain
  ruling", 458 contain "awaits editorial review" (1 010 occurrences), inside `sources[].notes` — a
  field `CLAUDE.md` designates as reader-facing with no sanitising layer.
  `INTERNAL_REGISTER_PATTERNS` does not cover the English phrasing, so `reader-facing-register`
  passes. This is the same failure class the doctrine already documents, in a second language.

### Domain 10 — Docs & runbooks

- **D10-1 (P1) — the only restore drill on record is `restore-drill-2025-07-14.md`**, ~14 months
  old, and its own banner says it "predates most of the schema". The emergency-response axis has no
  current evidence that a restore works.
- **D10-2 (P2) — three counts in `CLAUDE.md` have drifted**: it says migrations are "081 at last
  count" (87), "~890 `.json` fiches" (1 721 tracked), and "96 entries still violate"
  chronology-symmetry (95, at ceiling). Doctrine is accurate throughout; only the numbers aged.
- **D10-3 (P2) — the audit skill itself is stale.** `.claude/skills/ethniafrica-audit/SKILL.md`
  still describes a Vercel-from-git deploy (reality: a GitHub Release driving the OVH VPS) and the
  retired Tier 1/2/3 policy in which Tier 3 was forbidden. Audits run from it will re-derive
  superseded conclusions. This revision scored against `CLAUDE.md` instead.

### Domain 1 — Security posture

- **D1-1 (P2)** — `search_query_log` and `antibot_challenges` are deny-all without the explanatory
  comment that `admin_allowlist` and `flag_reporter_contacts` carry. Correct posture, unstated
  intent.

### Hardcoded values (P0/P1)

**None.** No hardcoded Supabase, Upstash or Sentry URLs in `src/`. 11 role-string literals appear
outside `src/types` — P2 only, and they match the `user_roles` enum.

### Dead code & redundancy

**None above ceiling.** `check:dead` is green with `exports 22/22`, `types 49/49`, and 0 in all six
zero-held categories (files, dependencies, devDependencies, unlisted, binaries, duplicates). No
surviving V1 import.

### How this revision was measured

Full local gate run on `recette @ c5421944`; the AFRIK warning corpus parsed from
`validation_report.json` rather than read off the summary; 53 tables enumerated from the migration
SQL; tier values counted across `dataset/source/afrik`. Live deploys, live Lighthouse and branch
protection were not probed — marked N/A above rather than scored.

---

## 7. Consumer / new-contributor flow

| Step                                      | Verdict                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `git clone` + `npm ci --legacy-peer-deps` | ✅ legacy peer deps intentional (Storybook vs Next) |
| `.env.example` → `.env.local`             | ✅ `check:env-example` verifies both directions     |
| `supabase/migrations/` apply in order     | ✅ 87 files, sequential, no duplicate prefix        |
| `npm run build`                           | ✅ passes                                           |
| `npm run test`                            | ✅ 8 983 pass on tracked code                       |
| `make check` on a working checkout        | ⚠️ **red from generated output** — D4-1             |
| First admin seeded                        | ✅ `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts`     |

---

## 8. Security posture

RLS coverage: **53 / 53 tables enabled**, 98 policies. The four deny-all tables are listed in §2.4;
two carry their reasoning in-migration, two do not (D1-1). No secrets in tracked files. All
third-party Actions SHA-pinned. Service-role client isolated from the app surface. `no-console`
discipline holds in every enforced directory. `npm audit`: 0 critical, 0 high, 10 moderate.

Not verified: branch-protection settings, live Supabase project configuration.

---

## 9. Performance & accessibility posture

Budgets are declared and enforced in `.lighthouserc.js`; `a11y.yml` runs axe-core and is not in
advisory mode; `e2e.yml` is present. No live measurement was taken this revision — Domain 9 is
scored on configuration and recorded CI evidence only.

---

## 10. AFRIK data integrity & Source Tier compliance

| Check                                            | Verdict                                                         |
| ------------------------------------------------ | --------------------------------------------------------------- |
| Strict model adherence (17 models, 1 721 fiches) | ✅ 50/50 validator checks                                       |
| Validator errors                                 | ✅ **0**                                                        |
| FR28 hard gate [95,105]                          | ✅ 0 offenders — the gate now fails the build                   |
| FR28-strict [99,101]                             | ✅ burn-down complete; only `FR52-coverage` soft (23 warnings)  |
| FLG / PPL / ISO referential integrity            | ✅ all reference checks pass                                    |
| Source Tier — every source carries a tier        | ✅ enforced; 0 untiered                                         |
| Source Tier — vocabulary agrees across layers    | ❌ **D8-1** — 1 002 `needs_review` unstorable in the DB         |
| Reader-facing register                           | ❌ **D8-2** — 1 010 workshop phrases in reader-facing `notes`   |
| Editorial rules                                  | ✅ 0 errors, 97 warnings; chronology ratchet at ceiling (95/95) |
| Translation parity                               | ✅ passes                                                       |

---

## 11. Prioritized action list

| #   | Pri | Action                                                                                                                                                                                       |
| --- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1  | **D8-2** — extend `INTERNAL_REGISTER_PATTERNS` to the English workshop phrasing ("domain ruling", "awaits editorial review"), then rewrite the 1 010 occurrences. The gate must fail first.  |
| 2   | P1  | **D8-1** — one migration: widen `sources_tier_check` to admit `needs_review`, and give `recompute_confidence()` an `ELSE` so an unclassified source weighs low instead of nothing.           |
| 3   | P1  | **D4-1** — add `output/`, `Claude outputs/`, `skills-lock.json` to **`.prettierignore`** as well as `.gitignore`; decide whether the stale `DossierNavigation.test.tsx` is fixed or dropped. |
| 4   | P1  | **D10-1** — run a restore drill against recette and record it; the standing record predates most of the schema.                                                                              |
| 5   | P2  | **D10-3** — refresh `.claude/skills/ethniafrica-audit/SKILL.md`: the deploy model and the Source Tier scale it describes are both retired.                                                   |
| 6   | P2  | **D10-2** — correct the three drifted counts in `CLAUDE.md`.                                                                                                                                 |
| 7   | P2  | **D1-1** — add the deny-all intent comment to `search_query_log` and `antibot_challenges`.                                                                                                   |
| 8   | P2  | Resolve the 10 moderate advisories from `npm audit`.                                                                                                                                         |

---

## 12. Conclusion

**7.9 / 10, up from 7.6.** The engineering surface is in good order and its gates are honest: every
check that guards correctness, security, architecture and dead code passes on the tracked tree, and
the two red gates belong to scratch files rather than to the repository.

What holds the score under the 8–9 band is no longer spread across domains — it has concentrated
into the one place that matters most for this particular product. EthniAfrica's claim is that every
statement carries auditable provenance, and provenance is where the two real defects sit: a standing
the database cannot store, and workshop language the reader was never meant to see. Both are small
changes. Both are the ones worth making first, because they are the ones the atlas is judged on.
