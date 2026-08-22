import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizScoreSharePage } from "./QuizScoreSharePage";

const props = {
  segment: "adults" as const,
  correct: 6,
  total: 8,
  rung: 2,
};

// @testing-library/user-event installs its own navigator.clipboard stub as
// part of userEvent.setup() — our mock must be defined *after* that call, or
// setup() silently clobbers it before the click ever fires.
function stubNavigator(overrides: {
  share?: (data: { url: string }) => Promise<void>;
}) {
  Object.defineProperty(navigator, "share", {
    value: overrides.share,
    configurable: true,
  });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}

describe("QuizScoreSharePage (Epic 10, Story 10.10, ETNI-499, ETNI-1140, FR70)", () => {
  // @req REQ-103 FR70
  it("renders the full score content as text with a single CTA to /fr/quiz", () => {
    render(<QuizScoreSharePage {...props} />);

    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rejouer" })).toHaveAttribute(
      "href",
      "/fr/quiz"
    );
  });

  // @req REQ-103 FR70
  it("shares the stateless URL via the Web Share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    stubNavigator({ share });

    render(<QuizScoreSharePage {...props} />);
    await user.click(screen.getByRole("button", { name: "Partager le score" }));

    expect(share).toHaveBeenCalledTimes(1);
    const sharedUrl = share.mock.calls[0][0].url as string;
    expect(sharedUrl).toContain("/fr/quiz/score?");
    expect(sharedUrl).toContain("segment=adults");
    expect(sharedUrl).toContain("correct=6");
    expect(sharedUrl).toContain("total=8");
    expect(sharedUrl).toContain("rung=2");
  });

  // @req REQ-103 FR70
  it("copies the URL and shows a polite copied confirmation when Web Share is unavailable", async () => {
    const user = userEvent.setup();
    stubNavigator({ share: undefined });

    render(<QuizScoreSharePage {...props} />);
    await user.click(screen.getByRole("button", { name: "Partager le score" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("copié");
  });
});
