# Runbook — self-hosted Plausible Analytics

How the shared collector runs, and how it feeds the app's own analytics toggle. It measures
two properties — `ethniafrica.com` and `big-emotion.com` — so a change here affects both.

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
| Public URLs      | `https://stats.ethniafrica.com` (canonical, `BASE_URL`) and `https://stats.big-emotion.com`  |
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

`stats.big-emotion.com` needs the **same A record to `51.195.82.98`**, in the
`big-emotion.com` zone (OVH, nameservers `ns200/dns200.anycast.me`).

**Order matters.** Traefik's `certresolver` requests a certificate per hostname on the
first request, so the DNS record must resolve _before_ the compose change is applied.
Applying it first means the ACME HTTP challenge fails on every retry, with Let's Encrypt
rate limits waiting at the end of enough of them.

Mind the spelling: the zone is **`big-emotion.com`**, hyphenated. `bigemotion.com` without
the hyphen is a different, parked domain on Media Temple nameservers, owned by someone
else — no subdomain can be created under it.

## One instance, two brands

This collector measures **`ethniafrica.com`** and **`big-emotion.com`** as two properties
of the same Plausible instance. Adding a property is a dashboard action (Sites → Add a
website), not an infrastructure change: a property is keyed by the domain being measured,
never by the hostname the dashboard answers on.

Both hostnames route to it, and both are kept deliberately — `stats.ethniafrica.com` is
what this runbook, the app's `NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN` and every existing
invite link already say, while BIG EMOTION's public page source has to name a BIG EMOTION
host rather than another brand's.

`BASE_URL` stays `https://stats.ethniafrica.com`. It is a single value that Plausible uses
to build invite emails and self-links, so it names one canonical host; the second hostname
serves the dashboard and the script endpoint perfectly well without it. Flipping it to
`stats.big-emotion.com` is a deliberate later step, and only once that host resolves and
holds a certificate — flipping it first would point the dashboard's own links at a name
that does not answer.

BIG EMOTION's side of the wiring — the `<script>` tag, the `PLAUSIBLE_DOMAIN` /
`PLAUSIBLE_HOST` build args and why it sits outside that site's consent manager — lives in
`big-emotion/website`, ADR 0011.

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
