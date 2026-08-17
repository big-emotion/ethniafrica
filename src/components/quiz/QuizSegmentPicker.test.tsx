import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizSegmentPicker } from "@/components/quiz/QuizSegmentPicker";
import type { QuizSegmentView } from "@/api/v2/schemas/quiz";

const FIVE_SEGMENTS: QuizSegmentView[] = [
  {
    id: "children",
    labelFr: "enfants",
    rungs: [{ difficulty: 1, activeQuestionCount: 4 }],
  },
  {
    id: "teens",
    labelFr: "ados",
    rungs: [{ difficulty: 1, activeQuestionCount: 3 }],
  },
  {
    id: "adults",
    labelFr: "adultes",
    rungs: [{ difficulty: 2, activeQuestionCount: 0 }],
  },
  {
    id: "university",
    labelFr: "étudiants",
    rungs: [{ difficulty: 3, activeQuestionCount: 5 }],
  },
  {
    id: "professionals",
    labelFr: "professionnels",
    rungs: [{ difficulty: 3, activeQuestionCount: 2 }],
  },
];

describe("QuizSegmentPicker (Epic 10, Story 10.8, ETNI-497, FR66, FR43)", () => {
  // @req REQ-103 FR66
  it("renders all five segment cards with their French labels", () => {
    render(<QuizSegmentPicker segments={FIVE_SEGMENTS} />);

    expect(screen.getByText("enfants")).toBeInTheDocument();
    expect(screen.getByText("ados")).toBeInTheDocument();
    expect(screen.getByText("adultes")).toBeInTheDocument();
    expect(screen.getByText("étudiants")).toBeInTheDocument();
    expect(screen.getByText("professionnels")).toBeInTheDocument();
  });

  // @req REQ-103 FR66
  it("shows the available-question count for a launchable segment", () => {
    render(<QuizSegmentPicker segments={FIVE_SEGMENTS} />);

    expect(screen.getByText("4 questions disponibles")).toBeInTheDocument();
  });

  // @req REQ-103 FR66
  it("stacks cards single-column with each card at least 44px tall", () => {
    render(<QuizSegmentPicker segments={FIVE_SEGMENTS} />);

    const list = screen.getByRole("list", {
      name: "Choisir un parcours de quiz",
    });
    expect(list.className).toMatch(/(^|\s)grid-cols-1(\s|$)/);

    for (const segment of FIVE_SEGMENTS) {
      expect(
        screen.getByRole("listitem", { name: segment.labelFr })
      ).toHaveClass("min-h-11");
    }
  });

  // @req REQ-103 FR66
  it("escalates the layout at 720px and 800px with no horizontal scroll", () => {
    render(<QuizSegmentPicker segments={FIVE_SEGMENTS} />);

    const list = screen.getByRole("list", {
      name: "Choisir un parcours de quiz",
    });
    expect(list.className).toMatch(/(^|\s)min-\[720px\]:grid-cols-2(\s|$)/);
    expect(list.className).toMatch(/(^|\s)min-\[800px\]:grid-cols-3(\s|$)/);
    expect(list.className).not.toMatch(/overflow-x-(auto|scroll)/);
  });

  // @req REQ-103 FR43
  it("renders a zero-question segment as non-launchable with the calm copy, not a broken state", () => {
    render(<QuizSegmentPicker segments={FIVE_SEGMENTS} />);

    const adultsCard = screen.getByRole("listitem", { name: "adultes" });
    expect(adultsCard).toBeDisabled();
    expect(
      screen.getByText(
        "les questions de ce parcours arrivent — les fiches correspondantes sont en cours de vérification"
      )
    ).toBeInTheDocument();
  });

  // @req REQ-103 FR43
  it("does not call onSelectSegment when a non-launchable card is clicked", async () => {
    const onSelectSegment = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizSegmentPicker
        segments={FIVE_SEGMENTS}
        onSelectSegment={onSelectSegment}
      />
    );

    await user.click(screen.getByRole("listitem", { name: "adultes" }));
    expect(onSelectSegment).not.toHaveBeenCalled();
  });

  // @req REQ-103 FR66
  it("calls onSelectSegment with the segment id when a launchable card is clicked", async () => {
    const onSelectSegment = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizSegmentPicker
        segments={FIVE_SEGMENTS}
        onSelectSegment={onSelectSegment}
      />
    );

    await user.click(screen.getByRole("listitem", { name: "enfants" }));
    expect(onSelectSegment).toHaveBeenCalledWith("children");
  });
});
