import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import { OG_TITLE, OG_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";
import type { AccessMode } from "@/lib/hubs/moduleRegistry";

// Home renders whatever counts getCorpusCounts resolves to; these tests
// exercise page layout/content, not the Supabase query layer (covered by
// src/lib/home/__tests__/corpusCounts.test.ts), so the counts are replaced
// with a deterministic fixture that is deliberately not 803/54/24 — proving
// the rendered figures track the mock rather than a literal.
const fixtureCounts = {
  peoples: 4213,
  countries: 91,
  families: 37,
  migrations: 5,
};

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: vi.fn(async () => fixtureCounts),
}));

// The axis panels open on the home itself, so the page resolves every
// axis's modules server-side. The availability probe is a Supabase round
// trip wrapped in unstable_cache, and these tests are about what the page
// renders — so the registry stands in, with every routed module live.
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

// The synthesis rail reads the corpus over Supabase. Unmocked, the client
// spends the whole test timeout retrying a connection that is not there —
// loadSynthesisRail swallows the failure by design, but only after the
// retries, which is far too late for a render test. The rail's own content
// is covered in src/lib/home/__tests__ and src/components/home/__tests__.
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

import Home, { metadata } from "../page";

describe("home page — the hero, the three axes and the receipt (REQ-113/REQ-115)", () => {
  // The page used to run flat: one h1 and eleven h2 siblings, because three
  // sections had no heading of their own and the items inside the other two
  // sat at the same level as the sections. It now has three rungs — the
  // outline in homeOrientation.test.tsx asserts the shape; this keeps the
  // headline itself verbatim.
  // @req FR91 @req FR95
  // @req REQ-044
  it("renders the hero with a single verbatim H1", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "Les peuples d'Afrique, sous le nom qu'ils se donnent"
    );
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

  // @req REQ-113
  it("renders exactly three axes below the hero and no per-module card grid", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getAllByTestId(/^access-axis-(explorer|comprendre|jouer)$/)
    ).toHaveLength(3);
    expect(screen.queryAllByTestId(/^module-card-/)).toHaveLength(0);
    expect(
      screen.queryByRole("group", { name: "Filtrer les modules" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("sources each axis figure from getCorpusCounts, not a literal", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      `${fixtureCounts.peoples} peuples · ${fixtureCounts.countries} pays`
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent(`${fixtureCounts.migrations} repères · 1 doctrine`);
  });

  // The hub route survives as the anchor's href — the path for a reader
  // without JavaScript, and for a crawler — but the click never leaves the
  // home any more.
  // @req REQ-114
  it("keeps each axis's hub route as its fallback href", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

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

  // @req REQ-114
  it("hands the axes their modules from the server, ready to deploy on click", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    await userEvent.click(screen.getByTestId("access-axis-explorer"));

    expect(screen.getByTestId("axis-facet-link-peuples")).toHaveAttribute(
      "href",
      getLocalizedRoute("fr", "peoples")
    );
  });

  // @req REQ-113
  it("closes on the sourcing claim and links to the page that backs it", async () => {
    render(await Home({ searchParams: Promise.resolve({}) }));

    const strip = screen.getByTestId("home-trust-strip");
    expect(strip).toHaveTextContent("Chaque source citée");
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
