---
type: Story
project: ETNI
parent_epic: ""
assignee: ""
---

# Title

<!-- Concise, business-readable. One short sentence that names the outcome, not the implementation.
     Avoid jargon and ticket IDs here. -->
<!-- Example, in EthniAfrica's domain language:
     "Expose demographic breakdowns per country through the public /v2 API" -->

## User story

<!-- if: type == "Story" -->

As a <role>
I want <capability>
so that <business outcome>.

<!-- /if -->

## Business value

<!-- One short paragraph: why this matters to the project's users or stakeholders.
     Tie it back to a measurable outcome whenever possible.

     EthniAfrica's measurable outcomes:
     - AFRIK data coverage and integrity (fiches passing validateAfrikData, FR28
       demographic sums inside the strict [99, 101]% band)
     - Source quality (share of claims cited at Tier 1 vs Tier 2; zero Tier 3)
     - Public API usability (documented /v2 endpoints, OpenAPI spec in sync)
     - Mobile performance and accessibility (Lighthouse mobile thresholds, RGAA)
     - Decolonial editorial standard (endonyms present, colonial terms explained) -->

## Scope

### In

<!-- Bullet list of what IS included in this ticket. -->

### Out

<!-- Bullet list of what is explicitly NOT included (deferred, separate ticket, etc.). -->

## Reproduction steps

<!-- if: type == "Bug" -->

1. <step one>
2. <step two>
3. <step three>
   <!-- /if -->

## Expected vs Actual behavior

<!-- if: type == "Bug" -->

### Expected

<expected behavior>

### Actual

<actual behavior>
<!-- /if -->

## Acceptance criteria (Given-When-Then)

<!-- Required whenever the ticket creates or edits a REQ.
     One GWT block per REQ touched. Use the `Given … When … Then …` skeleton below. -->

```
Given <context>
When <action>
Then <observable outcome>
```

## Confluence impact (load-bearing)

<!-- MANDATORY. List every REQ / DEC / ARCH touched by this ticket with one of the
     three allowed verbs: NEW, EDIT, RETIRE. No other verb (REMOVE, UPDATE, ADD, …)
     is accepted.

     The bullet character is `•`. Indentation under each bullet is two spaces. -->

• REQ-042 — EDIT statement
Current: "<verbatim current statement>"
Proposed: "<new statement>"
GWT changes: <which GWT blocks change, and how>

• DEC-018 — NEW
Context: <why this decision is being recorded now>
Decision: <the decision itself, one sentence>
Alternatives: <options considered, briefly>
Tradeoffs: <what we accept by choosing this option>
Requirements satisfied: <REQ-xxx, REQ-yyy>

• ARCH-007 — EDIT body
Summary change: <one-line diff of the architecture contract>
Source files (expected): <paths that should anchor this contract>
Tests anchoring this contract: <test files / spec ids>

## Dependencies

<!-- Optional. Other tickets, PRs, Confluence pages, or external blockers. Keep it brief. -->

## Assumptions / open questions

<!-- Optional. Anything you assumed while writing the ticket, or questions that
     need a product / design / lead decision before implementation can start. -->
