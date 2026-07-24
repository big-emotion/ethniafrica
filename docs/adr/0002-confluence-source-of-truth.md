# ADR-0002: Confluence as the engineering intent source of truth

- Status: Accepted
- Date: 2026-07-24
- Decision owners: EthniAfrica engineering

## Context

EthniAfrica has mature planning documents, architecture notes, Jira delivery work,
code, and tests, but these artifacts do not currently share one stable identifier
system. The dedicated `ETHNIAFRIC` Confluence space exists and is empty.

The project needs a one-shot migration that preserves the accepted product intent,
records decisions and architecture contracts, distinguishes retired intent, and
makes future drift detectable without rewriting repository history.

## Decision

The canonical engineering intent is stored under one Confluence tree:

```text
EthniAfrica
└── EthniAfrica — Engineering
    ├── Requirements
    ├── Decisions
    ├── Architecture
    └── Obsolete
```

The branches use stable identifiers:

- `REQ-NNN` for accepted functional and non-functional requirements.
- `DEC-NNN` for product and engineering decisions.
- `ARCH-NNN` for coarse-grained architecture contracts.

The bootstrap maps `FR1`–`FR46` to `REQ-001`–`REQ-046` and `NFR1`–`NFR45`
to `REQ-047`–`REQ-091`. Jira tickets declare each affected identifier with
exactly one of `NEW`, `EDIT`, or `RETIRE`. New tests carry a nearby
`// @req REQ-NNN` annotation. Existing tests are grandfathered and can be
annotated incrementally; CI validates every annotation against the generated
catalog.

Repository documents remain implementation evidence and bootstrap inputs. After
publication, changes to canonical intent start in Confluence and flow through Jira
to code and tests. Automated tools may propose drafts, but Confluence status
transitions remain human decisions.

## Consequences

- The one-shot bootstrap must be create-only except for completing the newly
  created Engineering index in the same publication session.
- A sentinel prevents accidental second runs.
- Page IDs are persisted in `docs/confluence-spec/config.json`; functional IDs
  remain stable even if a page title changes.
- A partial Confluence write never updates local page IDs or writes the sentinel.
- Ongoing work uses the normal specification workflow rather than rerunning the
  bootstrap.
- Requirements without an honest automated anchor remain explicitly marked
  `TODO: GWT`; the migration does not invent coverage.

## Rejected alternatives

- Repository-only intent: does not satisfy the requested Confluence workflow.
- Bidirectional mutable authority: creates conflict instead of resolving it.
- One Confluence page per requirement: creates excessive page-management
  overhead for the initial 91-requirement corpus.
- Fabricated test mappings: makes the traceability report misleading.
