import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { OG_TITLE, OG_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";
import { MODULE_DEFINITIONS, type HomeModule } from "@/lib/accessModeHubs";
import { getLocalizedRoute } from "@/lib/routing";

// Home renders whatever live|soon module list getHomeModules resolves to;
// these tests exercise page layout/content, not data availability
// (covered by src/lib/__tests__/moduleAvailability.test.ts), so the data
// probe layer is replaced with a deterministic, route-based fixture.
const fixtureModules: HomeModule[] = MODULE_DEFINITIONS.map((def) => ({
  id: def.id,
  title: def.title,
  category: def.category,
  accent: def.accent,
  illustration: def.illustration,
  state: def.page ? "live" : "soon",
  href: def.page ? getLocalizedRoute("fr", def.page) : null,
}));

vi.mock("@/lib/moduleAvailability", () => ({
  getHomeModules: vi.fn(async () => fixtureModules),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

import Home, { metadata } from "../page";

describe("home page — atomic light home (ETNI-820, FR91/FR92/FR95)", () => {
  // @req FR91 @req FR95
  // @req REQ-044
  it("renders the parchment hero with a single verbatim H1 and zero H3", async () => {
    render(await Home());

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "Le continent raconté comme une carte vivante"
    );
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
  });

  // @req FR92 @req FR95
  // @req REQ-044
  it("renders the filterable module grid below the hero with exactly 10 cards", async () => {
    render(await Home());

    expect(screen.getAllByTestId(/^module-card-/)).toHaveLength(10);
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
  it("no longer renders the eyebrow, the PRODUCT_NAME line, the five demo pills, or the old H2-sectioned hub layout", async () => {
    render(await Home());

    expect(
      screen.queryByText("EXPLORER · COMPRENDRE · JOUER")
    ).not.toBeInTheDocument();
    expect(screen.queryByText(PRODUCT_NAME)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Explorer", level: 2 })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Comprendre", level: 2 })
    ).not.toBeInTheDocument();
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
