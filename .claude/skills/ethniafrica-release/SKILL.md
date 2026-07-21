---
name: ethniafrica-release
description: Prepare and ship an EthniAfrica production release. Bumps the semver version of the root package.json, updates CHANGELOG.md (Keep a Changelog format, creates it if missing), creates an annotated git tag on main, then asks for explicit confirmation before pushing. Tagging is a marker, not a deploy trigger — Vercel deploys from the pushed branch. Use when the user says "release ethniafrica", "cut a release", "bump version", "tag a new version", or invokes /ethniafrica-release.
metadata:
  author: Big Emotion
  version: "1.0.0"
---

# EthniAfrica Release

Prepare a release locally (bump version, update CHANGELOG, create the commit and tag), then ask for explicit confirmation before pushing.

This skill writes to the local repo first. It only runs `git push` after the user explicitly confirms. Without confirmation, the commit + tag stay local.

## Deployment reality — read this before promising anything

EthniAfrica has **no GitHub deploy workflow**. There is no `deploy-production.yml`, no Dockerfile, no release pipeline in `.github/workflows/`. Hosting is Vercel, wired to the repo through the Vercel Git integration (`.vercel/` at the repo root).

Consequences this skill must state truthfully, every run:

- **The tag does not deploy anything.** Vercel deploys on _push to the tracked branch_. Pushing `main` is what ships; `v<version>` is a marker for humans and for the changelog.
- **No workflow creates a GitHub Release.** If the user wants a Release page, this skill creates it with `gh release create` (Step 7.5) — nothing else will.
- The only GitHub Actions that react to a push are the CI/quality workflows (`ci.yml`, `a11y.yml`, `lighthouse.yml`, `data-integrity.yml`, `openapi-diff.yml`, `e2e.yml`). None of them deploy.

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
   CI (precondition 5) covers the same ground on the PR commit, but a release tags the merge result; these run against the exact tree being tagged. `npm run build` is the expensive one — it is not optional, because Vercel will run the same build on push and a failure there means a broken production deploy with the tag already published.
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

### Step 6 — Report and ask for push confirmation

Print a summary:

```
ethniafrica v<next_version> prepared locally.

Files changed:
  - package.json        (version: <current_version> → <next_version>)
  - CHANGELOG.md        (new section [<next_version>] - <today>)

Commit:  <short-sha>  release: v<next_version>
Tag:     v<next_version> (annotated, local only)

Ready to push `main` + `v<next_version>` to origin?

What this actually does:
  - `git push origin main` → Vercel picks up the new commit on the tracked
    branch and builds + deploys production. THIS is the deploy trigger.
  - `git push origin v<next_version>` → publishes the tag. It deploys nothing;
    no GitHub Actions workflow reacts to tags in this repo.
  - No GitHub Release is created automatically. I can create one after the push
    if you want a Release page (Step 7.5).
  - CI workflows (a11y, lighthouse, data-integrity, openapi-diff, e2e) may run
    on the pushed commit; none of them deploy.

Reply `yes` / `push` / `go` / `oui` / `ok` to proceed.
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
Pushed.
  - origin/main now at <short-sha>  → Vercel production deploy triggered by this push
  - tag v<next_version> published    → marker only, triggers nothing

Watch the deploy in the Vercel dashboard for the ethniafrica project
(the repo is linked via .vercel/ — there is no GitHub Actions deploy job to watch).

CI runs on the pushed commit:
  https://github.com/big-emotion/ethniafrica/actions
```

Do not print a link to a deploy workflow — there is none. Do not claim the tag deployed anything.

### Step 7.5 — GitHub Release (optional, ask)

Nothing in this repo creates a GitHub Release. Ask the user:

```
Create a GitHub Release page for v<next_version> from the CHANGELOG section?
```

If they accept:

```bash
gh release create v<next_version> \
  --repo big-emotion/ethniafrica \
  --title "v<next_version>" \
  --notes-file <(section of CHANGELOG.md for <next_version>)
```

If they decline, skip it — the tag alone is a valid release marker.

### Step 8 — Verification checklist

- [ ] Version in the root `package.json` matches the new tag.
- [ ] `CHANGELOG.md` exists, is in Keep a Changelog format, and has a `[<next_version>]` section dated today.
- [ ] Exactly one commit was created. Exactly one annotated tag was created.
- [ ] If user confirmed: both `main` and `v<next_version>` are pushed to origin.
- [ ] If user did not confirm: commit + tag remain local only, no `git push` was executed.
- [ ] The report told the truth about deployment: push-to-`main` deploys via Vercel, the tag does not.

## Failure Modes — Stop Without Modifying

| Condition                                                                 | Action                                                                                                                              |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Not in the ethniafrica repo root                                          | Stop. Tell user to `cd` to the right directory.                                                                                     |
| Working tree dirty                                                        | Stop. Ask user to commit or stash.                                                                                                  |
| Not on `main` branch                                                      | Stop. Report current branch.                                                                                                        |
| Behind `origin/main`                                                      | Stop. Tell user to `git pull`.                                                                                                      |
| CI not green on HEAD                                                      | Stop. Print the run URL for investigation.                                                                                          |
| `origin/recette` not an ancestor of `origin/main`                         | Stop. List the un-integrated commits.                                                                                               |
| Any of `lint` / `typecheck` / `format:check` / `test` / `build` fails     | Stop. Report the failing gate and its output. Do not tag a tree that cannot build — Vercel would fail the same build in production. |
| A Supabase migration in `supabase/migrations/` is not recorded as applied | Stop. Applying schema is a human decision; releasing code ahead of its schema breaks production.                                    |
| Target version ≤ current version                                          | Stop. Ask for an explicit higher version.                                                                                           |
| `git push origin main` fails                                              | Stop. Do not push the tag.                                                                                                          |

## Out of Scope

- npm publish (package is `private: true`).
- The build + deploy mechanics themselves — Vercel owns them, driven by the push to `main`. This skill never invokes the Vercel CLI, never touches `.vercel/`, and never triggers a redeploy.
- Applying Supabase migrations or running `tsx scripts/migrateAfrikToDatabase.ts` against any database. Precondition 8 only _checks_.
- Staging deploys — those follow pushes to `recette`, never a tag.
- Bumping sub-package manifests (the root `package.json` is the only version source).
- Audit/scoring of release readiness (the preconditions above are sufficient; run `/ethniafrica-audit` separately).
- Pushing without explicit user confirmation in Step 6.
