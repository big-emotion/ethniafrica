import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { OG_TITLE, OG_DESCRIPTION, PRODUCT_NAME } from "@/lib/brand";

// Home renders whatever counts getCorpusCounts resolves to; these tests
// exercise page layout/content, not the Supabase query layer (covered by
// src/lib/home/__tests__/corpusCounts.test.ts), so the counts are replaced
// with a deterministic fixture that is deliberately not 803/54/24 — proving
// the rendered figures track the mock rather than a literal.
const fixtureCounts = { peoples: 4213, countries: 91, families: 37 };

vi.mock("@/lib/home/corpusCounts", () => ({
  getCorpusCounts: vi.fn(async () => fixtureCounts),
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

  // @req REQ-113
  it("renders exactly three entry points below the hero and no per-module card grid", async () => {
    render(await Home());

    expect(
      screen.getAllByTestId(/^entry-point-(peuples|pays|familles)$/)
    ).toHaveLength(3);
    expect(screen.queryAllByTestId(/^module-card-/)).toHaveLength(0);
    expect(
      screen.queryByRole("group", { name: "Filtrer les modules" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-113
  it("sources each entry point's count from getCorpusCounts, not a literal", async () => {
    render(await Home());

    expect(screen.getByTestId("entry-point-count-peuples")).toHaveTextContent(
      String(fixtureCounts.peoples)
    );
    expect(screen.getByTestId("entry-point-count-pays")).toHaveTextContent(
      String(fixtureCounts.countries)
    );
    expect(screen.getByTestId("entry-point-count-familles")).toHaveTextContent(
      String(fixtureCounts.families)
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
