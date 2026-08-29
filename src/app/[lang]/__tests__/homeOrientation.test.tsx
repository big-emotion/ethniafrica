import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import type { AccessMode } from "@/lib/hubs/moduleRegistry";

const fixtureCounts = {
  peoples: 4213,
  countries: 91,
  families: 37,
  migrations: 5,
};

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: vi.fn(async () => fixtureCounts),
}));

vi.mock("@/lib/hubs/moduleAvailability", async () => {
  const registry = await import("@/lib/hubs/moduleRegistry");
  return {
    getHubModules: vi.fn(async (mode: AccessMode) =>
      registry.getModulesForAccessMode(mode).map((definition) => ({
        ...definition,
        available: true,
      }))
    ),
  };
});

vi.mock("@/lib/home/synthesisRailData", () => ({
  loadSynthesisRail: vi.fn(async () => []),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/home/HomeGlobeStage", () => ({
  HomeGlobeStage: () => <div data-testid="home-globe-stage" />,
}));

import Home from "../page";

const renderHome = async () =>
  render(await Home({ searchParams: Promise.resolve({}) }));

/** Document order of two nodes, as the reader scrolls them. */
const precedes = (first: Element, second: Element) =>
  Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  );

describe("home — what the reader meets, and in what order (REQ-113)", () => {
  // The three doors used to sit at the bottom, behind the argument, on the
  // reading that a reader cannot choose an axis before being told what the
  // atlas is for. The standfirst now does that telling in two sentences,
  // above the fold, so the doors no longer have to wait for it.
  // @req REQ-113
  it("opens on the three entry points, not on the module of the month", async () => {
    const { container } = await renderHome();

    const axes = container.querySelector('[data-testid="access-axes"]');
    const featured = container.querySelector(
      '[data-testid="home-featured-module"]'
    );

    expect(axes).not.toBeNull();
    expect(featured).not.toBeNull();
    expect(precedes(axes!, featured!)).toBe(true);
  });

  // @req REQ-113
  it("puts the module of the month after the sample of the corpus, where the axes used to sit", async () => {
    const { container } = await renderHome();

    const purpose = container.querySelector(
      '[data-testid="home-purpose-blocks"]'
    );
    const featured = container.querySelector(
      '[data-testid="home-featured-module"]'
    );
    const trust = container.querySelector('[data-testid="home-trust-strip"]');

    expect(precedes(purpose!, featured!)).toBe(true);
    expect(precedes(featured!, trust!)).toBe(true);
  });

  // @req REQ-113
  it("states what the atlas is in two sentences under the headline", async () => {
    await renderHome();

    const standfirst = screen.getByTestId("home-hero-standfirst");
    const sentences = standfirst
      .textContent!.split(/(?<=\.)\s+/)
      .filter((part) => part.trim().length > 0);

    expect(sentences).toHaveLength(2);
    expect(standfirst).toHaveTextContent(/sourc/i);
  });

  // Every section says its own name. The three that did not were the
  // module slot, the name-origin slices and the axes — a reader landing
  // mid-scroll met an image, a card or a globe with nothing above it.
  // @req REQ-113
  it("gives every section a heading, and only the hero an h1", async () => {
    await renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    for (const testId of [
      "home-featured-heading",
      "home-purpose-heading",
      "home-axes-heading",
    ]) {
      expect(screen.getByTestId(testId).tagName).toBe("H2");
    }
  });

  // The section headings are h2, so what lives inside a section is h3.
  // Both groups were h2 before, which flattened the page into eleven
  // siblings and left the new group titles with nothing to outrank.
  // @req REQ-113
  it("drops the slice and axis titles to h3 under their section", async () => {
    await renderHome();

    for (const name of ["Explorer", "Comprendre", "Jouer"]) {
      expect(
        screen.getByRole("heading", { level: 3, name })
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 2, name })).toBeNull();
    }

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /Vous connaissez le nom/,
      })
    ).toBeInTheDocument();
  });

  // The formula described the reader ("il arrive…", "il repart…") instead
  // of the destination. A card has one line to say where the click lands;
  // spending it on a rhetorical figure left the reader to guess.
  // @req REQ-113
  it("says what each entry point holds rather than narrating the reader", async () => {
    const { container } = await renderHome();

    expect(container.textContent).not.toMatch(/il arrive avec/i);
    expect(container.textContent).not.toMatch(/il repart avec/i);
    expect(container.textContent).not.toMatch(/il arrive sans rien/i);

    expect(screen.getByTestId("access-axis-stake-explorer")).toHaveTextContent(
      /peuples, pays, langues/i
    );
    expect(
      screen.getByTestId("access-axis-stake-comprendre")
    ).toHaveTextContent(/sources|migrations|méthode/i);
    expect(screen.getByTestId("access-axis-stake-jouer")).toHaveTextContent(
      /jeux|quiz/i
    );
  });
});
