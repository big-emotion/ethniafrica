/**
 * FR90 (Epic 13, Story 13.9, ETNI-533) — asserts that no children-facing
 * quiz surface can ever link to, or be generated from, colonization/event
 * content.
 *
 * Two independent guarantees:
 * 1. Nav-rule: `QuizSegmentPicker` — the children segment's own entry
 *    point — renders zero `<a>` elements, so it is structurally incapable
 *    of linking to `/fr/regards/colonisation-et-resistances`.
 * 2. QZ-4-style CI assertion: the children field-path allowlist
 *    (`CHILDREN_FIELD_PATH_ALLOWLIST`) and the quiz template field paths
 *    (`TEMPLATE_FIELD_PATHS`) never reference event-derived content (the
 *    `MIGRATION_EVENT_TYPES` enum that backs colonization events per
 *    Story 13.1), and `isAllowedForSegment` denies such a path for the
 *    `children` audience.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { QuizSegmentPicker } from "@/components/quiz/QuizSegmentPicker";
import type { QuizSegmentView } from "@/api/v2/schemas/quiz";
import {
  CHILDREN_FIELD_PATH_ALLOWLIST,
  TEMPLATE_FIELD_PATHS,
  isAllowedForSegment,
} from "@/lib/quiz/segmentPolicy";
import { MIGRATION_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";

const CHILDREN_SEGMENT: QuizSegmentView[] = [
  {
    id: "children",
    labelFr: "enfants",
    rungs: [{ difficulty: 1, activeQuestionCount: 4 }],
  },
];

const EVENT_DERIVED_FIELD_PATH = "content.events.eventType";

function isEventDerivedPath(fieldPath: string): boolean {
  return (
    fieldPath.includes("content.events") ||
    MIGRATION_EVENT_TYPES.some((eventType) => fieldPath.includes(eventType))
  );
}

// @req REQ-091 FR90
describe("colonization children-surface exclusion (Epic 13, Story 13.9, ETNI-533)", () => {
  // @req REQ-091 FR90
  it("renders the children quiz segment picker with no links at all", () => {
    const { container } = render(
      <QuizSegmentPicker segments={CHILDREN_SEGMENT} />
    );
    expect(container.querySelectorAll("a").length).toBe(0);
  });

  // @req REQ-091 FR90
  it("keeps the children field-path allowlist free of event-derived paths", () => {
    for (const fieldPath of CHILDREN_FIELD_PATH_ALLOWLIST) {
      expect(isEventDerivedPath(fieldPath)).toBe(false);
    }
  });

  // @req REQ-091 FR90
  it("keeps every quiz template field path free of event-derived content (QZ-4)", () => {
    for (const fieldPath of Object.values(TEMPLATE_FIELD_PATHS)) {
      expect(isEventDerivedPath(fieldPath)).toBe(false);
    }
  });

  // @req REQ-091 FR90
  it("denies the children segment access to a representative event-derived field path", () => {
    expect(isAllowedForSegment(EVENT_DERIVED_FIELD_PATH, "children")).toBe(
      false
    );
  });

  // @req REQ-091 FR90
  it("still allows non-children segments access to event-derived field paths", () => {
    expect(isAllowedForSegment(EVENT_DERIVED_FIELD_PATH, "adults")).toBe(true);
  });
});
