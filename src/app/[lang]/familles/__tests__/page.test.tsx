import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetLanguageFamilyById,
  mockGetLatestVersion,
  mockGetRevisionSnapshot,
} = vi.hoisted(() => ({
  mockGetLanguageFamilyById: vi.fn(),
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

vi.mock("@/api/v2/services/languageFamilyService", () => ({
  getLanguageFamilyById: (...args: unknown[]) =>
    mockGetLanguageFamilyById(...args),
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

vi.mock("@/components/family/LanguageFamilyDetailViewV2", () => ({
  LanguageFamilyDetailViewV2: ({ family }: { family: { id: string } }) => (
    <div data-testid="family-detail-v2-live" data-family-id={family.id} />
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
  return render(ui);
}

describe("/[lang]/familles/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-019
  it("renders the frozen-version banner immediately after the snapshot heading", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "Famille bantu" },
      version: 8,
      published_at: "2025-09-03T08:15:00.000Z",
      confidence: 91,
      doctrine: null,
    });

    await renderPage("FLG_BANTU@v8");

    const headingBlock = screen.getByRole("heading", {
      name: "Famille bantu",
    }).parentElement;
    const banner = screen.getByTestId("pinned-version-banner");

    expect(headingBlock?.nextElementSibling).toBe(banner);
    expect(banner).toHaveAttribute(
      "data-pinned-at",
      "2025-09-03T08:15:00.000Z"
    );
    expect(banner).toHaveAttribute("data-version-tag", "8");
    expect(banner).toHaveAttribute("data-live-url", "/fr/familles/FLG_BANTU");
    expect(screen.getByTestId("confidence-chip")).toHaveAttribute(
      "data-confidence",
      "91"
    );
    expect(mockGetLanguageFamilyById).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Ce contenu est une capture archivée/)
    ).toBeInTheDocument();
  });

  // @req REQ-025
  it("renders the doctrine version frozen in a pinned family revision", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "Bantou" },
      version: 7,
      published_at: "2026-06-10T00:00:00Z",
      confidence: 91,
      doctrine: {
        slug: "classifications-contestees",
        version: 42,
      },
    });

    await renderPage("FLG_BANTU@v7");

    expect(mockGetRevisionSnapshot).toHaveBeenCalledWith(
      "language_family",
      "FLG_BANTU",
      7
    );
    expect(
      screen.getByRole("link", { name: "Lire la doctrine" })
    ).toHaveAttribute("href", "/fr/doctrine/classifications-contestees@v42");
  });

  // @req REQ-025
  it("does not render a doctrine card when the pinned revision has no doctrine", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "Bantou" },
      version: 7,
      published_at: null,
      confidence: null,
      doctrine: null,
    });

    await renderPage("FLG_BANTU@v7");

    expect(
      screen.queryByRole("link", { name: "Lire la doctrine" })
    ).not.toBeInTheDocument();
  });

  // @req REQ-019
  // @req REQ-025
  it("renders the V2 live family view without a frozen-version banner", async () => {
    mockGetLanguageFamilyById.mockResolvedValueOnce({
      id: "FLG_BANTU",
      nameFr: "Bantou",
      content: {},
    });

    await renderPage("FLG_BANTU");

    expect(mockGetLanguageFamilyById).toHaveBeenCalledWith("FLG_BANTU");
    expect(screen.getByTestId("family-detail-v2-live")).toHaveAttribute(
      "data-family-id",
      "FLG_BANTU"
    );
    expect(screen.queryByTestId("pinned-version-banner")).toBeNull();
    expect(mockGetRevisionSnapshot).not.toHaveBeenCalled();
  });

  // @req REQ-047
  it("returns not found when a live language family is missing", async () => {
    mockGetLanguageFamilyById.mockResolvedValueOnce(null);

    await expect(
      FamillesSlugPage({
        params: Promise.resolve({ lang: "fr", slug: "FLG_UNKNOWN" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // @req REQ-025
  it("preserves @latest redirects", async () => {
    mockGetLatestVersion.mockResolvedValueOnce(8);

    await expect(
      FamillesSlugPage({
        params: Promise.resolve({ lang: "fr", slug: "FLG_BANTU@latest" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/fr/familles/FLG_BANTU@v8");
  });
});
