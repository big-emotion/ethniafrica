# Runbook — self-hosted Plausible Analytics

How `stats.ethniafrica.com` runs, and how it feeds the app's own analytics toggle.

---

## The host

Same VPS as the app itself — see [`ovh-production-deploy.md`](ovh-production-deploy.md) for
address, port and the `proxy` network convention. Plausible is its own compose project,
`/srv/plausible`, on the same **one project per application** pattern as `ethniafrica`,
`b2b-portal` and `big-emotion` — nothing here can take another application down with it.

|                  |                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Compose file     | [`infra/plausible/docker-compose.yml`](../../infra/plausible/docker-compose.yml) (this repo) |
| Deploy directory | `/srv/plausible` — not a git clone, just the compose file, `clickhouse/` config, and `.env`  |
| Public URL       | `https://stats.ethniafrica.com`                                                              |
| Upstream         | [plausible/hosting](https://github.com/plausible/hosting), Community Edition v3.2.1          |

`docker-compose.yml` and `clickhouse/*.xml` are vendored from upstream as-is; the only
departure is the Traefik wiring (TLS terminates at Traefik, not at Plausible's own
Let's Encrypt — the two would otherwise fight over ports 80/443, which Traefik already owns
on this host).

## DNS

`stats.ethniafrica.com` needs an **A record to `51.195.82.98`**, added wherever
`ethniafrica.com`'s DNS is managed. A stale wildcard (`*.ethniafrica.com` → Vercel, left
over from before `vercel.json` disabled auto-deploys) still answers for any subdomain
without its own record — the specific record above overrides it for `stats`, but nothing
else needs touching.

## Deploying / updating

There is no GitHub Actions workflow for this yet (unlike the app's release-triggered
deploy) — it's a manual `docker compose` on the host:

```console
$ ssh -p 49152 ubuntu@51.195.82.98
$ cd /srv/plausible
# first time only: create .env from infra/plausible/env.example in the repo, with
# SECRET_KEY_BASE generated on the host — never paste a secret into this session:
$ openssl rand -base64 48   # → SECRET_KEY_BASE
$ openssl rand -base64 32   # → TOTP_VAULT_KEY (optional, else derived from the above)
$ docker compose up -d
```

To pick up an upstream Plausible release, bump the image tag in
`infra/plausible/docker-compose.yml` (repo PR, like any other change here). `/srv/plausible`
is not a git clone, so copy the updated `docker-compose.yml` and `clickhouse/` over to the
host by hand, then `docker compose up -d`.

## First admin account, and inviting others

`DISABLE_REGISTRATION=invite_only` (the default) makes an exception for the very first
account: visit `https://stats.ethniafrica.com/register` while the user table is empty and
that registration succeeds. Every account after that needs an invite sent from inside the
dashboard (Site → Team → Invite). There is no billing, no third-party account, no payment
method — it's a login you create on your own instance.

## Wiring it to the app

The app side is already built (`src/lib/plausible.ts`, `src/components/PlausibleScript.tsx`,
the consent banner) — see [`docs/design/`](../design/) if the consent UI itself needs
changing. Activating it in production means setting, in `/srv/ethniafrica/.env` (the app's
own env file, **not** this one):

```env
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=ethniafrica.com
NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN=https://stats.ethniafrica.com
```

These are `NEXT_PUBLIC_*` — inlined into the client bundle at **Docker build time**, not
read at runtime. Setting them takes effect on the _next_ image build (the next Release
deploy, or a manual `docker compose build ethniafrica` on the host), never by editing `.env`
alone.

## Data volume and cost

ClickHouse config under `infra/plausible/clickhouse/` is the upstream "low resources"
profile — `max_threads: 1`, small mark cache — sized for a VPS this size, not for high
traffic. If EthniAfrica's traffic grows enough for this to matter, revisit those files
against <https://clickhouse.com/docs/en/operations/tips#using-less-than-16gb-of-ram> before
assuming a slowdown is a bug.
