import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";

import type { AccessMode } from "@/lib/hubs/moduleRegistry";

const fixtureCounts = {
  peoples: 4213,
  countries: 91,
  families: 37,
  migrations: 5,
};

// The hero carries an interactive island since the search field landed in it,
// and useRouter throws outside an app-router tree rather than degrading.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: vi.fn(async () => fixtureCounts),
}));

// Only the draw is stubbed; the curated fallback is what the chips then hold.
vi.mock("@/lib/home/seedWords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/seedWords")>();
  return {
    ...actual,
    loadSeedWords: vi.fn(async () => actual.FALLBACK_SEED_WORDS),
  };
});

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

vi.mock("@/components/atlas/ContinentGlobeStage", () => ({
  ContinentGlobeStage: () => <div data-testid="home-globe-stage" />,
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
  // The doors came first while the hero's standfirst was doing the telling
  // above the fold. The hero is now a question and one sentence, so the
  // telling moved back down into the argument — and the argument has to
  // reach the reader before the three doors it makes sense of.
  //
  // The order also settles a vocabulary problem: the Explorer card offers
  // « familles linguistiques », a term nothing on the page glossed before
  // the reader met it. PurposeBlocks defines a language family by example
  // — « Bantou » names a kinship between 500 languages, not a people — so
  // standing it first is what makes the card's own wording readable.
  // @req REQ-113
  it("opens on the argument, then the three entry points, then the module of the month", async () => {
    const { container } = await renderHome();

    const purpose = container.querySelector(
      '[data-testid="home-purpose-blocks"]'
    );
    const axes = container.querySelector('[data-testid="access-axes"]');
    const featured = container.querySelector(
      '[data-testid="home-featured-module"]'
    );

    expect(purpose).not.toBeNull();
    expect(axes).not.toBeNull();
    expect(featured).not.toBeNull();
    expect(precedes(purpose!, axes!)).toBe(true);
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
  it("answers the headline in one sentence, and says the answers are sourced", async () => {
    await renderHome();

    const answer = screen.getByTestId("home-hero-answer");
    const sentences = answer
      .textContent!.split(/(?<=\.)\s+/)
      .filter((part) => part.trim().length > 0);

    expect(sentences).toHaveLength(1);
    expect(answer).toHaveTextContent(/sourc/i);
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

    // Counted, not quoted. Pinning one slice's wording made this test fail
    // the moment recette reworded them (#487) — a copy edit is not a
    // regression in the outline, and a test that cannot tell the two apart
    // is noise. What has to hold is that the section's heading is the only
    // h2 among them and all three slices sit under it.
    const purpose = screen.getByTestId("home-purpose-blocks");
    expect(within(purpose).getAllByRole("heading", { level: 3 })).toHaveLength(
      3
    );
    expect(within(purpose).getAllByRole("heading", { level: 2 })).toEqual([
      screen.getByTestId("home-purpose-heading"),
    ]);
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
