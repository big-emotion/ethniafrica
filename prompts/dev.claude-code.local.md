### Open the PR against `recette`, not the default branch

The base prompt says to open the PR "into the default branch". On this repo that
mapping is wrong: the default branch is `main`, but `main` is the **sortie** —
releases ship from it. Ferry integrates on `recette` (`ferry.config.yaml`:
`base_branch: recette`, `target_branch: recette`).

Branch off `recette` and open the PR **into `recette`**:
`gh pr create --base recette --head ferry/TICKET_KEY ...`. A PR opened against
`main` bypasses integration and has to be re-targeted by hand.

### Toolchain and validation

Use `npm`. The repo ships `package-lock.json`; never invoke `pnpm`, `yarn`, or `bun`.

Before declaring the story done, run `make check` — it chains `npm run lint`,
`npm run type-check`, `npm run format:check`, and `npm run all-tests`. Run those
four individually if you need to isolate a failure. `format:check` is easy to
forget and the required `CI / build` check runs it, so a formatting slip fails CI
even when every test passes.

Single-test runs: `npx vitest run path/to/file.test.ts`, or `npx vitest run -t "pattern"`.

Do **not** run `npm install` (deps come from `npm ci`), `npm run build` (too slow
for the inner loop — CI covers it), or `tsx scripts/migrateAfrikToDatabase.ts`
(it writes to Supabase).

Repo conventions: TypeScript `strict: false` (do not turn it on as a side effect),
`@/` maps to `src/`, tests live in `__tests__/` next to the code, and commits never
carry `Co-Authored-By` trailers.

### Close the planning sub-tasks once the story reaches review

The sub-tasks under this story are a planning breakdown — you implement the whole
story in one PR; they are not worked individually. So once you have **successfully**
transitioned the parent into **In Review** (the FR18 step above), the work they
describe is delivered. Close them so they stop cluttering the sprint board:

1. Call `list_subtasks("TICKET_KEY")`.
2. For each sub-task that is not already Done: call `get_transitions(<subtask_key>)`,
   pick the transition whose target status name matches "Done" / "Terminé"
   (case-insensitive), and call `transition_issue(<subtask_key>, <id>)`. **Resolve
   the id per sub-task — never hardcode it**; sub-tasks may use a different workflow
   than the story.

Guard: do this **only after** the parent transition to In Review succeeded. If you
hit a blocker and did NOT move the parent to In Review, leave the sub-tasks
untouched. State in your audit comment how many sub-tasks you closed.

### Surface readiness + CI state on the PR — MANDATORY labels

CI does **not** gate you: open the PR and transition to In Review either way. But the
Reviewer runs regardless of CI, so tell it the truth at a glance via PR labels. After
opening the PR, resolve its number
(`gh pr list --state open --head "$(git branch --show-current)" --json number`), give
CI a moment to start (`sleep 30`), then read the true state
(`gh pr checks <PR_NUMBER>` — the required checks are `CI / gitleaks` and `CI / build`,
the latter running lint, typecheck, format:check, tests, and the Next.js build).
Apply, on the PR (labels already exist — never invent variants):

- Always add readiness: `gh pr edit <PR_NUMBER> --add-label "ready-for-review"`
- **CI green** (both required checks passed): `gh pr edit <PR_NUMBER> --add-label "ci-green" --remove-label "ci-failing"`
- **CI red / pending / absent**: `gh pr edit <PR_NUMBER> --add-label "ci-failing" --remove-label "ci-green"`

`ci-green` and `ci-failing` are mutually exclusive — never leave both. A failing
`--remove-label` is idempotent; ignore it. This is best-effort and never blocks the
transition — note in the audit comment if labelling failed.

### Required: self-assessment score

Append one final line to the single fingerprinted audit comment you already post
(add it to that `[ferry:…]` comment — do not post a second comment):

`**Confidence (self-critique):** N/10 — <one sentence: what you actually verified, and the weakest or riskiest point that remains>`

- Score 0–10 honestly: 8–10 = implementation verified against tests/acceptance
  criteria with little residual doubt; 5–7 = works but rests on an unverified
  assumption or a dependency outside this PR; ≤4 = a real blocker (e.g. CI you
  could not read, an AFRIK sourcing step the pipeline cannot apply).
- The justification must name the weakest link, not restate success. This score
  is a signal to the reviewer and to the human — defensible under-confidence
  beats false certainty.
