import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizScoreScreen } from "@/components/quiz/QuizScoreScreen";
import type { QuizScope } from "@/lib/quiz/quizScope";
import { getLocalizedRoute } from "@/lib/routing";

const GHANA: QuizScope = { kind: "country", entityId: "GHA" };

function renderScreen(scope: QuizScope = GHANA, correct = 7) {
  return render(
    <QuizScoreScreen
      language="fr"
      scope={scope}
      scopeLabelFr="Ghana"
      correctCount={correct}
      totalQuestions={8}
      exitHref={getLocalizedRoute("fr", "quiz")}
    />
  );
}

describe("QuizScoreScreen (Epic 10, Story 10.9, ETNI-1136)", () => {
  // @req REQ-103 FR70
  it("surfaces the final correct/total score", () => {
    renderScreen();

    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/bonnes réponses sur/)).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  // @req REQ-103 FR70
  it("names the track just played", () => {
    renderScreen();

    expect(screen.getByText("Ghana")).toBeInTheDocument();
  });

  // @req REQ-103 FR70
  it("carries the track into the share card's URL, not its label", () => {
    // A label a stranger could set is a caption on an image carrying the
    // site's own type; the id is resolved against the corpus instead.
    renderScreen();

    const link = screen.getByRole("link", { name: "Voir la carte de score" });
    expect(link).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "quiz")}/score?pays=GHA&correct=7&total=8`
    );
  });

  // @req REQ-103 FR70
  it("writes nothing anywhere — no rung survives a session now", () => {
    // The per-audience ladder went with the audiences; the ladder now lives
    // inside the eight rounds, so there is no progression left to persist.
    renderScreen();

    expect(window.localStorage.length).toBe(0);
  });

  // @req REQ-103 FR67
  it("offers a way back to the picker", () => {
    renderScreen();

    expect(screen.getByTestId("quiz-session-exit")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "quiz")
    );
  });
});
