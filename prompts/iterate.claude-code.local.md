### CI does not gate you — transition back to In Review regardless

Make a best-effort attempt to drive CI green (bounded, fast-fail — cap at **5**
fix-and-push iterations, then stop), but **always** transition the ticket back to In
Review afterwards, whether CI ends green, red, or absent. A red CI is never a reason
to withhold the transition — the re-reviewer decides what to do with it. Surface the
true state via the labels below.

### Apply the re-review + CI labels on the PR — MANDATORY

After pushing your fixes, resolve the PR number
(`gh pr list --state open --head "$(git branch --show-current)" --json number`), read
the true CI state (`gh pr checks <PR_NUMBER>` — required checks `CI / gitleaks` and
`CI / build`, the latter running lint, typecheck, format:check, tests, and the
Next.js build), and set the PR labels (all three already exist — never invent
variants):

- Always request re-review: `gh pr edit <PR_NUMBER> --add-label "needs-rereview"`
- **CI green**: `gh pr edit <PR_NUMBER> --add-label "ci-green" --remove-label "ci-failing"`
- **CI red / pending / absent**: `gh pr edit <PR_NUMBER> --add-label "ci-failing" --remove-label "ci-green"`

`ci-green` and `ci-failing` are mutually exclusive — never leave both; `needs-rereview`
is always present after this step. A failing `--remove-label` is idempotent; ignore
it. Verify with `gh pr view <PR_NUMBER> --json labels`. Labelling is best-effort and
never blocks the transition — note it in the audit comment if it failed.

Use `npm`, and validate with `make check` (lint · type-check · format:check ·
all-tests) before pushing. Never run `npm install` or
`tsx scripts/migrateAfrikToDatabase.ts`.

### Required: self-assessment score

Append one final line to the single fingerprinted audit comment you already post
(add it to that `[ferry:…]` comment — do not post a second comment):

`**Confidence (self-critique):** N/10 — <one sentence: what you actually verified, and the weakest or riskiest point that remains>`

- Score 0–10 honestly: 8–10 = the requested changes are addressed and verified
  against tests/acceptance criteria; 5–7 = addressed but rests on an unverified
  assumption or a dependency outside this PR; ≤4 = a real blocker or a change
  you could not confirm resolves the review feedback.
- The justification must name the weakest link, not restate success. This score
  is a signal to the reviewer and to the human — defensible under-confidence
  beats false certainty.
