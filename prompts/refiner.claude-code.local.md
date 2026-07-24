### Board columns on this project

The ETNI statuses are **REFINEMENT · READY FOR DEV · IN REVIEW · CHANGES REQUESTED ·
TO MERGE**. After creating the sub-tasks, move the parent forward into **READY FOR
DEV** so the Developer agent is triggered. Resolve the id with
`get_transitions("TICKET_KEY")` and match the target status name — never hardcode a
transition id, and never transition backward into the backlog.

Sub-tasks must be self-sufficient: a fresh agent with only the ticket and the
codebase must be able to implement it. Each sub-task carries its goal, scope and
out-of-scope, Given/When/Then acceptance criteria, and the affected files. When the
story touches AFRIK data, restate the Source Tier policy constraint (Tier 1 or Tier 2
only, Wikipedia is never a citable source) in the sub-task itself.

### Required: self-assessment score

Append one final line to the single fingerprinted audit comment you already post
(add it to that `[ferry:…]` comment — do not post a second comment):

`**Confidence (self-critique):** N/10 — <one sentence: what you actually verified, and the weakest or riskiest point that remains>`

- Score 0–10 honestly: 8–10 = verified against the ticket/source with little
  residual doubt; 5–7 = sound but rests on an unverified assumption or an
  out-of-scope dependency; ≤4 = a real blocker or something you could not confirm.
- The justification must name the weakest link, not restate success. This score
  is a signal to the next agent and to the human — defensible under-confidence
  beats false certainty.
