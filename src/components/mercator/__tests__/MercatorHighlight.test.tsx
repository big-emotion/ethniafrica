import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MercatorSurface } from "@/components/mercator/MercatorSurface";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import type { BinaryRound } from "@/lib/games/gameKinds";

/**
 * The globe is a WebGL island behind a capability probe, so this suite stands
 * in for it and asserts the one thing the surface owes it: which countries the
 * standing round is about. What the sphere then does with them is
 * `overlays.test.ts`'s and `AtlasGlobeCanvas`'s business.
 */
const stageCalls: string[][] = [];

vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: ({
    countriesUnderQuestion = [],
  }: {
    countriesUnderQuestion?: string[];
  }) => {
    stageCalls.push(countriesUnderQuestion);
    return (
      <div
        data-testid="globe-stage"
        data-under-question={countriesUnderQuestion.join(",")}
      />
    );
  },
}));

const round = (
  id: string,
  a: string,
  b: string,
  comparedIds: string[]
): BinaryRound => ({
  kind: "binary",
  template: "larger-area",
  gameId: "mercator",
  subjectId: id,
  comparedIds,
  promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
  options: [{ labelFr: a }, { labelFr: b }],
  correctIndex: 1,
  reveal: {
    textFr: `${a} contre ${b}.`,
    fieldPath: "lib/atlas/assets/africaAdmin0",
    sources: [],
    confidence: null,
    ficheHref: getAxisHubRoute("fr", "atlas"),
  },
});

const renderSurface = (rounds: BinaryRound[]) =>
  render(
    <MercatorSurface
      game={{ ...getGameBySlug("mercator"), roundsPerSession: rounds.length }}
      rounds={rounds}
      language="fr"
      facts={[]}
      corpusLimited={false}
      trueSizeClaimFr="L'Afrique tient quatorze Groenland."
    />
  );

describe("the globe locates the round (REQ-120)", () => {
  // @req REQ-120
  it("marks the two countries of the opening round", () => {
    stageCalls.length = 0;
    renderSurface([round("NOR", "Norvège", "Côte d'Ivoire", ["NOR", "CIV"])]);

    expect(
      screen.getByTestId("globe-stage").getAttribute("data-under-question")
    ).toBe("NOR,CIV");
  });

  // @req REQ-120
  it("moves the marks to the next round's countries", async () => {
    stageCalls.length = 0;
    renderSurface([
      round("NOR", "Norvège", "Côte d'Ivoire", ["NOR", "CIV"]),
      round("ISL", "Islande", "Malawi", ["ISL", "MWI"]),
    ]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Norvège" }));
    await user.click(screen.getByRole("button", { name: /suivant/i }));

    expect(
      screen.getByTestId("globe-stage").getAttribute("data-under-question")
    ).toBe("ISL,MWI");
  });

  /**
   * The score card asks nothing, so leaving the last round's countries lit
   * would have the globe pointing at a question that is over.
   */
  // @req REQ-120
  it("takes the marks off once the session is finished", async () => {
    stageCalls.length = 0;
    renderSurface([round("NOR", "Norvège", "Côte d'Ivoire", ["NOR", "CIV"])]);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Norvège" }));
    await user.click(screen.getByRole("button", { name: /voir le score/i }));

    expect(
      screen.getByTestId("globe-stage").getAttribute("data-under-question")
    ).toBe("");
  });
});
