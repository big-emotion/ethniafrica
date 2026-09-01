# Runbook — secret exposure audit of the public history (2026-09-01)

`.github/workflows/ci.yml` scans the working tree with `--no-git` and states, in a comment,
that secrets in already-removed commits are _"a one-time audit + rotation concern"_.
**This is that audit.** It was run on 2026-09-01 against all 2 236 commits on every ref.

The repository is **public**. Anything that ever reached a commit is readable by anyone who
clones it, whether or not a later commit removed it.

---

## Verdict

|                                                     |                                                  |
| --------------------------------------------------- | ------------------------------------------------ |
| **Production credentials exposed**                  | **No.** None, in any form, anywhere in history.  |
| **Recette credentials exposed**                     | **Yes.** Service-role key and Postgres password. |
| **Deploy or infrastructure reachable from a clone** | No.                                              |
| **Working tree at HEAD**                            | Clean.                                           |

---

## Must be rotated

Both are in the public history permanently. **Deleting files does not fix this, and neither
does rewriting history** — a public repository can already have been cloned, forked, or
cached by GitHub's own network view. Rotation is the only remediation that works.

### 1. Recette Supabase `service_role` key — critical

Present in 4 commits. Decoded claims: `role=service_role`, `ref=shmrjtnfbqzceovroqjj`,
expiry 2036.

`service_role` **bypasses Row Level Security entirely**. Anyone holding it has full read and
write access to the recette database, regardless of any policy. This is the one finding that
matches the question "can someone modify the database by cloning the repo": for recette, yes.

Rotate in the Supabase dashboard (Settings → API → _Rotate_), then update, in this order:

- repository secrets `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
- every developer's `.env.local`
- the Vercel preview environment used by `deploy-preview-recette.yml`

### 2. Recette Postgres password — high

Present in commit `6d75c125`. Change it in the Supabase dashboard (Settings → Database) and
update the `RECETTE_SUPABASE_DB_URL` repository secret, which `migrate-recette.yml` reads.

---

## Confirmed clean

Each of these was checked, not assumed.

- **No production credential of any kind.** The production project ref appears in commits, but
  a ref is a public identifier that shows up in ordinary URLs, not a secret. The decisive test
  is whether a JWT _payload_ ever encoded that ref — searching history for the base64 fragment
  `ImphamdnYmVpbWZ1ZHB6Y3h5dGJi` returns nothing. The production Postgres password likewise
  returns zero commits.
- **No `.env` file was ever committed.** `git log --diff-filter=A` over all refs, all history.
- **No SSH or RSA private key** in any commit.
- **No real Anthropic, Supabase PAT, or GitHub token.** The prefixes `sk-ant-`, `sbp_`, `ghp_`
  and `gho_` do appear, but only as prose and configuration — none is followed by a
  token-shaped body. All 69 candidate commits were inspected, not sampled.
- **Working tree at HEAD carries no JWT.**

The strongest of these is not a pattern search. Every blob in every commit on every ref was
decoded, and the whole history contains exactly **one** Supabase JWT identity —
`role=service_role`, `ref=shmrjtnfbqzceovroqjj` — in three files of a single `.entire/`
transcript directory. A fourth JWT-shaped hit is 75 characters and does not decode: it is the
same key truncated by line wrapping in `full.jsonl`, not a second credential. Enumerating
identities this way answers "is production exposed?" outright, where grepping for a project
ref only ever answers "does this string appear somewhere?".

## Why nobody can deploy or reach the infrastructure from a clone

- Deploying requires **publishing a GitHub Release on the upstream repository**, which requires
  write access. `deploy-production.yml` listens on `release: published` and nothing else — it
  has no `workflow_dispatch`, so there is no button either.
- The five `PRODUCTION_OVH_SSH_*` values are GitHub Actions secrets. They are never in the
  repository, and GitHub does not expose secrets to workflows triggered by a fork's pull
  request.
- The production `.env` exists only at `/srv/ethniafrica/.env` on the VPS, `chmod 600`.
  `.dockerignore` keeps every `.env*` out of the build context, so it cannot reach an image
  layer either.
- `claude-code-review.yml` runs on `pull_request`, not `pull_request_target`: a fork's PR gets
  no secrets, and the job's permissions are read-only.
- `claude.yml` does trigger on `issue_comment` and `issues`, which anyone can create on a public
  repo — but `claude-code-action` enforces a write-access check on the triggering user by
  default, and `allowed_non_write_users` is not set here.
- `approve-agent-ci.yml` uses `pull_request_target` and deliberately performs **no checkout**,
  which is the safe form of that trigger.
- API routes **compare** their secrets (`authHeader !== "Bearer " + expected`) and never return
  one. No route echoes an environment variable.

---

## How the exposure happened

Agent session transcripts. **429 files under `.entire/`** were committed before that directory
was added to `.gitignore` (commit `e7f4a0c2`). Credentials pasted into a conversation ended up
in `full.jsonl` and `context.md`, and were committed with everything else.

The vector is closed: `.entire/` is ignored today (`.gitignore:68`). Note that
`git check-ignore .entire` — without the trailing slash — reports _not ignored_ when the
directory is absent from the working tree, because the pattern is directory-only and git cannot
classify a path that does not exist. Test it as `git check-ignore .entire/` instead; the first
form produces a false alarm.

The general lesson is worth keeping: **a transcript is a credential store.** Anything pasted
into an agent conversation should be treated as though it were committed.

---

## Reproducing this audit

```bash
# any .env ever added
git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep -E '(^|/)\.env'

# every JWT ever introduced, by claims rather than by value
git log --all --oneline -S'eyJhbGciOi'

# a specific project's JWT, by the base64 of its ref claim
git log --all --oneline -S'Im<base64 of the ref>'

# token prefixes — then confirm each hit has a token-shaped body before calling it a leak
for p in sk-ant- sbp_ ghp_ gho_ 'BEGIN OPENSSH PRIVATE KEY'; do
  echo "$p: $(git log --all --oneline -S"$p" | wc -l)"
done
```

Counting prefix hits is not a finding. `UPSTASH_REDIS_REST_TOKEN=` matches 31 commits and every
one is `.env.example` with an empty value. Decode or length-check before reporting anything.

---

## Related

- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — environment variables and where each one lives
- [`ovh-production-deploy.md`](./ovh-production-deploy.md) — deploy secrets, host, rollback
- [`../PRODUCTION-READINESS-AUDIT.md`](../PRODUCTION-READINESS-AUDIT.md) — broader posture
