import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizPlayHost } from "@/components/quiz/QuizPlayHost";
import type { QuizSegmentView } from "@/api/v2/schemas/quiz";

vi.mock("@/components/quiz/QuizPlayIsland", () => ({
  QuizPlayIsland: ({ segment }: { segment: string }) => (
    <div data-testid="quiz-play-island" data-segment={segment} />
  ),
}));

const SEGMENTS: QuizSegmentView[] = [
  {
    id: "adults",
    labelFr: "adultes",
    rungs: [{ difficulty: 3, activeQuestionCount: 10 }],
  },
];

describe("QuizPlayHost (Epic 10, Story 10.9, ETNI-1137)", () => {
  // @req REQ-103 FR66
  it("renders the segment picker before a segment is chosen", () => {
    render(<QuizPlayHost segments={SEGMENTS} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryByTestId("quiz-play-island")).not.toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("lazily mounts the play island for the chosen segment", async () => {
    const user = userEvent.setup();
    render(<QuizPlayHost segments={SEGMENTS} />);

    await user.click(screen.getByRole("listitem", { name: "adultes" }));

    await waitFor(() =>
      expect(screen.getByTestId("quiz-play-island")).toHaveAttribute(
        "data-segment",
        "adults"
      )
    );
  });
});
