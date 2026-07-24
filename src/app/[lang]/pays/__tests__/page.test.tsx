import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetLatestVersion, mockGetRevisionSnapshot } = vi.hoisted(() => ({
  mockGetLatestVersion: vi.fn(),
  mockGetRevisionSnapshot: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/api/v2/services/revisions", () => ({
  getLatestEntityRevisionVersion: (...args: unknown[]) =>
    mockGetLatestVersion(...args),
  getRevisionSnapshot: (...args: unknown[]) => mockGetRevisionSnapshot(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => {
    throw new Error("Page must not query Supabase directly");
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

vi.mock("@/components/detail/CountryDetailViewV2", () => ({
  CountryDetailViewV2: ({ countryId }: { countryId: string }) => (
    <div data-testid="country-detail-live" data-country-id={countryId} />
  ),
}));

vi.mock("@/components/source-transparency/ConfidenceChip", () => ({
  ConfidenceChip: () => <div data-testid="confidence-chip" />,
}));

import PaysSlugPage from "../[slug]/page";

async function renderPage(slug: string) {
  const ui = await PaysSlugPage({
    params: Promise.resolve({ lang: "fr", slug }),
  });
  return render(ui);
}

describe("/[lang]/pays/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-025
  it("renders the doctrine version frozen in a pinned country revision", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "Nigeria" },
      version: 12,
      published_at: "2026-06-10T00:00:00Z",
      confidence: 88,
      doctrine: {
        slug: "classifications-contestees",
        version: 42,
      },
    });

    await renderPage("NGA@v12");

    expect(mockGetRevisionSnapshot).toHaveBeenCalledWith("country", "NGA", 12);
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute("href", "/fr/doctrine/classifications-contestees@v42");
  });

  // @req REQ-025
  it("does not render a doctrine card when the pinned revision has no doctrine", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "Nigeria" },
      version: 12,
      published_at: null,
      confidence: null,
      doctrine: null,
    });

    await renderPage("NGA@v12");

    expect(
      screen.queryByRole("link", { name: "Lire la doctrine" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-025
  it("preserves the live country view", async () => {
    await renderPage("NGA");

    expect(screen.getByTestId("country-detail-live")).toHaveAttribute(
      "data-country-id",
      "NGA"
    );
    expect(mockGetRevisionSnapshot).not.toHaveBeenCalled();
  });

  // @req REQ-025
  it("preserves @latest redirects", async () => {
    mockGetLatestVersion.mockResolvedValueOnce(13);

    await expect(
      PaysSlugPage({
        params: Promise.resolve({ lang: "fr", slug: "NGA@latest" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/fr/pays/NGA@v13");
  });
});
