import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCountryById,
  mockGetLatestVersion,
  mockGetRevisionSnapshot,
  mockGetActiveSourceFlags,
} = vi.hoisted(() => ({
  mockGetCountryById: vi.fn(),
  mockGetLatestVersion: vi.fn(),
  mockGetRevisionSnapshot: vi.fn(),
  mockGetActiveSourceFlags: vi.fn(),
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

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryById: (...args: unknown[]) => mockGetCountryById(...args),
}));

vi.mock("@/lib/supabase/queries/afrik/flags", () => ({
  getActiveSourceFlags: (...args: unknown[]) =>
    mockGetActiveSourceFlags(...args),
}));

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

vi.mock("@/components/detail/CountryDetailViewV2", () => ({
  CountryDetailViewV2: ({
    countryId,
    initialData,
    initialSourceFlag,
    fromPeopleName,
    fromPeopleId,
  }: {
    countryId: string;
    initialData?: { nameFr: string };
    initialSourceFlag?: boolean;
    fromPeopleName?: string;
    fromPeopleId?: string;
  }) => (
    <div
      data-testid="country-detail-live"
      data-country-id={countryId}
      data-country-name={initialData?.nameFr}
      data-source-flag={initialSourceFlag}
      data-from-people-name={fromPeopleName}
      data-from-people-id={fromPeopleId}
    />
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
import { derivePanelSequence } from "@/lib/fichePanels";
import { mapCountryDetail } from "@/lib/afrikDetailMapper";

/**
 * A country row carrying every content section `derivePanelSequence` gates on,
 * so the composer yields the full country inventory and the assertions below
 * isolate what the panel registry itself declines to render.
 */
const NIGERIA_ROW = {
  id: "NGA",
  nameFr: "Nigéria",
  nameOfficial: "République fédérale du Nigéria",
  content: {
    historicalNames: { precolonial: "Oyo, Bénin, Kanem-Bornou" },
    majorPeoples: [{ name: "Yoruba" }],
    historicalFacts: { colonization: "Protectorat britannique" },
    culture: { dominantReligions: "Islam, christianisme" },
    demographics: {
      peoples: [{ name: "Yoruba", population: 38_000_000 }],
    },
    sources: ["CIA World Factbook, 2025"],
  },
};

/** ScalePanel reads the reduced-motion preference before it animates. */
function stubReducedMotion() {
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
}

function renderedAnchors(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("section[id^='fiche-']")).map(
    (section) => section.id
  );
}

async function renderPage(
  slug: string,
  lang = "fr",
  navigationContext?: { fromPeopleName?: string; fromPeopleId?: string }
) {
  const ui = await PaysSlugPage({
    params: Promise.resolve({ lang, slug }),
    searchParams: navigationContext
      ? Promise.resolve(navigationContext)
      : undefined,
  });
  return render(ui);
}

describe("/[lang]/pays/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubReducedMotion();
    mockGetCountryById.mockResolvedValue(NIGERIA_ROW);
    mockGetActiveSourceFlags.mockResolvedValue([]);
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
    expect(screen.getByTestId("country-detail-live")).toHaveAttribute(
      "data-country-name",
      "Nigéria"
    );
    expect(mockGetCountryById).toHaveBeenCalledWith("NGA");
    expect(mockGetActiveSourceFlags).toHaveBeenCalledWith("country", "NGA");
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

  // @req REQ-091
  it("carries the origin-people navigation context into the detail view", async () => {
    await renderPage("NGA", "fr", {
      fromPeopleName: "Yoruba",
      fromPeopleId: "PPL_YORUBA",
    });

    const detailView = screen.getByTestId("country-detail-live");
    expect(detailView).toHaveAttribute("data-from-people-name", "Yoruba");
    expect(detailView).toHaveAttribute("data-from-people-id", "PPL_YORUBA");
  });
});

describe("/[lang]/pays/[slug] — panel sequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubReducedMotion();
    mockGetCountryById.mockResolvedValue(NIGERIA_ROW);
    mockGetActiveSourceFlags.mockResolvedValue([]);
  });

  // @req REQ-091
  it("renders the live fiche as the panel sequence, record chapter last", async () => {
    const { container } = await renderPage("NGA");

    expect(renderedAnchors(container)).toEqual(["fiche-scale", "fiche-record"]);
    expect(
      container
        .querySelector("#fiche-record")
        ?.contains(screen.getByTestId("country-detail-live"))
    ).toBe(true);
  });

  // @req REQ-091
  it("gates the record behind a single reading gate", async () => {
    const { container } = await renderPage("NGA");

    // A route that wrapped the detail view itself would nest one <details>
    // inside the other, burying the dossier behind two disclosures.
    expect(container.querySelectorAll("details")).toHaveLength(1);
    expect(screen.getByText("Lire le dossier complet")).toBeInTheDocument();
  });

  // @req REQ-091
  it("omits the anchors of the chapters no country panel exists for yet", async () => {
    const { container } = await renderPage("NGA");

    // Identity, territory, fragmentation and voices are people-shaped panels
    // (stories 15.3–15.8 own their country counterparts): the composer asks
    // for them, the registry declines, and no empty anchor is left behind.
    const composed = derivePanelSequence(
      "country",
      mapCountryDetail(NIGERIA_ROW)
    );
    for (const kind of [
      "identity",
      "territory",
      "fragmentation",
      "voices",
    ] as const) {
      expect(composed).toContain(kind);
      expect(container.querySelector(`#fiche-${kind}`)).toBeNull();
    }
  });

  // @req REQ-019
  // @req REQ-091
  it("leaves the pinned snapshot free of any panel", async () => {
    mockGetRevisionSnapshot.mockResolvedValueOnce({
      data: { name_fr: "Nigéria" },
      version: 12,
      published_at: "2026-06-10T00:00:00Z",
      confidence: 88,
      doctrine: null,
    });

    const { container } = await renderPage("NGA@v12");

    expect(screen.getByTestId("country-snapshot-view")).toBeInTheDocument();
    expect(renderedAnchors(container)).toEqual([]);
    expect(container.querySelectorAll("details")).toHaveLength(0);
  });
});
