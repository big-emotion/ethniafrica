import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuizPlayHost } from "@/components/quiz/QuizPlayHost";
import type { QuizScope } from "@/lib/quiz/quizScope";
import { getLocalizedRoute } from "@/lib/routing";

vi.mock("@/components/quiz/QuizPlayIsland", () => ({
  QuizPlayIsland: ({
    scope,
    exitHref,
  }: {
    scope: QuizScope;
    exitHref: string;
  }) => (
    <div
      data-testid="quiz-play-island"
      data-scope={`${scope.kind}:${scope.entityId ?? ""}`}
      data-exit={exitHref}
    />
  ),
}));

describe("QuizPlayHost (Epic 10, Story 10.9, ETNI-1137)", () => {
  // @req REQ-103 FR67
  it("mounts the play island for the track the URL named", async () => {
    render(
      <QuizPlayHost
        scope={{ kind: "country", entityId: "GHA" }}
        theme={null}
        scopeLabelFr="Ghana"
        exitHref={getLocalizedRoute("fr", "quiz")}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("quiz-play-island")).toHaveAttribute(
        "data-scope",
        "country:GHA"
      )
    );
  });

  // @req REQ-103 FR67
  it("hands the island a way out of the session", async () => {
    render(
      <QuizPlayHost
        scope={{ kind: "mixed" }}
        theme={null}
        scopeLabelFr="Tout le continent"
        exitHref={getLocalizedRoute("fr", "quiz")}
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId("quiz-play-island")).toHaveAttribute(
        "data-exit",
        getLocalizedRoute("fr", "quiz")
      )
    );
  });
});
