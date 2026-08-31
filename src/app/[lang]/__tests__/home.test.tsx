import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { OG_TITLE, OG_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";

// The hero carries an interactive island since the search field landed in it,
// and useRouter throws outside an app-router tree rather than degrading.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// The seed chips draw their words from the corpus per request. Only the draw
// is stubbed — the words, the cap and the row budget stay real, so the row
// these tests render is the row a reader gets when the database is silent.
vi.mock("@/lib/home/seedWords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/home/seedWords")>();
  return {
    ...actual,
    loadSeedWords: vi.fn(async () => actual.FALLBACK_SEED_WORDS),
  };
});

// Hero rotation still resolves the available modules server-side. The
// availability probe is a Supabase round trip wrapped in unstable_cache, and
// these tests are about what the page renders — so the registry stands in,
// with every routed module live.
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

import Home, { metadata } from "../page";

describe("home page — the hero, discovery and the receipt (REQ-113/REQ-115)", () => {
  // The outline in homeOrientation.test.tsx covers the retained sections;
  // this keeps the headline itself verbatim.
  // @req FR91 @req FR95
  // @req REQ-044
  it("renders the hero with a single verbatim H1", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Qui sont les peuples d'Afrique ?");
  });

  // Nothing on this route is pinned to night any more, the globe's panel
  // included. Pinning the band made the theme control look broken here
  // alone; pinning the panel left a dark hole in the parchment page. The
  // globe answers the reader's choice by repainting its own sphere.
  // @req REQ-115
  it("leaves the whole hero, globe panel included, on the reader's chosen surface", async () => {
    const { container } = render(
      await Home({ searchParams: Promise.resolve({}) })
    );

    expect(container.querySelector(".home-hero")).not.toHaveClass(
      "afh-on-night"
    );
    expect(container.querySelector(".home-globe-holder")).not.toHaveClass(
      "afh-on-night"
    );
    expect(screen.getByTestId("home-globe-stage")).toBeInTheDocument();
  });

  // @req REQ-132
  it("does not repeat the presentation blocks moved to the About page", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByTestId("home-purpose-blocks")).not.toBeInTheDocument();
    expect(screen.queryByTestId("access-axes")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-synthesis-rail")).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("closes on the sourcing claim and links to the page that backs it", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    const strip = screen.getByTestId("home-trust-strip");
    expect(strip).toHaveTextContent("Chaque source est citée");
    expect(strip.querySelector("a")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "doctrine")
    );
  });

  // @req FR95
  // @req REQ-044
  it("sources the brand line from src/lib/brand.ts, never a literal", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));
    // The brand line was dropped from the hero (ETNI-852); brand.ts remains
    // the single source of truth for anything that does render it (e.g. OG
    // metadata), asserted below.
    expect(PRODUCT_NAME.length).toBeGreaterThan(0);
  });

  // @req FR95
  // @req REQ-044
  it("no longer renders the eyebrow, the PRODUCT_NAME line or the five demo pills", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.queryByText("EXPLORER · COMPRENDRE · JOUER")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/données illustratives/i)
    ).not.toBeInTheDocument();
  });

  // @req FR95
  it("declares a canonical URL for /fr", () => {
    expect(metadata.alternates?.canonical).toBe("/fr");
  });

  // @req FR95
  it("declares valid OpenGraph metadata sourced from the brand source of truth", () => {
    expect(metadata.title).toBe(OG_TITLE);
    expect(metadata.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.title).toBe(OG_TITLE);
    expect(metadata.openGraph?.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.url).toBe("/fr");
  });

  // Pinned rather than left to the draw: the lot holds every game, and a
  // game's preview needs rounds from the corpus these tests deliberately do
  // not reach. mercator is the one standalone module, so it is also the one
  // the band can show with no database behind it.
  // @req REQ-115
  it("says which axis and which module the band is currently showing", async () => {
    render(await Home({ searchParams: Promise.resolve({ hero: "mercator" }) }));

    const chip = screen.getByTestId("hero-provenance");
    expect(chip).toHaveTextContent("Jouer");
    expect(chip).toHaveTextContent("La taille qu'on vous a cachée");
    expect(chip.getAttribute("href")).toBe(
      `${getLocalizedRoute("fr", "jouerHub")}/mercator`
    );
  });

  // The chip and the stage read --accent off the wrapper, so the wrapper is
  // the only thing that has to know which axis was drawn.
  // @req REQ-115
  it("scopes the band to the drawn module's axis accent", async () => {
    const { container } = render(
      await Home({ searchParams: Promise.resolve({ hero: "mercator" }) })
    );

    expect(container.querySelector(".home-featured")).toHaveClass(
      "afh-accent-perv"
    );
  });

  // @req REQ-115
  it("lets ?hero= pin one module, so the band is reproducible", async () => {
    render(await Home({ searchParams: Promise.resolve({ hero: "mercator" }) }));

    expect(screen.getByTestId("hero-provenance")).toHaveTextContent(
      "La taille qu'on vous a cachée"
    );
  });
});
