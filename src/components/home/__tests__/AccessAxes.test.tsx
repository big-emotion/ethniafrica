import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessAxes } from "@/components/home/AccessAxes";
import { getLocalizedRoute } from "@/lib/routing";
import type { CorpusCounts } from "@/lib/home/corpusCounts";

const counts: CorpusCounts = {
  peoples: 803,
  countries: 54,
  families: 24,
  migrations: 6,
};

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
    render(<AccessAxes language="fr" counts={counts} />);

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

  // @req REQ-114
  it("sends each axis to its own hub route", () => {
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(
      <AccessAxes
        language="fr"
        counts={{ ...counts, peoples: 12, countries: 3, migrations: 1 }}
      />
    );

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      "12 peuples · 3 pays"
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent("1 repère · 1 doctrine");
  });

  // @req REQ-113
  it("gives each axis one action verb, not a paragraph", () => {
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(<AccessAxes language="fr" counts={counts} />);

    for (const id of ["explorer", "comprendre", "jouer"]) {
      const glyph = screen.getByTestId(`access-axis-glyph-${id}`);
      expect(glyph.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
  });

  // @req REQ-112
  it("drops every animation class under reduced motion", () => {
    reducedMotion = true;
    render(<AccessAxes language="fr" counts={counts} />);

    const axis = screen.getByTestId("access-axis-explorer");
    expect(axis.className).not.toContain("access-axis-reveal");
    expect(
      screen.getByTestId("access-axis-glyph-explorer").innerHTML
    ).not.toContain("g-dot");
  });

  // @req REQ-113
  it("keeps every axis above the 44px touch target", () => {
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(<AccessAxes language="fr" counts={counts} />);

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
    render(<AccessAxes language="fr" counts={counts} />);

    expect(screen.getByTestId("access-axis-jouer")).toHaveAttribute(
      "href",
      "/fr/jouer"
    );
  });
});
