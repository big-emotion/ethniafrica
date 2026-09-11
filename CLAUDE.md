# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EthniAfrica** is a Next.js 16 App Router app publishing an open, sourced atlas of African peoples, languages, linguistic families and countries, organised by the **AFRIK methodology** in a decolonial editorial posture.

The codebase is **bilingual — English and French — while publication fails closed to French-only** (ARCH-021, REQ-140). `Language = "en" | "fr"` is derived from `LOCALES` in `src/lib/locale.ts`, and `[lang]` resolves to either only when `SITE_LOCALE_MODE` publishes both. Missing or invalid configuration means `fr-only`; `bilingual-fr-default` publishes both while keeping `/` on French, and `bilingual-en-default` is the later explicit English-default launch. A reader's explicit choice is remembered in the `ethni-locale` cookie; only the language switcher writes that cookie. `/fr/*` resolves unchanged. English URLs carry **English slugs** (`/en/atlas/peoples/...`) that `src/middleware.ts` rewrites onto the French route folders under `src/app/[lang]/` (DEC-049), so a route rename is two slug entries in `src/lib/routing.ts`, never a second folder tree. There is no third locale: `es`/`pt` and any other two-letter segment 308 to the configured default. An `en` branch is expected wherever a locale is switched on; a `["fr"].includes(lang)` guard is the retired shape.

The public REST API is **v2 only** (`/api/v2/*`). V1 (regions/ethnicities) was removed; anything referring to `regions` or `ethnicities` as entities is stale, including most of `README.md`.

## Commands

```bash
npm run dev                 # dev server on :3000
npm run build               # production build
make check                  # full local gate: lint + typecheck + format:check + all tests (must stay < 5 min)

npm run lint                # eslint . (flat config; `next lint` is deliberately NOT used — see eslint.config.mjs)
npm run typecheck           # tsc --noEmit
npm run format              # prettier --write .

npm run test                # vitest run (happy-dom)
npm run test:watch
npm run test:coverage       # enforced thresholds: 70% statements/functions/lines, 60% branches
npm run unit-tests          # src/lib only
npm run integration-tests   # src/app/api
npm run api-tests           # src/app/api/v2

npx vitest run path/to/file.test.ts   # single file
npx vitest run -t "test name"         # single test by name

npm run e2e                 # Playwright; intentionally outside `make check`
npm run storybook           # :6006
```

### Repo-specific gates (all CI-blocking on every PR)

```bash
npm run lint:req                    # @req annotation traceability (see below)
npm run check:jira-template         # docs/templates/jira-ticket-template.md must exist and match
npm run check:action-pins           # every third-party GitHub Action must be SHA-pinned
npm run check:workflow-shell        # every workflow `run:` block must parse under `bash -n`
npm run check:env-example           # .env.example and the code agree, both directions
npm run check:local-paths           # no local filesystem path in a public repo
npm run test:social-tools           # the social/ Node utilities (in `make check`)
npm run test:social-engine          # the ten Python suites of the render engine
npm run check:migration-files       # no duplicate version or name, no hole in the sequence
npm run check:dead                  # knip: unreferenced files, exports, dependencies (ratcheted ceilings)
npm run test:charter-contracts      # aggregated design-charter contract suite
npx tsx scripts/validateAfrikData.ts        # AFRIK data integrity (FR26–FR52)
npx tsx scripts/ci/checkEditorialRules.ts   # decolonial editorial rules on fiches
```

## Architecture

### API: three layers, never two

Every `/api/v2` endpoint splits into route → handler → service. Adding an endpoint means touching all four of these:

```
src/app/api/v2/{resource}/route.ts   # HTTP: parsing, CORS, cache headers
src/api/v2/handlers/{resource}.ts    # business logic, serialization
src/api/v2/services/{resource}.ts    # Supabase queries — the only layer that talks to the DB
src/lib/api/openapiV2.ts             # OpenAPI spec (openapi:diff gates breaking changes)
```

Shared: `src/api/v2/utils/{validation,response}.ts`, `src/api/v2/schemas/` (zod), `src/api/v2/serializers/`, `src/lib/api/cors.ts`.

`src/middleware.ts` is load-bearing and does four unrelated jobs: CSP/security headers with a per-request nonce, locale resolution (`SITE_LOCALE_MODE` failing closed to `fr-only`, the `ethni-locale` cookie for an explicit choice, English slugs rewritten onto the French route folders, the resolved locale passed down as the `x-locale` request header so the root layout can declare `<html lang>`), API-key validation for `/api/v2/*` (PBKDF2-hashed keys in `api_keys`; same-origin requests are exempt so the frontend needs no embedded key), and Upstash rate limiting.

### AFRIK data pipeline

The corpus lives as JSON files in git, **not** only in the database:

```
dataset/source/afrik/           # ~890 .json fiches — the editorial source of truth
  famille_linguistique/FLG_*.json
  peuples/FLG_*/PPL_*.json
  pays/*.json
  {relations,noms,migrations}/
        ↓ src/lib/afrik/loaders/*JsonLoader.ts
Supabase tables: afrik_language_families, afrik_languages, afrik_peoples,
                 afrik_countries, afrik_people_countries
        ↓ src/api/v2/services/*
```

Fiche shape is fixed by the 17 strict models in `public/modele-*.json`: dossier, peuple, pays, linguistique, langue, media, relation, source, migration, recit-oral, frontiere-coloniale, and the six name models — nom and its five sub-models nom-jamu, nom-nisba, nom-patronyme, nom-patronymique, nom-totemique. Count the directory before quoting the number: this sentence once listed nine while sixteen were on disk, and `src/__tests__/agentInstructionsBilingual.test.ts` now holds it to the directory. Never skip, rename, or invent a section.

Hierarchy: **linguistic family → language → people → country.** IDs: families `FLG_*`, languages ISO 639-3, peoples `PPL_*`, countries ISO 3166-1 alpha-3.

Editorial work on fiches has a dedicated project skill: `.claude/skills/afrik-curator/`.

Loading the corpus is `scripts/migrateAfrikToDatabase.ts --target=recette|production` (`--target=staging` is retired and throws). `scripts/lib/afrikSyncTarget.ts` checks in the recette ref only; production comes from `AFRIK_PRODUCTION_SUPABASE_URL` with **no default**, because the default used to hold the recette ref and every production deploy loaded the corpus into recette. Runbook: `docs/runbooks/afrik-data-sync.md`.

### Supabase: two data clients, never interchangeable

- `src/lib/supabase/server.ts` — SSR / server components
- `src/lib/supabase/admin.ts` — service-role key, **server-only**

**The browser never reads the corpus from Supabase.** There used to be a third client — `client.ts`, anon key, browser — and this file described it for months after its last caller went away. Every read now goes through `/api/v2`, which is the better architecture, but it was only ever true in the code. The dead chain (`client.ts` ← `flags-client.ts` ← nobody) was removed rather than documented. `src/lib/supabase/auth-client.ts` is a separate, living thing: the browser authenticates directly, it just does not query.

Migrations are numbered and sequential in `supabase/migrations/` (081 at last count). A merge into `recette` applies the pending ones there automatically (`migrate-recette.yml`, needs the `RECETTE_SUPABASE_DB_URL` secret), and publishing a Release applies production's the same way (`deploy-production.yml`'s `migrate` job, needs `PRODUCTION_SUPABASE_DB_URL` — a Postgres connection string, not the PostgREST endpoint `PRODUCTION_SUPABASE_URL`). **That DDL runs through an SSH tunnel, and there is no DB URL secret.** Production's Postgres is self-hosted and its port is not published — measured 2026-09-03, the host answers on 443 and refuses 5432 — so the `migrate` job forwards to the **`supabase-db` container** over SSH (`SUPABASE_OVH_SSH_*`, five secrets, pointing at the **Supabase** VPS, a different machine from the app's), reads `POSTGRES_PASSWORD` from the stack's own `.env`, and runs `db push` on the runner against the loopback. Host port 5432 is **Supavisor**, not Postgres — a pooler a migration does not need, and which cost two deploys (it wants a tenant in the username, and authenticates with a password copy that `--force-recreate` does not refresh). A stored connection string was removed because it disagreed with the machine five times running. Production used to be manual on purpose; it stopped being so once the ledger became measurable, because a step performed by hand before every deploy is a step that gets skipped. `npm run migrations:diff` shows what a database is missing, `npm run check:migration-state` fails on anything pending, orphaned or edited-after-applying. Which of them are live on which project is tracked in `docs/runbooks/migration-state.md` — the ledger records some under timestamp versions rather than filenames, so a tool comparing version strings reports applied migrations as pending. **Both Supabase projects label their environment "production"** — a Supabase project has exactly one environment and Supabase names it "production", so the label describes the project, not the application it serves. `shmrjtnfbqzceovroqjj` serves **recette**. **Production is not a hosted project at all** — it is a **self-hosted** stack at `https://supabase.ethniafrica.com` on the OVH VPS, which is why the MCP cannot see it: this repo's token lists exactly one project. `jajggbeimfudpzcxytbb` is the **retired** hosted project, still alive enough to answer and therefore still able to mislead — this file named it as production for weeks, and a secret left pointing at it is what blocked the v4.1.1 deploy. Its **ledger** is readable all the same: migration `042` exposes `applied_migrations()` to `service_role`, so `npm run check:migration-state:production` measures it over PostgREST. Only **DDL** needs the direct Postgres connection. Conflating the two is what kept production's schema state a claim in a runbook for thirty-two migrations. Every migration is a two-step rollout: recette first, prod second. Applying one and calling it done has already left a corpus loaded on one and missing on the other.

### Frontend

- **Anything about the brand, the look of a page, or whether an assembly of blocks holds together — invoke `/afrik-art-director` first, every time.** It loads `docs/design/brand-charter.md`, which sits above the four surface charters and settles what none of them does: the product's one name and where it comes from, the licence the footer owes the reader, the single token spine (`--afh-*`; shadcn HSL variables are aliases confined to `ui/`), one accent per page, the two display weights that are actually loaded, vertical rhythm, one alignment per block, and the imagery doctrine. It also carries the capture harness — this surface cannot be judged from the code, and recette sits behind Vercel SSO so it has to be served locally.
- **Start at `docs/design/atlas-charter.md`.** It is what the atlas surface asserts: the three cartographic encodings and the hard rule that a people never receives a closed line, the per-surface accent scope, the three entry points, the doctrine for showing a field the corpus does not fill, the panel's two anchorings, and the motion tokens. The reviewed rendering is `docs/design/mockups/` (four pages, `node build.js`); the engine decision and what actually shipped instead is `docs/adr/0007-atlas-globe-engine.md`. A charter-named test file is picked up by `test:charter-contracts` automatically.
- **Anything about the games — invoke `/afrik-game-designer` first, every time.** Inventing, critiquing, scoping or killing a game; writing or repairing quiz items; auditing the _Jouer_ hub; or just an offhand "ce jeu est nul" — the skill loads `docs/design/games-charter.md`, which is the contract that surface owes. The charter records why the hub cuts from eleven games to three, the item doctrine (stimulus → stem → options: a round that never names its subject is a coin flip), the near-pool rule for distractors, and the interface rules. Reasoning about a game without it re-derives conclusions that are already written down, usually wrongly.
- Tailwind + shadcn/ui in `src/components/ui/`; feature components grouped by domain (`country/`, `people/`, `family/`, `fiche/`, `home/`, `quiz/`, `search/`, …).
- Design tokens are CSS custom properties in `src/styles/tokens/*.css` plus per-surface `country-tokens.css` / `people-tokens.css`. Colours belong in tokens, not literals — `src/styles/__tests__/colorTokens.test.ts` and the charter contract suite assert this.
- Storybook uses **`@storybook/react-vite`, not `@storybook/nextjs`** — Next 16 dropped `next/config`, which `@storybook/nextjs` requires. Installs need `--legacy-peer-deps`.
- Mobile-first is mandatory. Breakpoints: mobile 430px · tablet `md` 720px · desktop `xl` 800px (country container max-width).

### `social/` — the render engine, and where its output is not

Every carousel and short the project publishes is drawn by Python under
`social/harness`, with Node utilities beside it in `social/tools`. The spec they
obey is `docs/design/gabarits-social/GABARITS-SOCIAL.md`, versioned here with the
tokens it reads — it used to be a derived copy of a file in the private
workspace, marked "do not edit here", and it was a section behind its source
within a day.

**The code is versioned; the productions are not, and two variables draw the
line.** Both name a directory outright, because deriving either one is what tied
the engine to a layout this repository is not allowed to describe.

- **`ETHNIAFRICA_SOCIAL_PROJECTS`** — one subdirectory per subject _in the
  workshop_: its `cards.json`, its verified `assets/`, its narration, its scratch
  `work/`. A bare subject name on a render command resolves here. Unset, it falls
  back to the checkout's gitignored `output/social/`, so a fresh clone renders
  with nothing configured and loses the files with the worktree.
- **`ETHNIAFRICA_SOCIAL_POSTS`** — the finished posts, filed by status. No
  fallback, on purpose: `build-etat.mjs` exits rather than report an
  unconfigured library as one with zero subjects.

**A render is not aimed by either of them.** Each `cards.json` carries its own
`outDir`, and which status bucket a post sits in is derived from the post's own
header by the library's filing tool — never chosen by the engine, and never by
moving a folder in the Finder.

**Any other destination inside a git checkout is refused** (`ethni_paths.py`,
`assert_writable`). Not hypothetical: 1,2 Go of masters were once rendered into a
site checkout's gitignored `output/`, backed up by nothing, because one command
line was wrong. The engine now lives in a checkout itself, so the guard carries
exactly one exemption — its own fallback.

Nothing derives a root from its own file location any more, in either language.
Seven Python files and four Node tools each did, which worked only while the code
sat beside the productions, and failed **silently** once it did not: a walk over a
directory that does not exist reports zero subjects, not an error.

```bash
make social-tools     # node --test, cheap, part of `make check`
make social-engine    # the ten Python suites, needs the venv and the corpus
```

The engine's virtualenv is gitignored and rebuilt from
`social/harness/requirements.txt`, which pins its three direct dependencies
**exact** — Pillow decides glyph rasterisation and NumPy the compositing maths, so
a minor bump silently re-renders the back catalogue. `ffmpeg` and `ffprobe` are
called as binaries and installed separately.

`src/styles/__tests__/gabaritsSocialTokenParity.test.ts` holds the engine's token
copy to the design system, value by value. A font stack the site opens with the
Next loader's `var(--font-*)` is compared with that entry dropped: Python
rasterises from the `.ttf` files it ships and would resolve the loader variable to
nothing.

What stays in the private library: the renders, the per-subject `cards.json` and
`SOURCES.md`, the render-verification shelves, the dated editorial guides, and the
one tool that files folders onto the library's own shelves.

### Publishing — the audience, the plan, the video

The publishing chain runs in one order, and **all six of its skills live here**,
under their `ethniafrica-` names. They left for the private workspace on
2026-09-10, on the rule that a public repository carries no production skills, and
came back on 2026-09-11 when that rule was reversed: an engine and a chain whose
history nobody can read are an engine and a chain nobody can repair. What did not
come back is the **output** — see `social/` below.

```
audience-audit → content-strategist → idee → structure → produire → (fin)
   la mesure        quoi publier                                      ↓
                                                    publication : acte humain
```

- **Measure before planning — `/ethniafrica-audience-audit`.** It writes one
  dated report to `docs/audience/`, and the downstream skills refuse a report
  older than 30 days. Every figure counts **consented sessions only**: Plausible
  loads after the banner, so the number is a floor of unknown depth, never the
  audience.
- **Decide what ships — `/ethniafrica-content-strategist`.** Reads that report
  and never proposes a subject without the comparable's numbers attached.
- **Convert what already lands — `/ethniafrica-experience-optimizer`.** A page
  the report marks a dead end already has the audience a new page would have to
  earn.
- **Then the three that make it — `/ethniafrica-idee`, `/ethniafrica-structure`,
  `/ethniafrica-produire`.** A subject report, then the cards and their sources,
  then the render. **Nothing comes after `produire`**: the operator posts, then
  fills the Diffusion section of the subject's `post.md`. No skill publishes and
  no skill schedules — do not invent a fourth step.

The first two are optional and upstream; `idee` can start without them. But a
plan written without the measurement is a plan written to taste.

`scripts/lib/audienceSkillContract.ts` guards the whole handoff: that the
producer writes the dated report, and that each consumer still opens it and names
its producer. A consumer edited until it no longer reads the report keeps running
and silently reverts to guessing, which is the failure the indirection exists to
prevent.

- **Anything about why a video or a post holds attention — invoke
  `attention-architect` first, every time.** Writing a hook, judging a script
  that explains well and still flattens, or filing a persuasion principle
  somebody sent you. It ships in the `agent-comms` plugin
  (`/plugin install agent-comms@big-emotion` from `big-emotion/agent-atelier`)
  alongside `video-director`, `audience-audit` and `content-strategist` — the
  generic counterparts of the three above, for use on any project.

Its doctrine is measured on this project's own shorts, and two of its findings
bind editorial copy here: **a video that opens no loop has no retention floor**
(13 views against 632–861 on the same channel in the same week), and **every
approved script carries exactly one reframe sentence** — the one that restates
the hook's absurdity as a meaning, and the one readers quote.

The ethical line is not optional on this surface. The mechanism that captivates
is the mechanism that manipulates; only a paid debt separates them. **A hook whose
question the corpus cannot answer is not a hook, it is bait** — and on a sourced
atlas it is also a lie about the corpus. Rhetoric stays labelled as rhetoric: the
most quoted sentence in the Bantu short is editorial emphasis, not a historical
finding, and carrying it forward as fact is how the atlas loses what it sells.

Social copy obeys the reader-facing register and the source-tier policy exactly
as fiche text does.

## Non-obvious rules

### `@req` traceability (`npm run lint:req`, CI-blocking)

Every `test()`/`it()` call needs `// @req REQ-NNN` within the 3 lines above it, and any exported symbol annotated `@req REQ-NNN` must have a test annotated with the same ID. IDs are validated against `docs/confluence-spec/req-catalog.json`. Pre-existing tests are grandfathered by diffing against the previous file content, so _new or renamed_ tests are the ones that fail.

**Never delete `docs/confluence-spec/*.json` or `docs/templates/jira-ticket-template.md`.** With the catalog missing, `lintReqAnnotations.ts` returns early and reports OK while checking nothing — a silently disarmed gate, which is worse than a red one.

### No local paths (`npm run check:local-paths`, CI-blocking)

This repository is public, so an absolute workstation path publishes the author's
machine and usually the private production workspace sitting beside the checkout.
Three such lines were already committed before the gate existed: an absolute
memory path in `ethniafrica-audit`, a private-workspace shelf listing in a
demography note, and an agent-config path in a lint helper. A fourth was sitting
uncommitted in a working copy, which is what the pre-commit half of this gate is
for.

Six patterns are refused: two absolute home prefixes, the tilde shortcut, and the
three directory names that identify the private workspace and the local checkout.
**The exact list lives in `scripts/ci/checkLocalPaths.ts` and nowhere else** —
this section deliberately does not restate it, because a gate that greps every
tracked file greps its own documentation too, and a second copy of the list would
fail the build for describing it.

**Server paths are not local paths.** Production's Supabase stack really does live
under a deploy user's home on the VPS and the runbooks have to say so, so that one
prefix is allowed by name, as are the SSH and cache paths in workflow `run:`
blocks.

The Linux pattern is anchored to the start of a path token on purpose. The first
version was not, matched every `src/lib/home/...` import in the codebase, and
buried the three real leaks under 84 files of noise. `--selftest` holds ten
fixture lines, half of them the false positives that made that version unusable.

### The social gabarit spec is a derived copy

`docs/design/gabarits-social/` carries `GABARITS-SOCIAL.md` and the two token
files that the social carousel and reel templates are built from. The spec is
here because it documents the product's own style; the tokens because the
application uses them.

**It is generated, never edited here.** The source lives in the private
production workspace, and a sync script rewrites this copy with the workspace's
own shelf names stripped. Editing this copy makes the two diverge silently, and
the workspace is the one that wins. Fix the source, re-sync.

### Dead code (`npm run check:dead`, CI-blocking)

`knip` (config in `knip.json`) tallies unreferenced files, exports, types and
dependencies; `scripts/ci/checkDeadCode.ts` compares each tally against a
recorded ceiling. **The ceiling is a ratchet, not a budget** — a count above it
fails, and so does a count _below_ it, with the line to change. A ceiling left
standing above the real number is a licence to climb back to it.

Six categories are held at zero (files, dependencies, devDependencies, unlisted,
binaries, duplicates); `exports` and `types` sit where they were measured and
can only go down. `ADVISORY_CATEGORIES` softens a category the way
`SOFT_CHECK_NAMES` does in `validateAfrikData.ts` — a visible line in a source
file, never a flag in a config. It is currently empty.

A hand-run script or a config-loaded module is **declared in `knip.json`, not
deleted**: `scripts/**`, `e2e/**`, the `src/lib/atlas/assets/generate-*.mjs`
asset generators, `src/test/server-only-stub.ts` (a vitest alias) and the edge
functions are all entry points nothing imports on purpose. Three dependencies
are in `ignoreDependencies` because knip cannot see their use: `sharp` (Next's
production image optimizer), `puppeteer` (`@lhci/utils` does not depend on it —
`.lighthouserc.js`'s `puppeteerScript` resolves it from the project) and
`@storybook/blocks` (imported by `.mdx` stories knip does not parse).

### Custom ESLint rules (`eslint/rules/`, plugin `afh`)

- `afh/no-bare-people-name` — people/language names in `components/people/**` and `components/country/**` must render through `<AutonymExonymHeading>` so autonyms keep their exonyms and `lang` attribute.
- `afh/afh-error-misuse` — the `--afh-error` token is reserved for error/invalid contexts.
- `no-console` is an **error** in `src/api/**`, `src/app/api/**`, `src/lib/{api,afrik,auth,supabase}/**`. Use `import { logger } from "@/lib/api/logger"`.
- `@typescript-eslint/no-explicit-any` is an error in `src/`, a warning in tests (Supabase builder mocks are deep chained objects).

The rules' own tests are `.js` under `eslint/__tests__/` and are explicitly listed in `vitest.config.ts` — they once fell outside the glob and never ran, which is how a broken rule shipped.

### Source Tier Policy (enforced by `validateAfrikData.ts`)

**Nothing is forbidden. Everything is labelled.** A source is never rejected for being weak; it is
tiered, and the fiche's confidence follows from the tiers it rests on. Excluding oral, community and
amateur knowledge would itself be a colonial filter — the decolonial posture is to publish the claim
_and_ its provenance, not to suppress the claim.

The gate is therefore not "reject weak sources" but **"every source carries an explicit tier"**. A
`sources` entry with no tier is a blocking error.

One three-value scale is used everywhere — code identifier, DB value, API payload and user-facing
label all say the same thing:

| Identifier (code + DB) | Label (UI)       | Confidence weight | What it covers                                                                                  |
| ---------------------- | ---------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `official`             | **Officielle**   | 1.0               | UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA, national statistics institutes        |
| `referenced`           | **Référencée**   | 0.7               | Published, identifiable, verifiable work — academic, press, books. Not necessarily official     |
| `unverified`           | **Non vérifiée** | 0.4               | Aggregators, tertiary encyclopedias, blogs, social media, community accounts, AI-generated text |

This supersedes the earlier Tier 1/2/3 policy, under which Tier 3 was forbidden and an uncitable
claim was deleted. It also settles the aggregator question (Joshua Project, 101lasttribes,
peoplegroups): they are cited, at `unverified`.

Wikipedia is not a source. A primary source _discovered through_ Wikipedia is cited at its own tier,
by its own URL, and its `notes` field records which Wikipedia language versions were crossed so the
chain stays auditable.

#### Tier is authority; `source_kind` is provenance

They are orthogonal axes and must not be collapsed:

- `tier` — how much authority the source carries.
- `source_kind` — what kind of thing the source is (`sources.source_kind`, migration `031`).

AI-generated text is the worked example. It is not a level of authority — it is unverified content
whose _origin_ happens to matter. So it is `tier: "unverified"` + `source_kind: "ai_generated"`, and
`recompute_confidence()` multiplies rather than branches:

```sql
CASE s.tier
  WHEN 'official'   THEN 1.0
  WHEN 'referenced' THEN 0.7
  WHEN 'unverified' THEN 0.4
END
* CASE WHEN s.source_kind = 'ai_generated' THEN 0.5 ELSE 1.0 END   -- 0.4 × 0.5 = 0.2
```

which reproduces the retired `ai-enriched` weight of 0.2 exactly. The UI keeps the distinction
visible: the **Non vérifiée** badge plus an AI provenance marker driven by `source_kind`, never by
the tier.

A fiche sourced only at `unverified` is published and visibly marked low-confidence through
`ConfidenceChip`. That is the intended outcome, not a defect to fix.

### Demographics

2025 reference year. Per-country `percentageInCountry` must sum to 100%. The validator has a hard band [95, 105] (FR28) and a strict target band [99, 101] (FR28-strict). Both were advisory while ~30 countries' splits were re-sourced; that burn-down is finished — measured at zero offenders — so **both now fail the build**, and a fiche can no longer drift back out. Which checks remain advisory is one exported constant, `SOFT_CHECK_NAMES` in `scripts/validateAfrikData.ts`; only `FR52-coverage` is still in it.

### Colonial terminology

Keep colonial-era names but explain why they are problematic, and always surface the autonym. `checkEditorialRules.ts` enforces: an autonym is required at `confidence >= medium`, and ≥2 sources when `classification_status` is `contested` or `colonial-legacy`.

### Chronological symmetry (REQ-148)

A `content.kingdoms[]` entry carries `entryType` (`polity | colonial | modern`) and, where the corpus can state them, machine bounds in `timeRange` — the same shape the migration model validates. **`period` stays the reader-facing label and is never derived from the bounds**: it holds nuance ("apogée", "déclin progressif") that integers do not.

Two gates. `REQ-148 Kingdom time ranges` in `validateAfrikData.ts` holds the shape and refuses a range sharing no time with its own label. `chronology-symmetry` in `checkEditorialRules.ts` refuses the asymmetry that made this necessary: **a country that dates its colonial administrations must date its precolonial polities**, because the atlas was showing "1894 - 1962" for the protectorate and "Précolonial" for the five kingdoms above it. It is not a completeness check — a country that dates nothing passes.

96 entries still violate it, held by `UNDATED_POLITY_CEILING`, a ratchet that fails in both directions like `DEAD_CODE_CEILINGS`. Each editorial pass lowers it in the same change; at zero the ratchet is deleted and the findings become errors. `scripts/afrik/backfillKingdomTimeRange.ts` (dry-run by default) prints the queue by country and **never invents a bound** — an entry whose label names an era rather than a date stays undated and visible to the gate.

### Archive → JSON restoration

The conversion of `dataset/source/afrik/archive/famille_linguistique/*.txt` into the live `famille_linguistique/*.json` **lost content on more than half the twenty-four families**. `FLG_BERBERE` had two entirely empty sections and no longer contained the word "Diop"; the sub-part carrying the three competing theories of Berber origins, the 1974 UNESCO colloquium in Cairo and the explicit divergence points had simply gone.

A character ratio is a hint, not a measurement — the archive is markdown, the fiche is structured, and part of any gap is markup. `npx tsx scripts/afrik/diffFamilyArchive.ts` reports **named anchors** instead: years, proper-name pairs and author-year citations the archive holds and the fiche does not. `docs/editorial/family-restoration/` records one ledger per family somebody has started, and its `anchorBudget` is a descending ratchet — a family nobody has begun has no ledger and nothing to fail. Doctrine and running order: that directory's `README.md`.

**A restored theory comes back with its divergence points.** Publishing Diop and Obenga without the reasons comparative linguistics does not follow them would turn an exposed debate into an asserted position — the failure `FLG_AFROASIATIQUE` currently exhibits in the other direction, stating the Obenga position with no contradictor.

### Reader-facing register

Three fiche fields are published to the reader **verbatim**, with no sanitising layer: `gaps[].reason`, `sources[].title` and `sources[].notes` (nested under `names[].sources[]` on name fiches). Everything else, `_meta.directives` included, is authoring metadata nothing renders.

So those three may carry no repository path, no JSON field path, no raw `PPL_`/`FLG_`/`PAT_` identifier, and none of the pipeline's own vocabulary — _file d'attente_, _la passe_, _protocole de recherche_, _revue claim-level_, _tier hérité_. That last class is the one that got through: it carries no path and no identifier, so it reads as ordinary French, and 774 name fiches told their visitors which queue they came from and which research protocol they awaited. **The reader is owed the silence itself, never the reason the workshop has not filled it yet.**

`checkEditorialRules.ts` enforces this as `reader-facing-register` at error severity; the banned vocabulary is one exported constant, `INTERNAL_REGISTER_PATTERNS`. Doctrine, rewrite table and a paste-able prompt block for curation sessions: `docs/editorial/reader-facing-register.md`.

### Bilingual content (`npm run check:translation-parity`, CI-blocking)

Content added or changed in either language must carry its counterpart in the other, or an explicit deferral with a reason — a fiche field, a home fact, a UI string, a quiz template. The gate is symmetric: French without English fails exactly as English without French does, and a source field edited after its translation was produced is reported as drifted, not accepted (REQ-145).

For a French corpus record, the only deferral form is a non-empty reason at
`_translation.deferred.en` in the source record. The gate reports that reason
as a notice. Empty reasons fail. UI dictionary keys cannot be deferred.

Two kinds of content, two homes. **UI copy** lives in locale-keyed dictionaries — `src/lib/translations.ts` today, the `src/lib/i18n` modules as they land — and a keys-parity test holds `en` and `fr` to the same key set, so a string added under one locale fails the suite until the other has it. **Corpus translations** never edit the French fiche: they are records under `dataset/translations/<lang>/`, produced by `npm run translate:record`, and carry their own provenance.

The rules themselves — which fields are never translated, the glossary, the English register — live in `.claude/skills/afrik-translator/` and are enforced by `scripts/ci/checkTranslationParity.ts`. This file does not restate them, because three copies of one doctrine are how it drifts: invoke the skill before translating anything and let the gate name what is missing.

The parity gate controls content readiness, not publication. It never changes
`SITE_LOCALE_MODE`; unfinished English therefore remains silent while the
deployment stays on the default `fr-only` mode.

### TypeScript

`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`. The compiler will not catch nullability here — tests are the real gate. `@/` aliases `src/`.

## Workflow

### Git

- **One worktree per agent session.** Any agent task that writes to the repo — a background job, a Ferry run, `/ethniafrica-ticket`, a hand-launched sub-agent — must first isolate itself in its own git worktree (`EnterWorktree`, or `git worktree add .claude/worktrees/<name>`), never edit in the shared checkout. Parallel sessions sharing one working copy overwrite each other's edits and switch branches under each other. Read-only work — search, audit, answering a question — stays in place. Commit and push before the session ends: the worktree can be deleted with it.
- **A fresh worktree is not a working environment until it is provisioned.** `npm run worktree:setup` (i.e. `scripts/setup-worktree.sh`) clones `node_modules` from the main checkout, copies `.env.local`, and points `core.hooksPath` back at husky. A `PostToolUse` hook on `EnterWorktree` runs it automatically and `.worktreeinclude` carries the env files, so a Claude-created worktree needs nothing; **a worktree created by hand with `git worktree add` must run it explicitly.** Skipping it does not fail loudly: `vitest`, `tsc` and `eslint` resolve upward into the main checkout and pass — including on a dependency the worktree never installs, which is how a local green ships a CI red. `next dev` and `next build` are the ones that refuse outright, because `turbopack.root` is the worktree and a symlinked `node_modules` still resolves outside it.
- `recette` is the integration branch; `main` is the base. **`recette` is protected** — always branch and open a PR, never push directly.
- **A new clone branches worktrees off `main`, which is the wrong base here.** `EnterWorktree` and agent isolation resolve their base from `refs/remotes/origin/HEAD`, which a fresh `git clone` sets to GitHub's default branch. Point it at the integration branch once per clone:

  ```bash
  git remote set-head origin recette
  ```

  It is local git state, so it cannot be committed and every new clone needs it again. Without it a worktree starts dozens of commits behind and its PR carries the whole `main → recette` delta. Verify with `git symbolic-ref --short refs/remotes/origin/HEAD`; the `worktree.baseRef` setting only chooses between that ref (`fresh`, the default) and the local HEAD (`head`) — it cannot name a branch.

- `recette ↔ main` sync PRs must use a **merge commit**, not a squash; squashing has broken the ancestry before.
- Conventional commits (commitlint on `commit-msg`). Pre-commit runs `type-check` + `lint-staged`.
- Never add `Co-Authored-By` trailers.
- SHA-pin every third-party GitHub Action (`uses: org/action@<40-char-sha>  # <semver>`); `check:action-pins` enforces it and Dependabot bumps the pins weekly.

### Deploying

**Publishing a GitHub Release is the only thing that deploys production.** Not a push, not a tag. `deploy-production.yml` listens on `release: published`, SSHes to the OVH VPS in **Gravelines** (`51.195.82.98`, port **49152** — documents calling this host "Francfort" are using the wrong name for the right address), and rebuilds the container from the repository's `Dockerfile` + `docker-compose.yml` in `/srv/ethniafrica`. Use `/ethniafrica-release`; rollback is host-side and lives in `docs/runbooks/ovh-production-deploy.md`.

Vercel no longer auto-deploys anything — `vercel.json` sets `git.deploymentEnabled: false`, because per-push preview builds from parallel agent sessions exhausted the Hobby plan's quota. The recette preview is built on demand by running `deploy-preview-recette.yml` from the Actions tab.

Two couplings that fail silently: `production-data-sync.yml` chains off the deploy with `workflow_run`, which **only fires for workflow files on the default branch** — both files must be on `main`. And `UPSTASH_REDIS_REST_URL`/`_TOKEN` are mandatory in production despite reading as optional: rate limiting fails _closed_, so without them every `/api/v2/*` answers 500 while the pages render fine.

### Spec and tickets

**Confluence is the source of truth** for Requirements / Decisions / Architecture — not the repo. The in-repo copies were deliberately deleted (commit `0e753c07`) because they had drifted into a competing spec; don't recreate them. Page IDs and the Jira project (`ETNI`) are in `docs/confluence-spec/config.json`. Requirements live in twelve sub-pages under the Requirements parent — reading the parent alone will make you re-allocate an existing REQ number.

Project skills wrap the loop: `/ethniafrica-spec` (investigate → draft Pending REQ/DEC/ARCH + Jira tickets), `/ethniafrica-ticket` (take a Jira ticket end-to-end in an isolated worktree), `/ethniafrica-audit`, `/ethniafrica-release`.

Ferry (`ferry.config.yaml`) drives agent automation off Jira status transitions on ETNI — Refinement → READY FOR DEV → In Review → Changes Requested → TO MERGE — branching `ferry/*` off `recette`.

### Test placement

Colocated `__tests__/` next to the code: `src/lib/**`, `src/api/v2/**`, `src/app/api/v2/__tests__/`, `src/components/**`, `eslint/__tests__/`. Known-failing tests are quarantined under any `__tests__/known-failing/` directory (excluded in `vitest.config.ts`) rather than deleted, so the gate cannot mask new regressions.

### Development principles

TDD (failing test first) and KISS. Tests exercise the public interface — no reflection into internals, no mock-everything suites that assert nothing. Comments justify non-obvious decisions; they never narrate what the code already says. All docs, comments, commit messages and PR descriptions in **English**, even when the conversation is in French.

### Environment

Copy `.env.example` → `.env.local`. Required to run: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only). Required for reporting to work at all: `ANTIBOT_HMAC_SECRET` (server-only, any long random string) — **not** inert when unset, `GET /api/v2/antibot/challenge` answers 503 and every report dialog dies on "la vérification n'a pas abouti" while the build stays green. It replaced `CLOUDFLARE_TURNSTILE_SECRET_KEY`, which no longer exists. Optional subsystems: `UPSTASH_REDIS_REST_*` (rate limiting), `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `ANTIBOT_DIFFICULTY_BITS`, `REVALIDATE_SECRET`, `SUPABASE_WEBHOOK_SECRET`, `NEXT_PUBLIC_FEATURE_QUIZ`. The CI build passes placeholder Supabase values so fork and Dependabot PRs still gate.

Admin auth is Supabase Auth (magic-link, GitHub, Google OAuth); roles live in `user_roles` with values `reader`, `contributor`, `moderator`, `admin`, `advisor`. First admin: `ADMIN_EMAIL=… npx tsx scripts/seedAdmin.ts`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
