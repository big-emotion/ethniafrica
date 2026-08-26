import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GamePlayHost } from "@/components/play/GamePlayHost";
import type { BinaryRound, GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";

vi.mock("@/components/play/GamePlayIsland", () => ({
  GamePlayIsland: ({
    game,
    rounds,
  }: {
    game: GameDefinition;
    rounds: GameRound[];
  }) => (
    <div
      data-testid="game-play-island-mock"
      data-game={game.id}
      data-rounds={rounds.length}
    />
  ),
}));

const GAME: GameDefinition = {
  id: "plus-ou-moins",
  slug: "plus-ou-moins",
  nameFr: "Plus ou moins",
  kind: "binary",
  dataSource: "peoples",
  promptFr: "Lequel de ces deux peuples est le plus nombreux",
  roundsPerSession: 8,
};

const ROUND: BinaryRound = {
  kind: "binary",
  gameId: "plus-ou-moins",
  subjectId: "PPL_A",
  promptFr: "Lequel est le plus nombreux",
  reveal: { textFr: "12 millions.", fieldPath: "content.demography" },
  options: [{ labelFr: "Alpha" }, { labelFr: "Beta" }],
  correctIndex: 0,
};

describe("GamePlayHost (Jouer hub engine, REQ-120)", () => {
  // @req REQ-120
  it("lazily mounts the play island for the game it was given", async () => {
    render(<GamePlayHost game={GAME} rounds={[ROUND]} />);

    expect(await screen.findByTestId("game-play-island-mock")).toHaveAttribute(
      "data-game",
      "plus-ou-moins"
    );
  });

  // @req REQ-120
  it("hands the server-resolved rounds down untouched", async () => {
    render(<GamePlayHost game={GAME} rounds={[ROUND, ROUND]} />);

    expect(await screen.findByTestId("game-play-island-mock")).toHaveAttribute(
      "data-rounds",
      "2"
    );
  });

  // @req REQ-120
  it("mounts the island even with no round, so the shortfall gets stated", async () => {
    render(<GamePlayHost game={GAME} rounds={[]} />);

    expect(await screen.findByTestId("game-play-island-mock")).toHaveAttribute(
      "data-rounds",
      "0"
    );
  });
});
