import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuizPlayIsland } from "@/components/quiz/QuizPlayIsland";
import { persistRungIfEarned } from "@/lib/quiz/rung-storage";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";

const { mockUseQuizSession } = vi.hoisted(() => ({
  mockUseQuizSession: vi.fn(),
}));

vi.mock("@/hooks/use-quiz-session", () => ({
  useQuizSession: (options: unknown) => mockUseQuizSession(options),
}));

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

describe("QuizPlayIsland (Epic 10, Story 10.9, ETNI-1137)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseQuizSession.mockReset();
  });

  // @req REQ-103 FR67
  it("shows a loading message while the session is in flight", () => {
    mockUseQuizSession.mockReturnValue(baseSession({ status: "loading" }));

    render(<QuizPlayIsland segment="adults" onExit={vi.fn()} />);

    expect(screen.getByText("Chargement de la session…")).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("shows an error message when the session fails to load", () => {
    mockUseQuizSession.mockReturnValue(baseSession({ status: "error" }));

    render(<QuizPlayIsland segment="adults" onExit={vi.fn()} />);

    expect(
      screen.getByText(
        "Impossible de charger cette session — réessaie dans un instant."
      )
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("renders the progress dots and question card in the answering phase", () => {
    mockUseQuizSession.mockReturnValue(baseSession());

    render(<QuizPlayIsland segment="adults" onExit={vi.fn()} />);

    expect(screen.getByTestId("quiz-progress-dots")).toBeInTheDocument();
    expect(
      screen.getByText("Quelle est l'auto-appellation de ce peuple ?")
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR68 FR71
  it("renders the answer reveal panel in the revealed phase", () => {
    mockUseQuizSession.mockReturnValue(
      baseSession({
        status: "revealed",
        selectedOption: 0,
        verdict: false,
      })
    );

    render(<QuizPlayIsland segment="adults" onExit={vi.fn()} />);

    expect(screen.getByTestId("quiz-answer-reveal")).toBeInTheDocument();
  });

  // @req REQ-103 FR68
  it("renders the score screen in the finished phase", () => {
    mockUseQuizSession.mockReturnValue(
      baseSession({ status: "finished", correctCount: 1, totalQuestions: 1 })
    );

    render(<QuizPlayIsland segment="adults" onExit={vi.fn()} />);

    expect(screen.getByTestId("quiz-score-screen")).toBeInTheDocument();
  });

  // @req REQ-103 FR68
  it("passes the segment's previously stored rung as the session difficulty", () => {
    persistRungIfEarned("adults", 2, 1);
    mockUseQuizSession.mockReturnValue(baseSession());

    render(<QuizPlayIsland segment="adults" onExit={vi.fn()} />);

    expect(mockUseQuizSession).toHaveBeenCalledWith(
      expect.objectContaining({ segment: "adults", difficulty: 3 })
    );
  });

  // @req REQ-103 FR68
  it("falls back to the segment's minimum rung when nothing is stored", () => {
    mockUseQuizSession.mockReturnValue(baseSession());

    render(<QuizPlayIsland segment="children" onExit={vi.fn()} />);

    expect(mockUseQuizSession).toHaveBeenCalledWith(
      expect.objectContaining({ segment: "children", difficulty: 1 })
    );
  });
});
