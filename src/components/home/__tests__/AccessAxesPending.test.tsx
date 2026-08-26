import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * The "Bientôt" path of the home axes (REQ-114).
 *
 * Until REQ-120 this was covered by the Jouer axis, whose two modules were
 * both `unavailable`. Jouer now holds twelve live entries, so no real access
 * mode is dark and the real registry can no longer reach this branch. The
 * rule still stands — an axis must not advertise an action it cannot deliver
 * — so it is exercised here against a synthetic registry rather than left
 * uncovered. Deleting this file would leave a promise-check that never runs.
 */

vi.mock("@/lib/hubs/moduleRegistry", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/hubs/moduleRegistry")
  >("@/lib/hubs/moduleRegistry");

  return {
    ...actual,
    getModulesForAccessMode: (mode: string) =>
      mode === "jouer"
        ? [
            {
              id: "dark-one",
              name: "Un module éteint",
              accessMode: "jouer",
              page: null,
              availability: "unavailable",
            },
            {
              id: "dark-two",
              name: "Un autre module éteint",
              accessMode: "jouer",
              page: null,
              availability: "unavailable",
            },
          ]
        : actual.getModulesForAccessMode(mode as never),
  };
});

const { AccessAxes } = await import("@/components/home/AccessAxes");

const counts = { peoples: 890, countries: 54, families: 24, migrations: 6 };

describe("AccessAxes — an axis whose every module is dark (REQ-114)", () => {
  // @req REQ-114
  it("marks the axis unavailable rather than advertising its action", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "data-available",
      "false"
    );
  });

  // @req REQ-114
  it("replaces the action verb with the pending label", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-cta-jouer")).toHaveTextContent(
      "Bientôt"
    );
  });

  // @req REQ-114
  it("counts the dark modules instead of promising what they would show", () => {
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-figure-jouer")).toHaveTextContent(
      "2 modules en préparation"
    );
  });

  // The rule has to discriminate, not blanket: an axis with live modules
  // must keep its promise while its neighbour is dark.
  // @req REQ-114
  it("leaves the axes with live modules promising their action", () => {
    render(<AccessAxes language="fr" counts={counts} />);

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
