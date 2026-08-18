import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizQuestionCard } from "@/components/quiz/QuizQuestionCard";
import type { QuizSessionQuestionView } from "@/api/v2/schemas/quiz";

const QUESTION: QuizSessionQuestionView = {
  templateId: "T2",
  promptFr: "Quelle est l'auto-appellation de ce peuple ?",
  optionsFr: ["Alpha", "Beta", "Gamma", "Delta"],
  correctOption: 2,
  explanationFr: "Explication.",
  source: { title: "Ethnologue", year: 2021, tier: "primary", url: null },
  assertionId: "assertion-1",
  entity: {
    type: "people",
    id: "PPL_TEST",
    slug: "PPL_TEST",
    autonym: null,
    exonym: null,
  },
};

const NAME_OPTIONS_QUESTION: QuizSessionQuestionView = {
  ...QUESTION,
  optionsFr: [
    { autonym: "Wolof", exonym: "Ouolof" },
    { autonym: "Fulani", exonym: "Peul" },
  ],
};

describe("QuizQuestionCard (Epic 10, Story 10.9, ETNI-1133, FR67)", () => {
  // @req REQ-103 FR67
  it("renders a fieldset/legend radiogroup with the question as legend", () => {
    render(
      <QuizQuestionCard
        question={QUESTION}
        selectedOption={null}
        onSelectOption={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    const group = screen.getByRole("radiogroup");
    expect(group.closest("fieldset")).toBeInTheDocument();
    expect(
      screen.getByText("Quelle est l'auto-appellation de ce peuple ?")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  // @req REQ-103 FR67
  it("moves selection with arrow keys and selects with Space (roving tabindex)", async () => {
    const onSelectOption = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizQuestionCard
        question={QUESTION}
        selectedOption={null}
        onSelectOption={onSelectOption}
        onValidate={vi.fn()}
      />
    );

    const radios = screen.getAllByRole("radio");
    radios[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(radios[1]);
    await user.keyboard(" ");

    expect(onSelectOption).toHaveBeenCalledWith(1);
  });

  // @req REQ-103 FR67
  it("disables « valider » until an option is selected", () => {
    render(
      <QuizQuestionCard
        question={QUESTION}
        selectedOption={null}
        onSelectOption={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Valider" })).toBeDisabled();
  });

  // @req REQ-103 FR67
  it("enables « valider » once an option is selected and completes on Enter", async () => {
    const onValidate = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizQuestionCard
        question={QUESTION}
        selectedOption={2}
        onSelectOption={vi.fn()}
        onValidate={onValidate}
      />
    );

    const validateButton = screen.getByRole("button", { name: "Valider" });
    expect(validateButton).toBeEnabled();

    validateButton.focus();
    await user.keyboard("{Enter}");

    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  // @req REQ-103 FR67
  it("renders no timer and no auto-advance affordance anywhere in the card", () => {
    render(
      <QuizQuestionCard
        question={QUESTION}
        selectedOption={null}
        onSelectOption={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    expect(screen.queryByTestId("quiz-timer")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("renders structured autonym/exonym option values without collapsing to a bare string", () => {
    render(
      <QuizQuestionCard
        question={NAME_OPTIONS_QUESTION}
        selectedOption={null}
        onSelectOption={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    expect(screen.getByText("Wolof")).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.textContent === "(Ouolof)")
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("marks the currently selected option as checked", () => {
    render(
      <QuizQuestionCard
        question={QUESTION}
        selectedOption={1}
        onSelectOption={vi.fn()}
        onValidate={vi.fn()}
      />
    );

    const radios = screen.getAllByRole("radio");
    expect(radios[1]).toHaveAttribute("aria-checked", "true");
  });
});
