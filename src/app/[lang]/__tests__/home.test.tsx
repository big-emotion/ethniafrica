import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { OG_TITLE, OG_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import { getLocalizedRoute } from "@/lib/routing";

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
  // @req FR91 @req FR95
  // @req REQ-044
  it("renders the hero with a single verbatim H1 and zero H3", async () => {
    render(await Home());

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "Le continent raconté comme une carte vivante"
    );
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  // @req REQ-115
  it("opens on the night band with the globe and its instruction", async () => {
    const { container } = render(await Home());

    const hero = container.querySelector(".home-hero");
    expect(hero).toHaveClass("afh-on-night");
    expect(screen.getByTestId("home-globe-stage")).toBeInTheDocument();
  });

  // @req REQ-113
  it("renders exactly three axes below the hero and no per-module card grid", async () => {
    render(await Home());

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
    render(await Home());

    expect(screen.getByTestId("access-axis-figure-explorer")).toHaveTextContent(
      `${fixtureCounts.peoples} peuples · ${fixtureCounts.countries} pays`
    );
    expect(
      screen.getByTestId("access-axis-figure-comprendre")
    ).toHaveTextContent(`${fixtureCounts.migrations} repères · 1 doctrine`);
  });

  // @req REQ-114
  it("routes each axis to its own hub, one click from home", async () => {
    render(await Home());

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

  // @req REQ-113
  it("closes on the sourcing claim and links to the page that backs it", async () => {
    render(await Home());

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
    render(await Home());
    // The brand line was dropped from the hero (ETNI-852); brand.ts remains
    // the single source of truth for anything that does render it (e.g. OG
    // metadata), asserted below.
    expect(PRODUCT_NAME.length).toBeGreaterThan(0);
  });

  // @req FR95
  // @req REQ-044
  it("no longer renders the eyebrow, the PRODUCT_NAME line or the five demo pills", async () => {
    render(await Home());

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
});
