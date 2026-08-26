import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessAxes, type AccessAxesProps } from "@/components/home/AccessAxes";
import { getLocalizedRoute } from "@/lib/routing";
import {
  ACCESS_MODES,
  getModulesForAccessMode,
  type AccessMode,
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const counts: CorpusCounts = {
  peoples: 803,
  countries: 54,
  families: 24,
  migrations: 6,
};

// The axes now carry the modules the server resolved, so the fixture is
// the registry with every route-bearing module live — the state the corpus
// is actually in.
const modulesByAxis = Object.fromEntries(
  ACCESS_MODES.map((mode) => [
    mode,
    getModulesForAccessMode(mode).map((definition) => ({
      ...definition,
      available: definition.availability !== "unavailable",
    })),
  ])
) as Record<AccessMode, HubModule[]>;

const renderAxes = (props: Partial<AccessAxesProps> = {}) =>
  render(
    <AccessAxes
      language="fr"
      counts={counts}
      modulesByAxis={modulesByAxis}
      {...props}
    />
  );

let reducedMotion = false;
vi.mock("@/hooks/use-prefers-reduced-motion", () => ({
  usePrefersReducedMotion: () => reducedMotion,
}));

afterEach(() => {
  reducedMotion = false;
  cleanup();
});

describe("AccessAxes — the home's three entry points (REQ-113/REQ-114)", () => {
  // @req REQ-113
  it("offers exactly the three intents, named as verbs", () => {
    renderAxes();

    const axes = screen.getAllByTestId(/^access-axis-\w+$/);
    expect(axes.map((axis) => axis.dataset.testid)).toEqual([
      "access-axis-explorer",
      "access-axis-comprendre",
      "access-axis-jouer",
    ]);
    expect(
      screen.getByRole("heading", { level: 2, name: "Explorer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Comprendre" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Jouer" })
    ).toBeInTheDocument();
  });

  // The href survives as the no-JS and crawler path, but a reader with
  // JavaScript never spends a page load on the axis slug any more.
  // @req REQ-114
  it("keeps the hub route as a fallback href on every axis", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-explorer")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "explorerHub")
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "comprendreHub")
    );
    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "jouerHub")
    );
  });

  // Every figure on the home is a count of something a reader could go
  // and verify. "3 000 ans" was not one (ETNI-1198).
  // @req REQ-113
  it("counts real corpus entries rather than announcing an era", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      "803 peuples · 54 pays"
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent("6 repères · 1 doctrine");
    expect(screen.queryByText(/3\s?000\s?ans/)).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("tracks the counts it is given rather than hardcoding them", () => {
    renderAxes({
      counts: { ...counts, peoples: 12, countries: 3, migrations: 1 },
    });

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      "12 peuples · 3 pays"
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent("1 repère · 1 doctrine");
  });

  // @req REQ-113
  it("gives each axis one action verb, not a paragraph", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-cta-explorer")).toHaveTextContent(
      "Parcourir"
    );
    expect(screen.getByTestId("access-axis-cta-comprendre")).toHaveTextContent(
      "Remonter"
    );
    expect(screen.getByTestId("access-axis-cta-jouer")).toHaveTextContent(
      "Bientôt"
    );
  });

  // @req REQ-114
  it("scopes each axis to its own categorical accent", () => {
    renderAxes();

    expect(screen.getByTestId("access-axis-explorer")).toHaveClass(
      "afh-accent-ocre"
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveClass(
      "afh-accent-teal"
    );
    expect(screen.getByTestId("access-axis-jouer")).toHaveClass(
      "afh-accent-perv"
    );
  });

  // The glyph animates what its axis does, so it is a second reading of
  // the label — and decorative, so it stays out of the accessible name.
  // @req REQ-113
  it("carries a decorative animated glyph per axis", () => {
    renderAxes();

    for (const id of ["explorer", "comprendre", "jouer"]) {
      const glyph = screen.getByTestId(`access-axis-glyph-${id}`);
      expect(glyph.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  // @req REQ-112
  it("drops every animation class under reduced motion", () => {
    reducedMotion = true;
    renderAxes();

    const axis = screen.getByTestId("access-axis-explorer");
    expect(axis.className).not.toContain("access-axis-reveal");
    expect(
      screen.getByTestId("access-axis-glyph-explorer").innerHTML
    ).not.toContain("g-dot");
  });

  // @req REQ-113
  it("keeps every axis above the 44px touch target", () => {
    renderAxes();

    for (const id of ["explorer", "comprendre", "jouer"]) {
      expect(screen.getByTestId(`access-axis-${id}`).className).toContain(
        "min-h-11"
      );
    }
  });
});

// Both modules behind Jouer are `unavailable`, so /fr/jouer holds nothing
// but "Bientôt" rows. A primary home CTA reading "Comparer" over a figure
// promising "2 peuples face à face" sends the reader to a dead end. The
// axis reads its own state off the registry so it starts promising again
// by itself the day a module ships — nothing here to remember to undo.
describe("AccessAxes — an axis promises only what it can deliver (REQ-114)", () => {
  const counts = { peoples: 890, countries: 54, families: 24, migrations: 6 };

  // @req REQ-114
  it("marks an axis whose every module is unavailable as coming soon", () => {
    renderAxes({ counts });

    const jouer = screen.getByTestId("access-axis-jouer");
    expect(jouer).toHaveAttribute("data-available", "false");
    expect(
      screen.getByTestId("access-axis-figure-jouer")
    ).not.toHaveTextContent("2 peuples face à face");
  });

  // Explorer and Comprendre both have live modules, so neither may be
  // dressed as pending — the state has to discriminate, not blanket.
  // @req REQ-114
  it("leaves the axes with live modules promising their action", () => {
    renderAxes({ counts });

    expect(screen.getByTestId("access-axis-explorer")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-comprendre")).toHaveAttribute(
      "data-available",
      "true"
    );
    expect(screen.getByTestId("access-axis-cta-explorer")).toHaveTextContent(
      "Parcourir"
    );
  });

  // axe caught this on the live /fr route: dimming the pending axis as a
  // whole took its CTA text under the contrast bar. The pending state is
  // allowed to soften decoration — the glyph is aria-hidden and no
  // contrast rule applies to it — but never text, which has already said
  // "Bientôt" and needs no help being read.
  // @req REQ-114
  it("softens only aria-hidden decoration, never the pending axis text", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/home/AccessAxes.tsx"),
      "utf8"
    );
    const pendingRules = source.match(/\.access-axis-pending[^{]*\{[^}]*\}/g);

    for (const rule of pendingRules ?? []) {
      if (!/opacity/.test(rule)) continue;
      expect(rule).not.toContain(".access-axis-cta");
      expect(rule).not.toContain(".access-axis-figure");
    }
  });

  // Still a link: the hub is where the reader sees what is coming. What is
  // removed is the promise of a live action, not the route.
  // @req REQ-114
  it("keeps the pending axis reachable rather than inert", () => {
    renderAxes({ counts });

    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "href",
      "/fr/jouer"
    );
  });
});

// Clicking an entry point used to cost a page load to reach a list of the
// same modules. It now opens that list on the home itself, and the reader's
// next click lands on the module rather than on the axis slug.
describe("AccessAxes — an axis opens on the home rather than loading its hub (REQ-114)", () => {
  // @req REQ-114
  it("swallows the navigation and deploys the axis in place", () => {
    renderAxes();
    const explorer = screen.getByTestId("access-axis-explorer");
    expect(explorer).toHaveAttribute("aria-expanded", "false");

    // fireEvent reports false when a handler called preventDefault.
    const proceeded = fireEvent.click(explorer);

    expect(proceeded).toBe(false);
    expect(screen.getByTestId("axis-panel-explorer")).toBeInTheDocument();
    expect(explorer).toHaveAttribute("aria-expanded", "true");
    expect(explorer).toHaveAttribute("aria-controls", "axis-panel-explorer");
  });

  // @req REQ-114
  it("deploys the modules of the axis that was opened, and no others", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-comprendre"));

    expect(screen.getByTestId("axis-module-doctrine")).toBeInTheDocument();
    expect(screen.getByTestId("axis-module-frise")).toBeInTheDocument();
    expect(screen.queryByTestId("axis-module-peuples")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("sends a module click to the module's own page, never to the axis slug", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-explorer"));

    expect(screen.getByTestId("axis-module-link-peuples")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
  });

  // @req REQ-114
  it("keeps a single axis open, switching rather than stacking", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-explorer"));
    await userEvent.click(screen.getByTestId("access-axis-jouer"));

    expect(screen.queryByTestId("axis-panel-explorer")).not.toBeInTheDocument();
    expect(screen.getByTestId("axis-panel-jouer")).toBeInTheDocument();
  });

  // @req REQ-114
  it("marks which axis is open on the group itself", async () => {
    renderAxes();
    expect(screen.getByTestId("access-axes")).toHaveAttribute(
      "data-open",
      "none"
    );

    await userEvent.click(screen.getByTestId("access-axis-explorer"));

    expect(screen.getByTestId("access-axes")).toHaveAttribute(
      "data-open",
      "explorer"
    );
  });

  // Escape is the way out of anything that opened over what you were
  // reading, and the focus has to come back where it was taken from.
  // @req REQ-114
  it("closes on Escape and hands focus back to the card that opened it", async () => {
    renderAxes();
    const explorer = screen.getByTestId("access-axis-explorer");

    await userEvent.click(explorer);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByTestId("axis-panel-explorer")).not.toBeInTheDocument();
    expect(explorer).toHaveFocus();
  });

  // @req REQ-114
  it("closes when the opened card is clicked a second time", async () => {
    renderAxes();
    const explorer = screen.getByTestId("access-axis-explorer");

    await userEvent.click(explorer);
    await userEvent.click(explorer);

    expect(screen.queryByTestId("axis-panel-explorer")).not.toBeInTheDocument();
    expect(explorer).toHaveAttribute("aria-expanded", "false");
  });

  // A pending axis is still worth opening: that is where the reader sees
  // what is coming, which is what the hub used to be for.
  // @req REQ-106
  it("opens a pending axis too, onto its Bientôt modules", async () => {
    renderAxes();

    await userEvent.click(screen.getByTestId("access-axis-jouer"));

    expect(
      screen.getByTestId("axis-module-unavailable-comparer")
    ).toHaveTextContent("Bientôt");
  });
});
