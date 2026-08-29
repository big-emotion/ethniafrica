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
  themes: [
    {
      id: "croyances",
      labelFr: "Croyances",
      activeQuestionCount: 400,
      playable: true,
    },
    {
      id: "migrations",
      labelFr: "Migrations",
      activeQuestionCount: 2,
      playable: false,
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

  /**
   * The picker offered two axes, and both answer *who* a question is about.
   * Neither answers *what* it asks — which is the axis a reader was actually
   * missing once the bank held nine domains instead of four.
   */
  // @req REQ-121
  it("offers a theme alongside the country and the family", () => {
    render(<QuizScopePicker scopes={scopes} action={QUIZ_PATH} />);

    expect(screen.getByLabelText("Thème")).toHaveAttribute("name", "theme");
    expect(screen.getByLabelText("Pays")).toHaveAttribute("name", "pays");
    expect(screen.getByLabelText("Famille linguistique")).toHaveAttribute(
      "name",
      "famille"
    );
  });

  /**
   * All three submit from one `method="get"` form, which is what makes
   * « les croyances des peuples d'Afrique du Sud » a single navigation rather
   * than a track the picker would have had to enumerate.
   */
  // @req REQ-121
  it("submits the three axes together, so they compose", () => {
    render(<QuizScopePicker scopes={scopes} action={QUIZ_PATH} />);

    const form = screen.getByTestId("quiz-scope-picker");
    const names = Array.from(form.querySelectorAll("select")).map(
      (select) => select.name
    );
    expect(names).toEqual(["pays", "famille", "theme"]);
  });

  // @req REQ-121
  it("defaults every axis to no filter, so the bare form is the whole corpus", () => {
    render(<QuizScopePicker scopes={scopes} action={QUIZ_PATH} />);

    for (const label of ["Pays", "Famille linguistique", "Thème"]) {
      expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(
        ""
      );
    }
    expect(screen.getByText("Tous les thèmes")).toBeInTheDocument();
  });

  /**
   * A theme too thin to fill eight rounds is listed with its honest count and
   * disabled — the treatment Khoïsan already gets on the track axis. Hiding it
   * would make the corpus look narrower than it is.
   */
  // @req REQ-121
  it("lists a theme that cannot fill a session, and refuses it", () => {
    render(<QuizScopePicker scopes={scopes} action={QUIZ_PATH} />);

    const migrations = screen.getByRole("option", {
      name: /Migrations/,
    }) as HTMLOptionElement;
    expect(migrations.disabled).toBe(true);

    const croyances = screen.getByRole("option", {
      name: /Croyances — 400 questions disponibles/,
    }) as HTMLOptionElement;
    expect(croyances.disabled).toBe(false);
  });
});
