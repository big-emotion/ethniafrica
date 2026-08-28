import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccessAxes } from "@/components/home/AccessAxes";
import {
  ACCESS_MODES,
  getModulesForAccessMode,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";

/**
 * The "Bientôt" path of the home axes (REQ-114).
 *
 * Until REQ-120 this was covered by the Jouer axis, whose two modules were
 * both `unavailable`. Jouer now holds twelve live entries, so no real access
 * mode is dark and the real registry can no longer reach this branch. The
 * rule still stands — an axis must not advertise an action it cannot deliver
 * — so it is exercised here against a hand-built list rather than left
 * uncovered. Deleting this file would leave a promise-check that never runs.
 */

const counts = { peoples: 890, countries: 54, families: 24, migrations: 6 };

const liveModules = (mode: AccessMode): HubModule[] =>
  getModulesForAccessMode(mode).map((definition) => ({
    ...definition,
    available: true,
  }));

const darkJouer: HubModule[] = [
  {
    id: "dark-one",
    name: "Un module éteint",
    accessMode: "jouer",
    page: null,
    availability: "data",
    available: false,
  },
  {
    id: "dark-two",
    name: "Un autre module éteint",
    accessMode: "jouer",
    page: null,
    availability: "data",
    available: false,
  },
];

const modulesByAxis: Record<AccessMode, HubModule[]> = {
  ...(Object.fromEntries(
    ACCESS_MODES.map((mode) => [mode, liveModules(mode)])
  ) as Record<AccessMode, HubModule[]>),
  jouer: darkJouer,
};

const renderAxes = () =>
  render(
    <AccessAxes language="fr" counts={counts} modulesByAxis={modulesByAxis} />
  );

describe("AccessAxes — an axis whose every module is dark (REQ-114)", () => {
  // @req REQ-114
  it("marks the axis unavailable rather than advertising its action", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "data-available",
      "false"
    );
  });

  // @req REQ-114
  it("replaces the action verb with the pending label", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-cta-jouer")).toHaveTextContent(
      "Bientôt"
    );
  });

  // @req REQ-114
  it("counts the dark modules instead of promising what they would show", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-figure-jouer")).toHaveTextContent(
      "2 modules en préparation"
    );
  });

  // The rule has to discriminate, not blanket: an axis with live modules
  // must keep its promise while its neighbour is dark.
  // @req REQ-114
  it("leaves the axes with live modules promising their action", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-explorer")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveAttribute(
      "data-available",
      "true"
    );
  });
});
