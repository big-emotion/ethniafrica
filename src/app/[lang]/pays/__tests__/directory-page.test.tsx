import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/fr/pays` — the country directory.
 *
 * The directory used to open a detail pane of its own, with no globe, and that
 * pane is what a reader comparing the page to its mockup was looking at. The
 * directory is a list now, and the pane's `?country=` links are answered with a
 * redirect to the fiche rather than being rendered a second time.
 */

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
}));

vi.mock("@/components/pages/PaysPageContentV2", () => ({
  PaysPageContentV2: () => <div data-testid="pays-directory" />,
}));

import PaysDirectoryPage from "../page";

/** The route signature Next 16 hands a page: both bags arrive as promises. */
function renderRoute(searchParams: Record<string, string | string[]>) {
  return PaysDirectoryPage({
    params: Promise.resolve({ lang: "fr" }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("/fr/pays — country directory", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
  });

  // @req REQ-091
  it("sends a ?country= deep link to that country's fiche", async () => {
    await expect(renderRoute({ country: "NGA" })).rejects.toThrow(
      "NEXT_REDIRECT:/fr/pays/NGA"
    );
    expect(mockPermanentRedirect).toHaveBeenCalledWith("/fr/pays/NGA");
  });

  // A 308 rather than a 307: the query form is retired, not merely moved, so a
  // crawler should transfer the standing it had gathered.
  // @req REQ-091
  it("redirects permanently, never temporarily", async () => {
    await expect(renderRoute({ country: "SEN" })).rejects.toThrow(
      "NEXT_REDIRECT:/fr/pays/SEN"
    );
  });

  // @req REQ-091
  it("renders the list when no country is named", async () => {
    render(await renderRoute({}));

    expect(screen.getByTestId("pays-directory")).toBeInTheDocument();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("renders the list rather than guessing when the query is repeated", async () => {
    render(await renderRoute({ country: ["NGA", "KEN"] }));

    expect(screen.getByTestId("pays-directory")).toBeInTheDocument();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });
});
