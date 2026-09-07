import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MercatorSurface } from "@/components/mercator/MercatorSurface";
import type { GameRound } from "@/lib/games/gameKinds";
import type { GameDefinition } from "@/lib/games/gameRegistry";
import { buildScaleFacts } from "@/lib/games/scaleFacts";
import { getCountryRoute } from "@/lib/routing";

// The stage mounts WebGL, which happy-dom has none of. Standing in for it
// with an element that prints the props under test keeps this a test about
// how the page mounts the globe, not about the renderer.
vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: ({
    pinnedProjection,
    presentation,
    autoRotate,
  }: {
    pinnedProjection?: "flat" | "sphere";
    presentation?: "standard" | "hero";
    autoRotate?: boolean;
  }) => (
    <div
      data-testid="globe-stage"
      data-projection={pinnedProjection ?? ""}
      data-presentation={presentation ?? ""}
      data-autorotate={autoRotate ? "true" : "false"}
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
  template: "larger-area",
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
    ficheHref: getCountryRoute("fr", "DZA"),
  },
});

const ROUNDS = [round("DZA"), round("TCD")];

const TRUE_SIZE_CLAIM = "L'Afrique fait 14 fois le Groenland.";

function renderSurface(corpusLimited = false) {
  return render(
    <MercatorSurface
      language="fr"
      game={GAME}
      rounds={ROUNDS}
      facts={buildScaleFacts()}
      corpusLimited={corpusLimited}
      trueSizeClaimFr={TRUE_SIZE_CLAIM}
    />
  );
}

describe("MercatorSurface — the home's globe, and the size it states (REQ-120)", () => {
  /**
   * Charter §11, amended 2026-09-06: the page shows the same sphere the home
   * shows, on the same terms. The pin that used to hold it flat while a
   * question stood is gone — it captioned a Mercator map « Afrique à sa
   * surface réelle » and withdrew the very slider the demonstration is made
   * of.
   */
  // @req REQ-120
  it("mounts the globe unpinned, so the reader owns the projection", () => {
    renderSurface();

    expect(screen.getByTestId("globe-stage")).toHaveAttribute(
      "data-projection",
      ""
    );
  });

  // @req REQ-120
  it("mounts it on the home's own terms: editorial figure, arriving in motion", () => {
    renderSurface();

    const stage = screen.getByTestId("globe-stage");
    expect(stage).toHaveAttribute("data-presentation", "hero");
    expect(stage).toHaveAttribute("data-autorotate", "true");
  });

  // @req REQ-120
  it("keeps the projection the reader's to move once the answer is in", async () => {
    const user = userEvent.setup();
    renderSurface();

    await user.click(screen.getByRole("button", { name: "DZA-A" }));

    expect(screen.getByTestId("globe-stage")).toHaveAttribute(
      "data-projection",
      ""
    );
  });

  /**
   * The globe draws the continent; it does not say how much ground that is.
   * The claim is measured off the same outlines the sphere is drawn from and
   * handed down by the server page, so the figure and the picture cannot
   * disagree.
   */
  // @req REQ-120
  it("states Africa's measured true size beside the globe", () => {
    renderSurface();

    expect(screen.getByText(TRUE_SIZE_CLAIM)).toBeInTheDocument();
  });

  /**
   * The demonstration stopped being only ours on 4 September 2026. Naming the
   * vote turns « une projection déforme » into a thing states argued about,
   * and the reader can go and check it.
   */
  // @req REQ-120
  it("credits the UN resolution and links the reader to it", () => {
    renderSurface();

    const link = screen.getByRole("link", { name: /ONU Info/ });
    expect(link).toHaveAttribute(
      "href",
      "https://news.un.org/fr/story/2026/09/1159416"
    );
    expect(screen.getByTestId("mercator-true-size")).toHaveTextContent(
      /Equal Earth/
    );
  });

  /**
   * Charter §9.1: the stem and every option clear the fold at 430 px, and it
   * is the stage that gives way, never the options. The stage floor is 560 px
   * on a phone, so the round sits *before* the globe in the document — which
   * is also the order the tab sequence and a screen reader want, and it now
   * holds in every phase rather than being repainted on the reveal.
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
