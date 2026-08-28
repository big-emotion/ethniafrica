import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetQuizSegmentsHandler, mockIsQuizFeatureEnabled } = vi.hoisted(
  () => ({
    mockGetQuizSegmentsHandler: vi.fn(),
    mockIsQuizFeatureEnabled: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/api/v2/handlers/quiz", () => ({
  getQuizSegmentsHandler: () => mockGetQuizSegmentsHandler(),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/quiz/QuizSegmentPicker", () => ({
  QuizSegmentPicker: ({ segments }: { segments: { id: string }[] }) => (
    <div data-testid="quiz-segment-picker" data-count={segments.length} />
  ),
}));

import { notFound } from "next/navigation";
import QuizPage from "../page";

function makeSegmentsEnvelope() {
  return {
    data: {
      segments: [
        { id: "children", labelFr: "enfants", rungs: [] },
        { id: "teens", labelFr: "ados", rungs: [] },
        { id: "adults", labelFr: "adultes", rungs: [] },
        { id: "university", labelFr: "étudiants", rungs: [] },
        { id: "professionals", labelFr: "professionnels", rungs: [] },
      ],
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
    mockGetQuizSegmentsHandler.mockResolvedValue(makeSegmentsEnvelope());

    render(await QuizPage());

    expect(screen.getByTestId("quiz-segment-picker")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });

  // @req REQ-103 FR66
  it("server-renders QuizSegmentPicker fed by /v2/quiz/segments when the flag is on", async () => {
    mockGetQuizSegmentsHandler.mockResolvedValue(makeSegmentsEnvelope());

    render(await QuizPage());

    expect(screen.getByTestId("quiz-segment-picker")).toHaveAttribute(
      "data-count",
      "5"
    );
  });
});
