import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";

import type { AccessMode } from "@/lib/hubs/moduleRegistry";

// The hero carries an interactive island since the search field landed in it,
// and useRouter throws outside an app-router tree rather than degrading.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
  // The home now stays focused on discovery: the opening question leads into
  // one sourced surprise, then a module to try, and finally the sourcing
  // receipt. The broader presentation narrative lives on About.
  // @req REQ-113
  it("keeps the retained sequence from hero to anecdote, featured module and trust strip", async () => {
    const { container } = await renderHome();

    const hero = container.querySelector(".home-hero");
    const didYouKnow = container.querySelector(
      '[data-testid="home-did-you-know"]'
    );
    const featured = container.querySelector(
      '[data-testid="home-featured-module"]'
    );
    const trust = container.querySelector('[data-testid="home-trust-strip"]');

    expect(hero).not.toBeNull();
    expect(didYouKnow).not.toBeNull();
    expect(featured).not.toBeNull();
    expect(trust).not.toBeNull();
    expect(precedes(hero!, didYouKnow!)).toBe(true);
    expect(precedes(didYouKnow!, featured!)).toBe(true);
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

  // The two retained content sections keep their h2 landmarks below the
  // hero's single h1; the trust strip is an aside rather than a new section.
  // @req REQ-113
  it("keeps the retained content headings below the hero h1", async () => {
    await renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const didYouKnow = screen.getByTestId("home-did-you-know");
    expect(
      within(didYouKnow).getAllByRole("heading", { level: 2 })
    ).toHaveLength(1);
    expect(screen.getByTestId("home-featured-heading").tagName).toBe("H2");
  });
});
