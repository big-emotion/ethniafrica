import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDescribeScope } = vi.hoisted(() => ({
  mockDescribeScope: vi.fn(),
}));

vi.mock("@/api/v2/handlers/quiz", () => ({
  describeScope: (...args: unknown[]) => mockDescribeScope(...args),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
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
    pays: "GHA",
    correct: "6",
    total: "8",
    ...overrides,
  });
}

describe("/[lang]/quiz/score page (Epic 10, Story 10.10, ETNI-499, ETNI-1140, FR70)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDescribeScope.mockResolvedValue({
      kind: "country",
      entityId: "GHA",
      labelFr: "Ghana",
    });
  });

  // A shared score URL used to 404 unless the build carried
  // NEXT_PUBLIC_FEATURE_QUIZ. Only forged params 404 now.
  // @req REQ-103 AR39
  it("renders a shared score whatever the environment says", async () => {
    delete process.env.NEXT_PUBLIC_FEATURE_QUIZ;

    render(await QuizScorePage({ searchParams: searchParams() }));

    expect(notFound).not.toHaveBeenCalled();
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
      scope: { kind: "country", entityId: "GHA" },
      scopeLabelFr: "Ghana",
      correct: 6,
      total: 8,
    });
  });

  // @req REQ-103 FR70
  it("generateMetadata points og:image at /api/og/quiz-score with the same validated params", async () => {
    const metadata = await generateMetadata({ searchParams: searchParams() });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: "/api/og/quiz-score?pays=GHA&correct=6&total=8",
      }),
    ]);
  });

  // @req REQ-103 FR70
  it("404s when the track names a country the corpus does not hold", async () => {
    // The label is read from the corpus, never from the URL, so an id naming
    // nothing gets the same 404 an absurd score does.
    mockDescribeScope.mockResolvedValue(null);

    await expect(
      QuizScorePage({ searchParams: searchParams({ pays: "ZZZ" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // @req REQ-103 FR70
  it("generateMetadata returns an empty object for forged params", async () => {
    const metadata = await generateMetadata({
      searchParams: searchParams({ correct: "47", total: "8" }),
    });

    expect(metadata).toEqual({});
  });
});
