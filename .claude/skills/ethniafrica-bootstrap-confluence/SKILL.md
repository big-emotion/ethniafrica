---
name: ethniafrica-bootstrap-confluence
description: One-shot publication of the complete EthniAfrica Confluence engineering tree from validated repository drafts. Creates the Engineering index plus Requirements, Decisions, Architecture, and Obsolete branches, persists their page IDs and a lockout sentinel, and never runs twice. Use only for the initial ETHNIAFRIC space bootstrap.
---

# EthniAfrica Bootstrap Confluence

Publish the validated brownfield documentation migration once. After publication,
canonical intent flows from Confluence through Jira to code and tests. Ongoing
changes use `/ethniafrica-spec`.

Read `AGENTS.md`, `_bmad-output/project-context.md`, and
`docs/adr/0002-confluence-source-of-truth.md` before acting.

## Fixed tree

```text
EthniAfrica
└── EthniAfrica — Engineering
    ├── Requirements
    ├── Decisions
    ├── Architecture
    └── Obsolete
```

The space homepage is only the parent. Never edit it. The Engineering page and
its four children are created in this run.

## Inputs

- `docs/confluence-spec/config.json`
- `docs/confluence-spec/bootstrap-catalog.json`
- `_bmad-output/planning-artifacts/prd.md`
- Generated bodies under `bootstrap/output/`

Run `npm run confluence:bootstrap:build` before previewing or publishing.

## Preconditions

Before any Confluence write:

1. `package.json` name is `ethniafrica`.
2. `docs/.confluence-bootstrap-complete` does not exist. If present, report its
   timestamp and page IDs and refuse.
3. The working tree contains only the reviewed bootstrap changes. Report the
   exact diff; never sweep unrelated user work into the bootstrap commit.
4. Config has non-null `cloudId`, `siteUrl`, `spaceKey`, `spaceId`, and
   `engineeringRootPageId`; all five destination page IDs remain unpublished.
5. `npm run confluence:bootstrap:build`, `npm run lint:req`,
   `npm run check:jira-template`, lint, typecheck, format check, coverage, and
   the complete test suite pass.
6. The Atlassian identity can read and write the configured Confluence space.
7. The configured homepage exists in that space and has no descendant titled
   `EthniAfrica — Engineering`, `Requirements`, `Decisions`, `Architecture`, or
   `Obsolete`.
8. The generated migration report and all five exact HTML bodies have been
   shown to the user by file link, with counts and SHA-256 hashes.

Print this discipline phrase after the guards pass:

```text
This is the one-shot bootstrap. After publish, spec intent lives on Confluence and flows from Confluence to Jira, code, and tests. Ongoing changes go through /ethniafrica-spec.
```

## Atlassian boundaries

Use Atlassian Rovo tools resolved through `tool_search`.

Allowed writes:

- Create the Engineering page under `engineeringRootPageId`.
- Create the four canonical pages under the newly created Engineering page.
- Update only that newly created Engineering page in the same session, replacing
  draft page-ID placeholders with the four returned child page IDs.

Forbidden:

- Any Jira write.
- Editing the existing homepage or any pre-existing Confluence page.
- Deleting a Confluence page.
- Retrying a failed write blindly.
- Writing outside the newly created Engineering subtree.

## Phase 0 — Guard

Run every precondition sequentially. If one fails, stop without a Confluence
write, config change, sentinel, branch, or commit.

Re-read live descendants immediately before presenting the publish gate. A
half-built or colliding tree is a human reconciliation problem.

## Phase 1 — Build and validate exact drafts

`npm run confluence:bootstrap:build` must produce:

- `bootstrap/output/requirements.html`
- `bootstrap/output/decisions.html`
- `bootstrap/output/architecture.html`
- `bootstrap/output/obsolete.html`
- `bootstrap/output/engineering.html`
- `bootstrap/output/migration-report.md`
- `docs/confluence-spec/req-catalog.json`

The Requirements generator maps `FR1`–`FR46` to `REQ-001`–`REQ-046` and
`NFR1`–`NFR45` to `REQ-047`–`REQ-091`. Existing test annotations are reported
as anchors. Missing anchors remain `TODO: GWT`.

Do not hand-edit generated bodies. Change their source catalog or generator,
test first, then regenerate.

## Phase 2 — Hard approval gate

Present:

- parent page ID and title;
- exact title, byte size, section count, and SHA-256 for every page;
- clickable local links to all five full HTML bodies and the migration report;
- intended create/update order;
- the current repository diff and validation results.

Then print exactly:

```text
To proceed with the Confluence publish, reply with this exact phrase on a line by itself, case-sensitive, with no other text:

bootstrap publish approved
```

Wait. Only `reply.strip() == "bootstrap publish approved"` authorizes Phase 3.
Any other reply stops the run with no external or lockout write.

## Phase 3 — Publish sequentially

Never parallelize these calls:

1. Create `EthniAfrica — Engineering` under `engineeringRootPageId` using the
   generated Engineering draft. Capture `engineeringTreePageId`.
2. Create `Requirements` under `engineeringTreePageId` from
   `requirements.html`. Capture `requirementsPageId`.
3. Create `Decisions` under `engineeringTreePageId` from `decisions.html`.
4. Create `Architecture` under `engineeringTreePageId` from
   `architecture.html`.
5. Create `Obsolete` under `engineeringTreePageId` from `obsolete.html`.
6. Render the Engineering body with the four real child IDs and update only the
   Engineering page created in step 1. A single version-conflict retry is
   allowed after refetching that page.
7. Fetch all five pages and verify their titles, parents, identifiers, section
   counts, and content hashes or normalized bodies.

On any failure, stop. Report every page already created and its ID. Do not
continue, delete, update config, or write the sentinel. Manual reconciliation is
required.

## Phase 4 — Persist IDs exactly

Only after all five live pages verify:

- Set `engineeringTreePageId` to the created Engineering page ID.
- Set the four `*PageId` fields to their returned IDs.
- Preserve every other config field, field order, and two-space indentation.

Write `docs/.confluence-bootstrap-complete`:

```json
{
  "timestamp": "<UTC ISO 8601>",
  "engineeringTreePageId": "<id>",
  "requirementsPageId": "<id>",
  "decisionsPageId": "<id>",
  "architecturePageId": "<id>",
  "obsoletePageId": "<id>",
  "prdSha256": "<sha256>",
  "requirementsSha256": "<sha256>",
  "decisionsSha256": "<sha256>",
  "architectureSha256": "<sha256>",
  "obsoleteSha256": "<sha256>"
}
```

## Phase 5 — Local branch and commit

Create `codex/bootstrap-confluence-spec-init` from the current branch. Stage
only the reviewed bootstrap files, config, and sentinel. Commit in English:

```text
chore(confluence): bootstrap EthniAfrica spec tree
```

Never add a `Co-Authored-By` trailer. Do not push.

Run the full validation suite again and report:

- branch and commit;
- live links for all five pages;
- config and sentinel paths;
- final counts and traceability coverage;
- any documented gap that remains Pending or `TODO: GWT`;
- explicit confirmation that nothing was pushed and Jira was not modified.

## One-shot lockout

Every future invocation checks the sentinel first and refuses. Removing the
sentinel does not make a second run safe; reconciliation of live IDs and pages is
a deliberate human operation.
