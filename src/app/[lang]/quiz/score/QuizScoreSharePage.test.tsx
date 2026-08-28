import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizScoreSharePage } from "./QuizScoreSharePage";

const props = {
  scope: { kind: "country" as const, entityId: "GHA" },
  scopeLabelFr: "Ghana",
  correct: 6,
  total: 8,
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
  it("renders the score as text and sends « rejouer » back to the same track", () => {
    // A reader arriving on a shared card is being invited to try that country;
    // dropping them on an unfiltered quiz would lose the invitation.
    render(<QuizScoreSharePage {...props} />);

    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Ghana")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rejouer" })).toHaveAttribute(
      "href",
      "/fr/quiz?pays=GHA"
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
    expect(sharedUrl).toContain("pays=GHA");
    expect(sharedUrl).toContain("correct=6");
    expect(sharedUrl).toContain("total=8");
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
