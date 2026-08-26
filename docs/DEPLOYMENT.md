# Deployment guide

How an EthniAfrica change reaches users, and what an operator has to do by hand.

The short version: **the application deploys itself, the database does not.** Vercel builds and
serves whatever is on the branch. Every schema change and every corpus load is a manual,
two-step operation that no pipeline performs for you.

---

## Environments

| Environment | Branch    | Supabase project                           | Notes                                         |
| ----------- | --------- | ------------------------------------------ | --------------------------------------------- |
| Local       | any       | your own project, or a shared one          | `.env.local`, never committed                 |
| Recette     | `recette` | `shmrjtnfbqzceovroqjj`                     | the integration environment; protected branch |
| Production  | `main`    | a second project, ref not recorded in-repo | serves `ethniafrica.com`                      |

**Both Supabase projects call their environment "production", and neither label means what it
looks like.** A Supabase project has exactly one environment, and Supabase names it
"production" — there is no staging branch inside a project. The label therefore describes the
project's own environment, not the application environment it serves. `shmrjtnfbqzceovroqjj`
serves **recette**; the production application is served by the other project, whose ref is not
recorded in this repository. Before touching a database, read
[`runbooks/migration-state.md`](./runbooks/migration-state.md) — it carries the project
identity table, the applied-migration state, and the two-step rollout rule.

The AFRIK corpus sync used to hard-code `shmrjtnfbqzceovroqjj` as its "production" target, so
every production deploy loaded the corpus into recette and then revalidated `ethniafrica.com`,
a site it had not written to. That is fixed. `scripts/lib/afrikSyncTarget.ts` now resolves
`--target=recette` against a checked-in recette ref and `--target=production` against the
`AFRIK_PRODUCTION_SUPABASE_URL` environment variable, with no default and an outright refusal
if it is configured as the recette project. `.github/workflows/production-data-sync.yml`
supplies it from two repository secrets belonging to the production project —
`PRODUCTION_SUPABASE_URL` and `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` — and fails, rather than
skipping, when either is missing.

---

## Deploying the application

Vercel is connected to the repository and deploys on push:

- a push to `recette` produces the recette deployment;
- a push to `main` produces the production deployment.

There is no `vercel.json` in the repository — build settings and environment variables live in
the Vercel project. `next.config.ts` wraps the config in `withSentryConfig`, which uploads
source maps when `SENTRY_AUTH_TOKEN` is present and deletes them after upload, so the browser
never serves them.

Both branches are protected. Every change arrives through a pull request; `recette → main` sync
PRs must use a **merge commit**, never a squash.

### Tagging

`npm run` has no release script. Versioning is a marker only — the tag records what shipped, it
does not trigger the deploy. The `/ethniafrica-release` project skill bumps `package.json`,
updates `CHANGELOG.md` and creates the annotated tag on `main`.

---

## What CI gates before a merge

`.github/workflows/ci.yml` runs on every pull request targeting `recette` or `main`, as two
jobs:

- **gitleaks** — scans the PR's working tree (`--no-git`) against `.gitleaks.toml`.
- **build** — `npm run lint`, `lint:req`, `check:jira-template`, `check:action-pins`,
  `check:env-example`, `typecheck`, `format:check`, `test:coverage`, `test:charter-contracts`,
  then `npm run build`.

The build step passes placeholder Supabase values so that fork and Dependabot PRs, which have
no access to secrets, still gate. The Supabase modules validate their configuration at module
scope and throw when it is missing; the placeholders only need to parse, nothing queries the
database during a build.

Separate workflows carry the heavier domain gates: `a11y.yml`, `lighthouse.yml`, `e2e.yml`,
`data-integrity.yml`, `editorial-rules.yml`, `openapi-diff.yml`, `storybook-deploy.yml`.

> Which of these are _required_ contexts on `recette` and `main` is a branch-protection
> setting, not a repository file — check it on GitHub rather than inferring it from this list.
> A workflow that runs but cannot block a merge is not a gate.

Run the same gate locally before pushing:

```bash
make check        # lint + typecheck + format:check + all tests, must stay under 5 min
npm run e2e       # Playwright, deliberately outside `make check`
```

---

## Environment variables

`.env.example` is the annotated, authoritative list — copy it, do not copy this section.

```bash
cp .env.example .env.local
```

Required for the app to run at all:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never expose it to the browser bundle

Optional subsystems, each inert when unset: `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` (rate limiting), `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`,
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `CLOUDFLARE_TURNSTILE_SECRET_KEY`, `REVALIDATE_SECRET`,
`SUPABASE_WEBHOOK_SECRET`, `NEXT_PUBLIC_FEATURE_QUIZ`, `CORS_ALLOWED_ORIGIN`.

`AFRIK_PRODUCTION_SUPABASE_URL` is loader-only: set it only when syncing the AFRIK corpus with
`--target=production`. Its CI counterparts, `PRODUCTION_SUPABASE_URL` and
`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`, are GitHub Actions repository secrets read only by
`.github/workflows/production-data-sync.yml` — they are never local environment variables.

`scripts/checkEnvExample.ts` compares `.env.example` against the variables the code actually
reads. Run it after adding any `process.env` reference.

### Rate limiting `/api/v2/*`

`src/middleware.ts` applies Upstash rate limiting. Without `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN`, the limiter is disabled — acceptable locally, not in production.

| Variable                 | Meaning                                                        | Default |
| ------------------------ | -------------------------------------------------------------- | ------- |
| `RATE_LIMIT_IP_RPM`      | anonymous requests per IP                                      | `60`    |
| `RATE_LIMIT_PUBLIC_RPM`  | a `public`-tier API key                                        | `600`   |
| `RATE_LIMIT_PARTNER_RPM` | a `partner`-tier API key                                       | `6000`  |
| `RATE_LIMIT_WINDOW`      | window accepted by `@upstash/ratelimit` (`"1 m"`, `"30 s"`, …) | `"1 m"` |

The tier (`public` / `partner` / `admin`) comes from the `api_keys.tier` column (migration
`013`), resolved by `validateApiKey()`. There is no key list to maintain in the environment.
Same-origin requests are exempt from API-key validation, so the frontend embeds no key.

---

## Database changes

Schema and data are two different operations with two different runbooks. Neither is automated.

### Schema

Read [`runbooks/migration-state.md`](./runbooks/migration-state.md) first. It records which
migrations are live on which project and why "the ticket is Done" has already meant "the
migration was never applied".

The rule, in one line: **apply to the recette-backing project, verify against the recette
application, then apply the same file to the production-backing project.** Never one alone,
never production first.

Migrations are numbered sequentially in `supabase/migrations/`. The highest-numbered file is not
necessarily the highest-numbered applied migration — that gap is the whole subject of the
runbook.

### AFRIK corpus

The editorial corpus lives as ~890 JSON fiches under `dataset/source/afrik/`, in git. Loading
it into Supabase is a separate step, documented in
[`runbooks/afrik-data-sync.md`](./runbooks/afrik-data-sync.md).

Validate before loading anything:

```bash
npx tsx scripts/validateAfrikData.ts        # AFRIK data integrity
npx tsx scripts/ci/checkEditorialRules.ts   # decolonial editorial rules
```

Then preview, then apply:

```bash
npx tsx scripts/migrateAfrikToDatabase.ts --target=production
npx tsx scripts/migrateAfrikToDatabase.ts --target=production --apply
```

`--target` names the application environment: `recette` or `production`. `--target=recette`
resolves to `shmrjtnfbqzceovroqjj`; `--target=production` resolves to whatever
`AFRIK_PRODUCTION_SUPABASE_URL` names, and refuses to run if that is unset or is the recette
project. `NEXT_PUBLIC_SUPABASE_URL` must match the resolved target, so loading production by
hand means pointing both variables at the production project. `--target=staging` is retired and
now throws.

`.github/workflows/production-data-sync.yml` runs the same validate → preview → apply sequence
automatically after a successful Vercel _Production_ deployment of `main`, then POSTs a cache
revalidation to `https://ethniafrica.com/api/admin/revalidate`. It reads
`PRODUCTION_SUPABASE_URL` and `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` — both the production
project's, both distinct from the recette values the rest of CI uses — and fails if either is
absent.

Requires **Node ≥ 22** for the loaders: `@supabase/supabase-js` needs a native `WebSocket`, and
on Node 20 the run dies with `native WebSocket not found` before the target guard is reached.
(The application itself pins Node `20.x` in `package.json` `engines` — the loaders are the
exception.)

---

## First admin user

Roles live in `user_roles` (migration `008`) with values `reader`, `contributor`, `moderator`,
`admin`, `advisor`. Authentication is Supabase Auth: magic link, GitHub and Google OAuth.

1. The person signs in once at `/admin/login` so their auth account exists.
2. Grant the role:

   ```bash
   ADMIN_EMAIL=admin@example.com npx tsx scripts/seedAdmin.ts
   # or
   npx tsx scripts/seedAdmin.ts admin@example.com
   ```

3. Confirm the `user_roles` row shows `role = 'admin'`.

---

## Post-deploy verification

- [ ] The deployment is green in Vercel and the site loads.
- [ ] `/fr` renders — the middleware canonicalizes every locale segment to `fr`.
- [ ] A fiche route renders for each entity type: a country, a people, a language family.
      _A green axe check has previously masked an HTTP 500 on every fiche route for two
      releases. Load one for real._
- [ ] `/api/v2/countries` returns 200 from the browser (same-origin, no API key) and 401
      without a key from `curl`.
- [ ] Sentry shows no new issue class in the first 30 minutes.
- [ ] If a migration shipped in this release: its state table row in
      [`runbooks/migration-state.md`](./runbooks/migration-state.md) is updated for **both**
      projects.

---

## Rollback

**Application.** Redeploy the previous deployment from the Vercel dashboard. Nothing else is
required — the frontend holds no state.

**Database.** Migrations are not generally reversible; several drop tables and their data.
Restore from a snapshot rather than hand-writing a down migration. See
[`runbooks/restore-procedure.md`](./runbooks/restore-procedure.md) for PITR and logical
restore, with the RTO/RPO targets that apply.

An application rollback without a database rollback is usually the safer combination: the
previous build tolerates a newer schema far more often than the reverse. Roll the app back
first, then decide about the data.

---

## Troubleshooting

**`Missing Supabase environment variables`** — the Supabase modules validate at module scope.
Check `.env.local` exists and is loaded; a typo reads as absent.

**API returns 401 from `curl` but works in the browser** — expected. `src/middleware.ts`
exempts same-origin requests from API-key validation. Pass a key, or call from the app.

**`22P02` on `migration_events.event_type`** — migration `037` is not applied on that project.
See [`runbooks/migration-state.md`](./runbooks/migration-state.md).

**`42P17` recursion on an anonymous read** — migration `038` is not applied on that project.
The service-role key masks this, because it bypasses RLS entirely; reproduce with the anon key.

**`no unique or exclusion constraint matching the ON CONFLICT specification`** — migration
`039` is not applied, or `sources_title_key` was dropped by a later table recreation.

**A corpus loads fewer rows than there are files** — a parser rejection, not a database
problem. The preview output reports the per-corpus parse count and a `Failed to parse` line.
Compare against the files on disk before applying.

**A route renders an empty state while row counts are non-zero** — the rows are there and RLS
is blocking the read. Test with the anon key, never the service role.

---

## Related

- [`runbooks/migration-state.md`](./runbooks/migration-state.md) — which migrations are live where
- [`runbooks/afrik-data-sync.md`](./runbooks/afrik-data-sync.md) — loading the corpus
- [`runbooks/restore-procedure.md`](./runbooks/restore-procedure.md) — backup restore, RTO/RPO
- [`runbooks/revisions-dba-bypass.md`](./runbooks/revisions-dba-bypass.md) — overriding the append-only invariant
- [`../CLAUDE.md`](../CLAUDE.md) — architecture and repository conventions
