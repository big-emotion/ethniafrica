import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QuizProgressDots } from "@/components/quiz/QuizProgressDots";

describe("QuizProgressDots (Epic 10, Story 10.9, ETNI-1135, FR67)", () => {
  // @req REQ-103 FR67
  it("renders the dots as aria-hidden decoration", () => {
    render(<QuizProgressDots current={2} total={5} />);

    const dots = screen.getByTestId("quiz-progress-dots");
    expect(dots).toHaveAttribute("aria-hidden", "true");
  });

  // @req REQ-103 FR67
  it("renders visible text carrying the same progress information", () => {
    render(<QuizProgressDots current={2} total={5} />);

    expect(screen.getByText("question 2 sur 5")).toBeInTheDocument();
  });

  // @req REQ-103 FR67
  it("renders exactly `total` dots with the first `current` marked active", () => {
    render(<QuizProgressDots current={3} total={5} />);

    const dots = screen.getByTestId("quiz-progress-dots");
    const dotEls = dots.querySelectorAll("[data-active]");
    expect(dotEls).toHaveLength(5);
    expect(
      Array.from(dotEls).filter(
        (el) => el.getAttribute("data-active") === "true"
      )
    ).toHaveLength(3);
  });

  // @req REQ-103 FR67
  it("updates both the dots and the text consistently when props change", () => {
    const { rerender } = render(<QuizProgressDots current={1} total={4} />);
    expect(screen.getByText("question 1 sur 4")).toBeInTheDocument();

    rerender(<QuizProgressDots current={4} total={4} />);
    expect(screen.getByText("question 4 sur 4")).toBeInTheDocument();
    const dots = screen.getByTestId("quiz-progress-dots");
    expect(
      Array.from(dots.querySelectorAll("[data-active='true']"))
    ).toHaveLength(4);
  });
});
