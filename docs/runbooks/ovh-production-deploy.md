# Runbook — OVH production deploy and rollback

How `ethniafrica.com` is built, shipped, and put back the way it was.

The short version: **publishing a GitHub Release is the deploy.** Nothing else ships. A
push does not, a tag does not, and there is no button.

---

## The host

|                  |                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Provider         | OVH VPS, **Gravelines**                                                                    |
| Address          | `51.195.82.98`, SSH on port **49152** (not 22)                                             |
| Login            | `ubuntu`, sudo without a password                                                          |
| Deploy directory | `/srv/ethniafrica` — a clone of `big-emotion/ethniafrica`, checked out at the released tag |
| Reverse proxy    | Traefik `v2.11`, its own compose project at `/home/ubuntu/docker/traefik`                  |
| Shared network   | `proxy`, external, joined by every application                                             |
| Neighbours       | `b2b-portal`, `big-emotion`, `b2b-postgres` — all on the same host                         |

> **The plan that produced this work called this host "Francfort". It is not.**
> `51.195.82.98` is Gravelines; Frankfurt is `145.239.76.125`, a different machine
> running different things. The name was wrong, the address was right, and the address
> is what everything is configured against. If a document says Frankfurt and means
> `51.195.82.98`, it means this host.

The host runs **one compose project per application**, all attached to Traefik's
external `proxy` network. `ethniafrica` follows that convention: its stack is
[`docker-compose.yml`](../../docker-compose.yml) at the repository root, deployed from
`/srv/ethniafrica`. Nothing about this application can take Traefik — or its two
neighbours — down with it.

---

## What deploys, and what does not

```
git push origin main          →  nothing. Vercel auto-deploys are off (vercel.json).
git push origin v3.0.1        →  nothing. The tag is what the Release will point at.
gh release create v3.0.1      →  deploy-production.yml  →  ethniafrica.com
                                        │
                                        └─ on success ─→ production-data-sync.yml
                                                          (AFRIK corpus + cache bust)
```

`.github/workflows/deploy-production.yml` listens on `release: published` and nothing
else. It has no `workflow_dispatch` on purpose: a production deploy that can be started
from a dropdown is a production deploy with no Release to point at afterwards. It skips
pre-releases, so `v1.2.0-rc.1` published as a pre-release ships nothing.

The workflow never checks the code out. It opens an SSH session and the host does the
rest — so the only credential in CI is an SSH key. No Supabase key, no Sentry token,
nothing that could surface in a job log.

`production-data-sync.yml` is chained to it with `workflow_run` and runs only on
`conclusion == 'success'`. **`workflow_run` only fires for workflow files that live on
the default branch**, so both workflows must be on `main` for the chain to exist at all.

---

## Repository secrets

| Secret                           | Value                                   | Why                             |
| -------------------------------- | --------------------------------------- | ------------------------------- |
| `PRODUCTION_OVH_SSH_HOST`        | `51.195.82.98`                          |                                 |
| `PRODUCTION_OVH_SSH_USER`        | `ubuntu`                                |                                 |
| `PRODUCTION_OVH_SSH_PORT`        | `49152`                                 | sshd does not listen on 22 here |
| `PRODUCTION_OVH_SSH_KEY`         | private half of a dedicated ed25519 key | not anyone's personal key       |
| `PRODUCTION_OVH_SSH_KNOWN_HOSTS` | `ssh-keyscan -p 49152` output           | pins the host key               |

`PRODUCTION_OVH_SSH_KNOWN_HOSTS` is not optional and the workflow refuses to run without
it. Its entries are keyed `[51.195.82.98]:49152` — the bracketed form is what a
non-default port produces, and an entry written for port 22 fails host-key verification
rather than merely failing to connect. Without the pin the job would hand a deploy key
to whoever answers on that address.

Rotating the deploy key:

```bash
ssh-keygen -t ed25519 -f ./ethniafrica_deploy -N "" -C "github-actions-deploy@ethniafrica"
ssh-copy-id -i ./ethniafrica_deploy.pub -p 49152 ubuntu@51.195.82.98
gh secret set PRODUCTION_OVH_SSH_KEY --repo big-emotion/ethniafrica < ./ethniafrica_deploy
# then remove the old public key from ~/.ssh/authorized_keys on the host
rm -f ./ethniafrica_deploy ./ethniafrica_deploy.pub
```

---

## `/srv/ethniafrica/.env`

One file, read twice: `docker compose` passes it to the build as a BuildKit secret
mounted at `.env.production.local` — which is how the `NEXT_PUBLIC_*` values get inlined
into the client bundle — and mounts it again as the container's `env_file` at run time.
One file means the build and the runtime cannot disagree about a value.

It never leaves the host. `.dockerignore` keeps every `.env*` out of the build context,
so it cannot reach an image layer, and the Sentry token does not ship inside the image.

`/srv/ethniafrica/.env.template` documents every key. Fill it in and `chmod 600 .env`.
The variables themselves are described in [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — that
is the authoritative list, not this file.

Two of them decide whether the site works at all:

- `ANTIBOT_HMAC_SECRET` — unset, `GET /api/v2/antibot/challenge` answers 503 and every
  reader's report dialog dies on _"la vérification n'a pas abouti"_, while every other
  check stays green.
- `ETHNIAFRICA_TRAEFIK_RULE` — the Traefik host rule, below.

### The host rule, in three stages

Setting this to a hostname whose DNS does not point here yet makes Traefik retry a
failing ACME challenge in a loop. Move through the stages in order.

```bash
# 1. validation, before touching DNS for the apex
ETHNIAFRICA_TRAEFIK_RULE=Host(`next.ethniafrica.com`)

# 2. cutover, after the A record moves
ETHNIAFRICA_TRAEFIK_RULE=Host(`ethniafrica.com`)

# 3. if www is kept
ETHNIAFRICA_TRAEFIK_RULE=Host(`ethniafrica.com`) || Host(`www.ethniafrica.com`)
```

Apply a change with `cd /srv/ethniafrica && docker compose up -d ethniafrica`.

---

## Normal deploy

Use `/ethniafrica-release`. It bumps the version, writes the changelog, tags, pushes,
and publishes the Release — in that order, with one confirmation covering all of it.

By hand, the same thing:

```bash
git push origin main
git push origin v<version>
gh release create v<version> --repo big-emotion/ethniafrica \
  --title "v<version>" --notes-file <notes>
gh run watch --repo big-emotion/ethniafrica "$(gh run list \
  --repo big-emotion/ethniafrica --workflow deploy-production.yml \
  --limit 1 --json databaseId -q '.[0].databaseId')"
```

**No `--draft`.** A draft Release does not emit `release: published`, deploys nothing,
and looks exactly like success from the terminal.

Then run the post-deploy checklist in [`../DEPLOYMENT.md`](../DEPLOYMENT.md). Load a
fiche for real — a green a11y check has masked an HTTP 500 on every fiche route for two
releases before.

---

## Rollback

Rolling back is a **host-side operation**. It is not a re-run of the deploy workflow,
and re-publishing an older Release is not a rollback either — it would redeploy that
tag's code, which is a different and slower thing.

### The previous image is still there

Each deploy renames the outgoing image `ethniafrica:previous` before the build
overwrites `ethniafrica:live`. Going back is two commands and about ten seconds:

```bash
ssh -p 49152 ubuntu@51.195.82.98
cd /srv/ethniafrica
docker image tag ethniafrica:previous ethniafrica:live
docker compose up -d --no-deps --force-recreate ethniafrica
docker compose logs -f --tail=50 ethniafrica
```

**Only one generation is kept.** After two deploys in a row, the version before last is
gone. Two rollbacks in a row will silently put back the same image the second time —
check what you are restoring:

```bash
docker image inspect ethniafrica:previous --format '{{.Created}} {{.Id}}'
docker image inspect ethniafrica:live     --format '{{.Created}} {{.Id}}'
```

### Rebuilding an older tag

When `:previous` is not the version you want, build it from git:

```bash
cd /srv/ethniafrica
git fetch --tags --force origin
git checkout --force v<older-version>
docker compose build ethniafrica
docker compose up -d --no-deps ethniafrica
```

Slower — a full Next build on the VPS — but it reaches any released version.

### Falling back to Vercel

If the host itself is the problem, put DNS back. This is the slowest option (DNS
propagation) and the one that needs the most care, because the apex record currently
serving traffic is an `ALIAS`, not an `A`.

**Record the record's id before replacing it**, so the `ALIAS` can be rebuilt:

```bash
vercel dns ls ethniafrica.com          # note the id and value of the apex record
```

The state before this migration was an apex `ALIAS` to
`1ede882bbec37744.vercel-dns-017.com`, plus a wildcard `ALIAS` that `www` falls through
to, plus three `CAA` records including `letsencrypt.org` — which is why Traefik can
issue a certificate here at all.

Vercel also has to be able to serve `main` again: `git.deploymentEnabled` in
[`../../vercel.json`](../../vercel.json) is `false`, so either flip it to `true`
temporarily and push, or run `vercel deploy --prod` by hand.

### Database

Not covered here, and usually the wrong thing to roll back. Migrations are frequently
irreversible — several drop tables. See
[`restore-procedure.md`](./restore-procedure.md). Roll the application back first, then
decide about the data: an old build tolerates a newer schema far more often than the
reverse.

---

## Troubleshooting

**The deploy workflow did not run at all.** The Release was saved as a draft — a draft
emits no `release: published` — or it was marked pre-release, which the job skips by
design. Check the Release page, not the Actions tab.

**`Host key verification failed`.** `PRODUCTION_OVH_SSH_KNOWN_HOSTS` is stale or was
generated without `-p 49152`. Regenerate:
`ssh-keyscan -p 49152 -t ed25519,rsa 51.195.82.98`.

**`production-data-sync.yml` never ran after a successful deploy.** `workflow_run` only
fires for workflow files on the **default branch**. Both files have to be on `main`; on
`recette` alone the chain does not exist. Also check that
`PRODUCTION_SUPABASE_SERVICE_ROLE_KEY` is set — the job fails loudly rather than
skipping when it is missing, which is deliberate.

**The build runs out of memory on the VPS.** A Next build is the heaviest thing this
host does. Check `free -g` and whether a neighbour is mid-build; the deploy holds a
`concurrency` group so two of its own runs cannot overlap, but nothing coordinates it
with the other stacks.

**Traefik returns 404 for the site.** The container is not on the `proxy` network, or
`ETHNIAFRICA_TRAEFIK_RULE` is empty — an empty rule produces a router that matches
nothing rather than an error. `docker inspect ethniafrica --format '{{json .Config.Labels}}'`.

**TLS will not issue.** The hostname in the rule does not resolve to `51.195.82.98`
yet. Work through the three stages above rather than pointing at the apex early.

---

## Related

- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — environments, variables, post-deploy checklist
- [`afrik-data-sync.md`](./afrik-data-sync.md) — loading the corpus
- [`migration-state.md`](./migration-state.md) — which migrations are live where
- [`restore-procedure.md`](./restore-procedure.md) — database restore, RTO/RPO
- [`../../.claude/skills/ethniafrica-release/SKILL.md`](../../.claude/skills/ethniafrica-release/SKILL.md) — the release procedure
