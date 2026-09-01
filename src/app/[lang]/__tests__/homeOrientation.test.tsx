import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";

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

vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: vi.fn(async () => ({})),
}));

// Only the draw is stubbed; the curated fallback is what the chips then hold.
vi.mock("@/lib/home/seedWords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/seedWords")>();
  return {
    ...actual,
    loadSeedWords: vi.fn(async () => actual.FALLBACK_SEED_WORDS),
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

const renderHome = async () => render(await Home());

/** Document order of two nodes, as the reader scrolls them. */
const precedes = (first: Element, second: Element) =>
  Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  );

describe("home — what the reader meets, and in what order (REQ-113)", () => {
  // The DOM is the phone composition: copy/search/seeds, globe, then the
  // counters. Desktop reuses those nodes through grid areas rather than
  // maintaining a second reading order.
  // @req REQ-113
  it("orders the search-first hero for mobile before enhancing it for desktop", async () => {
    const { container } = await renderHome();

    const copy = container.querySelector(".home-hero-copy");
    // `.home-hero-visual`, not `.home-hero-globe`: the band's visual is drawn
    // at random from the eligible hero kinds, and only the globe draw carries
    // the second class. Reading order is the same whichever kind is drawn, so
    // the assertion belongs on the slot rather than on one of its outcomes.
    const visual = container.querySelector(".home-hero-visual");
    const counts = container.querySelector(".home-hero-counts");

    expect(copy).not.toBeNull();
    expect(visual).not.toBeNull();
    expect(counts).not.toBeNull();
    expect(precedes(copy!, visual!)).toBe(true);
    expect(precedes(visual!, counts!)).toBe(true);
  });

  // @req REQ-113
  it("places exactly two sourced facts after the hero and no retired section", async () => {
    const { container } = await renderHome();

    const hero = container.querySelector(".home-hero");
    const section = screen.getByTestId("home-did-you-know");

    expect(precedes(hero!, section)).toBe(true);
    expect(screen.getAllByTestId("home-did-you-know")).toHaveLength(1);
    expect(within(section).getAllByTestId("home-dyk-fact")).toHaveLength(2);
    expect(
      within(section).getAllByTestId("home-dyk-official-source")
    ).toHaveLength(2);
    for (const testId of [
      "home-purpose-blocks",
      "access-axes",
      "home-synthesis-rail",
      "home-featured-module",
      "home-trust-strip",
    ]) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
    }
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

  // One page title, one section title, then the two fact titles. The corpus
  // figures are values, not three headings competing with the page question.
  // @req REQ-113
  it("keeps one h1 and gives the two facts a shared h2", async () => {
    await renderHome();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  });

  // Counts keep their definition-list semantics even when the display order
  // puts each number above its label.
  // @req REQ-113
  it("presents the corpus scale as three labelled values", async () => {
    await renderHome();

    const counts = screen.getAllByRole("term")[0].closest("dl");
    expect(counts).toHaveAttribute("aria-label", "Le corpus en chiffres");
    expect(within(counts!).getAllByRole("term")).toHaveLength(3);
    expect(within(counts!).getAllByRole("definition")).toHaveLength(3);
    for (const label of ["Peuples", "Pays", "Familles linguistiques"]) {
      expect(within(counts!).getByText(label).tagName).toBe("DT");
    }
  });

  // The one action names the three entity types the corpus can resolve. No
  // retired axis copy survives around it to compete for the first decision.
  // @req REQ-113
  it("names the searchable entity kinds without legacy entry-point rhetoric", async () => {
    const { container } = await renderHome();

    expect(container.textContent).not.toMatch(/il arrive avec/i);
    expect(container.textContent).not.toMatch(/il repart avec/i);
    expect(container.textContent).not.toMatch(/il arrive sans rien/i);
    expect(
      screen.getByRole("combobox", {
        name: /peuple, un pays ou une famille linguistique/i,
      })
    ).toBeInTheDocument();
  });
});
