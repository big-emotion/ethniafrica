import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizScopePicker } from "@/components/quiz/QuizScopePicker";
import type { QuizScopesData } from "@/api/v2/schemas/quiz";
import { getLocalizedRoute } from "@/lib/routing";

const SCOPES: QuizScopesData = {
  countries: [
    {
      id: "ZAF",
      labelFr: "Afrique du Sud",
      activeQuestionCount: 160,
      playable: true,
    },
    { id: "DJI", labelFr: "Djibouti", activeQuestionCount: 3, playable: false },
  ],
  families: [
    {
      id: "FLG_BANTU",
      labelFr: "Bantoue",
      activeQuestionCount: 900,
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
    activeQuestionCount: 4500,
    playable: true,
  },
  random: {
    id: "random",
    labelFr: "Au hasard",
    activeQuestionCount: 4500,
    playable: true,
  },
};

function renderPicker() {
  return render(
    <QuizScopePicker scopes={SCOPES} action={getLocalizedRoute("fr", "quiz")} />
  );
}

describe("QuizScopePicker — the content-theme facet", () => {
  /**
   * The composer offered two axes, both about *who* a question is asked about
   * and neither about *what* it asks. Twelve templates over nine themes are
   * worth nothing to a reader who cannot pick one.
   */
  // @req REQ-121
  it("offers a theme alongside the country and the family", () => {
    renderPicker();

    const themeSelect = screen.getByLabelText("Thème");
    expect(themeSelect).toHaveAttribute("name", "theme");
    expect(screen.getByLabelText("Pays")).toHaveAttribute("name", "pays");
    expect(screen.getByLabelText("Famille linguistique")).toHaveAttribute(
      "name",
      "famille"
    );
  });

  /**
   * All three submit from one `method="get"` form, which is what makes
   * « les croyances des peuples d'Afrique du Sud » a single navigation instead
   * of a track the picker would have had to enumerate.
   */
  // @req REQ-121
  it("submits the three axes together, so they compose", () => {
    renderPicker();

    const form = screen.getByTestId("quiz-scope-picker");
    expect(form).toHaveAttribute("method", "get");
    const names = Array.from(form.querySelectorAll("select")).map(
      (select) => select.name
    );
    expect(names).toEqual(["pays", "famille", "theme"]);
  });

  // @req REQ-121
  it("defaults every axis to no filter, so the bare form is the whole corpus", () => {
    renderPicker();

    for (const label of ["Pays", "Famille linguistique", "Thème"]) {
      expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(
        ""
      );
    }
    expect(screen.getByText("Tous les thèmes")).toBeInTheDocument();
  });

  /**
   * A theme too thin to fill eight rounds is listed with its honest count and
   * disabled — the same treatment Djibouti gets on the track axis. Hiding it
   * would make the corpus look narrower than it is.
   */
  // @req REQ-121
  it("lists a theme that cannot fill a session, and refuses it", () => {
    renderPicker();

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
