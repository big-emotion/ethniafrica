import { render } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const mockGetLatestVersion = vi.fn();

vi.mock("@/api/v2/services/revisions", () => ({
  getLatestEntityRevisionVersion: (...args: unknown[]) =>
    mockGetLatestVersion(...args),
}));

const mockMaybeSingle = vi.fn();
const mockQuery = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: mockMaybeSingle,
};
mockQuery.select.mockReturnValue(mockQuery);
mockQuery.eq.mockReturnValue(mockQuery);

const mockFrom = vi.fn(() => mockQuery);

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: mockFrom }),
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
  return render(ui as React.ReactElement);
}

describe("/[lang]/pays/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
  });

  // @req REQ-019
  it("renders the frozen-version banner immediately after the snapshot heading", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        version: 13,
        snapshot_jsonb: {
          name_fr: "République démocratique du Congo",
          confidence: 84,
        },
        published_at: "2026-02-14T11:30:00.000Z",
      },
      error: null,
    });

    const { getByRole, getByTestId, getByText } = await renderPage("COD@v13");

    const headingBlock = getByRole("heading", {
      name: "République démocratique du Congo",
    }).parentElement;
    const banner = getByTestId("pinned-version-banner");

    expect(headingBlock?.nextElementSibling).toBe(banner);
    expect(banner.getAttribute("data-pinned-at")).toBe(
      "2026-02-14T11:30:00.000Z"
    );
    expect(banner.getAttribute("data-version-tag")).toBe("13");
    expect(banner.getAttribute("data-live-url")).toBe("/fr/pays/COD");
    expect(getByTestId("confidence-chip").getAttribute("data-confidence")).toBe(
      "84"
    );
    expect(
      getByText(/Ce contenu est une capture archivée/)
    ).toBeInTheDocument();
  });

  // @req REQ-019
  it("does not render a frozen-version banner for the live route", async () => {
    const { getByTestId, queryByTestId } = await renderPage("COD");

    expect(
      getByTestId("country-detail-live").getAttribute("data-country-id")
    ).toBe("COD");
    expect(queryByTestId("pinned-version-banner")).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
