import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The families facet of the unified Explorer hub.
 *
 * It replaces a client directory that loaded every family through react-query
 * and paged them in the browser — over a service that had been paginating at
 * the database for two requirements already. The page asks the service for one
 * page and renders it, which is why nothing here counts rows.
 *
 * The globe is the Explorer layout's. What this route owes the shared map is
 * the index it reads: which families the current selection documents in each
 * country, and what each row opens.
 */

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => getLocalizedRoute("fr", "families"),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Stood in for so the index it publishes can be read as data. The real
 * publisher writes into a context the shell owns, which is the shell's
 * contract to test, not this route's.
 */
vi.mock("@/components/hubs/facets/FacetCountryIndex", () => ({
  PublishFacetCountryIndex: ({ index }: { index: unknown }) => (
    <div
      data-testid="published-country-index"
      data-index={JSON.stringify(index)}
    />
  ),
}));

const { mockGetLanguageFamilies, mockGetPresence, mockGetCountryIndex } =
  vi.hoisted(() => ({
    mockGetLanguageFamilies: vi.fn(),
    mockGetPresence: vi.fn(),
    mockGetCountryIndex: vi.fn(),
  }));

vi.mock("@/api/v2/services/languageFamilyService", () => ({
  getLanguageFamilies: (...args: unknown[]) => mockGetLanguageFamilies(...args),
}));

vi.mock("@/api/v2/services/languageFamilyAtlas", () => ({
  getLanguageFamilyPresence: () => mockGetPresence(),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: () => mockGetCountryIndex(),
}));

import FamillesHubPage from "../page";
import { getFamilyRoute, getLocalizedRoute } from "@/lib/routing";

/** Mirrors the page's own per-page constant, which a Next page may not export. */
const FAMILIES_PER_PAGE = 12;

const FAMILIES_ROUTE = getLocalizedRoute("fr", "families");

/**
 * Thirteen families documented in Nigeria, so a filtered selection still runs
 * to two pages; sixteen in all, so an unfiltered one does too.
 */
const WIDESPREAD = Array.from({ length: 13 }, (_, index) => ({
  id: `FLG_W${index}`,
  nameFr: `Famille ${index}`,
  countryIds: ["NGA"],
}));

const PRESENCE = [
  { id: "FLG_AFROASIATIQUE", nameFr: "Afro-asiatique", countryIds: [] },
  { id: "FLG_BANTU", nameFr: "Bantou", countryIds: ["MOZ", "ZWE"] },
  { id: "FLG_MANDE", nameFr: "Mandé", countryIds: ["MLI"] },
  ...WIDESPREAD,
];

function renderRoute(searchParams: Record<string, string | string[]>) {
  return FamillesHubPage({
    params: Promise.resolve({ lang: "fr" }),
    searchParams: Promise.resolve(searchParams),
  });
}

function publishedIndex(): Record<
  string,
  Array<{ id: string; label: string; href: string }>
> {
  const raw = screen
    .getByTestId("published-country-index")
    .getAttribute("data-index");
  return JSON.parse(raw ?? "{}");
}

describe("the families facet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermanentRedirect.mockClear();
    mockGetPresence.mockResolvedValue(PRESENCE);
    mockGetCountryIndex.mockResolvedValue([
      { id: "MOZ", nameFr: "Mozambique" },
      { id: "ZWE", nameFr: "Zimbabwe" },
      { id: "MLI", nameFr: "Mali" },
      { id: "NGA", nameFr: "Nigéria" },
      { id: "COM", nameFr: "Comores" },
    ]);
    mockGetLanguageFamilies.mockResolvedValue({
      data: [
        { id: "FLG_BANTU", nameFr: "Bantou", peopleCount: 320, content: {} },
        { id: "FLG_MANDE", nameFr: "Mandé", peopleCount: 41, content: {} },
      ],
      total: PRESENCE.length,
      unclassifiedPeoplesCount: 64,
    });
  });

  // @req REQ-091
  it("sends a ?family= deep link to that family's fiche", async () => {
    await expect(renderRoute({ family: "FLG_BANTU" })).rejects.toThrow(
      `NEXT_REDIRECT:${getFamilyRoute("fr", "FLG_BANTU")}`
    );
    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      getFamilyRoute("fr", "FLG_BANTU")
    );
  });

  /**
   * The rule that stops `?family=//host` becoming an open redirect lives in
   * the shared resolver, and this is what keeps it there: the directory used
   * to forward the identifier itself, unencoded, from a second client-side
   * copy of the same redirect. That copy is gone; the rule has one home.
   */
  // @req REQ-091
  it("encodes the identifier so a protocol-relative deep link cannot leave the site", async () => {
    await expect(renderRoute({ family: "//evil.com" })).rejects.toThrow(
      /NEXT_REDIRECT:/
    );

    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      `${FAMILIES_ROUTE}/%2F%2Fevil.com`
    );
  });

  /**
   * The name is the shell's, printed above the globe where it is read before
   * the band fills the screen — see `facetHubHeadCharter.test.tsx`. The page
   * owes the count, which changes with the filters it sits above, and owes no
   * second h1.
   */
  // @req REQ-114
  it("leaves its name to the shell, and counts the corpus rather than the page", async () => {
    render(await renderRoute({}));

    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getByText(/16 familles/)).toBeInTheDocument();
  });

  // @req REQ-117
  it("tells the shared map which families it documents in each country", async () => {
    render(await renderRoute({}));

    const index = publishedIndex();
    expect(index.MOZ).toEqual([
      {
        id: "FLG_BANTU",
        label: "Bantou",
        href: getFamilyRoute("fr", "FLG_BANTU"),
      },
    ]);
    expect(index.MLI).toEqual([
      {
        id: "FLG_MANDE",
        label: "Mandé",
        href: getFamilyRoute("fr", "FLG_MANDE"),
      },
    ]);
    expect(index.NGA).toHaveLength(WIDESPREAD.length);
  });

  /**
   * Afro-asiatique reaches no country through the peoples that carry its id —
   * its members all sit under a sub-family. That is the corpus speaking, so
   * the family stays in the reading and appears in no country's panel.
   */
  // @req REQ-117
  it("puts a family with no derived footprint in no country, rather than everywhere", async () => {
    render(await renderRoute({}));

    const rows = Object.values(publishedIndex()).flat();
    expect(rows.some((row) => row.id === "FLG_AFROASIATIQUE")).toBe(false);
  });

  // @req REQ-110
  it("narrows the list query itself when a country is chosen, rather than filtering rows already fetched", async () => {
    render(await renderRoute({ pays: "MLI" }));

    expect(mockGetLanguageFamilies).toHaveBeenCalledWith(1, FAMILIES_PER_PAGE, {
      ids: ["FLG_MANDE"],
    });
    expect(Object.keys(publishedIndex())).toEqual(["MLI"]);
  });

  // A native <select> submits its empty option as "", which is no filter.
  // @req REQ-114
  it("reads an empty filter value as no filter at all", async () => {
    render(await renderRoute({ pays: "" }));

    expect(mockGetLanguageFamilies).toHaveBeenCalledWith(
      1,
      FAMILIES_PER_PAGE,
      {}
    );
  });

  // @req REQ-114
  it("offers only the countries the corpus documents a family in", async () => {
    render(await renderRoute({}));

    const select = screen.getByLabelText("Pays") as HTMLSelectElement;
    const values = Array.from(select.options).map((option) => option.value);

    expect(values).toEqual(["", "MLI", "MOZ", "NGA", "ZWE"]);
    // Comores documents no family; offering it would promise an empty page.
    expect(values).not.toContain("COM");
  });

  // @req REQ-114
  it("submits its filters back to the facet's own address, as a GET navigation", async () => {
    render(await renderRoute({}));

    const form = screen.getByTestId("facet-filter-bar");
    expect(form).toHaveAttribute("action", FAMILIES_ROUTE);
    expect(form).toHaveAttribute("method", "get");
  });

  // @req REQ-110
  it("asks the service for the page the address names", async () => {
    render(await renderRoute({ page: "2" }));

    expect(mockGetLanguageFamilies).toHaveBeenCalledWith(
      2,
      FAMILIES_PER_PAGE,
      {}
    );
  });

  // A page past the end is a stale or typed address, not an empty reading.
  // @req REQ-110
  it("clamps a page number past the end of the selection before querying", async () => {
    render(await renderRoute({ page: "99" }));

    expect(mockGetLanguageFamilies).toHaveBeenCalledWith(
      2,
      FAMILIES_PER_PAGE,
      {}
    );
  });

  // @req REQ-110
  it("keeps the chosen country in the page links, so paging does not widen the selection", async () => {
    render(await renderRoute({ pays: "NGA" }));

    // The pager is repeated head and foot; both steps address the same page.
    expect(
      screen.getAllByRole("link", { name: /suivante/i })[0]
    ).toHaveAttribute("href", `${FAMILIES_ROUTE}?pays=NGA&page=2`);
  });

  // A list row opens the fiche. Only the map opens the globe's panel.
  // @req REQ-091
  it("opens each row straight onto its fiche", async () => {
    render(await renderRoute({}));

    const list = screen.getByTestId("family-facet-list");
    const links = within(list).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      getFamilyRoute("fr", "FLG_BANTU"),
      getFamilyRoute("fr", "FLG_MANDE"),
    ]);
  });

  // @req REQ-108
  it("reports the peoples no published family reaches", async () => {
    render(await renderRoute({}));

    expect(screen.getByText(/64 peuples/)).toBeInTheDocument();
  });

  // @req REQ-108
  it("says nothing about unclassified peoples when the corpus leaves none", async () => {
    mockGetLanguageFamilies.mockResolvedValue({
      data: [],
      total: 0,
      unclassifiedPeoplesCount: 0,
    });

    render(await renderRoute({}));

    expect(screen.queryByText(/peuples non class/i)).toBeNull();
  });
});
