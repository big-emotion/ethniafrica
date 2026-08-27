import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameScoreCard } from "@/components/play/GameScoreCard";
import type { GameDefinition } from "@/lib/games/gameRegistry";

const GAME: GameDefinition = {
  id: "pays-davant",
  slug: "pays-davant",
  nameFr: "Le pays d'avant",
  kind: "globeTap",
  dataSource: "countries",
  promptFr: "Quel pays porte aujourd'hui ce nom d'avant",
  roundsPerSession: 8,
};

describe("GameScoreCard (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("names the game and reports the score it was played at", () => {
    render(
      <GameScoreCard game={GAME} correct={4} total={6} onPlayAgain={vi.fn()} />
    );

    expect(screen.getByText("Le pays d'avant")).toBeInTheDocument();
    expect(screen.getByTestId("game-score-value")).toHaveTextContent("4 sur 6");
  });

  // @req REQ-120
  it("keeps the tone flat: no exclamation mark, no emoji", () => {
    render(
      <GameScoreCard game={GAME} correct={6} total={6} onPlayAgain={vi.fn()} />
    );

    const text = screen.getByTestId("game-score-card").textContent ?? "";
    expect(text).not.toMatch(/!/);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  // @req REQ-120
  it("replays the game when the reader asks for another round", async () => {
    const user = userEvent.setup();
    const onPlayAgain = vi.fn();
    render(
      <GameScoreCard
        game={GAME}
        correct={4}
        total={6}
        onPlayAgain={onPlayAgain}
      />
    );

    await user.click(screen.getByRole("button", { name: "Rejouer" }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  // @req REQ-120
  it("says plainly that the corpus holds too little rather than showing an empty screen", () => {
    render(
      <GameScoreCard game={GAME} correct={0} total={0} onPlayAgain={vi.fn()} />
    );

    expect(screen.getByTestId("game-score-empty")).toHaveTextContent(
      "Le corpus ne contient pas encore assez de fiches pour composer un tour de ce jeu."
    );
    expect(screen.queryByTestId("game-score-value")).not.toBeInTheDocument();
  });

  // @req REQ-120
  it("offers no replay when there was nothing to play", () => {
    render(
      <GameScoreCard game={GAME} correct={0} total={0} onPlayAgain={vi.fn()} />
    );

    expect(
      screen.queryByRole("button", { name: "Rejouer" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-120
  it("gives the replay control the 44px thumb-tap minimum", () => {
    render(
      <GameScoreCard game={GAME} correct={4} total={6} onPlayAgain={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Rejouer" }).className).toMatch(
      /min-h-11/
    );
  });
});
