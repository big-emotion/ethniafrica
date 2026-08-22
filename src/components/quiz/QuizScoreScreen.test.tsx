import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuizScoreScreen } from "@/components/quiz/QuizScoreScreen";
import { getStoredRung } from "@/lib/quiz/rung-storage";

describe("QuizScoreScreen (Epic 10, Story 10.9, ETNI-1136, FR68)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // @req REQ-103 FR67
  it("surfaces the final correct/total score", () => {
    render(
      <QuizScoreScreen
        segment="adults"
        difficulty={2}
        correctCount={7}
        totalQuestions={8}
        onPlayAgain={vi.fn()}
      />
    );

    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/bonnes réponses sur/)).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  // @req REQ-103 FR68
  it("persists the next rung in localStorage, keyed per segment, when finishing at >= 75% correct", () => {
    render(
      <QuizScoreScreen
        segment="adults"
        difficulty={2}
        correctCount={6}
        totalQuestions={8}
        onPlayAgain={vi.fn()}
      />
    );

    expect(getStoredRung("adults")).toBe(3);
    expect(
      screen.getByText("Niveau suivant débloqué pour ce parcours.")
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR68
  it("does not persist any rung advancement when finishing below 75% correct", () => {
    render(
      <QuizScoreScreen
        segment="adults"
        difficulty={2}
        correctCount={5}
        totalQuestions={8}
        onPlayAgain={vi.fn()}
      />
    );

    expect(getStoredRung("adults")).toBeNull();
    expect(
      screen.getByText("Encore un effort pour débloquer le niveau suivant.")
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR68
  it("sends nothing to the server for progression — pure client-side write", () => {
    const originalFetch = global.fetch;
    let called = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = () => {
      called = true;
      throw new Error("fetch must not be called");
    };

    render(
      <QuizScoreScreen
        segment="adults"
        difficulty={2}
        correctCount={8}
        totalQuestions={8}
        onPlayAgain={vi.fn()}
      />
    );

    expect(called).toBe(false);
    global.fetch = originalFetch;
  });

  // @req REQ-103 FR67
  it("calls onPlayAgain when the « rejouer » button is activated", async () => {
    const onPlayAgain = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizScoreScreen
        segment="adults"
        difficulty={2}
        correctCount={8}
        totalQuestions={8}
        onPlayAgain={onPlayAgain}
      />
    );

    await user.click(screen.getByRole("button", { name: "Rejouer" }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
