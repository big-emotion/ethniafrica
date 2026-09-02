/**
 * FR90 (Epic 13, Story 13.9, ETNI-533) — asserts that no quiz surface can link
 * to, or be generated from, colonization/event content.
 *
 * **What changed, and why this file matters more now.** The guarantee used to
 * rest on two things: a children segment whose picker rendered no links, and a
 * children field-path allowlist that denied event-derived paths. Both went out
 * with the audience axis — a session is scoped by country or family now, and
 * nothing filters by audience at all.
 *
 * Measured against the five templates that exist, the allowlist was excluding
 * exactly one thing from children: T5, the ISO 639-3 code of a language — a
 * template since retired under games charter §8. Not a
 * sensitive topic. The property it was meant to protect — that no template
 * reads colonisation or event content — was always a property of
 * `TEMPLATE_FIELD_PATHS`, and that is what is asserted here directly.
 *
 * This is a narrower guarantee than the doctrine asks for. A future template
 * touching sensitive content needs an editorial gate written for it, with
 * advisory sign-off; it cannot inherit one from a segment that no longer
 * exists.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { QuizScopePicker } from "@/components/quiz/QuizScopePicker";
import type { QuizScopesData } from "@/api/v2/schemas/quiz";
import { TEMPLATE_FIELD_PATHS } from "@/lib/quiz/segmentPolicy";
import { MIGRATION_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import { getLocalizedRoute } from "@/lib/routing";

const EVENT_DERIVED_FIELD_PATH = "content.events.eventType";

const SCOPES: QuizScopesData = {
  countries: [
    { id: "GHA", labelFr: "Ghana", activeQuestionCount: 90, playable: true },
  ],
  families: [],
  mixed: {
    id: "mixed",
    labelFr: "Tout le continent",
    activeQuestionCount: 2504,
    playable: true,
  },
  random: {
    id: "random",
    labelFr: "Au hasard",
    activeQuestionCount: 2504,
    playable: true,
  },
};

function isEventDerivedPath(fieldPath: string): boolean {
  return (
    fieldPath.includes("content.events") ||
    MIGRATION_EVENT_TYPES.some((eventType) => fieldPath.includes(eventType))
  );
}

// @req REQ-091 FR90
describe("colonization quiz-surface exclusion (Epic 13, Story 13.9, ETNI-533)", () => {
  // @req REQ-091 FR90
  it("links only to the quiz itself from the track picker", () => {
    const { container } = render(
      <QuizScopePicker
        scopes={SCOPES}
        action={getLocalizedRoute("fr", "quiz")}
      />
    );

    const hrefs = Array.from(container.querySelectorAll("a")).map((anchor) =>
      anchor.getAttribute("href")
    );
    expect(
      hrefs.every((href) => href?.startsWith(getLocalizedRoute("fr", "quiz")))
    ).toBe(true);
  });

  // @req REQ-091 FR90
  it("keeps every quiz template field path free of event-derived content", () => {
    for (const fieldPath of Object.values(TEMPLATE_FIELD_PATHS)) {
      expect(isEventDerivedPath(fieldPath)).toBe(false);
    }
  });

  // @req REQ-091 FR90
  it("recognises a representative event-derived field path, so the check above can fail", () => {
    // Without this, a check that every template path is clean would also pass
    // if `isEventDerivedPath` stopped recognising anything at all.
    expect(isEventDerivedPath(EVENT_DERIVED_FIELD_PATH)).toBe(true);
  });
});
