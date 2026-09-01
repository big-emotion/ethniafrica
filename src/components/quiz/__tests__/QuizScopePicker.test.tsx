import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizScopePicker } from "@/components/quiz/QuizScopePicker";
import {
  QUIZ_THEME_IDS,
  QUIZ_THEME_LABELS_FR,
  QUIZ_THEME_SPECIMENS_FR,
} from "@/lib/quiz/segmentPolicy";
import type { QuizScopesData } from "@/api/v2/schemas/quiz";
import { getLocalizedRoute } from "@/lib/routing";

// Composed, never written out: `routeLiteralCharter` forbids the literal, and
// this is also the value the page hands the component in production.
const ACTION = getLocalizedRoute("fr", "quiz");
const track = (query: string) => `${ACTION}?${query}`;

function scopes(overrides: Partial<QuizScopesData> = {}): QuizScopesData {
  return {
    countries: [
      {
        id: "GHA",
        labelFr: "Ghana",
        activeQuestionCount: 90,
        playable: true,
        playableThemeIds: ["noms", "croyances"],
      },
      {
        id: "DJI",
        labelFr: "Djibouti",
        activeQuestionCount: 12,
        playable: true,
        playableThemeIds: [],
      },
    ],
    families: [
      {
        id: "FLG_NIGER_CONGO",
        labelFr: "Niger-Congo",
        activeQuestionCount: 1103,
        playable: true,
        playableThemeIds: ["noms"],
      },
    ],
    themes: QUIZ_THEME_IDS.map((id) => ({
      id,
      labelFr: QUIZ_THEME_LABELS_FR[id],
      activeQuestionCount: 400,
      playable: true,
    })),
    mixed: {
      id: "mixed",
      labelFr: "Tout le continent",
      activeQuestionCount: 5711,
      playable: true,
      playableThemeIds: [...QUIZ_THEME_IDS],
    },
    random: {
      id: "random",
      labelFr: "Au hasard",
      activeQuestionCount: 5711,
      playable: true,
      playableThemeIds: [...QUIZ_THEME_IDS],
    },
    ...overrides,
  } as QuizScopesData;
}

describe("QuizScopePicker", () => {
  /**
   * The single most important assertion in the redesign. Every option used to
   * carry « — N questions disponibles », a number that protected nothing (all
   * 54 countries, 23 families and 9 themes are playable alone) and that went
   * stale the moment two axes were crossed, since the counts were never
   * combined.
   */
  // @req REQ-103
  it("prints no question count anywhere", () => {
    const { container } = render(
      <QuizScopePicker scopes={scopes()} action={ACTION} />
    );

    expect(container.textContent).not.toMatch(/\d+\s*questions?/);
    expect(container.textContent).not.toMatch(/disponibles/);
  });

  // @req REQ-103
  it("renders no form and no select", () => {
    const { container } = render(
      <QuizScopePicker scopes={scopes()} action={ACTION} />
    );

    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("select")).toBeNull();
  });

  /**
   * Inverts the assertion this file used to carry. « Tout le continent » was
   * deleted once because it linked to the bare path, which names no track and
   * bounced the reader back to the picker. It carries `?mode=mixte` now — the
   * marker the retired hidden input submitted — so it is a track like any
   * other. Deleting it again would take the laddered whole-corpus run with it.
   */
  // @req REQ-103
  it("offers the whole continent as a track of its own, beside the random one", () => {
    render(<QuizScopePicker scopes={scopes()} action={ACTION} />);

    expect(
      screen.getByTestId("quiz-scope-mixed").querySelector("a")
    ).toHaveAttribute("href", track("mode=mixte"));
    expect(
      screen.getByTestId("quiz-scope-random").querySelector("a")
    ).toHaveAttribute("href", track("mode=aleatoire"));
  });

  // @req REQ-103
  it("offers every country, family and theme as a link to its own track", () => {
    render(<QuizScopePicker scopes={scopes()} action={ACTION} />);

    expect(screen.getByRole("link", { name: "Ghana" })).toHaveAttribute(
      "href",
      track("pays=GHA")
    );
    expect(screen.getByRole("link", { name: "Niger-Congo" })).toHaveAttribute(
      "href",
      track("famille=FLG_NIGER_CONGO")
    );
    expect(screen.getByRole("link", { name: "Croyances" })).toHaveAttribute(
      "href",
      track("theme=croyances")
    );
  });

  /**
   * What a card buys over an `<option>`: the theme's card shows the question it
   * asks, not the size of its pool.
   */
  // @req REQ-121
  it("shows each theme's question rather than its size", () => {
    render(<QuizScopePicker scopes={scopes()} action={ACTION} />);

    for (const id of QUIZ_THEME_IDS) {
      expect(screen.getByText(QUIZ_THEME_SPECIMENS_FR[id])).toBeInTheDocument();
    }
  });

  // @req REQ-103
  it("gives every tappable a 44px target", () => {
    const { container } = render(
      <QuizScopePicker scopes={scopes()} action={ACTION} />
    );

    const cards = container.querySelectorAll("[class*='min-h-11']");
    expect(cards.length).toBeGreaterThanOrEqual(
      2 + QUIZ_THEME_IDS.length + 2 + 1
    );
  });

  /**
   * The A–Z sort is the service's single responsibility (`byLabel` in
   * quizService); the picker must not re-sort, or the two orders drift and the
   * one a reader sees stops being the one the API documents.
   */
  // @req REQ-103
  it("lists the countries in the order the catalogue hands them", () => {
    render(<QuizScopePicker scopes={scopes()} action={ACTION} />);

    const links = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(links.indexOf(track("pays=GHA"))).toBeLessThan(
      links.indexOf(track("pays=DJI"))
    );
  });

  /**
   * `colonizationChildrenExclusion.test.tsx` renders this component with a
   * catalogue built before the themes axis existed. Keeping the tolerance means
   * that file needs no edit, and its « every href starts with /fr/jeux/quiz »
   * assertion still holds because every link here is a query on `action`.
   */
  // @req REQ-121
  it("survives a catalogue with no themes key", () => {
    const withoutThemes = scopes();
    delete (withoutThemes as { themes?: unknown }).themes;

    const { container } = render(
      <QuizScopePicker scopes={withoutThemes} action={ACTION} />
    );

    expect(screen.getByRole("link", { name: "Ghana" })).toBeInTheDocument();
    for (const link of Array.from(container.querySelectorAll("a"))) {
      expect(link.getAttribute("href")).toMatch(/^\/fr\/jeux\/quiz/);
    }
  });
});
