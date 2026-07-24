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

vi.mock("@/components/detail/LanguageFamilyDetailView", () => ({
  LanguageFamilyDetailView: ({ familyId }: { familyId: string }) => (
    <div data-testid="family-detail-live" data-family-id={familyId} />
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

import FamillesSlugPage from "../[slug]/page";

async function renderPage(slug: string, lang = "fr") {
  const ui = await FamillesSlugPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui as React.ReactElement);
}

describe("/[lang]/familles/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
  });

  // @req REQ-019
  it("renders the frozen-version banner immediately after the snapshot heading", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        version: 8,
        snapshot_jsonb: {
          name_fr: "Famille bantu",
          confidence: 91,
        },
        published_at: "2025-09-03T08:15:00.000Z",
      },
      error: null,
    });

    const { getByRole, getByTestId, getByText } =
      await renderPage("FLG_BANTU@v8");

    const headingBlock = getByRole("heading", {
      name: "Famille bantu",
    }).parentElement;
    const banner = getByTestId("pinned-version-banner");

    expect(headingBlock?.nextElementSibling).toBe(banner);
    expect(banner.getAttribute("data-pinned-at")).toBe(
      "2025-09-03T08:15:00.000Z"
    );
    expect(banner.getAttribute("data-version-tag")).toBe("8");
    expect(banner.getAttribute("data-live-url")).toBe("/fr/familles/FLG_BANTU");
    expect(getByTestId("confidence-chip").getAttribute("data-confidence")).toBe(
      "91"
    );
    expect(
      getByText(/Ce contenu est une capture archivée/)
    ).toBeInTheDocument();
  });

  // @req REQ-019
  it("does not render a frozen-version banner for the live route", async () => {
    const { getByTestId, queryByTestId } = await renderPage("FLG_BANTU");

    expect(
      getByTestId("family-detail-live").getAttribute("data-family-id")
    ).toBe("FLG_BANTU");
    expect(queryByTestId("pinned-version-banner")).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
