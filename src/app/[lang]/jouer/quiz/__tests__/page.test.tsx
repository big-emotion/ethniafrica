import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetQuizScopesHandler, mockDescribeScope } = vi.hoisted(() => ({
  mockGetQuizScopesHandler: vi.fn(),
  mockDescribeScope: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/api/v2/handlers/quiz", () => ({
  getQuizScopesHandler: () => mockGetQuizScopesHandler(),
  describeScope: (...args: unknown[]) => mockDescribeScope(...args),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/quiz/QuizScopePicker", () => ({
  QuizScopePicker: ({
    scopes,
  }: {
    scopes: { countries: unknown[]; families: unknown[] };
  }) => (
    <div
      data-testid="quiz-scope-picker"
      data-countries={scopes.countries.length}
    />
  ),
}));

vi.mock("@/components/quiz/QuizPlayHost", () => ({
  QuizPlayHost: ({
    scopeLabelFr,
    theme,
  }: {
    scopeLabelFr: string;
    theme: string | null;
  }) => (
    <div
      data-testid="quiz-play-host"
      data-label={scopeLabelFr}
      data-theme={theme ?? ""}
    />
  ),
}));

import { notFound } from "next/navigation";
import QuizPage from "../page";

function scopesEnvelope() {
  return {
    data: {
      countries: [
        {
          id: "GHA",
          labelFr: "Ghana",
          activeQuestionCount: 90,
          playable: true,
        },
      ],
      families: [],
      themes: [
        {
          id: "croyances",
          labelFr: "Croyances",
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
    },
    meta: { license: "CC-BY-SA-4.0", attribution: "Africa History" },
    errors: [],
  };
}

describe("/[lang]/quiz page (Epic 10, Story 10.8, ETNI-497, AR39)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The page used to answer notFound() unless NEXT_PUBLIC_FEATURE_QUIZ was
  // "true", so a built route returned 404 depending on where it was built.
  // @req REQ-103 AR39
  it("renders whatever the environment says", async () => {
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;
    mockGetQuizScopesHandler.mockResolvedValue(scopesEnvelope());

    render(await QuizPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("quiz-scope-picker")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  // @req REQ-103 FR66
  it("shows the track picker when the URL names no track", async () => {
    mockGetQuizScopesHandler.mockResolvedValue(scopesEnvelope());

    render(await QuizPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("quiz-scope-picker")).toHaveAttribute(
      "data-countries",
      "1"
    );
    expect(screen.queryByTestId("quiz-play-host")).not.toBeInTheDocument();
  });

  // @req REQ-103 FR66 FR67
  it("opens the session when the URL names a track", async () => {
    mockDescribeScope.mockResolvedValue({
      kind: "country",
      entityId: "GHA",
      labelFr: "Ghana",
    });

    render(await QuizPage({ searchParams: Promise.resolve({ pays: "GHA" }) }));

    expect(screen.getByTestId("quiz-play-host")).toHaveAttribute(
      "data-label",
      "Ghana"
    );
  });

  /**
   * A theme on its own is a track: « les croyances », over the whole corpus.
   * Left out of the fork it parsed to `mixed`, which the page refuses to launch
   * on its own — so the reader's choice was silently dropped and they landed
   * back on the picker.
   */
  // @req REQ-121
  it("opens the session when the URL names only a theme", async () => {
    mockDescribeScope.mockResolvedValue({
      kind: "mixed",
      entityId: null,
      labelFr: "Tout le continent",
    });

    render(
      await QuizPage({ searchParams: Promise.resolve({ theme: "croyances" }) })
    );

    expect(screen.getByTestId("quiz-play-host")).toBeInTheDocument();
    expect(screen.queryByTestId("quiz-scope-picker")).not.toBeInTheDocument();
  });

  // @req REQ-121
  it("carries the theme into the session alongside the track", async () => {
    mockDescribeScope.mockResolvedValue({
      kind: "country",
      entityId: "ZAF",
      labelFr: "Afrique du Sud",
    });

    render(
      await QuizPage({
        searchParams: Promise.resolve({ pays: "ZAF", theme: "croyances" }),
      })
    );

    expect(screen.getByTestId("quiz-play-host")).toHaveAttribute(
      "data-theme",
      "croyances"
    );
  });

  // @req REQ-103 FR66
  it("falls back to the picker when the URL names a country the corpus lacks", async () => {
    // A 404 would be wrong: the route exists, and the reader's next move is to
    // pick something that does exist.
    mockDescribeScope.mockResolvedValue(null);
    mockGetQuizScopesHandler.mockResolvedValue(scopesEnvelope());

    render(await QuizPage({ searchParams: Promise.resolve({ pays: "ZZZ" }) }));

    expect(screen.getByTestId("quiz-scope-picker")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
