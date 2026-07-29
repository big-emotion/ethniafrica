import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import { OG_TITLE, OG_DESCRIPTION } from "@/lib/brand";

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

import Home, { metadata } from "../page";

describe("home page — route integration (FR95)", () => {
  // @req FR91 @req FR95
  // @req REQ-044
  it("renders the HomeHero section with its H1", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Le continent raconté comme une carte vivante"
    );
  });

  // @req FR92 @req FR95
  // @req REQ-044
  it("renders the access-mode hubs below the hero", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Explorer" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Comprendre" })
    ).toBeInTheDocument();
  });

  // @req FR95
  // @req REQ-044
  it("no longer renders the illustrative demo elements dropped from the prototype", () => {
    render(<Home />);

    expect(
      screen.queryByText(/données illustratives/i)
    ).not.toBeInTheDocument();
  });

  // @req FR95
  // @req REQ-044
  it("declares a canonical URL for /fr", () => {
    expect(metadata.alternates?.canonical).toBe("/fr");
  });

  // @req FR95
  // @req REQ-044
  it("declares valid OpenGraph metadata sourced from the brand source of truth", () => {
    expect(metadata.title).toBe(OG_TITLE);
    expect(metadata.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.title).toBe(OG_TITLE);
    expect(metadata.openGraph?.description).toBe(OG_DESCRIPTION);
    expect(metadata.openGraph?.url).toBe("/fr");
  });
});
