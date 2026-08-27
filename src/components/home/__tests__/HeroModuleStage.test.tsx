import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/components/home/HomeGlobeStage", () => ({
  HomeGlobeStage: () => <div data-testid="stage-globe" />,
}));
vi.mock("@/components/play/GamePlayHost", () => ({
  GamePlayHost: () => <div data-testid="stage-game" />,
}));

import { HeroModuleStage } from "@/components/home/HeroModuleStage";
import {
  HERO_PREVIEW_KINDS,
  MODULE_DEFINITIONS,
  type HeroPreviewKind,
} from "@/lib/hubs/moduleRegistry";
import type { HeroPreview } from "@/lib/home/heroPreviewData";

// One sample payload per kind, so the exhaustiveness check below renders a
// real preview rather than asserting against a type.
const SAMPLE: Record<HeroPreviewKind, HeroPreview> = {
  globe: { kind: "globe" },
  game: { kind: "game", game: {} as never, rounds: [{} as never] },
  "migration-paths": {
    kind: "migration-paths",
    paths: [
      {
        id: "MGR_BANTU",
        nameMain: "Dispersion bantoue",
        geometry: { type: "LineString", coordinates: [[11.5, 6.5]] },
        timeRange: { startYear: -3000, endYear: -1500, datingNote: null },
      },
    ] as never,
  },
  "family-crown": {
    kind: "family-crown",
    families: [
      { id: "FLG_NIGER_CONGO", nameFr: "Niger-Congo", peopleCount: 5 },
    ],
  },
};

describe("HeroModuleStage", () => {
  // strictNullChecks is off in this repo, so a switch missing a case
  // returns undefined and still compiles. Exhaustiveness over
  // HeroPreviewKind can only be a test — this is it.
  // @req REQ-115
  it("renders something for every kind the registry can declare", () => {
    HERO_PREVIEW_KINDS.forEach((kind) => {
      const { container, unmount } = render(
        <HeroModuleStage preview={SAMPLE[kind]} />
      );
      expect(
        container.firstChild,
        `HeroModuleStage rendered nothing for kind "${kind}"`
      ).not.toBeNull();
      unmount();
    });
  });

  // The registry and the switch are two halves of one contract. A module
  // declaring a kind the union does not carry would render the globe under
  // a chip naming something else.
  // @req REQ-115
  it("declares no module under a kind the union does not carry", () => {
    const declared = MODULE_DEFINITIONS.map((def) => def.heroable).filter(
      Boolean
    );
    const unknown = declared.filter(
      (kind) => !HERO_PREVIEW_KINDS.includes(kind as HeroPreviewKind)
    );
    expect(unknown).toEqual([]);
  });

  // @req REQ-115
  it("keeps the lot spread across more than one axis", () => {
    const axes = new Set(
      MODULE_DEFINITIONS.filter((def) => def.heroable).map(
        (def) => def.accessMode
      )
    );
    expect(axes.size).toBeGreaterThan(1);
  });

  // @req REQ-115
  it("falls back to the globe rather than an empty band on an unknown kind", () => {
    const { getByTestId } = render(
      <HeroModuleStage preview={{ kind: "not-a-kind" } as never} />
    );
    expect(getByTestId("stage-globe")).toBeTruthy();
  });
});
