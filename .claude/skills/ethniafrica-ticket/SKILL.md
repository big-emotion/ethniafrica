---
name: ethniafrica-ticket
description: End-to-end local automation for a single Jira ticket on the EthniAfrica repo. Paste a Jira ticket URL (or key) and the skill self-assigns the ticket, reads it, refines it, creates the Jira sub-tasks, branches off the integration branch in an isolated git worktree, implements the work in parallel via sub-agents, opens the pull request, then moves the ticket to the review column and comments the PR link. Runs fully automatically with no confirmation gates. Use when the user pastes a Jira ticket link, says "prends ce ticket", "implémente ce ticket Jira", "traite ce ticket", or invokes /ethniafrica-ticket.
metadata:
  author: Big Emotion
  version: "1.0.0"
---

# EthniAfrica Ticket

Take a single Jira ticket from link to merged-ready PR, locally and unattended.

This is the **local, interactive, on-demand** counterpart to Ferry (which runs the same lifecycle async/cloud via Jira Automation). It does not call Ferry; it does the work directly on the developer's machine. To avoid divergence with Ferry, **the base branch, the PR target branch, and the review column are resolved at runtime from the repo's Ferry configuration** — never hard-coded in this file. The one deliberate divergence is the working-branch prefix: the `ferry/` namespace belongs to Ferry-run branches, so local runs stay out of it and use the human-style prefixes of the repo history instead (`feat/`, `fix/` — Step 5).

## Operating mode — FULL AUTO

The user chose **no confirmation gates**. The skill runs the entire chain — assign → read → refine → sub-tasks → branch → implement → PR → Jira transition + comment — without stopping to ask.

"Full auto" removes _confirmation_ prompts. It does **not** remove _safety blockers_: a small set of hard preconditions where proceeding would corrupt shared state or produce a broken PR. On a safety blocker the skill **stops and reports** — it does not guess or force through. These are listed under Preconditions and are non-negotiable.

## When to Activate

- User pastes a Jira ticket URL (e.g. `https://big-emotion.atlassian.net/browse/ETNI-123`) or a bare issue key.
- User says: "prends ce ticket", "implémente / traite ce ticket Jira", "fais ce ticket".
- User invokes `/ethniafrica-ticket <jira-url-or-key>`.

## Inputs

A single argument: the Jira ticket URL or issue key.

- Accept `.../browse/ETNI-123`, `...selectedIssue=ETNI-123`, `...?...&issueKey=ETNI-123`, or a bare `ETNI-123`.
- Extract the issue key with the regex `[A-Z][A-Z0-9]+-\d+`. If zero or more than one distinct key is found, **stop** and ask the user for the exact key (ambiguous input is a safety blocker, not a design choice).

## Preconditions (safety blockers — stop and report if any fail)

1. **Repo root** — `package.json` `.name` is `ethniafrica`. If not, stop and tell the user to `cd` in.
2. **Atlassian MCP reachable** — `mcp__atlassian__getAccessibleAtlassianResources` returns at least one site. Resolve and keep `cloudId` (the Jira site id) for every subsequent Jira call. If it fails, stop — the Jira half of the workflow is impossible.
3. **gh authenticated** — `gh auth status` succeeds for `big-emotion/ethniafrica`.
4. **Base branch fetchable** — `git fetch origin` succeeds and `origin/<base_branch>` exists. Implementation runs in a dedicated worktree (Step 5), so the user's main checkout is never touched and need not be clean — but the worktree must be cut from a real remote base branch.
5. **Ferry config present and parseable** — `ferry.config.yaml` at the repo root is the single source of truth for the base/target branches. If missing or unparseable, stop.

Resolve these at runtime — **never substitute a literal**:

- `base_branch` = `git.base_branch` from `ferry.config.yaml` (branch to cut from). Read it with e.g. `npx --yes js-yaml ferry.config.yaml | jq -r .git.base_branch`, or by reading the file directly.
- `target_branch` = `git.target_branch` from `ferry.config.yaml` (PR base).
- `review_column` = the Jira status the Ferry review rule triggers on. `ferry.config.yaml` does not carry it, so resolve it from `ferry-jira-automation-setup.md` at the repo root: find the section titled for the Ferry **Review** column trigger and take its `To status:` value. Cross-check it against the live board by matching it to a transition returned by `getTransitionsForJiraIssue` in Step 10. If the two disagree, the live board wins and the divergence is reported — the doc is the intent, the board is the reality.

If `ferry.config.yaml` or `ferry-jira-automation-setup.md` changes, the skill must follow. A literal branch or column name appearing in those roles anywhere in this file is a bug.

## Workflow

### Step 1 — Resolve ticket and Jira identity

- `cloudId` from `getAccessibleAtlassianResources`.
- `getJiraIssue(cloudId, issueIdOrKey=ETNI-123)` — fetch summary, description, issue type, status, acceptance criteria, attachments, existing sub-tasks, comments.
- `atlassianUserInfo` → own `accountId` (the assignee).

### Step 2 — Self-assign

- `editJiraIssue(cloudId, ETNI-123, fields={ assignee: { accountId: <own> } })`.
- If the ticket is already assigned to someone else, still assign to self (the user explicitly wants to take the ticket) but note the previous assignee in the final report.

### Step 3 — Read & refine

- Summarise the ticket's intent, scope, and acceptance criteria.
- **Surface assumptions explicitly** in the refinement (per the core operating behaviors): any ambiguous requirement gets a stated assumption rather than a silent guess.

Apply the project's mandatory refinement rules. Each one has a trigger, a consequence on sub-task ordering, and an N/A escape hatch. They come from `CLAUDE.md` and are what stops silent scope drift.

**R1 — AFRIK hierarchy = data-model-first ordering.**
_Trigger:_ the ticket touches AFRIK entities (linguistic families, languages, peoples, countries) — new fields, new relations, a new fiche section, or a migration under `supabase/migrations/`.
_Consequence:_ sub-tasks are ordered along the AFRIK hierarchy **Linguistic Family → Language → People → Country**, because a people cannot be modelled before its language family exists and a country relation cannot be modelled before its people does. Concretely: the schema/migration sub-task comes **first and alone** (nothing else starts until it is done), then loaders/parsers (`src/lib/afrik/loaders/`, `src/lib/afrik/parsers/`) in hierarchy order, then services, then handlers, then UI. Enumerate every entity the ticket implies; any entity whose model does not yet support the change becomes its own blocking sub-task at the head of the list.
_N/A:_ the ticket touches no AFRIK entity (pure UI, tooling, CI, docs) — say so explicitly in the refinement comment.

**R2 — API layered pattern = fixed sub-task order.**
_Trigger:_ the ticket adds or changes a `/api/v2/*` endpoint.
_Consequence:_ the sub-tasks are created in exactly this order, each depending on the previous — (a) service in `src/api/v2/services/` (Supabase queries), (b) handler in `src/api/v2/handlers/` (business logic), (c) route in `src/app/api/v2/{resource}/route.ts` (parsing, CORS, caching), (d) **OpenAPI spec update in `src/lib/api/openapiV2.ts`**. (d) is never optional and never folded into another sub-task: `openapi-diff.yml` gates PRs on breaking changes, and a route shipped without its spec entry is an undocumented public API. Shared utilities belong where they already live — `src/api/v2/utils/validation.ts` for param validation, `src/api/v2/utils/response.ts` for response shape, `src/lib/api/cors.ts` for CORS, `src/lib/api/logger.ts` for logging (never `console.*`).
_N/A:_ no API surface touched.

**R3 — TDD is mandatory, so every implementation sub-task is a test sub-task first.**
_Trigger:_ always.
_Consequence:_ each sub-task's description states the failing test it must produce before any implementation code. Tests land at the placement conventions declared in `CLAUDE.md` — unit tests in `src/lib/**/__tests__/**/*.test.ts`, handler/service tests in `src/api/v2/**/__tests__/**/*.test.ts`, API route tests in `src/app/api/v2/__tests__/**/*.test.ts`, parser tests in `src/lib/afrik/parsers/__tests__/**/*.test.ts`. A sub-task with no identified test file is under-refined — split it or name the file.
_N/A:_ none. A ticket that genuinely cannot be tested (a pure doc change) says so in the refinement and skips the test sub-task explicitly.

**R4 — Source Tier boundary on any content work.**
_Trigger:_ the ticket would add, change, or surface an ethnographic or demographic claim (fiche content, seed data, copy asserting a fact).
_Consequence:_ every claim needs a Tier 1 citation (UN, UNFPA, CIA, SIL Ethnologue, Glottolog, UNESCO, IWGIA) or a Tier 2 one (a primary source discovered via ≥2 Wikipedia language versions, cited by its own URL, with the cross-check chain recorded in the entry's `notes`). Tier 3 — Wikipedia itself, blogs, social media, aggregators, AI-generated text — is forbidden, and an un-citable claim is **removed**, not softened. Demographics use the 2025 reference year and must satisfy the FR28 band (hard gate [95,105]%, doctrinal target [99,101]% — see `docs/adr/0001-fr28-demographic-tolerance.md`); new or updated fiches aim for the strict band. If the ticket asks for a claim with no available source, that becomes a blocking sub-task ("source or drop"), never an invented value.
_N/A:_ the ticket touches no content or data claim.

**R5 — Supabase client isolation and single-locale invariants.**
_Trigger:_ the ticket touches data access or user-facing copy.
_Consequence:_ pick the right client and say which in the sub-task — `src/lib/supabase/client.ts` (browser, anon key), `server.ts` (SSR), `admin.ts` (service role, **server-only**, never reachable from a browser bundle). Never widen that boundary to make a task easier. The app is French-only (`Language = "fr"`): a sub-task must not reintroduce a locale switch or an `en`/`es`/`pt` branch. UI work is mobile-first at the project breakpoints — mobile 430px, tablet md 720px, desktop xl 800px.
_N/A:_ no data access and no user-facing copy.

- Write the refined breakdown back to Jira as a comment on the ticket (`addCommentToJiraIssue`) so the refinement is visible to the team — concise: intent, assumptions, which of R1–R5 fired (and which were N/A and why), sub-task list with the dependency ordering called out.

### Step 4 — Create sub-tasks in Jira

- For each refined item, `createJiraIssue(cloudId, fields={ project, parent: { key: ETNI-123 }, issuetype: { id: "10248" }, summary, description })`.
  - `10248` is the `Sub-task` issue type id recorded in `docs/confluence-spec/config.json` (`jiraIssueTypeIds.Sub-task`). Prefer reading it from that file at runtime; fall back to `getJiraProjectIssueTypesMetadata` if the id is rejected (project configuration can change).
- **Order matters**: apply the ordering that R1–R3 produced. A sub-task that produces something the others consume is created first and its description states that dependent sub-tasks cannot start until it is done.
- Collect the created sub-task keys; they drive the implementation plan and the PR checklist.

### Step 5 — Create an isolated worktree off the base branch

All implementation happens in a **dedicated git worktree**, never in the user's main checkout. This keeps the user's working directory and current branch untouched for the entire full-auto run, and is what makes precondition 4 a non-blocker on a dirty main tree.

- `git fetch origin`.
- Branch name: `<prefix>/<key-lower>-<slug>` where:
  - `prefix` = `fix` if the issue type is Bug, else `feat`. The `ferry/` namespace is reserved for Ferry-run branches and must stay untouched by local runs.
  - `key-lower` = the issue key lowercased (e.g. `etni-123`).
  - `slug` = kebab-cased, ASCII, ≤ 5 words from the summary.
- Worktree path: a sibling of the repo root — `<repo-parent>/ethniafrica-worktrees/<key-lower>-<slug>` (outside the repo so Next.js and Vitest never scan it; the dir-name segment drops the `<prefix>/` so no nested directory is created).
- Create branch + worktree in one step, cutting from the **remote** base branch (not local, to avoid stale state):
  `git worktree add -b <branch> <worktree-path> origin/<base_branch>`
- **Every subsequent step — implement, verify, commit, push, open PR — runs with the worktree as the working directory.** Pass it as `cwd` to Bash calls and as the repo path in every sub-agent brief. Never run implementation commands in the main checkout.

### Step 6 — Implement (parallel sub-agents)

Follow TDD and KISS (user `CLAUDE.md`): tests before code, simplest design that satisfies acceptance criteria, surgical scope — touch only what the ticket requires.

Dependency-aware execution:

1. **Respect the project's toolchain constraints** (project `CLAUDE.md`):
   - **npm only, and `npm ci --legacy-peer-deps` in a fresh worktree.** The legacy peer deps are deliberate — Storybook runs on `@storybook/react-vite` because `@storybook/nextjs` is incompatible with this Next version. Never "fix" that peer conflict as a side effect of a ticket, and never switch package manager.
   - **Blocking sub-tasks run FIRST and alone**: a Supabase migration (`supabase/migrations/NNN_*.sql`) or an AFRIK data-model change is the whole first wave. Nothing runs in parallel with it. Migrations are numbered, idempotent (`IF NOT EXISTS`), and must not collide with an existing prefix — check `ls supabase/migrations/` before choosing a number. **Never apply a migration to any database from this skill**; the SQL lands in the PR, a human applies it.
   - **The three-layer API pattern is a boundary, not a suggestion**: a route file never queries Supabase directly, a handler never imports `next/server` request internals, a service never formats an HTTP response. If a sub-agent is tempted to shortcut a layer, it has mis-scoped its sub-task.
   - **The three Supabase clients stay isolated**: `admin.ts` (service role) is server-only and must never be imported from a path that can reach a browser bundle. This invariant is documented in `_bmad-output/project-context.md` — read it before touching data access.
   - **AFRIK strict models are never extended ad-hoc**: fiche structure follows `public/modele-*.json`. A new section requires a model change as its own sub-task, not an improvised field.
   - **TypeScript is `strict: false`** — that is not licence for `any` in new code. Use `@/` for imports (maps to `src/`), and shadcn/ui components for UI consistency.
2. **Independent sub-tasks run in parallel** via the `Agent` tool (`general-purpose`, or `agent-skills:test-engineer` for test-heavy slices). Always parallelise when sub-tasks have no dependency between them — launch the independent sub-agents in a single message so they run concurrently. Each sub-agent gets a self-contained brief: the worktree path as its working directory, the sub-task summary, acceptance criteria, relevant file paths, the test file it must write first, the TDD + KISS + mobile-first constraints, and the applicable rules from R1–R5. All sub-agents share the one worktree (they implement different sub-tasks of the same branch), so do not give them separate worktree isolation.
3. **Mobile-first** (user `CLAUDE.md`): any UI work is designed and verified at 320–430 px first, then ≥768 px, then ≥1200 px — and against this project's own breakpoints (mobile 430px, tablet md 720px, desktop xl 800px).

### Step 7 — Verify (safety blocker if it fails)

Before any PR, the project's quality gates must pass **in the worktree**, in this order:

```bash
npm run lint          # eslint over src + scripts
npm run typecheck     # tsc --noEmit
npm run format:check  # prettier
npm test              # vitest run
```

Run the full set even when the ticket seems not to touch a given area — a type error in an untouched file caused by a changed shared type is exactly what this catches, and it is cheap here versus in CI.

Additional gates when the ticket triggered the matching rule:

- R2 fired (API change) → `npm run openapi:generate` then `npm run openapi:diff`, so the committed spec matches the routes and any breaking change is deliberate and called out in the PR body.
- R1 or R4 fired (AFRIK data/content change) → `tsx scripts/validateAfrikData.ts`. FR28 hard gate [95,105]% must pass; any fiche outside the strict band [99,101]% is reported in the PR body as a known deviation, not silently accepted.
- UI change → verify the mobile breakpoint before the desktop one. If Playwright MCP is used, delete `.playwright-mcp/` immediately after (user `CLAUDE.md`).

Do **not** run `npm run build` here — Vercel builds on push and CI covers it; running it in the worktree is slow and rarely adds signal beyond `typecheck` + `test`. Run it only if the ticket touches Next config, routing, or the build pipeline itself.

Known pre-existing failures (e.g. the Supabase mock in `scripts/__tests__/migrateAfrikToDatabase.test.ts`) do not block, but the count must not grow. If it grew, the ticket caused it — fix it.

If a check fails, iterate on the implementation to fix the **root cause** (do not disable checks, do not `--no-verify`, do not loosen a threshold). If it is genuinely unrecoverable, **stop and report** — never open a broken PR. A broken PR on a shared branch is exactly the shared-state corruption full-auto must still refuse.

### Step 8 — Commit & push

- Commit per sub-task (or logically grouped), Conventional Commits, message references the Jira key (e.g. `feat(api): add cursor pagination to /v2/peoples (ETNI-123)`).
- **Never add `Co-Authored-By` trailers** (user + project `CLAUDE.md`).
- Commit messages, code comments, PR body — **English** (user `CLAUDE.md`), even though the product copy is French.
- Husky + lint-staged run ESLint + Prettier on commit; let them run, never bypass them.
- `git push -u origin <branch>`.

### Step 9 — Open the pull request

```bash
gh pr create --repo big-emotion/ethniafrica \
  --base <target_branch> --head <branch> \
  --title "<type>(<scope>): <summary> (ETNI-123)" \
  --body "$(cat <<'EOF'
## Summary
<1-3 bullets — what and why>

Jira: <full ticket URL>

## Sub-tasks
- [x] <sub-task ETNI-124 summary>
- [x] <sub-task ETNI-125 summary>
...

## Test plan
- [ ] <how to verify each acceptance criterion>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

`<target_branch>` is the value resolved from `ferry.config.yaml` in the Preconditions — never a literal.

Add these sections when the corresponding rule fired:

- **Migrations** — the migration filename, what it changes, and an explicit note that it has **not** been applied to any database. A human applies it; record which environments still need it.
- **API contract** — the `npm run openapi:diff` verdict. If it reports a breaking change, say why it is acceptable and what consumers must do.
- **AFRIK data** — the `validateAfrikData.ts` verdict, with FR28 hard-gate result and any fiche left outside the strict [99,101]% band, plus the Source Tier of every new citation (Tier 1 direct, or Tier 2 with its Wikipedia cross-check chain).
- **Visual parity** — for UI work, what was checked at 430px / 720px / 800px.

Capture the PR URL from the command output.

### Step 10 — Transition Jira to review + comment

- `getTransitionsForJiraIssue(cloudId, ETNI-123)` → find the transition whose **target status name** equals the `review_column` resolved in the Preconditions. Match on the target status name, not the transition's own name.
- `transitionJiraIssue(cloudId, ETNI-123, transition=<id>)`.
- `addCommentToJiraIssue(cloudId, ETNI-123, "PR ready for review: <PR URL>")`.
- If no transition leads to `review_column` (workflow misconfigured, wrong current status, or the doc and the board disagree), do not invent one — leave the ticket where it is, still post the PR-link comment, and flag the missing transition plus the doc/board divergence in the final report.
- Note: moving the ticket into that column is also what Ferry's Jira Automation rule listens on. Expect the async Ferry review run to pick it up; that is intended, not a conflict.

### Step 11 — Report

End-of-turn summary (one or two sentences): the ticket key, the branch, the worktree path (kept for follow-up — remove with `git worktree remove <path>` once the PR is merged), the PR URL, the Jira status it now sits in, and any flagged anomalies (previous assignee overridden, missing transition, unapplied migration, FR28 strict-band deviations, assumptions made during refinement).

## Failure handling

- Safety blockers (Preconditions, Step 7 verification, ambiguous issue key) → **stop and report**, leave shared state untouched.
- Recoverable implementation failures → iterate to root cause within the implementation loop.
- Never disable quality gates, never `--no-verify`, never force-push, never open a knowingly-broken PR.
- Never apply a Supabase migration, never run `tsx scripts/migrateAfrikToDatabase.ts` against a real database, never touch production data.
- Never invent an ethnographic or demographic value to satisfy an acceptance criterion. An un-citable claim is dropped and reported.
- If a Jira write fails mid-chain (e.g. sub-task creation), report exactly what was created vs. not so the user can reconcile manually — do not retry blindly in a loop.

## Cleanup

If any temporary files are created (e.g. `.playwright-mcp/` during browser verification), delete them immediately after use (user `CLAUDE.md`).
