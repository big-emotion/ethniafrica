import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { AtlasGlobe } from "../AtlasGlobe";
import type { CountryOutlineOverlay, Ring } from "@/lib/atlas/overlays";
import { buildCountryPickerTargets } from "@/lib/atlas/targets";

// The one thing on the stage that needs a GPU the runner does not have.
vi.mock("@/components/atlas/AtlasGlobeCanvas", () => ({
  AtlasGlobeCanvas: () => <canvas data-testid="atlas-globe-canvas-mock" />,
}));

/**
 * The two readings of the WebGL probe, which are deliberately different.
 *
 * The probe used to be two-state, so `undefined` and "unsupported" were the
 * same value. The server has no WebGL, so it started `false`: the legend
 * rendered « Glissez pour déplacer » and the post-hydration probe rewrote it to
 * « Glissez pour tourner ». Rewriting the largest text in the hero band ~4s in
 * *is* the Largest Contentful Paint — which is how a fiche measured 6.3s
 * against a 5.5s budget while painting its first frame at 1.5s.
 *
 * The stage stays conservative: an unproven context draws the fallback figure,
 * because a sphere that may never arrive is worse than the map that certainly
 * can. Only the legend is optimistic, because it describes a gesture and being
 * briefly wrong for the minority without WebGL costs them nothing.
 *
 * **The optimistic path has no test here, on purpose.** In jsdom the effect
 * resolves the probe before any assertion runs, so an unresolved probe is not
 * observable — a test claiming to pin it would pass for the wrong reason. What
 * is verifiable is that the two resolved states still read correctly and that
 * the stage did not become optimistic with the legend; the optimism itself is
 * verified by the Lighthouse LCP measurement on the fiche routes.
 */
describe("globe legend and stage read the probe differently", () => {
  const square: Ring = [
    { lon: 0, lat: 0 },
    { lon: 2, lat: 0 },
    { lon: 2, lat: 2 },
    { lon: 0, lat: 2 },
  ];

  const overlay: CountryOutlineOverlay = {
    kind: "country-outline",
    countryId: "ZAF",
    rings: [square],
    fillOpacity: 0.22,
  };

  const renderGlobe = (probedWebglSupport?: boolean) =>
    render(
      <AtlasGlobe
        overlay={overlay}
        targetPicker="list"
        pickerTargets={buildCountryPickerTargets(["ZAF", "NGA"], {
          ZAF: 12,
          NGA: 8,
        })}
        missingMessage="absent"
        probedWebglSupport={probedWebglSupport}
      />
    );

  // @req REQ-112
  it("tells a reader without WebGL that the surface slides", () => {
    const { container } = renderGlobe(false);

    expect(container.querySelector("[data-atlas-legend]")).toHaveTextContent(
      "Glissez pour déplacer"
    );
  });

  // The conservative half. If the stage ever became optimistic with the legend,
  // a reader whose context fails would be shown an empty canvas where the map
  // should be — the failure REQ-112 AC2 exists to prevent.
  // @req REQ-112
  it("draws the fallback figure rather than a sphere it cannot prove", () => {
    const { container } = renderGlobe(false);

    expect(container.querySelector("svg")).not.toBeNull();
  });
});
