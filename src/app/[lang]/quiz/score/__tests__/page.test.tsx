import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIsQuizFeatureEnabled } = vi.hoisted(() => ({
  mockIsQuizFeatureEnabled: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/featureFlags", () => ({
  isQuizFeatureEnabled: () => mockIsQuizFeatureEnabled(),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../QuizScoreSharePage", () => ({
  QuizScoreSharePage: (props: Record<string, unknown>) => (
    <div
      data-testid="quiz-score-share-page"
      data-props={JSON.stringify(props)}
    />
  ),
}));

import { notFound } from "next/navigation";
import QuizScorePage, { generateMetadata } from "../page";

function searchParams(overrides: Record<string, string> = {}) {
  return Promise.resolve({
    segment: "adults",
    correct: "6",
    total: "8",
    rung: "2",
    ...overrides,
  });
}

describe("/[lang]/quiz/score page (Epic 10, Story 10.10, ETNI-499, ETNI-1140, FR70)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsQuizFeatureEnabled.mockReturnValue(true);
  });

  // @req REQ-103 AR39
  it("404s when the quiz feature flag is off", async () => {
    mockIsQuizFeatureEnabled.mockReturnValue(false);

    await expect(
      QuizScorePage({ searchParams: searchParams() })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  // @req REQ-103 FR70
  it("404s on forged params (correct exceeds total)", async () => {
    await expect(
      QuizScorePage({
        searchParams: searchParams({ correct: "47", total: "8" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // @req REQ-103 FR70
  it("renders the score share page with the validated params", async () => {
    render(await QuizScorePage({ searchParams: searchParams() }));

    const el = screen.getByTestId("quiz-score-share-page");
    expect(JSON.parse(el.getAttribute("data-props") ?? "{}")).toEqual({
      segment: "adults",
      correct: 6,
      total: 8,
      rung: 2,
    });
  });

  // @req REQ-103 FR70
  it("generateMetadata points og:image at /api/og/quiz-score with the same validated params", async () => {
    const metadata = await generateMetadata({ searchParams: searchParams() });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: "/api/og/quiz-score?segment=adults&correct=6&total=8&rung=2",
      }),
    ]);
  });

  // @req REQ-103 FR70
  it("generateMetadata returns an empty object for forged params", async () => {
    const metadata = await generateMetadata({
      searchParams: searchParams({ correct: "47", total: "8" }),
    });

    expect(metadata).toEqual({});
  });
});
