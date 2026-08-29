import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GamePlayIsland } from "@/components/play/GamePlayIsland";
import type {
  BinaryRound,
  GameRound,
  GlobeTapRound,
} from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { ACCENT_BY_ACCESS_MODE } from "@/lib/hubs/moduleRegistry";
import { getCountryRoute, getPeopleRoute } from "@/lib/routing";

// The globe primitive is the one heavy dependency of the engine; the island
// only has to prove it routes to it, never that WebGL came up.
vi.mock("@/components/play/GlobeTap", () => ({
  GlobeTap: ({ promptFr }: { promptFr: string }) => (
    <div data-testid="globe-tap-mock">{promptFr}</div>
  ),
}));

const GAME: GameDefinition = {
  id: "appellations",
  slug: "appellations",
  nameFr: "Eux, ou les autres",
  kind: "binary",
  dataSource: "peoples",
  promptFr: "Lequel de ces deux noms le peuple se donne-t-il",
  roundsPerSession: 8,
};

function binaryRound(subjectId: string): BinaryRound {
  return {
    kind: "binary",
    gameId: "appellations",
    subjectId,
    promptFr: `Comment ${subjectId} se nomme-t-il`,
    reveal: {
      textFr: `Origine de l'exonyme de ${subjectId}.`,
      fieldPath: "content.appellations.originOfExonyms",
      sources: [],
      confidence: null,
      ficheHref: getPeopleRoute("fr", "PPL_TEST"),
    },
    options: [{ labelFr: "Alpha" }, { labelFr: "Beta" }],
    correctIndex: 0,
  };
}

const GLOBE_ROUND: GlobeTapRound = {
  kind: "globeTap",
  gameId: "pays-davant",
  subjectId: "GHA",
  promptFr: "« Côte-de-l'Or » : quel pays porte aujourd'hui ce nom d'avant",
  reveal: {
    textFr: "Nommée pour son or.",
    fieldPath: "etymology",
    sources: [],
    confidence: null,
    ficheHref: getCountryRoute("fr", "GHA"),
  },
  choices: ["GHA", "BEN"],
  correctCountryId: "GHA",
};

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
      "Origine de l'exonyme de PPL_A."
    );
  });

  // @req REQ-120
  it("advances to the following round", async () => {
    const user = userEvent.setup();
    renderIsland([binaryRound("PPL_A"), binaryRound("PPL_B")]);

    await user.click(screen.getByRole("button", { name: "Alpha" }));
    await user.click(screen.getByRole("button", { name: "Tour suivant" }));

    expect(screen.getByText("question 2 sur 2")).toBeInTheDocument();
    expect(screen.getByText("Comment PPL_B se nomme-t-il")).toBeInTheDocument();
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
  it("routes a globe round to the lazily loaded globe primitive", async () => {
    renderIsland([GLOBE_ROUND]);

    expect(await screen.findByTestId("globe-tap-mock")).toHaveTextContent(
      "« Côte-de-l'Or » : quel pays porte aujourd'hui ce nom d'avant"
    );
  });

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
