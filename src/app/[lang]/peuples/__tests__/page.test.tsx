import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const mockGetSnapshot = vi.fn();
const mockGetLatestVersion = vi.fn();

vi.mock("@/api/v2/services/revisions", () => ({
  getPeopleRevisionSnapshot: (...args: unknown[]) => mockGetSnapshot(...args),
  getLatestEntityRevisionVersion: (...args: unknown[]) =>
    mockGetLatestVersion(...args),
}));

// PageLayout passthrough
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

// PeopleDetailView stub — records the peopleId it received
vi.mock("@/components/detail/PeopleDetailView", () => ({
  PeopleDetailView: ({ peopleId }: { peopleId: string }) => (
    <div data-testid="people-detail-live" data-people-id={peopleId} />
  ),
}));

// ConfidenceChip stub — exposes the confidence score
vi.mock("@/components/source-transparency/ConfidenceChip", () => ({
  ConfidenceChip: ({ confidenceScore }: { confidenceScore: number | null }) => (
    <div data-testid="confidence-chip" data-confidence={confidenceScore} />
  ),
  default: ({ confidenceScore }: { confidenceScore: number | null }) => (
    <div data-testid="confidence-chip" data-confidence={confidenceScore} />
  ),
}));

// ---------------------------------------------------------------------------
// Import page AFTER mocks
// ---------------------------------------------------------------------------
import { render } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import PeoplesSlugPage from "../[slug]/page";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function renderPage(slug: string, lang = "fr") {
  const ui = await PeoplesSlugPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui as React.ReactElement);
}

async function callPage(slug: string, lang = "fr") {
  return PeoplesSlugPage({ params: Promise.resolve({ lang, slug }) });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("/[lang]/peuples/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Live URL — renders current live data via PeopleDetailView
  it("live URL: renders PeopleDetailView with the entity id", async () => {
    const { getByTestId } = await renderPage("PPL_BAKONGO");

    const detail = getByTestId("people-detail-live");
    expect(detail.getAttribute("data-people-id")).toBe("PPL_BAKONGO");
    expect(mockGetSnapshot).not.toHaveBeenCalled();
    expect(mockGetLatestVersion).not.toHaveBeenCalled();
  });

  // 2. Pinned URL — renders snapshot, never queries live row
  it("pinned URL @v34: renders snapshot view and calls getPeopleRevisionSnapshot", async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      data: { id: "PPL_BAKONGO", nameMain: "Bakongo", confidence: 87 },
      version: 34,
      published_at: "2025-01-15T00:00:00Z",
      confidence: 87,
    });

    const { getByTestId, queryByTestId } = await renderPage("PPL_BAKONGO@v34");

    // snapshot path was taken
    expect(mockGetSnapshot).toHaveBeenCalledWith("PPL_BAKONGO", 34);
    // snapshot view is present, live detail is absent
    expect(getByTestId("people-snapshot-view")).toBeTruthy();
    expect(queryByTestId("people-detail-live")).toBeNull();
  });

  // 3. @latest redirect
  it("@latest: redirects to the pinned URL for the max version", async () => {
    mockGetLatestVersion.mockResolvedValueOnce(5);

    await expect(callPage("PPL_BAKONGO@latest")).rejects.toThrow(
      "NEXT_REDIRECT:/fr/peuples/PPL_BAKONGO@v5"
    );
    expect(redirect).toHaveBeenCalledWith("/fr/peuples/PPL_BAKONGO@v5");
  });

  // 4. @latest with no revisions → 404
  it("@latest with no revisions: calls notFound()", async () => {
    mockGetLatestVersion.mockResolvedValueOnce(null);

    await expect(callPage("PPL_BAKONGO@latest")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  // 5. Pinned URL version not found → 404
  it("pinned URL non-existent version: calls notFound()", async () => {
    mockGetSnapshot.mockResolvedValueOnce(null);

    await expect(callPage("PPL_BAKONGO@v999")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
    expect(mockGetSnapshot).toHaveBeenCalledWith("PPL_BAKONGO", 999);
  });

  // 6. Invalid suffix @V34 (uppercase V) → 404
  it("invalid suffix @V34 (uppercase V): calls notFound()", async () => {
    await expect(callPage("PPL_BAKONGO@V34")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(mockGetSnapshot).not.toHaveBeenCalled();
  });

  // 7. Invalid suffix @v34.1 (decimal) → 404
  it("invalid suffix @v34.1 (decimal): calls notFound()", async () => {
    await expect(callPage("PPL_BAKONGO@v34.1")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  // 8. Snapshot-vs-live divergence: pinned snapshot shows frozen confidence
  it("snapshot-vs-live divergence: ConfidenceChip shows confidence from snapshot, not live", async () => {
    const frozenConfidence = 72;
    mockGetSnapshot.mockResolvedValueOnce({
      data: {
        id: "PPL_BAKONGO",
        nameMain: "Bakongo",
        confidence: frozenConfidence,
      },
      version: 10,
      published_at: "2024-06-01T00:00:00Z",
      confidence: frozenConfidence,
    });

    const { getByTestId } = await renderPage("PPL_BAKONGO@v10");

    const chip = getByTestId("confidence-chip");
    expect(chip.getAttribute("data-confidence")).toBe(String(frozenConfidence));
    // live component was not rendered
    expect(mockGetSnapshot).toHaveBeenCalledWith("PPL_BAKONGO", 10);
  });
});
