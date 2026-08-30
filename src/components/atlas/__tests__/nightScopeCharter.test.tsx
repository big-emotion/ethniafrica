import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import { ContinentGlobeStage } from "@/components/atlas/ContinentGlobeStage";
import type { CountryOutlineOverlay, Ring } from "@/lib/atlas/overlays";

/**
 * brand-charter §5.1 (DEC-022): the night ground `--afh-night-*` is licensed
 * for the atlas stage *only* — the globe band on a fiche. It is a stage light,
 * not a theme, and any other block that goes dark is out of scope.
 *
 * Nothing asserted that, which is how ETNI-1360 carried the night onto two
 * surfaces that are not fiches — the home's opening module and
 * /jouer/mercator — with the whole suite green. The engine consolidation was
 * right; what travelled with it was a ground the charter does not license
 * there. The parchment half of `globePalette.ts` went dead the same day:
 * `resolveGlobePalette()` was called with no argument, so ten
 * `--afh-globe-parchment-*` tokens and `GLOBE_LIGHTING` became unreachable
 * while still being maintained.
 *
 * The rule this file holds: a globe reaches the night group only where the
 * charter licenses it, and everywhere else it stands on the reader's own
 * ground.
 */

/** Published so a test can read which palette the canvas was actually handed. */
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: ({ surface }: { surface?: string }) => (
    <canvas data-testid="atlas-globe-canvas-mock" data-surface={surface} />
  ),
}));

let readerTheme = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: readerTheme }),
}));

/** Enough for buildContinentOverlay to resolve a scene rather than the missing placeholder. */
const peopleCounts = { NGA: 40, ZAF: 22, ETH: 18 };

const square: Ring = [
  { lon: 0, lat: 0 },
  { lon: 2, lat: 0 },
  { lon: 2, lat: 2 },
  { lon: 0, lat: 2 },
];

/** A country fiche's overlay — the mount DEC-022 actually licenses. */
const ficheOverlay: CountryOutlineOverlay = {
  kind: "country-outline",
  countryId: "ZAF",
  rings: [square],
  fillOpacity: 0.22,
};

function withWebgl() {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as unknown as RenderingContext
  );
}

/**
 * The ground the stage declares, not the `background-color` that reads it: the
 * stage paints `var(--afh-globe-stage-ground)` either way, so the declaration
 * is the only place the two surfaces differ. Asserted non-empty first, because
 * a role that is simply absent would satisfy every "is not night" expectation
 * below without the stage having chosen anything at all.
 */
function stageGround(): string {
  const stage = document.querySelector<HTMLElement>("[data-atlas-stage]");
  expect(stage).not.toBeNull();
  const ground = stage.style.getPropertyValue("--afh-globe-stage-ground");
  expect(ground).not.toBe("");
  return ground;
}

afterEach(() => {
  readerTheme = "light";
  vi.restoreAllMocks();
});

describe("night is a stage light on the fiche atlas, not a theme (brand-charter §5.1)", () => {
  // @req REQ-115
  it("keeps the fiche's globe band on the night ground, the one surface DEC-022 licenses", async () => {
    withWebgl();

    render(
      <AtlasGlobe overlay={ficheOverlay} missingMessage="Rien à montrer." />
    );

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(stageGround()).toContain("--afh-night-ground");
  });

  // @req REQ-115
  it("stands the continent stage on the reader's own ground, so the home and /jouer/mercator stop punching a hole through parchment", async () => {
    withWebgl();

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(stageGround()).not.toContain("--afh-night-ground");
  });

  /**
   * The witness for the opposite direction. Without it the assertion above is
   * satisfied by a stage that has simply lost the ability to go dark, and the
   * reader who chose night would get a parchment disc on a night page — the
   * inverse of the defect, and just as wrong.
   */
  // @req REQ-115
  it("follows the reader back to night when they have chosen it, rather than pinning parchment", async () => {
    readerTheme = "dark";
    withWebgl();

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );
    expect(stageGround()).toContain("--afh-night-ground");
  });

  /**
   * A role that resolves to itself computes to nothing, and an element with no
   * colour inherits the page's — which on the night stage is the parchment ink,
   * at about 1.2:1 on a ground of #120e0a.
   *
   * This is not hypothetical: threading the roles in cost exactly this bug,
   * and every assertion above stayed green through it, because happy-dom does
   * not resolve `var()` and so cannot tell a cycle from a colour. The rendered
   * page is where it showed. Asserted here on the declaration instead, which
   * is the part a DOM without a cascade can still be honest about.
   */
  // @req REQ-115
  it.each(["ground", "ink", "line", "panel"])(
    "resolves the %s role to something other than itself, on both surfaces",
    async (role) => {
      withWebgl();
      const property = `--afh-globe-stage-${role}`;

      for (const theme of ["light", "dark"]) {
        readerTheme = theme;
        const { unmount } = render(
          <ContinentGlobeStage peopleCountsByCountry={peopleCounts} />
        );
        await waitFor(() =>
          expect(
            screen.getByTestId("atlas-globe-canvas-mock")
          ).toBeInTheDocument()
        );

        const stage = document.querySelector<HTMLElement>("[data-atlas-stage]");
        expect(stage.style.getPropertyValue(property)).not.toContain(property);
        unmount();
      }
    }
  );

  // @req REQ-112
  it("hands the canvas the parchment palette, so the ground and the sphere painted on it agree", async () => {
    withWebgl();

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    const canvas = await screen.findByTestId("atlas-globe-canvas-mock");
    expect(canvas).toHaveAttribute("data-surface", "parchment");
  });

  /**
   * The chrome is the half a ground swap silently leaves behind: the caption,
   * the toolbar and the legend each name a night ink inline, and a night ink
   * on parchment is dark-on-light at a contrast nothing measures. Asserted as
   * "reaches into the group at all" rather than pair by pair — the charter's
   * rule is about scope, and a pairwise test would pass the day someone adds
   * a tenth night reference.
   */
  // @req REQ-115
  it("lets nothing inside a parchment stage reach into the night group", async () => {
    withWebgl();

    render(<ContinentGlobeStage peopleCountsByCountry={peopleCounts} />);

    await waitFor(() =>
      expect(screen.getByTestId("atlas-globe-canvas-mock")).toBeInTheDocument()
    );

    const stage = document.querySelector<HTMLElement>("[data-atlas-stage]");
    const nightConsumers = [...stage.querySelectorAll<HTMLElement>("[style]")]
      .map((element) => element.getAttribute("style") ?? "")
      .filter((style) => style.includes("--afh-night-"));

    expect(nightConsumers).toEqual([]);
  });
});
