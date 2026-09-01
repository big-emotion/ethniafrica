import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCountryById,
  mockGetCountryAtlasIndex,
  mockGetLatestVersion,
  mockGetRevisionSnapshot,
  mockGetActiveSourceFlags,
} = vi.hoisted(() => ({
  mockGetCountryById: vi.fn(),
  mockGetCountryAtlasIndex: vi.fn(),
  mockGetLatestVersion: vi.fn(),
  mockGetRevisionSnapshot: vi.fn(),
  mockGetActiveSourceFlags: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
  getCountryAtlasIndex: () => mockGetCountryAtlasIndex(),
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
    flushTop,
  }: {
    children: React.ReactNode;
    onLanguageChange?: unknown;
    flushTop?: boolean;
  }) => {
    if (typeof onLanguageChange === "function") {
      throw new Error("Server pages must not pass callbacks to PageLayout");
    }
    return (
      <div data-testid="page-layout" data-flush-top={String(Boolean(flushTop))}>
        {children}
      </div>
    );
  },
}));

vi.mock("@/components/country/CountryRecordView", () => ({
  CountryRecordView: ({
    country,
    hasSourceFlag,
    fromPeopleName,
    fromPeopleId,
  }: {
    country: { id: string; nameFr: string };
    hasSourceFlag?: boolean;
    fromPeopleName?: string;
    fromPeopleId?: string;
  }) => (
    <div
      data-testid="country-detail-live"
      data-country-id={country?.id}
      data-country-name={country?.nameFr}
      data-source-flag={hasSourceFlag}
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
import { FICHE_RECORD_ANCHOR } from "@/lib/ficheChapters";
import { getCountryRoute, getLocalizedRoute } from "@/lib/routing";

/**
 * A country row carrying every editorial section the strict country model
 * declares, so the assertions below run against the fiche a full corpus
 * produces rather than one with holes in it.
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
    sources: [
      {
        title: "CIA World Factbook, 2025",
        url: null,
        tier: "unverified" as const,
      },
    ],
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
    mockGetCountryAtlasIndex.mockResolvedValue([
      {
        id: "NGA",
        nameFr: "Nigeria",
        languages: [],
        peoples: ["Yoruba"],
      },
      { id: "KEN", nameFr: "Kenya", languages: [], peoples: [] },
    ]);
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
    expect(banner).toHaveAttribute(
      "data-live-url",
      getCountryRoute("fr", "COD")
    );
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
    ).toHaveAttribute(
      "href",
      `${getLocalizedRoute("fr", "doctrine")}/classifications-contestees@v42`
    );
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
    ).rejects.toThrow(`NEXT_REDIRECT:${getCountryRoute("fr", "NGA@v13")}`);
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
    mockGetCountryAtlasIndex.mockResolvedValue([
      {
        id: "NGA",
        nameFr: "Nigeria",
        languages: [],
        peoples: ["Yoruba"],
      },
      { id: "KEN", nameFr: "Kenya", languages: [], peoples: [] },
    ]);
  });

  // One globe, one parchment — the shape the mockup asks of a fiche whose
  // dossier is the page. The chapter sequence used to sit between the two,
  // and for a country it only ever resolved to a scale panel restating what
  // the parchment says twice over.
  // @req REQ-091
  it("renders the live fiche as one parchment under the globe", async () => {
    const { container } = await renderPage("NGA");

    expect(renderedAnchors(container)).toEqual(["fiche-record"]);
    expect(
      container
        .querySelector("#fiche-record")
        ?.contains(screen.getByTestId("country-detail-live"))
    ).toBe(true);
  });

  // The dossier *is* this page. A reading gate over it asks the reader to
  // open the thing they came for, and it is what made the fiche look nothing
  // like its mockup: a globe, then a chevron.
  // @req REQ-091
  it("opens the dossier as the page body, with no reading gate", async () => {
    const { container } = await renderPage("NGA");

    expect(container.querySelectorAll("details")).toHaveLength(0);
    expect(screen.queryByText("Lire le dossier complet")).toBeNull();
    expect(screen.getByTestId("country-detail-live")).toBeInTheDocument();
  });

  // The band is what makes the globe reach both edges of the viewport and
  // closes it with the ochre seam. Without it the globe is boxed in the page
  // container, which is the state this fiche shipped in.
  // @req REQ-116
  it("stands the globe on the full-width night band", async () => {
    const { container } = await renderPage("NGA");

    const band = screen.getByTestId("fiche-hero-band");
    expect(band).toBeInTheDocument();

    // AtlasGlobe now mounts through next/dynamic (ETNI-1378), which resolves
    // its chunk a tick after the initial render.
    await waitFor(() =>
      expect(
        band.contains(container.querySelector("[data-atlas-surface]"))
      ).toBe(true)
    );
  });

  // @req REQ-116
  it("closes the band with the seam that opens the reading", async () => {
    await renderPage("NGA");

    expect(screen.getByTestId("fiche-hero-seam")).toBeInTheDocument();
  });

  // Without flushTop the band starts below a strip of page background, and the
  // globe stops reading as the top of the page.
  // @req REQ-116
  it("lets the band start at the top of the page", async () => {
    await renderPage("NGA");

    expect(screen.getByTestId("page-layout")).toHaveAttribute(
      "data-flush-top",
      "true"
    );
  });

  // The fiche used to compose chapters around its dossier from a table of
  // eight kinds. There is one section now, whatever the corpus carries.
  // @req REQ-091
  it("renders the dossier and nothing else", async () => {
    const { container } = await renderPage("NGA");

    expect(
      Array.from(container.querySelectorAll("section[id^='fiche-']")).map(
        (section) => section.id
      )
    ).toEqual([FICHE_RECORD_ANCHOR]);
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
