import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  GAME_REVEAL_MIN_HEIGHT_CLASS,
  GameAnswerReveal,
} from "@/components/play/GameAnswerReveal";
import type { BinaryRound } from "@/lib/games/gameKinds";

const CORPUS_TEXT =
  "Le terme « Yoruba » vient du haoussa yarabawa, employé pour désigner les habitants d'Oyo, puis étendu par les administrations coloniales.";

const ROUND: BinaryRound = {
  kind: "binary",
  gameId: "appellations",
  subjectId: "PPL_YORUBA",
  promptFr: "Lequel de ces deux noms ce peuple se donne-t-il",
  reveal: {
    textFr: CORPUS_TEXT,
    fieldPath: "content.appellations.originOfExonyms",
  },
  options: [{ labelFr: "Yorùbá" }, { labelFr: "Nagot" }],
  correctIndex: 0,
};

// happy-dom ships no matchMedia, and usePrefersReducedMotion reads it at mount.
function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

describe("GameAnswerReveal (Jouer hub engine, REQ-120)", () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // @req REQ-120
  it("announces the verdict in a polite live region", () => {
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    const liveRegion = screen.getByTestId("game-reveal-live-region");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveTextContent("Bonne réponse");
  });

  // @req REQ-120
  it("names a wrong answer without scolding the reader", () => {
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect={false}
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Ce n'est pas ça"
    );
  });

  // @req REQ-120
  it("moves focus to the verdict heading", () => {
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
  });

  // @req REQ-120
  it("renders the corpus text verbatim, neither truncated nor reworded", () => {
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByTestId("game-reveal-text")).toHaveTextContent(
      CORPUS_TEXT
    );
  });

  // @req REQ-120
  it("keeps the claim auditable by naming the field it was read from", () => {
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByTestId("game-reveal-provenance")).toHaveTextContent(
      "content.appellations.originOfExonyms"
    );
  });

  // @req REQ-120
  it("offers the next round, or the score once the last one is played", () => {
    const { rerender } = render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Tour suivant" })
    ).toBeInTheDocument();

    rerender(
      <GameAnswerReveal round={ROUND} isCorrect isLastRound onNext={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: "Voir le score" })
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("advances when the reader asks for the next round", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={onNext}
      />
    );

    await user.click(screen.getByRole("button", { name: "Tour suivant" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  // @req REQ-120
  it("collapses the transition when the reader asked for reduced motion", () => {
    mockReducedMotion(true);

    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    const panel = screen.getByTestId("game-answer-reveal");
    expect(panel).toHaveAttribute("data-reduced-motion", "true");
    expect(panel).toHaveStyle({ transitionDuration: "0.01ms" });
  });

  // @req REQ-120
  it("reserves a minimum height so revealing does not shift the page", () => {
    render(
      <GameAnswerReveal
        round={ROUND}
        isCorrect
        isLastRound={false}
        onNext={vi.fn()}
      />
    );

    expect(screen.getByTestId("game-answer-reveal").className).toContain(
      GAME_REVEAL_MIN_HEIGHT_CLASS
    );
  });
});
