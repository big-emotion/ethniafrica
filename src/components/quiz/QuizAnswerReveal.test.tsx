import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuizAnswerReveal } from "@/components/quiz/QuizAnswerReveal";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";

const QUESTION: QuizSessionQuestionView = {
  templateId: "T2",
  promptFr: "Quelle est l'auto-appellation de ce peuple ?",
  optionsFr: ["Alpha", "Beta", "Gamma", "Delta"],
  correctOption: 2,
  explanationFr: "Gamma est confirmé par la source primaire.",
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("QuizAnswerReveal (Epic 10, Story 10.9, ETNI-1134, FR68/FR71)", () => {
  // @req REQ-103 FR68 FR71
  it("shows the verdict, correct answer, explanation and source line", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText("Ce n'est pas ça")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
    expect(
      screen.getByText("Gamma est confirmé par la source primaire.")
    ).toBeInTheDocument();
    expect(screen.getByText("SIL Ethnologue")).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "· 2021")
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR68
  it("uses --afh-terracotta and never --afh-error for an incorrect verdict", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    const heading = screen.getByRole("heading", { name: /Ce n'est pas ça/ });
    expect(heading.className).toMatch(/afh-terracotta/);
    expect(heading.className).not.toMatch(/afh-error/);
  });

  // @req REQ-103 FR68
  it("shows a positive verdict heading for a correct answer", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByText("Bonne réponse !")).toBeInTheDocument();
  });

  // @req REQ-103 FR71
  it("opens SourceChainSheet for the question's assertionId when the source-chain button is activated", async () => {
    const user = userEvent.setup();
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Ouvrir la chaîne de sources" })
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /Quelle est l'auto-appellation/ })
      ).toBeInTheDocument()
    );
  });

  // @req REQ-103 FR68
  it("announces the verdict and explanation via aria-live=polite", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    const live = screen.getByTestId("quiz-reveal-live-region");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("Ce n'est pas ça");
    expect(live).toHaveTextContent(
      "Gamma est confirmé par la source primaire."
    );
  });

  // @req REQ-103 FR67
  it("moves focus to the verdict heading on mount, with « question suivante » next in tab order", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    const heading = screen.getByRole("heading", { name: /Ce n'est pas ça/ });
    expect(heading).toHaveFocus();

    const nextButton = screen.getByRole("button", {
      name: "Question suivante",
    });
    const position = heading.compareDocumentPosition(nextButton);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // @req REQ-103 FR67
  it("shows « voir le score » instead of « question suivante » on the last question", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion
        onNext={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Voir le score" })
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("calls onNext when the next-question button is activated", async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={onNext}
      />
    );

    await user.click(screen.getByRole("button", { name: "Question suivante" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // @req REQ-103 NFR — reduced-motion
  it("resolves the reveal transition to an opacity-only ≤ 0.01ms duration under prefers-reduced-motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    const panel = screen.getByTestId("quiz-answer-reveal");
    expect(panel).toHaveAttribute("data-reduced-motion", "true");
    expect(panel.style.transitionDuration).toBe("0.01ms");
  });

  // @req REQ-103 NFR — CLS
  it("reserves a min-height on the reveal panel", () => {
    render(
      <QuizAnswerReveal
        question={QUESTION}
        isCorrect={false}
        isLastQuestion={false}
        onNext={vi.fn()}
      />
    );

    const panel = screen.getByTestId("quiz-answer-reveal");
    expect(panel.className).toMatch(/min-h-/);
  });
});
