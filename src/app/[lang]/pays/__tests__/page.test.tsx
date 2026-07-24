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
  ConfidenceChip: ({ confidenceScore }: { confidenceScore: number | null }) => (
    <div data-testid="confidence-chip" data-confidence={confidenceScore} />
  ),
}));

vi.mock("@/components/source-transparency/PinnedVersionBanner", () => ({
  PinnedVersionBanner: ({
    pinnedAt,
    versionTag,
    liveUrl,
  }: {
    pinnedAt: string | null;
    versionTag: string;
    liveUrl: string;
  }) => (
    <aside
      data-testid="pinned-version-banner"
      data-pinned-at={pinnedAt ?? ""}
      data-version-tag={versionTag}
      data-live-url={liveUrl}
    />
  ),
}));

import PaysSlugPage from "../[slug]/page";

async function renderPage(slug: string, lang = "fr") {
  const ui = await PaysSlugPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui);
}

describe("/[lang]/pays/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-019
  it("renders the frozen-version banner immediately after the snapshot heading", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "République démocratique du Congo" },
      version: 13,
      published_at: "2026-02-14T11:30:00.000Z",
      confidence: 84,
      doctrine: null,
    });

    await renderPage("COD@v13");

    const headingBlock = screen.getByRole("heading", {
      name: "République démocratique du Congo",
    }).parentElement;
    const banner = screen.getByTestId("pinned-version-banner");

    expect(headingBlock?.nextElementSibling).toBe(banner);
    expect(banner).toHaveAttribute(
      "data-pinned-at",
      "2026-02-14T11:30:00.000Z"
    );
    expect(banner).toHaveAttribute("data-version-tag", "13");
    expect(banner).toHaveAttribute("data-live-url", "/fr/pays/COD");
    expect(screen.getByTestId("confidence-chip")).toHaveAttribute(
      "data-confidence",
      "84"
    );
    expect(
      screen.getByText(/Ce contenu est une capture archivée/)
    ).toBeInTheDocument();
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

  // @req REQ-019
  // @req REQ-025
  it("preserves the live country view without a frozen-version banner", async () => {
    await renderPage("NGA");

    expect(screen.getByTestId("country-detail-live")).toHaveAttribute(
      "data-country-id",
      "NGA"
    );
    expect(screen.queryByTestId("pinned-version-banner")).toBeNull();
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
