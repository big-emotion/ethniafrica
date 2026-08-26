import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
const mockGetPeopleById = vi.fn();
const mockGetActiveSourceFlags = vi.fn();
const mockPinnedVersionBanner = vi.fn();
const mockGetPeopleNamesDossier = vi.fn();
const mockGetPeopleFragmentation = vi.fn();
const mockGetEgoNetwork = vi.fn();
const mockListPublicOralNarratives = vi.fn();

vi.mock("@/api/v2/services/revisions", () => ({
  getPeopleRevisionSnapshot: (...args: unknown[]) => mockGetSnapshot(...args),
  getLatestEntityRevisionVersion: (...args: unknown[]) =>
    mockGetLatestVersion(...args),
}));

vi.mock("@/api/v2/services/peopleService", () => ({
  getPeopleById: (...args: unknown[]) => mockGetPeopleById(...args),
}));

vi.mock("@/lib/supabase/queries/afrik/flags", () => ({
  getActiveSourceFlags: (...args: unknown[]) =>
    mockGetActiveSourceFlags(...args),
}));

vi.mock("@/api/v2/services/names", () => ({
  getPeopleNamesDossier: (...args: unknown[]) =>
    mockGetPeopleNamesDossier(...args),
}));

vi.mock("@/api/v2/services/peopleFragmentation", () => ({
  getPeopleFragmentation: (...args: unknown[]) =>
    mockGetPeopleFragmentation(...args),
}));

vi.mock("@/api/v2/services/relations", () => ({
  getEgoNetwork: (...args: unknown[]) => mockGetEgoNetwork(...args),
}));

vi.mock("@/api/v2/services/oralNarratives", () => ({
  listPublicOralNarratives: (...args: unknown[]) =>
    mockListPublicOralNarratives(...args),
}));

// PageLayout passthrough
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    onLanguageChange,
  }: {
    children: React.ReactNode;
    onLanguageChange?: unknown;
  }) => {
    if (typeof onLanguageChange === "function") {
      throw new Error("Server pages must not pass callbacks to PageLayout");
    }
    return <div data-testid="page-layout">{children}</div>;
  },
}));

// The record view stub. It is fed by the route now rather than fetching its
// own fiche, so what it records is the payload it was handed.
vi.mock("@/components/people/PeopleDetailViewV2", () => ({
  PeopleDetailViewV2: ({
    people,
    hasSourceFlag,
  }: {
    people: { id: string; nameMain: string };
    hasSourceFlag?: boolean;
  }) => (
    <div
      data-testid="people-detail-live"
      data-people-id={people?.id}
      data-people-name={people?.nameMain}
      data-source-flag={hasSourceFlag}
    />
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

vi.mock("@/components/source-transparency/PinnedVersionBanner", () => ({
  PinnedVersionBanner: (props: {
    pinnedAt: string | null;
    versionTag: string;
    liveUrl: string;
    resolvedFlagsCount?: number;
  }) => {
    mockPinnedVersionBanner(props);
    return <aside data-testid="pinned-version-banner" />;
  },
}));

// ---------------------------------------------------------------------------
// Import page AFTER mocks
// ---------------------------------------------------------------------------
import { render } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import PeoplesSlugPage from "../[slug]/page";
import {
  RELATIONS,
  YORUBA_FRAGMENTATION,
  YORUBA_NAMES_DOSSIER,
} from "@/components/fiche/__tests__/ficheContextFixtures";

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

/** ScalePanel reads the reduced-motion preference; VoicesPanel fetches narratives. */
function stubPanelRuntime() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
  );
}

/** Journey anchors FicheSequence stamps on the panels it actually rendered. */
function panelAnchors(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('section[id^="fiche-"]')).map(
    (section) => section.id
  );
}

/**
 * A people whose AFRIK dossier fills every section the composer gates on, so
 * the sequence the route produces is the full people inventory rather than an
 * artefact of a thin fixture.
 */
const YORUBA_LIVE_ROW = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA", "BEN"],
  content: {
    ethnicities: ["Ọ̀yọ́"],
    origins: { ancientOrigins: "Ilé-Ifẹ̀" },
    languages: { mainLanguage: "yoruba", isoCodes: ["yor"] },
    historicalRole: { kingdomsOrChiefdoms: "Ọ̀yọ́" },
    culture: { divinitiesAndSpirits: { supremeDeity: { name: "Olódùmarè" } } },
    demography: {
      totalPopulation: 42_000_000,
      referenceYear: 2025,
      source: "UNFPA, World Population Prospects 2025",
      distributionByCountry: [
        { country: "NGA", population: 29_400_000, percentage: 70 },
        { country: "BEN", population: 12_600_000, percentage: 30 },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("/[lang]/peuples/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPanelRuntime();
    mockGetPeopleById.mockResolvedValue({
      id: "PPL_BAKONGO",
      nameMain: "Bakongo",
      languageFamilyId: "FLG_BANTU",
      currentCountries: ["COD"],
      content: {},
    });
    mockGetActiveSourceFlags.mockResolvedValue([]);
    mockGetPeopleNamesDossier.mockResolvedValue(null);
    mockGetPeopleFragmentation.mockResolvedValue(null);
    mockGetEgoNetwork.mockResolvedValue({ sourced: [], derived: [] });
    mockListPublicOralNarratives.mockResolvedValue({ data: [], total: 0 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 1. Live URL — renders current live data via PeopleDetailView
  // @req REQ-019
  it("live URL: renders PeopleDetailView with the entity id", async () => {
    const { getByTestId, queryByTestId } = await renderPage("PPL_BAKONGO");

    const detail = getByTestId("people-detail-live");
    expect(detail.getAttribute("data-people-id")).toBe("PPL_BAKONGO");
    expect(detail.getAttribute("data-people-name")).toBe("Bakongo");
    expect(mockGetPeopleById).toHaveBeenCalledWith("PPL_BAKONGO");
    expect(mockGetActiveSourceFlags).toHaveBeenCalledWith(
      "people",
      "PPL_BAKONGO"
    );
    expect(queryByTestId("pinned-version-banner")).toBeNull();
    expect(mockPinnedVersionBanner).not.toHaveBeenCalled();
    expect(mockGetSnapshot).not.toHaveBeenCalled();
    expect(mockGetLatestVersion).not.toHaveBeenCalled();
  });

  // 2. Pinned URL — renders snapshot, never queries live row
  // @req REQ-019
  it("pinned URL @v34: renders snapshot view and calls getPeopleRevisionSnapshot", async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      data: { id: "PPL_BAKONGO", nameMain: "Bakongo", confidence: 87 },
      version: 34,
      published_at: "2025-01-15T00:00:00Z",
      confidence: 87,
    });

    const { getByRole, getByTestId, getByText, queryByTestId } =
      await renderPage("PPL_BAKONGO@v34");

    // snapshot path was taken
    expect(mockGetSnapshot).toHaveBeenCalledWith("PPL_BAKONGO", 34);
    // snapshot view is present, live detail is absent
    expect(getByTestId("people-snapshot-view")).toBeTruthy();
    expect(queryByTestId("people-detail-live")).toBeNull();

    expect(mockPinnedVersionBanner).toHaveBeenCalledWith({
      pinnedAt: "2025-01-15T00:00:00Z",
      versionTag: "34",
      liveUrl: "/fr/peuples/PPL_BAKONGO",
    });

    const heading = getByRole("heading", { level: 1, name: "Bakongo" });
    const entityId = getByText("PPL_BAKONGO");
    const banner = getByTestId("pinned-version-banner");
    const headingBlock = heading.parentElement;

    expect(headingBlock).not.toBeNull();
    expect(headingBlock).toContainElement(entityId);
    expect(headingBlock?.nextElementSibling).toBe(banner);
  });

  // 3. @latest redirect
  // @req REQ-019
  it("@latest: redirects to the pinned URL for the max version", async () => {
    mockGetLatestVersion.mockResolvedValueOnce(5);

    await expect(callPage("PPL_BAKONGO@latest")).rejects.toThrow(
      "NEXT_REDIRECT:/fr/peuples/PPL_BAKONGO@v5"
    );
    expect(redirect).toHaveBeenCalledWith("/fr/peuples/PPL_BAKONGO@v5");
  });

  // 4. @latest with no revisions → 404
  // @req REQ-019
  it("@latest with no revisions: calls notFound()", async () => {
    mockGetLatestVersion.mockResolvedValueOnce(null);

    await expect(callPage("PPL_BAKONGO@latest")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  // 5. Pinned URL version not found → 404
  // @req REQ-019
  it("pinned URL non-existent version: calls notFound()", async () => {
    mockGetSnapshot.mockResolvedValueOnce(null);

    await expect(callPage("PPL_BAKONGO@v999")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
    expect(mockGetSnapshot).toHaveBeenCalledWith("PPL_BAKONGO", 999);
  });

  // 6. Invalid suffix @V34 (uppercase V) → 404
  // @req REQ-019
  it("invalid suffix @V34 (uppercase V): calls notFound()", async () => {
    await expect(callPage("PPL_BAKONGO@V34")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(mockGetSnapshot).not.toHaveBeenCalled();
  });

  // 7. Invalid suffix @v34.1 (decimal) → 404
  // @req REQ-019
  it("invalid suffix @v34.1 (decimal): calls notFound()", async () => {
    await expect(callPage("PPL_BAKONGO@v34.1")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });

  // 8. Snapshot-vs-live divergence: pinned snapshot shows frozen confidence
  // @req REQ-019
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

  // @req REQ-025
  it("pinned URL renders the doctrine card with the frozen doctrine version", async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      data: { id: "PPL_BAKONGO", nameMain: "Bakongo" },
      version: 34,
      published_at: "2025-01-15T00:00:00Z",
      confidence: 87,
      doctrine: {
        slug: "classifications-contestees",
        version: 42,
      },
    });

    const { getByRole } = await renderPage("PPL_BAKONGO@v34");

    expect(getByRole("link", { name: "Lire la doctrine" })).toHaveAttribute(
      "href",
      "/fr/doctrine/classifications-contestees@v42"
    );
  });

  // @req REQ-025
  it("pinned URL without doctrine metadata renders no doctrine card", async () => {
    mockGetSnapshot.mockResolvedValueOnce({
      data: { id: "PPL_BAKONGO", nameMain: "Bakongo" },
      version: 34,
      published_at: "2025-01-15T00:00:00Z",
      confidence: 87,
      doctrine: null,
    });

    const { queryByRole } = await renderPage("PPL_BAKONGO@v34");

    expect(
      queryByRole("link", { name: "Lire la doctrine" })
    ).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Fiche panel sequence (ETNI-928)
  // -------------------------------------------------------------------------
  describe("panel sequence", () => {
    beforeEach(() => {
      mockGetPeopleById.mockResolvedValue(YORUBA_LIVE_ROW);
      mockGetPeopleNamesDossier.mockResolvedValue(YORUBA_NAMES_DOSSIER);
      mockGetPeopleFragmentation.mockResolvedValue(YORUBA_FRAGMENTATION);
      mockGetEgoNetwork.mockResolvedValue({ sourced: RELATIONS, derived: [] });
      mockListPublicOralNarratives.mockResolvedValue({ data: [], total: 3 });
    });

    // @req REQ-091
    it("live URL: renders the composed chapters, with the detail view as the record", async () => {
      const { container, getByTestId } = await renderPage("PPL_YORUBA");

      expect(panelAnchors(container)).toEqual([
        "fiche-identity",
        "fiche-scale",
        "fiche-territory",
        "fiche-fragmentation",
        "fiche-links",
        "fiche-voices",
        "fiche-record",
      ]);

      const detail = getByTestId("people-detail-live");
      expect(detail.getAttribute("data-people-id")).toBe("PPL_YORUBA");
      expect(container.querySelector("#fiche-record")).toContainElement(detail);
    });

    // @req REQ-091
    it("live URL: side-loads every panel corpus for the requested people", async () => {
      await renderPage("PPL_YORUBA");

      expect(mockGetPeopleNamesDossier).toHaveBeenCalledWith("PPL_YORUBA");
      expect(mockGetPeopleFragmentation).toHaveBeenCalledWith("PPL_YORUBA");
      expect(mockGetEgoNetwork).toHaveBeenCalledWith("PPL_YORUBA");
    });

    // @req REQ-091
    it("live URL: still renders when the names and fragmentation corpora are empty", async () => {
      mockGetPeopleNamesDossier.mockRejectedValue(
        new Error("PeopleNamesNotFoundError: PPL_YORUBA")
      );
      mockGetPeopleFragmentation.mockRejectedValue(
        new Error("PeopleFragmentationNotFoundError: PPL_YORUBA")
      );

      const { container, getByTestId } = await renderPage("PPL_YORUBA");

      expect(panelAnchors(container)).toEqual([
        "fiche-scale",
        "fiche-territory",
        "fiche-links",
        "fiche-voices",
        "fiche-record",
      ]);
      expect(getByTestId("people-detail-live")).toBeInTheDocument();
    });

    // @req REQ-095
    it("live URL: drops the voices chapter for a people with no published narrative", async () => {
      // The count is settled server-side precisely so the chapter can be
      // dropped before its anchor is written — VoicesPanel's own fetch only
      // reports emptiness after hydration, too late to unstamp an anchor.
      mockListPublicOralNarratives.mockResolvedValue({ data: [], total: 0 });

      const { container } = await renderPage("PPL_YORUBA");

      expect(panelAnchors(container)).not.toContain("fiche-voices");
      expect(panelAnchors(container)).toContain("fiche-record");
    });

    // @req REQ-091
    it("live URL: an empty corpus drops its own chapter and no other", async () => {
      mockGetPeopleNamesDossier.mockRejectedValue(
        new Error("PeopleNamesNotFoundError: PPL_YORUBA")
      );

      const { container } = await renderPage("PPL_YORUBA");

      expect(panelAnchors(container)).not.toContain("fiche-identity");
      expect(panelAnchors(container)).toContain("fiche-fragmentation");
      expect(panelAnchors(container)).toContain("fiche-links");
    });

    // @req REQ-091
    it("pinned URL @v34: renders the snapshot alone, with no panel and no live query", async () => {
      mockGetSnapshot.mockResolvedValueOnce({
        data: { id: "PPL_YORUBA", nameMain: "Yoruba" },
        version: 34,
        published_at: "2025-01-15T00:00:00Z",
        confidence: 87,
      });

      const { container, getByTestId } = await renderPage("PPL_YORUBA@v34");

      expect(getByTestId("people-snapshot-view")).toBeInTheDocument();
      expect(panelAnchors(container)).toEqual([]);
      expect(mockGetPeopleNamesDossier).not.toHaveBeenCalled();
      expect(mockGetPeopleFragmentation).not.toHaveBeenCalled();
      expect(mockGetEgoNetwork).not.toHaveBeenCalled();
    });

    // @req REQ-091
    it("@latest: still redirects, without touching any panel corpus", async () => {
      mockGetLatestVersion.mockResolvedValueOnce(5);

      await expect(callPage("PPL_YORUBA@latest")).rejects.toThrow(
        "NEXT_REDIRECT:/fr/peuples/PPL_YORUBA@v5"
      );
      expect(mockGetPeopleNamesDossier).not.toHaveBeenCalled();
      expect(mockGetPeopleFragmentation).not.toHaveBeenCalled();
      expect(mockGetEgoNetwork).not.toHaveBeenCalled();
    });
  });
});
