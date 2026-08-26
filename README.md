# EthniAfrica

An open, sourced atlas of African peoples, languages, linguistic families and countries —
published in French, organised by the **AFRIK methodology**, written from a decolonial
editorial posture.

Every claim carries its source. Colonial-era names are kept and explained rather than quietly
dropped, and the autonym — what a people calls itself — is always surfaced alongside the
exonym.

- Site: <https://ethniafrica.com>
- Repository: <https://github.com/big-emotion/ethniafrica>
- API docs: `/docs/api` (Swagger UI) · `/api/docs` (OpenAPI JSON)

---

## Getting started

Node **20.x** (`package.json` `engines`). The AFRIK data loaders are the one exception and need
Node ≥ 22 — see [`docs/runbooks/afrik-data-sync.md`](docs/runbooks/afrik-data-sync.md).

```bash
git clone https://github.com/big-emotion/ethniafrica.git
cd ethniafrica
npm install
cp .env.example .env.local     # then fill in the three required values below
npm run dev                    # http://localhost:3000
```

The app redirects `/` to `/fr`. Without Supabase credentials the pages render but data-backed
routes fail — the modules validate their configuration at import time and throw when it is
missing.

Three variables are required to run:

| Variable                        |                                                          |
| ------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | your Supabase project URL                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser-safe anon key                                    |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server-only** — never let this reach the client bundle |

Everything else is optional and inert when unset: Upstash (rate limiting), Sentry, Plausible,
Turnstile, the quiz feature flag. `.env.example` is annotated and authoritative;
`npm run check:env-example` keeps it honest against what the code actually reads.

---

## The data model

The corpus lives as **~890 JSON fiches in git**, under `dataset/source/afrik/` — not only in
the database. The files are the editorial source of truth; Supabase is a projection of them.

```
linguistic family  →  language  →  people  →  country
   FLG_*              ISO 639-3     PPL_*     ISO 3166-1 alpha-3
```

```
dataset/source/afrik/
  famille_linguistique/FLG_*.json
  peuples/FLG_*/PPL_*.json
  pays/*.json
  {relations,noms,migrations}/
        ↓  src/lib/afrik/loaders/*JsonLoader.ts
  afrik_language_families · afrik_languages · afrik_peoples
  afrik_countries · afrik_people_countries
```

Each fiche's shape is fixed by a strict model in `public/modele-*.json` (peuple, pays,
linguistique, nom, relation, source, migration, récit-oral, frontière-coloniale). Never skip,
rename or invent a section.

Every `sources` entry carries a tier, and `scripts/validateAfrikData.ts` enforces it. Editorial
work on fiches has its own guidance in `.claude/skills/afrik-curator/`; the rules the validator
and `scripts/ci/checkEditorialRules.ts` apply are documented in
[`CLAUDE.md`](CLAUDE.md#source-tier-policy-enforced-by-validateafrikdatats).

---

## The public API

**`/api/v2` only.** V1 (`/api/regions`, `/api/ethnicities`) was removed with the schema behind
it; anything that mentions regions or ethnicities as entities is stale.

Resources under `/api/v2/`: `countries`, `peoples`, `language-families`, `relations`,
`migrations`, `names`, `oral-narratives`, `sources`, `reference-library`, `search`, `compare`,
`confidence`, `doctrine`, `flags`, `quiz`, `feed`, `keys`.

```bash
curl http://localhost:3000/api/v2/countries
curl http://localhost:3000/api/v2/countries/NGA
curl "http://localhost:3000/api/v2/peoples?limit=5"
curl http://localhost:3000/api/v2/language-families/FLG_BANTU
```

Every endpoint splits across three layers — route (HTTP, CORS, cache headers) → handler
(business logic, serialization) → service (the only layer that talks to Supabase) — plus the
OpenAPI spec in `src/lib/api/openapiV2.ts`, which `npm run openapi:diff` gates against
breaking changes.

Requests from another origin need an API key; same-origin requests are exempt, so the frontend
embeds no key. Rate limits apply per key tier. Bulk exports: `/api/download?format=csv` or
`format=excel`.

The site itself is **French-only**. The `[lang]` route segment survives from the multilingual
V1 but only ever resolves to `fr` — `src/middleware.ts` redirects every other locale segment
there. Do not reintroduce `en` / `es` / `pt` branches.

---

## Working on it

```bash
make check        # the gate: lint + typecheck + format:check + all tests (stays under 5 min)
npm run dev
npm run test:watch
npm run storybook # :6006
npm run e2e       # Playwright — deliberately outside `make check`
```

Beyond `make check`, CI runs gates specific to this repository. Run the ones your change
touches before pushing:

| Command                                     | What it protects                                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run lint:req`                          | `@req` traceability — every test needs a `// @req REQ-NNN`, validated against `docs/confluence-spec/req-catalog.json` |
| `npm run check:env-example`                 | `.env.example` matches the variables the code reads                                                                   |
| `npm run check:action-pins`                 | every third-party GitHub Action is SHA-pinned                                                                         |
| `npm run check:jira-template`               | the ticket template still exists and matches                                                                          |
| `npm run test:charter-contracts`            | the design-charter contract suite                                                                                     |
| `npx tsx scripts/validateAfrikData.ts`      | AFRIK corpus integrity                                                                                                |
| `npx tsx scripts/ci/checkEditorialRules.ts` | decolonial editorial rules on fiches                                                                                  |

Two things about that list are easy to get wrong:

- **Never delete `docs/confluence-spec/*.json` or `docs/templates/jira-ticket-template.md`.**
  With the catalog missing, `lintReqAnnotations.ts` returns early and reports OK while checking
  nothing — a silently disarmed gate, which is worse than a red one.
- Custom ESLint rules live in `eslint/rules/` under the `afh` plugin, and their own tests are
  `.js` files listed explicitly in `vitest.config.ts`. They once fell outside the glob and never
  ran, which is how a broken rule shipped.

TypeScript runs with `strict: false` and `strictNullChecks: false`. The compiler will not catch
nullability here — **the tests are the real gate.** Write the failing test first.

### Contributing

`recette` is the integration branch, `main` is the base. Both are protected: branch and open a
pull request, never push directly. Conventional commits (commitlint on `commit-msg`).
`recette ↔ main` sync PRs need a **merge commit**, not a squash.

Requirements, decisions and architecture live on **Confluence**, not in this repository — see
[`docs/adr/README.md`](docs/adr/README.md) for where and why. Tickets are in the Jira project
`ETNI`.

Data corrections are welcome as pull requests against the fiches in `dataset/source/afrik/`, or
through the site: `/fr/contribute` to propose a change, `/fr/report-error` to flag one.

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · TanStack Query · Supabase
(PostgreSQL, Auth, RLS) · Vitest + Playwright · Storybook (`@storybook/react-vite`, **not**
`@storybook/nextjs` — Next 16 dropped `next/config`; installs need `--legacy-peer-deps`).

Design tokens are CSS custom properties in `src/styles/tokens/`. Colours belong in tokens, not
literals, and the charter contract suite asserts it. Mobile-first is mandatory: mobile 430px ·
tablet `md` 720px · desktop `xl` 800px.

---

## Documentation

|                                                                        |                                                                                           |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                               | architecture, conventions, and the non-obvious rules — read this before changing anything |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)                             | how a change reaches users, and what an operator does by hand                             |
| [`docs/runbooks/migration-state.md`](docs/runbooks/migration-state.md) | which Supabase migrations are live on which project, and the two-step rollout rule        |
| [`docs/runbooks/`](docs/runbooks/)                                     | restore, corpus sync, DBA overrides                                                       |
| [`docs/adr/README.md`](docs/adr/README.md)                             | where architecture decisions live now                                                     |
| [`CHANGELOG.md`](CHANGELOG.md)                                         | release history                                                                           |

**Operators, read this first:** both Supabase projects label their environment "production",
because a Supabase project has exactly one environment and Supabase names it that — the label
describes the project, not the application it serves. `shmrjtnfbqzceovroqjj` backs recette; a
second project backs production. Every migration is a two-step rollout, recette first. Applying
one and calling it done has already left a corpus loaded on one database and missing on the
other.

---

## Licence

Open source. See the repository for terms.
