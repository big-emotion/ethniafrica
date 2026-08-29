import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MercatorSurface } from "@/components/mercator/MercatorSurface";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { buildScaleFacts } from "@/lib/games/scaleFacts";

// The stage mounts WebGL, which happy-dom has none of. Standing in for it
// with a element that prints the props under test keeps this a test about
// the binding between the round and the globe, not about the renderer.
vi.mock("@/components/home/HomeGlobeStage", () => ({
  HomeGlobeStage: ({
    morphOverride,
    overrideNoteFr,
  }: {
    morphOverride?: number | null;
    overrideNoteFr?: string;
  }) => (
    <div
      data-testid="globe-stage"
      data-morph={String(morphOverride)}
      data-note={overrideNoteFr ?? ""}
    />
  ),
}));

const GAME: GameDefinition = {
  id: "mercator",
  slug: "mercator",
  nameFr: "La taille qu'on vous a cachée",
  kinds: ["binary", "estimate"],
  dataSource: "countries",
  promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
  roundsPerSession: 8,
};

const round = (subjectId: string): GameRound => ({
  kind: "binary",
  gameId: "mercator",
  subjectId,
  promptFr: "Lequel de ces deux pays couvre la plus grande surface ?",
  options: [{ labelFr: `${subjectId}-A` }, { labelFr: `${subjectId}-B` }],
  correctIndex: 0,
  reveal: {
    textFr: `Surface réelle de ${subjectId}.`,
    fieldPath: "lib/atlas/assets/africaAdmin0",
    sources: [],
    confidence: null,
    ficheHref: "/fr/explorer/pays/DZA",
  },
});

const ROUNDS = [round("DZA"), round("TCD")];

function renderSurface(corpusLimited = false) {
  return render(
    <MercatorSurface
      game={GAME}
      rounds={ROUNDS}
      facts={buildScaleFacts()}
      corpusLimited={corpusLimited}
    />
  );
}

describe("MercatorSurface — the globe answers the round (REQ-120)", () => {
  /**
   * Charter §1 forbids a manipulable globe beside a live round because an
   * area-true sphere lets the reader answer by eye. Holding the map flat
   * turns that inside out: what stands beside the question is the lie the
   * question is asked against, so reading it gives the wrong answer.
   */
  // @req REQ-120
  it("holds the map flat while a question stands", () => {
    renderSurface();

    const stage = screen.getByTestId("globe-stage");
    expect(stage).toHaveAttribute("data-morph", "0");
    expect(stage.getAttribute("data-note")).toMatch(
      /se rouvre avec la réponse/
    );
  });

  // @req REQ-120
  it("closes the map into a sphere on the reveal", async () => {
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole("button", { name: "DZA-A" }));

    expect(screen.getByTestId("globe-stage")).toHaveAttribute(
      "data-morph",
      "1"
    );
  });

  // @req REQ-120
  it("says nothing about a lock once the sphere is open", async () => {
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole("button", { name: "DZA-A" }));

    expect(screen.getByTestId("globe-stage")).toHaveAttribute("data-note", "");
  });

  /**
   * Charter §9.1: the stem and every option clear the fold at 430 px, and it
   * is the stage that gives way, never the options. The stage floor is 560 px
   * on a phone, so the round is placed *before* the globe in the document
   * while a question stands — which is also the order a screen reader and the
   * tab sequence want. The painted order follows from CSS on the same
   * attribute.
   */
  // @req REQ-120
  it("puts the round before the globe in the document, not below it", () => {
    const { container } = renderSurface();

    const surface = container.querySelector(".mercator-surface");
    const children = [...surface.children].filter(
      (child) =>
        child.classList.contains("mercator-round") ||
        child.classList.contains("mercator-stage")
    );

    expect(children[0].classList.contains("mercator-round")).toBe(true);
    expect(children[1].classList.contains("mercator-stage")).toBe(true);
  });

  // @req REQ-120
  it("declares the phase so the layout can answer it", async () => {
    const user = userEvent.setup();
    const { container } = renderSurface();

    expect(container.querySelector(".mercator-surface")).toHaveAttribute(
      "data-phase",
      "answering"
    );

    await user.click(screen.getByRole("button", { name: "DZA-A" }));

    expect(container.querySelector(".mercator-surface")).toHaveAttribute(
      "data-phase",
      "revealed"
    );
  });

  /**
   * The handler has always computed this and the page used to drop it, so a
   * short session looked like a complete one.
   */
  // @req REQ-120
  it("states a short session on the score card rather than hiding it", async () => {
    const user = userEvent.setup();
    renderSurface(true);

    await user.click(screen.getByRole("button", { name: "DZA-A" }));
    await user.click(screen.getByRole("button", { name: /Tour suivant/ }));
    await user.click(screen.getByRole("button", { name: "TCD-A" }));
    await user.click(screen.getByRole("button", { name: /Voir le score/ }));

    expect(screen.getByTestId("game-score-corpus-limited")).toBeInTheDocument();
  });

  // @req REQ-120
  it("lays the whole measured bank out once the session is over", async () => {
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole("button", { name: "DZA-A" }));
    await user.click(screen.getByRole("button", { name: /Tour suivant/ }));
    await user.click(screen.getByRole("button", { name: "TCD-A" }));
    await user.click(screen.getByRole("button", { name: /Voir le score/ }));

    const bank = screen.getByTestId("game-score-facts");
    expect(bank).toBeInTheDocument();
    expect(
      screen.getAllByTestId("scale-fact-card").length
    ).toBeGreaterThanOrEqual(buildScaleFacts().length);
  });

  // A fact lands between rounds, so the session teaches even when the reader
  // is right and the reveal has nothing to correct.
  // @req REQ-120
  it("states a measured fact on the reveal that carries one", async () => {
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole("button", { name: "DZA-A" }));
    await user.click(screen.getByRole("button", { name: /Tour suivant/ }));
    await user.click(screen.getByRole("button", { name: "TCD-A" }));

    expect(screen.getByTestId("scale-fact-card")).toBeInTheDocument();
  });
});
