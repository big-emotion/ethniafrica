import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuizScoreCard } from "@/components/quiz/QuizScoreCard";

const fiches = [
  { id: "PPL_YORUBA", name: "Yoruba", href: "/fr/peuples/PPL_YORUBA" },
  { id: "PPL_IGBO", name: "Igbo", href: "/fr/peuples/PPL_IGBO" },
];

describe("QuizScoreCard (Epic 10, Story 10.10, ETNI-499, ETNI-1139, FR70, UX-DR27/34)", () => {
  // @req REQ-103 FR70
  it("shows the exact-count sentence, track, fiche links, rejouer and partager actions", () => {
    render(
      <QuizScoreCard
        scopeLabelFr="Ghana"
        correct={7}
        total={8}
        fiches={fiches}
        playAgainHref="/fr/quiz"
        onShare={vi.fn()}
      />
    );

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("réponses exactes sur")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Ghana")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yoruba" })).toHaveAttribute(
      "href",
      "/fr/peuples/PPL_YORUBA"
    );
    expect(screen.getByRole("link", { name: "Igbo" })).toHaveAttribute(
      "href",
      "/fr/peuples/PPL_IGBO"
    );
    expect(screen.getByRole("link", { name: "Rejouer" })).toHaveAttribute(
      "href",
      "/fr/quiz"
    );
    expect(
      screen.getByRole("button", { name: "Partager le score" })
    ).toBeInTheDocument();
  });

  // @req REQ-103 UX-DR27 UX-DR34
  it("never renders confetti, emoji or exclamation marks", () => {
    const { container } = render(
      <QuizScoreCard
        scopeLabelFr="Kh�san"
        correct={2}
        total={5}
        playAgainHref="/fr/quiz"
        onShare={vi.fn()}
      />
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(container.querySelector("[data-confetti]")).toBeNull();
  });

  // @req REQ-103 FR70
  it("renders no fiche links when none are given", () => {
    render(
      <QuizScoreCard
        scopeLabelFr="Tout le continent"
        correct={4}
        total={6}
        playAgainHref="/fr/quiz"
        onShare={vi.fn()}
      />
    );

    expect(screen.queryByRole("list")).toBeNull();
  });

  // @req REQ-103 FR70
  it("calls onShare when partager le score is activated", async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizScoreCard
        scopeLabelFr="Ghana"
        correct={7}
        total={8}
        playAgainHref="/fr/quiz"
        onShare={onShare}
      />
    );

    await user.click(screen.getByRole("button", { name: "Partager le score" }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  // @req REQ-103 FR70
  it("surfaces a polite share status message via an aria-live region", () => {
    render(
      <QuizScoreCard
        scopeLabelFr="Ghana"
        correct={7}
        total={8}
        playAgainHref="/fr/quiz"
        onShare={vi.fn()}
        shareStatusMessage="copié"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("copié");
  });
});
