import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import React from "react";

import type { LanguageFamily } from "@/types/afrik";
import type { FamilyTreeSkeleton } from "@/api/v2/services/languageFamilyTreeService";

// ---------------------------------------------------------------------------
// Mocks — Supabase-backed services, the legacy detail view and the page chrome.
// The panel sequence itself stays real: it is what this route now delegates to.
// ---------------------------------------------------------------------------

const {
  mockGetLanguageFamilyById,
  mockGetFamilyTreeSkeleton,
  mockGetLatestVersion,
  mockGetRevisionSnapshot,
} = vi.hoisted(() => ({
  mockGetLanguageFamilyById: vi.fn(),
  mockGetFamilyTreeSkeleton: vi.fn(),
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

vi.mock("@/api/v2/services/languageFamilyTreeService", () => ({
  getFamilyTreeSkeleton: (...args: unknown[]) =>
    mockGetFamilyTreeSkeleton(...args),
}));

// The route must read through the v2 services, which own the revision rules;
// a direct client here would mean the page reads around them.
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => {
    throw new Error("Page must not query Supabase directly");
  }),
}));

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

// Stubbed so the reading-gate count below can only come from the route's own
// wiring, never from a <details> buried in the legacy view.
vi.mock("@/components/family/LanguageFamilyDetailViewV2", () => ({
  LanguageFamilyDetailViewV2: ({
    family,
    classificationTree,
  }: {
    family: LanguageFamily;
    classificationTree?: React.ReactNode;
  }) => (
    <div
      data-testid="family-record-view"
      data-family-id={family.id}
      data-carries-content-blob={String(Boolean(family.content))}
    >
      {classificationTree}
    </div>
  ),
}));

vi.mock("@/components/family/FamilyClassificationTreeSection", () => ({
  FamilyClassificationTreeSection: ({
    familyId,
    tree,
  }: {
    familyId: string;
    tree: FamilyTreeSkeleton;
  }) => (
    <div data-testid="family-classification-section" data-family-id={familyId}>
      {tree.branches.map((branch) => branch.name).join(", ")}
    </div>
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

// ---------------------------------------------------------------------------
// Import page AFTER mocks
// ---------------------------------------------------------------------------

import FamillesSlugPage from "../[slug]/page";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BANTU: LanguageFamily = {
  id: "FLG_BANTU",
  nameFr: "Bantou",
  nameEn: "Bantu",
  classificationStatus: "contested",
  associatedPeoples: [{ name: "Shona", peopleId: "PPL_SHONA" }],
  content: {
    generalInfo: {
      branches: ["Bantou étroit"],
      geographicArea: "Afrique centrale et australe",
      numberOfLanguages: 500,
      totalSpeakers: 350_000_000,
    },
    linguisticCharacteristics: { typology: "Agglutinante" },
    historyAndOrigins: { probableOrigin: "Frontière Nigéria-Cameroun" },
    distribution: { totalSpeakers: 350_000_000 },
    sources: ["Glottolog 5.0"],
  },
};

const BANTU_TREE: FamilyTreeSkeleton = {
  family: { id: "FLG_BANTU", nameFr: "Bantou", nameEn: "Bantu" },
  branches: [
    { iso639_3: "sna", name: "Shona", peopleCount: 3 },
    { iso639_3: "swh", name: "Swahili", peopleCount: 7 },
  ],
  unlinkedPeopleCount: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function renderFamillesPage(slug: string, lang = "fr") {
  const ui = await FamillesSlugPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui as React.ReactElement);
}

/** For the paths that never reach a render: notFound() and redirect() throw. */
async function callFamillesPage(slug: string, lang = "fr") {
  return FamillesSlugPage({ params: Promise.resolve({ lang, slug }) });
}

/** Journey anchors FicheSequence stamps on the panels it actually rendered. */
function panelAnchors(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("section[id^='fiche-']")).map(
    (section) => section.id
  );
}

/** ScalePanel reads the reduced-motion preference; TonguePanel fetches branches. */
function stubPanelRuntime() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/[lang]/familles/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubPanelRuntime();
    mockGetLanguageFamilyById.mockResolvedValue(BANTU);
    mockGetFamilyTreeSkeleton.mockResolvedValue(BANTU_TREE);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("live fiche", () => {
    // @req REQ-091
    it("renders the family as a panel sequence, the record chapter included", async () => {
      const { container, getByTestId } = await renderFamillesPage("FLG_BANTU");

      expect(panelAnchors(container)).toEqual([
        "fiche-scale",
        "fiche-tongue",
        "fiche-record",
      ]);
      expect(getByTestId("family-record-view")).toBeInTheDocument();
    });

    // @req REQ-091
    it("gates the record behind exactly one reading gate", async () => {
      const { container } = await renderFamillesPage("FLG_BANTU");

      // Two would mean the route re-wrapped a record the sequence already gates,
      // burying the dossier under a <details> inside a <details>.
      expect(container.querySelectorAll("details")).toHaveLength(1);
    });

    // @req REQ-019
    // @req REQ-025
    it("renders the V2 live family view without a frozen-version banner", async () => {
      const { getByTestId, queryByTestId } =
        await renderFamillesPage("FLG_BANTU");

      expect(mockGetLanguageFamilyById).toHaveBeenCalledWith("FLG_BANTU");
      expect(getByTestId("family-record-view")).toHaveAttribute(
        "data-family-id",
        "FLG_BANTU"
      );
      expect(queryByTestId("pinned-version-banner")).toBeNull();
      expect(mockGetRevisionSnapshot).not.toHaveBeenCalled();
    });

    // @req REQ-047
    it("hands the legacy view the stored family, not the flattened detail", async () => {
      const { getByTestId } = await renderFamillesPage("FLG_BANTU");

      const recordView = getByTestId("family-record-view");
      expect(recordView.dataset.familyId).toBe("FLG_BANTU");
      expect(recordView.dataset.carriesContentBlob).toBe("true");
      expect(getByTestId("family-classification-section")).toBeInTheDocument();
    });

    // @req REQ-047
    it("fetches the tree skeleton server-side and passes a classification section to the live view", async () => {
      const { getByTestId } = await renderFamillesPage("FLG_BANTU");

      expect(mockGetFamilyTreeSkeleton).toHaveBeenCalledWith("FLG_BANTU");
      const classificationSection = getByTestId(
        "family-classification-section"
      );
      expect(classificationSection).toHaveAttribute(
        "data-family-id",
        "FLG_BANTU"
      );
      expect(classificationSection).toHaveTextContent("Shona");
      expect(classificationSection).toHaveTextContent("Swahili");
    });

    // @req REQ-091
    it("opens the tongue chapter from the classification tree already fetched", async () => {
      const { container } = await renderFamillesPage("FLG_BANTU");

      expect(mockGetFamilyTreeSkeleton).toHaveBeenCalledTimes(1);
      const tongue = container.querySelector("#fiche-tongue");
      expect(tongue).not.toBeNull();
      // TonguePanel names each branch twice (tree canvas + text index), so the
      // branch names are counted rather than fetched as unique nodes.
      expect(
        within(tongue as HTMLElement).getAllByText("Shona").length
      ).toBeGreaterThan(0);
      expect(
        within(tongue as HTMLElement).getAllByText("Swahili").length
      ).toBeGreaterThan(0);
    });

    // @req REQ-091
    it("drops the tongue chapter, and nothing else, for a family with no tree", async () => {
      mockGetFamilyTreeSkeleton.mockResolvedValue(null);

      const { container, getByTestId } = await renderFamillesPage("FLG_BANTU");

      expect(container.querySelector("#fiche-tongue")).toBeNull();
      expect(panelAnchors(container)).toEqual(["fiche-scale", "fiche-record"]);
      expect(getByTestId("family-record-view")).toBeInTheDocument();
    });

    // @req REQ-047
    it("returns not found when a live language family is missing", async () => {
      mockGetLanguageFamilyById.mockResolvedValue(null);

      await expect(callFamillesPage("FLG_UNKNOWN")).rejects.toThrow(
        "NEXT_NOT_FOUND"
      );
    });
  });

  describe("versioned URLs", () => {
    // @req REQ-019
    // @req REQ-025
    it("renders the pinned snapshot, banner first and without any panel chapter", async () => {
      mockGetRevisionSnapshot.mockResolvedValueOnce({
        data: { name_fr: "Famille bantu" },
        version: 8,
        published_at: "2025-09-03T08:15:00.000Z",
        confidence: 91,
        doctrine: null,
      });

      const { container, getByRole, getByTestId, getByText } =
        await renderFamillesPage("FLG_BANTU@v8");

      expect(mockGetRevisionSnapshot).toHaveBeenCalledWith(
        "language_family",
        "FLG_BANTU",
        8
      );
      expect(getByTestId("family-snapshot-view")).toBeInTheDocument();

      const headingBlock = getByRole("heading", {
        name: "Famille bantu",
      }).parentElement;
      const banner = getByTestId("pinned-version-banner");

      expect(headingBlock?.nextElementSibling).toBe(banner);
      expect(banner).toHaveAttribute(
        "data-pinned-at",
        "2025-09-03T08:15:00.000Z"
      );
      expect(banner).toHaveAttribute("data-version-tag", "8");
      expect(banner).toHaveAttribute("data-live-url", "/fr/familles/FLG_BANTU");
      expect(getByTestId("confidence-chip")).toHaveAttribute(
        "data-confidence",
        "91"
      );
      expect(
        getByText(/Ce contenu est une capture archivée/)
      ).toBeInTheDocument();

      expect(panelAnchors(container)).toEqual([]);
      expect(mockGetLanguageFamilyById).not.toHaveBeenCalled();
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

      const { getByRole } = await renderFamillesPage("FLG_BANTU@v7");

      expect(mockGetRevisionSnapshot).toHaveBeenCalledWith(
        "language_family",
        "FLG_BANTU",
        7
      );
      expect(getByRole("link", { name: "Lire la doctrine" })).toHaveAttribute(
        "href",
        "/fr/doctrine/classifications-contestees@v42"
      );
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

      const { queryByRole } = await renderFamillesPage("FLG_BANTU@v7");

      expect(
        queryByRole("link", { name: "Lire la doctrine" })
      ).not.toBeInTheDocument();
    });

    // @req REQ-025
    it("redirects @latest to the newest pinned version", async () => {
      mockGetLatestVersion.mockResolvedValueOnce(8);

      await expect(callFamillesPage("FLG_BANTU@latest")).rejects.toThrow(
        "NEXT_REDIRECT:/fr/familles/FLG_BANTU@v8"
      );
      expect(redirect).toHaveBeenCalledWith("/fr/familles/FLG_BANTU@v8");
    });
  });
});
