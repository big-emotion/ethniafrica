import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GamePlayIsland } from "@/components/play/GamePlayIsland";
import type { BinaryRound, GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { getCountryRoute } from "@/lib/routing";

const GAME: GameDefinition = {
  id: "mercator",
  slug: "mercator",
  nameFr: "La taille qu'on vous a cachée",
  kinds: ["binary"],
  dataSource: "countries",
  promptFr: "Lequel de ces deux pays couvre la plus grande surface",
  roundsPerSession: 8,
};

function binaryRound(subjectId: string): BinaryRound {
  return {
    kind: "binary",
    gameId: "mercator",
    subjectId,
    promptFr: `Lequel couvre la plus grande surface, ${subjectId}`,
    reveal: {
      textFr: `Surface réelle de ${subjectId}.`,
      fieldPath: "lib/atlas/assets/africaAdmin0",
      sources: [],
      confidence: null,
      ficheHref: getCountryRoute("fr", "DZA"),
    },
    options: [{ labelFr: "Alpha" }, { labelFr: "Beta" }],
    correctIndex: 0,
  };
}

function renderIsland(rounds: GameRound[]) {
  return render(<GamePlayIsland game={GAME} rounds={rounds} />);
}

describe("GamePlayIsland (Jouer hub engine, REQ-120)", () => {
  beforeEach(() => {
    // happy-dom ships no matchMedia; the reveal panel reads it at mount.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // @req REQ-120
  it("opens on the first round with the shared progress indicator", () => {
    renderIsland([binaryRound("PPL_A"), binaryRound("PPL_B")]);

    expect(screen.getByTestId("quiz-progress-dots")).toBeInTheDocument();
    expect(screen.getByText("question 1 sur 2")).toBeInTheDocument();
    expect(screen.getByTestId("binary-choice")).toBeInTheDocument();
  });

  // @req REQ-120
  it("reveals the corpus text once the reader answers", async () => {
    const user = userEvent.setup();
    renderIsland([binaryRound("PPL_A")]);

    await user.click(screen.getByRole("button", { name: "Alpha" }));

    expect(screen.getByTestId("game-answer-reveal")).toBeInTheDocument();
    expect(screen.getByTestId("game-reveal-text")).toHaveTextContent(
      "Surface réelle de PPL_A."
    );
  });

  // @req REQ-120
  it("advances to the following round", async () => {
    const user = userEvent.setup();
    renderIsland([binaryRound("PPL_A"), binaryRound("PPL_B")]);

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: "Tour suivant" }));

    expect(screen.getByText("question 2 sur 2")).toBeInTheDocument();
    expect(
      screen.getByText("Lequel couvre la plus grande surface, PPL_B")
    ).toBeInTheDocument();
  });

  // @req REQ-120
  it("ends on the score card once the last round is played", async () => {
    const user = userEvent.setup();
    renderIsland([binaryRound("PPL_A")]);

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: "Voir le score" }));

    expect(screen.getByTestId("game-score-card")).toBeInTheDocument();
    expect(screen.getByTestId("game-score-value")).toHaveTextContent("1 sur 1");
  });

  // @req REQ-120

  // @req REQ-120
  it("states the corpus shortfall instead of rendering an empty screen", () => {
    renderIsland([]);

    expect(screen.getByTestId("game-score-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("quiz-progress-dots")).not.toBeInTheDocument();
  });

  // @req REQ-120
  it("scopes itself to the Jouer accent declared by the hub registry", () => {
    renderIsland([binaryRound("PPL_A")]);

    expect(screen.getByTestId("game-play-island").className).toContain(
      ACCENT_BY_ACCESS_MODE.jouer
    );
  });
});

/**
 * The page's seed is derived from the game's slug, which is a constant — a
 * deliberate choice keeping the route cacheable and the server tree in step
 * with the client one. The cost was that « rejouer » handed back the rounds
 * just played. The pool now arrives longer than a session and the island
 * advances its window instead.
 */
describe("GamePlayIsland — a replay is a different session (REQ-120)", () => {
  const pool = [
    binaryRound("DZA"),
    binaryRound("TCD"),
    binaryRound("SEN"),
    binaryRound("TUN"),
  ];
  const shortGame: GameDefinition = { ...GAME, roundsPerSession: 2 };

  // @req REQ-120
  it("cuts the first session from the head of the pool", () => {
    render(<GamePlayIsland game={shortGame} rounds={pool} />);

    expect(screen.getByTestId("binary-choice")).toHaveTextContent("DZA");
  });

  // @req REQ-120
  it("opens the next replay on rounds the reader has not just played", async () => {
    const user = userEvent.setup();
    render(<GamePlayIsland game={shortGame} rounds={pool} />);

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: /Tour suivant/ }));
    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: /Voir le score/ }));
    await user.click(screen.getByRole("button", { name: /Rejouer/ }));

    expect(screen.getByTestId("binary-choice")).toHaveTextContent("SEN");
  });
});
