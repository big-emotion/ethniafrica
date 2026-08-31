import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuizPlayIsland } from "@/components/quiz/QuizPlayIsland";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";
import type { QuizScope } from "@/lib/quiz/quizScope";
import { getLocalizedRoute } from "@/lib/routing";

const { mockUseQuizSession } = vi.hoisted(() => ({
  mockUseQuizSession: vi.fn(),
}));

vi.mock("@/hooks/use-quiz-session", () => ({
  useQuizSession: (options: unknown) => mockUseQuizSession(options),
}));

const GHANA: QuizScope = { kind: "country", entityId: "GHA" };

const QUESTION: QuizSessionQuestionView = {
  templateId: "T2",
  promptFr: "Quelle est l'auto-appellation de ce peuple ?",
  optionsFr: ["Alpha", "Beta"],
  correctOption: 1,
  explanationFr: "Explication.",
  source: { title: "SIL Ethnologue", year: 2021, tier: "official", url: null },
  assertionId: "assertion-1",
  entity: {
    type: "people",
    id: "PPL_TEST",
    slug: "PPL_TEST",
    autonym: null,
    exonym: null,
  },
};

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    status: "answering",
    questions: [QUESTION],
    currentQuestion: QUESTION,
    currentIndex: 0,
    totalQuestions: 1,
    selectedOption: null,
    verdict: null,
    correctCount: 0,
    error: null,
    selectAnswer: vi.fn(),
    validate: vi.fn(),
    next: vi.fn(),
    ...overrides,
  };
}

function renderIsland(scope: QuizScope = GHANA, label = "Ghana") {
  return render(
    <QuizPlayIsland
      scope={scope}
      scopeLabelFr={label}
      exitHref={getLocalizedRoute("fr", "quiz")}
    />
  );
}

describe("QuizPlayIsland (Epic 10, Story 10.9, ETNI-1137)", () => {
  beforeEach(() => {
    mockUseQuizSession.mockReset();
  });

  /**
   * The figure itself arrives in its own chunk — it carries the continent
   * path, which the island's gzip budget cannot afford — so what this holds
   * is the band and its reserved height. Without the band the wait was a
   * single line of grey text on an otherwise empty page.
   */
  // @req REQ-103 FR67
  it("holds a band open while the session is in flight", () => {
    mockUseQuizSession.mockReturnValue(baseSession({ status: "loading" }));

    renderIsland();

    expect(screen.getByTestId("quiz-loading-band")).toBeInTheDocument();
    expect(screen.queryByTestId("quiz-question-card")).not.toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("says the track has nothing to serve rather than rendering an empty screen", () => {
    // The gate runs again at serve time, so a track the picker counted as
    // stocked can still compose to zero questions. Returning null for that
    // left the player on a blank page with no way back.
    mockUseQuizSession.mockReturnValue(
      baseSession({ questions: [], currentQuestion: null, totalQuestions: 0 })
    );

    renderIsland();

    expect(
      screen.getByText(
        "Aucune question disponible pour ce parcours — réessaie plus tard."
      )
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("offers a way out of a running session, not only of an empty one", () => {
    // There was none: a player who picked the wrong country was held for eight
    // questions with no breadcrumb, no abandon and no link back.
    mockUseQuizSession.mockReturnValue(baseSession());

    renderIsland();

    expect(screen.getByTestId("quiz-session-exit")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "quiz")
    );
  });

  // @req REQ-103 FR67
  it("names the track being played", () => {
    mockUseQuizSession.mockReturnValue(baseSession());

    renderIsland();

    expect(screen.getByText("Ghana")).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("offers a way back from the empty state", () => {
    mockUseQuizSession.mockReturnValue(
      baseSession({ questions: [], currentQuestion: null, totalQuestions: 0 })
    );

    renderIsland();

    expect(screen.getByTestId("quiz-session-exit")).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("shows an error message when the session fails to load", () => {
    mockUseQuizSession.mockReturnValue(baseSession({ status: "error" }));

    renderIsland();

    expect(
      screen.getByText(
        "Impossible de charger cette session — réessaie dans un instant."
      )
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("renders the progress dots and question card in the answering phase", () => {
    mockUseQuizSession.mockReturnValue(baseSession());

    renderIsland();

    expect(screen.getByTestId("quiz-progress-dots")).toBeInTheDocument();
    expect(
      screen.getByText("Quelle est l'auto-appellation de ce peuple ?")
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR71
  it("renders the answer reveal panel in the revealed phase", () => {
    mockUseQuizSession.mockReturnValue(
      baseSession({
        status: "revealed",
        selectedOption: 0,
        verdict: false,
      })
    );

    renderIsland();

    expect(screen.getByTestId("quiz-answer-reveal")).toBeInTheDocument();
  });

  // @req REQ-103 FR70
  it("renders the score screen in the finished phase", () => {
    mockUseQuizSession.mockReturnValue(
      baseSession({ status: "finished", correctCount: 1, totalQuestions: 1 })
    );

    renderIsland();

    expect(screen.getByTestId("quiz-score-screen")).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("asks the session hook for the track the page named", () => {
    mockUseQuizSession.mockReturnValue(baseSession());

    renderIsland();

    expect(mockUseQuizSession).toHaveBeenCalledWith({
      scope: GHANA,
      theme: null,
    });
  });
});
