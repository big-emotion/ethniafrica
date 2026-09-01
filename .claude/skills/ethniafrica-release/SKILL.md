---
name: ethniafrica-release
description: Prepare and ship an EthniAfrica production release. Bumps the semver version of the root package.json, updates CHANGELOG.md (Keep a Changelog format, creates it if missing), creates an annotated git tag on main, then asks for explicit confirmation before pushing and publishing the GitHub Release. Publishing that Release is the production deploy trigger — pushing main deploys nothing, and pushing the tag alone deploys nothing either. Use when the user says "release ethniafrica", "cut a release", "bump version", "tag a new version", or invokes /ethniafrica-release.
metadata:
  author: Big Emotion
  version: "2.0.0"
---

# EthniAfrica Release

Prepare a release locally (bump version, update CHANGELOG, create the commit and tag), then ask for explicit confirmation before pushing.

This skill writes to the local repo first. It only runs `git push` after the user explicitly confirms. Without confirmation, the commit + tag stay local.

## Deployment reality — read this before promising anything

Production is **self-hosted on the OVH VPS in Gravelines** (`51.195.82.98`, SSH on port `49152`), not on Vercel. It is built and started by `.github/workflows/deploy-production.yml`, which listens on exactly one event: **a published GitHub Release**.

> Documents produced during this migration call that host "Francfort". They are wrong about the name and right about the address — Frankfurt is `145.239.76.125`, a different machine running different things. Everything is configured against the address.

Consequences this skill must state truthfully, every run:

- **Publishing the GitHub Release is the deploy.** Not the push, not the tag. `deploy-production.yml` is keyed on `release: published`, SSHes to the VPS, checks out the released tag, and runs `docker compose build && up -d`. It has no `workflow_dispatch` — there is no button that ships production without a Release naming what shipped.
- **Pushing `main` deploys nothing.** `vercel.json` sets `git.deploymentEnabled: false`, so no push and no pull request builds anything on Vercel any more. That was deliberate: automatic preview builds from parallel agent sessions exhausted the Hobby plan's deployment quota, and the rate limit eventually landed on `main` itself.
- **Pushing the tag deploys nothing either.** The tag is the thing the Release will point at. It has to exist on `origin` before the Release is created, which is why Step 7 pushes it and Step 8 publishes the Release — in that order, never merged into one step.
- **Creating the Release is therefore no longer optional.** Step 8 is part of shipping, not a nicety. A release that stops after the tag has bumped a version and shipped nothing.
- **The AFRIK corpus sync rides on the deploy.** `production-data-sync.yml` triggers on `workflow_run` of `Deploy Production (OVH)` and only when it concluded `success`. A failed deploy leaves the production corpus untouched, which is correct.
- **`workflow_run` only fires for workflow files that live on the default branch.** Both workflows must be on `main` for the chain to work. Precondition 6 (`recette` is an ancestor of `main`) already covers the usual way this goes wrong.
- The recette preview still exists on Vercel but is manual: `deploy-preview-recette.yml`, `workflow_dispatch` only.
- The CI/quality workflows (`ci.yml`, `a11y.yml`, `lighthouse.yml`, `data-integrity.yml`, `openapi-diff.yml`, `e2e.yml`) still react to pushes and pull requests. None of them deploy.

Rollback is a host-side operation on the VPS, not a re-run of anything here — see [`docs/runbooks/ovh-production-deploy.md`](../../../docs/runbooks/ovh-production-deploy.md).

## When to Activate

- User says: "release ethniafrica", "cut a release", "bump version", "tag a new version", "ship a release".
- User invokes `/ethniafrica-release` (optionally with a bump level: `patch | minor | major | <explicit-version>`).

## Preconditions

Verify all of the following before any write. If any fail, **do not modify anything** — report the blocker and exit.

1. **In the repo root** — `package.json` has `"name": "ethniafrica"`. If not, stop and tell the user to `cd` to the right directory.
2. **Clean working tree** — `git status --porcelain` must be empty. If dirty, stop and ask the user to commit or stash.
3. **On `main` branch** — `git branch --show-current` must return `main`. If not, stop. Releases ship from `main` only; feature work lands on `recette` first (Ferry branch model, `ferry.config.yaml` → `git.target_branch: recette`).
4. **Up to date with `origin/main`** — run `git fetch origin` then `git rev-list --count main..origin/main`. If > 0, stop and tell the user to `git pull`.
5. **CI green on HEAD** — run:
   ```bash
   HEAD_SHA=$(git rev-parse HEAD)
   gh run list --repo big-emotion/ethniafrica \
     --commit "$HEAD_SHA" --workflow ci.yml \
     --limit 1 --json conclusion,status,url
   ```
   The latest run must have `conclusion: "success"`. Note: `ci.yml` triggers on `pull_request` only, so the run attached to HEAD is the one from the `recette → main` PR that produced this commit. If no run exists for HEAD, or the conclusion is not `success`, stop and provide the run URL so the user can investigate.
6. **`recette` is an ancestor of `main`** — `git merge-base --is-ancestor origin/recette origin/main`. EthniAfrica integrates everything on `recette` before `main`; if `recette` carries commits `main` does not, the release would ship a state that was never integrated. On failure, stop and list the missing commits (`git log --oneline origin/main..origin/recette`).
7. **Local quality gates green** — run all five, in this order, and stop on the first failure:
   ```bash
   npm run lint
   npm run typecheck
   npm run format:check
   npm test
   npm run build
   ```
   CI (precondition 5) covers the same ground on the PR commit, but a release tags the merge result; these run against the exact tree being tagged. `npm run build` is the expensive one — it is not optional, because the VPS runs the same build inside Docker during the deploy, and a failure there leaves the tag and the Release page published with production untouched.
8. **No unapplied Supabase migrations** — compare `ls supabase/migrations/` against what the runbooks record as applied (`docs/runbooks/`). A migration present in the repo but not applied to production means the deploy ships code whose schema does not exist yet. If any is unapplied, stop and tell the user to apply it (or confirm explicitly that the release does not depend on it).

## Inputs

Argument is the bump level or explicit version:

- `patch` — `1.1.0 → 1.1.1`
- `minor` — `1.1.0 → 1.2.0`
- `major` — `1.1.0 → 2.0.0`
- `<explicit>` — e.g. `1.2.0-rc.1`, `2.0.0`

If no argument is provided, propose a bump based on commit messages since the last tag using the Conventional Commits heuristic:

- `feat!:` or body contains `BREAKING CHANGE` → major
- `feat:` → minor
- anything else (fix, refactor, perf, style, docs, ci, chore) → patch

Show the proposal and **ask the user to confirm or override** before proceeding.

## Workflow

### Step 1 — Determine current and target versions

- Read current version from the **root** `package.json` (`.version` — currently `1.1.0`). The root file is the single version source.
- Determine `previous_tag` = `git describe --tags --abbrev=0 2>/dev/null` (empty if no tag yet).
- Compute `next_version` from the bump level.
- Validate: `next_version` must be strictly greater than `current_version` (semver comparison). If not, stop and ask the user for an explicit higher version.

### Step 2 — Collect changes since last tag

Run:

```bash
git log --pretty=format:"%h %s" <previous_tag>..HEAD
# If no previous tag:
git log --pretty=format:"%h %s"
```

Group commits by Conventional Commit type:

| CHANGELOG section | Commit type prefixes                    |
| ----------------- | --------------------------------------- |
| **Added**         | `feat:`, `feat(...):`                   |
| **Changed**       | `refactor:`, `perf:`, `style:`          |
| **Fixed**         | `fix:`, `fix(...):`                     |
| **Security**      | `security:`                             |
| **Removed**       | `revert:` or commits describing removal |

Filter out merge commits and `chore:`, `ci:`, `docs:`, `test:` entries (too noisy for a user-facing changelog) unless they carry noteworthy messages.

AFRIK-specific: a commit that changes `dataset/source/afrik/**` or a fiche's demographics is user-visible content, not a chore — surface it under **Changed** with the entity IDs it touched (`FLG_*`, `PPL_*`, ISO 3166-1 alpha-3).

### Step 3 — Update or create `CHANGELOG.md`

Use [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. `CHANGELOG.md` lives at the repo root. **It does not exist yet** — the first run of this skill creates it with this skeleton before editing:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

On that first run, do **not** attempt to reconstruct the entire history back to `1.0.0` — start the file at the version being released and note in the report that earlier history lives in `git log` only.

Then:

- Move any items under `[Unreleased]` into the new `[<next_version>] - <YYYY-MM-DD>` section.
- Append the grouped commits from Step 2 under the appropriate subsections (deduplicate; skip sections with no entries).
- Keep an empty `[Unreleased]` section at the top for the next cycle.
- Maintain the link references at the bottom of the file:
  - `[Unreleased]` → `https://github.com/big-emotion/ethniafrica/compare/v<next_version>...HEAD`
  - Add `[<next_version>]` → `https://github.com/big-emotion/ethniafrica/releases/tag/v<next_version>` (first release) or `.../compare/v<previous>...v<next_version>` (subsequent releases).

Write the changelog in **English** (repo docs-language rule), even though the product UI is French.

Use today's date (`date -u +%Y-%m-%d`) for the release date.

### Step 4 — Update `package.json`

Set `.version` of the **root** `package.json` to `<next_version>` using the Edit tool (targeted field update — do not reformat the file).

### Step 5 — Commit and tag (local only)

Stage exactly the two files changed:

```bash
git add CHANGELOG.md package.json
```

(Do not `git add -A` — do not pick up unrelated dirty paths.)

Commit with the message:

```
release: v<next_version>
```

One-line subject only. No body unless there are breaking changes — then add a `BREAKING CHANGE:` paragraph in the body.

**No `Co-Authored-By` trailer.**

Then create an annotated tag:

```bash
git tag -a v<next_version> -m "ethniafrica v<next_version>"
```

### Step 6 — Report and ask for ship confirmation

This one confirmation covers all three of Steps 7 and 8 — push, tag, publish. Say so plainly, because the third one is the one that touches production.

Print a summary:

```
ethniafrica v<next_version> prepared locally.

Files changed:
  - package.json        (version: <current_version> → <next_version>)
  - CHANGELOG.md        (new section [<next_version>] - <today>)

Commit:  <short-sha>  release: v<next_version>
Tag:     v<next_version> (annotated, local only)

Ready to ship v<next_version> to production?

What this actually does, in order:
  1. `git push origin main` → deploys NOTHING. Vercel's automatic deployments
     are off (vercel.json, git.deploymentEnabled: false). CI and the quality
     workflows still run on the pushed commit; none of them deploy.
  2. `git push origin v<next_version>` → publishes the tag. Still deploys
     nothing. The tag exists so the Release has something to point at.
  3. `gh release create v<next_version>` → THIS is the deploy trigger. It fires
     `deploy-production.yml`, which SSHes to the OVH VPS in Gravelines, checks
     out this exact tag, rebuilds the image and restarts the container on
     ethniafrica.com. On success, `production-data-sync.yml` then loads the
     AFRIK corpus into the production Supabase project and busts its caches.

Stopping after step 2 is a valid outcome: version bumped, nothing shipped.
Rolling back afterwards is a host-side operation on the VPS —
docs/runbooks/ovh-production-deploy.md.

Reply `yes` / `push` / `ship` / `go` / `oui` / `ok` to proceed with all three.
Anything else → keeps commit + tag local only.
```

**Wait for explicit confirmation.** Do not push without it.

- Affirmative tokens (case-insensitive): `yes`, `y`, `push`, `ship`, `go`, `oui`, `ok`.
- Anything else (including silence, "let me check first", partial answers) → treat as stop. Skip Steps 7 and 7.5.

### Step 7 — Push (only after confirmation)

Run in order, as separate commands:

```bash
git push origin main
git push origin v<next_version>
```

**Not** `--follow-tags`. Separate commands so a tag-push failure doesn't leave `main` pushed ambiguously. If `git push origin main` fails (e.g. non-fast-forward, branch protection), stop immediately — do not push the tag.

After both succeed, print:

```
Pushed. Nothing is deployed yet.
  - origin/main now at <short-sha>  → no deploy; Vercel auto-deploys are off
  - tag v<next_version> published    → no deploy; it is what the Release will point at

Next step ships it: publishing the GitHub Release (Step 8).
```

Do not claim anything reached production at this point. Push and tag are both inert.

### Step 8 — Publish the GitHub Release (this is the deploy)

Not optional, and not a separate question — Step 6's confirmation already covered it. Skip this only if the user declined at Step 6, in which case Step 7 did not run either.

Extract the `[<next_version>]` section of `CHANGELOG.md` into a temporary notes file, then:

```bash
gh release create v<next_version> \
  --repo big-emotion/ethniafrica \
  --title "v<next_version>" \
  --notes-file <notes-file>
```

**No `--draft` and no `--prerelease`.** A draft Release does not emit `release: published`, so it deploys nothing and looks identical to success from here. `deploy-production.yml` also skips pre-releases outright.

Then watch the actual deploy:

```bash
gh run watch --repo big-emotion/ethniafrica \
  "$(gh run list --repo big-emotion/ethniafrica \
       --workflow deploy-production.yml --limit 1 --json databaseId -q '.[0].databaseId')"
```

Report the outcome honestly:

```
Released v<next_version>.

  Release:  https://github.com/big-emotion/ethniafrica/releases/tag/v<next_version>
  Deploy:   Deploy Production (OVH) — <conclusion> — <run url>
  Corpus:   Production AFRIK Data Sync runs next, only if the deploy succeeded

Verify: docs/DEPLOYMENT.md → Post-deploy verification.
```

If the deploy run failed, say so and do not describe the release as shipped. The tag and the Release page exist either way; the site does not. Point at the rollback procedure in [`docs/runbooks/ovh-production-deploy.md`](../../../docs/runbooks/ovh-production-deploy.md) rather than attempting one from here — it is a host-side operation.

### Step 9 — Verification checklist

- [ ] Version in the root `package.json` matches the new tag.
- [ ] `CHANGELOG.md` exists, is in Keep a Changelog format, and has a `[<next_version>]` section dated today.
- [ ] Exactly one commit was created. Exactly one annotated tag was created.
- [ ] If user confirmed: `main` and `v<next_version>` are pushed, **and** the GitHub Release is published — not a draft.
- [ ] If user did not confirm: commit + tag remain local only, no `git push` was executed and no Release was created.
- [ ] The report told the truth about deployment: publishing the Release deploys via OVH; pushing `main` and pushing the tag do not.
- [ ] The reported deploy outcome matches the actual conclusion of the `deploy-production.yml` run. A published Release with a failed deploy is not a shipped release.

## Failure Modes — Stop Without Modifying

| Condition                                                                 | Action                                                                                                                                                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Not in the ethniafrica repo root                                          | Stop. Tell user to `cd` to the right directory.                                                                                                                               |
| Working tree dirty                                                        | Stop. Ask user to commit or stash.                                                                                                                                            |
| Not on `main` branch                                                      | Stop. Report current branch.                                                                                                                                                  |
| Behind `origin/main`                                                      | Stop. Tell user to `git pull`.                                                                                                                                                |
| CI not green on HEAD                                                      | Stop. Print the run URL for investigation.                                                                                                                                    |
| `origin/recette` not an ancestor of `origin/main`                         | Stop. List the un-integrated commits.                                                                                                                                         |
| Any of `lint` / `typecheck` / `format:check` / `test` / `build` fails     | Stop. Report the failing gate and its output. Do not tag a tree that cannot build — the VPS runs the same build and the deploy would fail with the Release already published. |
| A Supabase migration in `supabase/migrations/` is not recorded as applied | Stop. Applying schema is a human decision; releasing code ahead of its schema breaks production.                                                                              |
| Target version ≤ current version                                          | Stop. Ask for an explicit higher version.                                                                                                                                     |
| `git push origin main` fails                                              | Stop. Do not push the tag.                                                                                                                                                    |

## Out of Scope

- npm publish (package is `private: true`).
- The build + deploy mechanics themselves — `deploy-production.yml` owns them, driven by the published Release. This skill publishes the Release and lets the workflow take over; it never SSHes to the VPS, never runs `docker compose`, and never performs a rollback. Rollback is documented in [`docs/runbooks/ovh-production-deploy.md`](../../../docs/runbooks/ovh-production-deploy.md) and is a deliberate human act.
- Applying Supabase migrations or running `tsx scripts/migrateAfrikToDatabase.ts` against any database. Precondition 8 only _checks_. The corpus sync that follows a successful deploy is `production-data-sync.yml`'s job, not this skill's.
- Recette previews — those are `deploy-preview-recette.yml`, run by hand from the Actions tab, and have nothing to do with a release.
- Bumping sub-package manifests (the root `package.json` is the only version source).
- Audit/scoring of release readiness (the preconditions above are sufficient; run `/ethniafrica-audit` separately).
- Pushing without explicit user confirmation in Step 6.
