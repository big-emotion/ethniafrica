import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GamePlayIsland } from "@/components/play/GamePlayIsland";
import type { BinaryRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { getCountryRoute } from "@/lib/routing";

const GAME: GameDefinition = {
  id: "mercator",
  slug: "mercator",
  nameFr: "La taille qu'on vous a cachée",
  kinds: ["binary"],
  dataSource: "countries",
  promptFr: "Lequel couvre la plus grande surface ?",
  roundsPerSession: 1,
};

const ROUND = {
  kind: "binary",
  gameId: "mercator",
  subjectId: "DZA",
  promptFr: "Lequel couvre la plus grande surface ?",
  promptEn: "Which covers the larger area?",
  options: [
    { labelFr: "Algérie", labelEn: "Algeria" },
    { labelFr: "Tchad", labelEn: "Chad" },
  ],
  correctIndex: 0,
  reveal: {
    textFr: "L'Algérie couvre la plus grande surface.",
    textEn: "Algeria covers the larger area.",
    fieldPath: "lib/atlas/assets/africaAdmin0",
    sources: [],
    confidence: null,
    ficheHref: getCountryRoute("fr", "algerie"),
    ficheHrefEn: getCountryRoute("en", "algeria"),
  },
} as BinaryRound;

describe("the English game surface", () => {
  beforeEach(() => {
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

  // @req REQ-145
  it("plays and completes a round without French interface copy", async () => {
    const user = userEvent.setup();
    render(<GamePlayIsland language="en" game={GAME} rounds={[ROUND]} />);

    expect(
      screen.getByRole("heading", { name: "Which covers the larger area?" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Algeria" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Algeria" }));

    expect(screen.getByTestId("game-answer-reveal")).toHaveTextContent(
      "Correct"
    );
    expect(screen.getByTestId("game-reveal-text")).toHaveTextContent(
      "Algeria covers the larger area."
    );
    expect(screen.getByTestId("game-reveal-provenance")).toHaveTextContent(
      "According to the boundary outlines published by the atlas."
    );
    expect(screen.getByTestId("game-reveal-fiche-link")).toHaveAttribute(
      "href",
      getCountryRoute("en", "algeria")
    );

    await user.click(screen.getByRole("button", { name: "See the score" }));

    expect(screen.getByTestId("game-score-card")).toHaveTextContent(
      "Game complete"
    );
    expect(screen.getByTestId("game-score-value")).toHaveTextContent("1 of 1");
    expect(
      screen.getByRole("button", { name: "Play again" })
    ).toBeInTheDocument();
  });
});
