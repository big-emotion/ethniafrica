import { describe, expect, it } from "vitest";

import { validateJiraTemplate } from "../checkJiraTemplate";

const VALID_TEMPLATE = `
# Title

## User story

## Business value

## Scope

## Acceptance criteria (Given-When-Then)

## Confluence impact (load-bearing)

• REQ-042 — EDIT statement
• DEC-018 — NEW
• ARCH-007 — RETIRE

## Dependencies
`;

describe("validateJiraTemplate", () => {
  // @req REQ-085
  it("accepts the required structure and the NEW/EDIT/RETIRE verbs", () => {
    expect(validateJiraTemplate(VALID_TEMPLATE)).toEqual([]);
  });

  // @req REQ-085
  it("reports missing load-bearing sections", () => {
    expect(validateJiraTemplate("# Title")).toContain(
      'missing required section "## Confluence impact (load-bearing)"'
    );
  });

  // @req REQ-085
  it("rejects unsupported Confluence impact verbs", () => {
    expect(
      validateJiraTemplate(
        VALID_TEMPLATE.replace(
          "• REQ-042 — EDIT statement",
          "• REQ-042 — UPDATE"
        )
      )
    ).toContain('unsupported Confluence impact verb "UPDATE" for REQ-042');
  });
});
