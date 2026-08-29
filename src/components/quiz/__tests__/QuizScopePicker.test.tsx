import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizScopePicker } from "@/components/quiz/QuizScopePicker";
import { getLocalizedRoute } from "@/lib/routing";
import type { QuizScopesData } from "@/api/v2/schemas/quiz";

const QUIZ_PATH = getLocalizedRoute("fr", "quiz");

const scopes = {
  countries: [
    { id: "GHA", labelFr: "Ghana", activeQuestionCount: 90, playable: true },
  ],
  families: [
    {
      id: "FLG_NIGER_CONGO",
      labelFr: "Nigéro-congolaise",
      activeQuestionCount: 400,
      playable: true,
    },
  ],
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
} as unknown as QuizScopesData;

describe("QuizScopePicker", () => {
  /**
   * The card linked to the bare quiz path, and the page only opens a session
   * when the URL names a track — so it always landed back on the picker it was
   * clicked from. It also said the same thing as « Au hasard » to a reader:
   * eight questions from the whole corpus.
   */
  // @req REQ-103 FR66
  it("offers no whole-continent card beside the random one", () => {
    render(<QuizScopePicker scopes={scopes} action={QUIZ_PATH} />);

    expect(screen.queryByTestId("quiz-scope-mixed")).not.toBeInTheDocument();
    expect(screen.getByTestId("quiz-scope-random")).toBeInTheDocument();
  });

  /**
   * Left on « Tous les pays » / « Toutes les familles » the form submitted
   * `?pays=&famille=`, which names no track — so « Lancer ce parcours » walked
   * the reader back to the picker. The marker is what makes an unfiltered
   * submission a track of its own.
   */
  // @req REQ-103 FR66
  it("submits the whole-corpus marker so an unfiltered run still opens", () => {
    const { container } = render(
      <QuizScopePicker scopes={scopes} action={QUIZ_PATH} />
    );

    const marker = container.querySelector('input[name="mode"]');
    expect(marker).toHaveValue("mixte");
  });
});
