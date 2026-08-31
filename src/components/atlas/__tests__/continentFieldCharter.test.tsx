import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "@/components/atlas/AtlasGlobe";
import {
  buildContinentOverlay,
  type ContinentFieldOverlay,
  type PeopleFieldOverlay,
} from "@/lib/atlas/overlays";
import { continentTargetFacts } from "@/lib/atlas/targets";

// The stage's only GPU-bound layer. Mocked into an inert canvas so the
// assertions below read the SVG fallback, which is what the server renders,
// what the reader sees on first paint, and the one path jsdom can inspect.
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
}));

const CONTINENT_COUNTS = { TZA: 99, ETH: 89, GHA: 84 };

function continentOverlay(): ContinentFieldOverlay {
  const overlay = buildContinentOverlay(CONTINENT_COUNTS);
  if (overlay.kind !== "continent-field") {
    throw new Error(
      "expected buildContinentOverlay to yield a continent field"
    );
  }
  return overlay;
}

const peopleOverlay: PeopleFieldOverlay = {
  kind: "people-field",
  areas: [
    { countryId: "NGA", center: { lon: 8, lat: 9 }, populationShare: 1 },
    { countryId: "BEN", center: { lon: 2, lat: 9 }, populationShare: 0.4 },
  ],
  undrawn: [],
};

/**
 * Which scenes may draw a radial field (charter §1).
 *
 * The field is the *people* encoding: a presence whose edge nobody can source,
 * feathered to zero because a closed line would assert an inside and an
 * outside. It earns that ambiguity on a people fiche, where `PeopleFieldLegend`
 * names the quantity it carries.
 *
 * The continent scene borrowed the same glow for a different quantity —
 * documented fiches per country, ranked, top twelve — and named it nowhere. A
 * reader met twelve luminous zones over an unlabelled continent and had no way
 * to learn they meant "well documented" rather than "densely populated" or
 * "where these peoples live". That is the map asserting something the corpus
 * never declared, which is the one failure §1 exists to prevent.
 *
 * So: the field belongs to the fiche, and the hub locates without measuring.
 */
describe("the radial field is the people encoding, not a hub decoration", () => {
  // @req REQ-116
  it("draws no radial field on the continent scene", () => {
    const { container } = render(
      <AtlasGlobe
        overlay={continentOverlay()}
        missingMessage="n/a"
        targetFacts={continentTargetFacts}
      />
    );

    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  /**
   * The witness. Without it the assertion above passes just as well against a
   * globe that lost its field layer entirely, or against a render that never
   * happened — and the charter rule it guards would be indistinguishable from
   * a deletion nobody noticed.
   */
  // @req REQ-116
  it("still draws one edgeless field per country on a people fiche", () => {
    const { container } = render(
      <AtlasGlobe overlay={peopleOverlay} missingMessage="n/a" />
    );

    const circles = Array.from(container.querySelectorAll("circle"));
    expect(circles).toHaveLength(peopleOverlay.areas.length);
    expect(
      circles.every((circle) => circle.getAttribute("stroke") === "none")
    ).toBe(true);
  });
});
