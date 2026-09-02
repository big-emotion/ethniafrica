# Deployment guide

How an EthniAfrica change reaches users, and what an operator has to do by hand.

The short version: **publishing a GitHub Release deploys the application; the database does
not follow by itself.** Nothing else ships — not a push, not a tag. Every schema change is a
manual, two-step operation that no pipeline performs for you.

---

## Environments

| Environment | Ships when                                  | Hosted on                          | Supabase project                           |
| ----------- | ------------------------------------------- | ---------------------------------- | ------------------------------------------ |
| Local       | —                                           | your machine                       | your own project, or a shared one          |
| Recette     | `deploy-preview-recette.yml` is run by hand | Vercel preview                     | `shmrjtnfbqzceovroqjj`                     |
| Production  | a GitHub Release is published               | OVH VPS, Gravelines `51.195.82.98` | a second project, ref not recorded in-repo |

Neither environment deploys on a push any more. `recette` is still the integration branch and
`main` is still what a release is tagged from — but the branch no longer triggers anything.

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

**Production is self-hosted on an OVH VPS in Gravelines (`51.195.82.98`), not on Vercel.**

```
git push origin main          →  nothing
git push origin v<version>    →  nothing
gh release create v<version>  →  deploy-production.yml  →  ethniafrica.com
                                       │
                                       └─ on success ─→ production-data-sync.yml
```

`.github/workflows/deploy-production.yml` listens on `release: published` and nothing else. It
opens an SSH session to the VPS, checks out the released tag in `/srv/ethniafrica`, and runs
`docker compose build && up -d` against the repository's own [`Dockerfile`](../Dockerfile) and
[`docker-compose.yml`](../docker-compose.yml). It skips pre-releases. It has no
`workflow_dispatch`: production is not deployable from a dropdown.

Full procedure, secrets, host layout and **rollback**:
[`runbooks/ovh-production-deploy.md`](./runbooks/ovh-production-deploy.md).

Vercel still hosts the **recette preview**, but nothing about it is automatic.
[`vercel.json`](../vercel.json) sets `git.deploymentEnabled: false`, which turns off every
commit-triggered build — the volume that exhausted the Hobby plan's deployment quota once
several agent sessions began pushing in parallel, until the rate limit landed on `main` itself.
Build a preview by running `deploy-preview-recette.yml` from the Actions tab; it calls a Vercel
Deploy Hook, which is an explicit trigger rather than a commit-driven one.

`next.config.ts` sets `output: "standalone"` for the Docker image and wraps the config in
`withSentryConfig`, which uploads source maps when `SENTRY_AUTH_TOKEN` is present and deletes
them after upload, so the browser never serves them.

Both branches are protected. Every change arrives through a pull request; `recette → main` sync
PRs must use a **merge commit**, never a squash. `main` matters more than usual now:
`workflow_run` only fires for workflow files that live on the default branch, so
`production-data-sync.yml` cannot chain off the deploy until both files are on `main`.

### Tagging

`npm run` has no release script. The `/ethniafrica-release` project skill bumps
`package.json`, updates `CHANGELOG.md`, creates the annotated tag on `main`, pushes both, and
then publishes the GitHub Release — which is the step that actually deploys. Stopping after the
tag bumps a version and ships nothing.

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

Required for a reader to report an error:

- `ANTIBOT_HMAC_SECRET` — **server-only**, any long random string. It signs the proof-of-work
  challenge that stands in front of `POST /v2/flags`.

  It is not inert when unset, which is why it is listed here and not below.
  `GET /api/v2/antibot/challenge` answers **503** without it, the report dialog shows _"la
  vérification n'a pas abouti"_, and no reader can file anything — on a build whose every
  other check is green. That is exactly what happened when the proof of work replaced
  Cloudflare Turnstile: the secret was added to `.env.example` and this list still named the
  vendor that had just been removed, so nobody knew there was a new secret to set. Rotating it
  is harmless — challenges in flight are invalidated and readers are handed new ones.

  **Generating one.** Any long random string; 48 random bytes is ample.

  ```bash
  openssl rand -base64 48 | tr -d '\n' > antibot-secret.txt   # umask 077 first
  ```

  **Setting it.** In production it is a line in `/srv/ethniafrica/.env` on the VPS; on the
  recette preview it is a Vercel environment variable; locally it is in `.env.local`. It is
  read only on the server, so it never needs a `NEXT_PUBLIC_` twin.

  ```bash
  # production — generate it on the host so the value never travels
  ssh -p 49152 ubuntu@51.195.82.98
  openssl rand -base64 48 | tr -d '\n'    # paste into /srv/ethniafrica/.env
  cd /srv/ethniafrica && docker compose up -d ethniafrica

  # recette preview
  tr -d '\n' < antibot-secret.txt | vercel env add ANTIBOT_HMAC_SECRET preview
  ```

  Then **rebuild** — neither a `.env` line nor a Vercel variable reaches a build that
  already ran. On the VPS that means `docker compose up -d`; on Vercel, a fresh run of
  `deploy-preview-recette.yml`.

  **Checking parity without printing the secret.** The value must be identical across
  environments, or a challenge minted by one and verified by another is refused. Compare
  fingerprints rather than values:

  ```bash
  shasum -a 256 antibot-secret.txt | cut -c1-16
  ```

  **Rotation is harmless and needs no window.** Challenges in flight are invalidated and
  their readers are handed new ones; nothing durable is signed with it. Rotate on the usual
  schedule, or immediately if the value is ever printed into a log, a terminal transcript or
  a pull request.

  Verify it after every deploy, on each environment:

  ```bash
  curl -s https://<host>/api/v2/antibot/challenge | head -c 200   # expect salt + signature, not UNAVAILABLE
  ```

  A 200 with a `salt` proves the secret is set. It does **not** prove the two environments
  agree — only a report that actually sends does that.

Required in production, whatever their reputation as an optional extra:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

  Rate limiting **fails closed**. `checkUpstashConfigured()` in `src/lib/api/rate-limit.ts`
  answers **500** on a production deployment when either is missing, rather than serving
  unlimited traffic — a deliberate choice, since failing open would silently remove all rate
  limiting. Outside production it logs a warning and lets the request through.

  What decides "production" changed with the move off Vercel. `isProductionDeployment()`
  prefers `VERCEL_ENV`, which no longer exists, and falls back to `NODE_ENV` — which the
  Docker image sets to `production`. So on the VPS these two are mandatory: without them
  every `/api/v2/*` request answers 500 while the pages themselves render perfectly, which is
  a difficult failure to read from the outside.

Optional subsystems, each genuinely inert when unset: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`,
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `ANTIBOT_DIFFICULTY_BITS` (defaults to 20),
`REVALIDATE_SECRET`, `SUPABASE_WEBHOOK_SECRET`, `NEXT_PUBLIC_FEATURE_QUIZ`,
`CORS_ALLOWED_ORIGIN`.

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
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=production
npx tsx --conditions=react-server scripts/migrateAfrikToDatabase.ts --target=production --apply
```

`--target` names the application environment: `recette` or `production`. `--target=recette`
resolves to `shmrjtnfbqzceovroqjj`; `--target=production` resolves to whatever
`AFRIK_PRODUCTION_SUPABASE_URL` names, and refuses to run if that is unset or is the recette
project. `NEXT_PUBLIC_SUPABASE_URL` must match the resolved target, so loading production by
hand means pointing both variables at the production project. `--target=staging` is retired and
now throws.

`.github/workflows/production-data-sync.yml` runs the same validate → preview → apply sequence
automatically after a **successful OVH production deploy** — it is chained to
`deploy-production.yml` with `workflow_run` and runs only when that concluded `success`, so a
failed deploy leaves the production corpus untouched. It then POSTs a cache revalidation to
`https://ethniafrica.com/api/admin/revalidate`. It reads
`PRODUCTION_SUPABASE_URL` and `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` — both the production
project's, both distinct from the recette values the rest of CI uses — and fails if either is
absent.

Requires **Node ≥ 22** for the loaders: `@supabase/supabase-js` needs a native `WebSocket`, and
on Node 20 the run dies with `native WebSocket not found` before the target guard is reached.
(The application itself pins Node `20.x` in `package.json` `engines` — the loaders are the
exception.)

---

## First moderator

Access to `/fr/admin` is an address on `admin_allowlist` — not a role, and not an
account, because the atlas has no public accounts. Put the address on the list, then
have the person request a link at `/fr/admin/connexion`:

```bash
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npx tsx scripts/seedAdminAllowlist.ts moderation@example.org "Responsable éditorial de la modération"
```

The magic link only works once Supabase Auth's redirect allow-list carries this
environment's `/api/auth/callback`; otherwise Supabase silently substitutes the
project's Site URL. Full procedure and the failure modes:
`docs/runbooks/moderation-access.md`.

## Legacy `user_roles`

Roles live in `user_roles` (migration `008`) with values `reader`, `contributor`, `moderator`,
`admin`, `advisor`. They gated the legacy `/admin/contributions` workspace, which was removed
when contributions became flags (migration `081`), and they open no door in the moderation
console — access there is membership of `admin_allowlist`. Nothing reads `user_roles` today.

1. The person signs in once at `/fr/admin/connexion` so their auth account exists.
2. Grant the role:

   ```bash
   ADMIN_EMAIL=admin@example.com npx tsx scripts/seedAdmin.ts
   # or
   npx tsx scripts/seedAdmin.ts admin@example.com
   ```

3. Confirm the `user_roles` row shows `role = 'admin'`.

---

## Post-deploy verification

- [ ] The `deploy-production.yml` run concluded `success` and the site loads. A published
      Release with a failed deploy is not a shipped release.
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

**Application.** A host-side operation on the VPS, not a re-run of any workflow and not a
re-published Release. Each deploy renames the outgoing image `ethniafrica:previous`, so going
back is two commands and about ten seconds. Only one generation is kept. Full procedure —
including rebuilding an older tag and the DNS fallback to Vercel — is in
[`runbooks/ovh-production-deploy.md`](./runbooks/ovh-production-deploy.md). Nothing else is
required: the frontend holds no state.

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

- [`runbooks/ovh-production-deploy.md`](./runbooks/ovh-production-deploy.md) — the production host, its secrets, and **rollback**
- [`runbooks/migration-state.md`](./runbooks/migration-state.md) — which migrations are live where
- [`runbooks/afrik-data-sync.md`](./runbooks/afrik-data-sync.md) — loading the corpus
- [`runbooks/restore-procedure.md`](./runbooks/restore-procedure.md) — backup restore, RTO/RPO
- [`runbooks/revisions-dba-bypass.md`](./runbooks/revisions-dba-bypass.md) — overriding the append-only invariant
- [`../CLAUDE.md`](../CLAUDE.md) — architecture and repository conventions
