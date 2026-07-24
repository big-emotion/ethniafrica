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

vi.mock("@/components/detail/LanguageFamilyDetailView", () => ({
  LanguageFamilyDetailView: ({ familyId }: { familyId: string }) => (
    <div data-testid="family-detail-live" data-family-id={familyId} />
  ),
}));

vi.mock("@/components/source-transparency/ConfidenceChip", () => ({
  ConfidenceChip: () => <div data-testid="confidence-chip" />,
}));

import FamillesSlugPage from "../[slug]/page";

async function renderPage(slug: string) {
  const ui = await FamillesSlugPage({
    params: Promise.resolve({ lang: "fr", slug }),
  });
  return render(ui);
}

describe("/[lang]/familles/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  // @req REQ-025
  it("preserves the live family view", async () => {
    await renderPage("FLG_BANTU");

    expect(screen.getByTestId("family-detail-live")).toHaveAttribute(
      "data-family-id",
      "FLG_BANTU"
    );
    expect(mockGetRevisionSnapshot).not.toHaveBeenCalled();
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
