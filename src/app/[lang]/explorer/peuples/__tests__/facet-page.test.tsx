import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The peoples facet of the unified Explorer hub.
 *
 * It replaces a client directory that fetched a page of twenty and then
 * dropped the rows whose countries did not match — so page one of a country
 * filter was "whichever of the first twenty happen to be Ghanaian", counted
 * against a total that described the whole corpus. Every assertion about a
 * filter here is really an assertion about *where* the filter is applied.
 *
 * The frame is not this route's: `FacetHubShell` owns the `PageLayout`, the
 * facet accent, the switcher and the one globe the three facets share. What
 * this page owes is the reading, and the index the shared map reads.
 */

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  usePathname: () => getLocalizedRoute("fr", "peoples"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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

const { mockGetPage, mockGetIndex, mockGetChoices } = vi.hoisted(() => ({
  mockGetPage: vi.fn(),
  mockGetIndex: vi.fn(),
  mockGetChoices: vi.fn(),
}));

vi.mock("@/api/v2/services/peoplesFacet", () => ({
  getPeoplesFacetPage: (...args: unknown[]) => mockGetPage(...args),
  getPeoplesFacetCountryIndex: (...args: unknown[]) => mockGetIndex(...args),
  getPeoplesFacetChoices: () => mockGetChoices(),
}));

import PeuplesHubPage from "../page";
import { getFacetRoute } from "@/lib/hubs/facets";
import { getLocalizedRoute, getPeopleRoute } from "@/lib/routing";

const PEUPLES = getFacetRoute("fr", "peoples");

const akan = {
  id: "PPL_AKAN",
  nameMain: "Akan",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["GHA", "CIV"],
  content: {
    appellations: { selfAppellation: "Akanfoɔ" },
    demography: { totalPopulation: 20000000 },
  },
};

const ewe = {
  id: "PPL_EWE",
  nameMain: "Ewe",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["GHA", "TGO"],
  content: {},
};

/** The route signature Next 16 hands a page: both bags arrive as promises. */
function renderRoute(searchParams: Record<string, string | string[]> = {}) {
  return PeuplesHubPage({
    params: Promise.resolve({ lang: "fr" }),
    searchParams: Promise.resolve(searchParams),
  });
}

function publishedIndex() {
  const raw = screen
    .getByTestId("published-country-index")
    .getAttribute("data-index");
  return JSON.parse(raw ?? "{}");
}

function filtersPassed(mock: typeof mockGetPage, call = 0) {
  const args = mock.mock.calls[call];
  return args[args.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPage.mockResolvedValue({
    peoples: [akan, ewe],
    page: 1,
    total: 2,
    totalPages: 1,
  });
  mockGetIndex.mockResolvedValue([
    { id: "PPL_AKAN", nameMain: "Akan", countryIds: ["GHA", "CIV"] },
    { id: "PPL_EWE", nameMain: "Ewe", countryIds: ["GHA", "TGO"] },
  ]);
  mockGetChoices.mockResolvedValue({
    families: [{ id: "FLG_NIGER_CONGO", label: "Niger-congolaises" }],
    countries: [{ id: "GHA", label: "Ghana" }],
  });
});

describe("the peoples facet — what it reads", () => {
  // @req REQ-091
  it("sends a ?people= deep link to that people's fiche", async () => {
    await expect(renderRoute({ people: "PPL_AKAN" })).rejects.toThrow(
      `NEXT_REDIRECT:${getPeopleRoute("fr", "PPL_AKAN")}`
    );
  });

  /**
   * The name is the shell's, printed above the globe where it is read before
   * the band fills the screen — see `facetHubHeadCharter.test.tsx`. The page
   * owes the count, which changes with the filters it sits above, and owes no
   * second h1.
   */
  // @req REQ-106
  it("leaves its name to the shell, and counts what the selection holds", async () => {
    render(await renderRoute());

    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getByText(/2 peuples/)).toBeInTheDocument();
  });

  /**
   * A row is a link and only a link. The panel belongs to the map: a list that
   * also opened one would put two answers on screen to a question the reader
   * asked once.
   */
  // @req REQ-091
  it("gives every people a link to its fiche, and no other control", async () => {
    render(await renderRoute());

    const list = screen.getByRole("list", { name: /peuples/i });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    expect(within(rows[0]).getByRole("link")).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_AKAN")
    );
    expect(within(list).queryAllByRole("button")).toEqual([]);
  });

  // @req REQ-091
  it("keeps the autonym beside the name the corpus files a people under", async () => {
    render(await renderRoute());

    expect(screen.getByText("Akanfoɔ")).toBeInTheDocument();
  });

  // @req REQ-106
  it("says the selection is empty rather than rendering an empty list", async () => {
    mockGetPage.mockResolvedValue({
      peoples: [],
      page: 1,
      total: 0,
      totalPages: 0,
    });
    mockGetIndex.mockResolvedValue([]);

    render(await renderRoute({ pays: "GHA" }));

    expect(screen.getByTestId("peoples-facet-empty")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /peuples/i })).toBeNull();
  });
});

describe("the peoples facet — where the filtering happens", () => {
  // @req REQ-106
  it("carries the reader's selects to the database, not to rows it has already loaded", async () => {
    render(await renderRoute({ famille: "FLG_NIGER_CONGO", pays: "GHA" }));

    expect(filtersPassed(mockGetPage)).toEqual({
      familyId: "FLG_NIGER_CONGO",
      countryId: "GHA",
      letter: null,
    });
    // Everything the service returned is on screen: nothing was dropped after
    // the fact, which is the defect this facet replaces.
    expect(
      within(screen.getByRole("list", { name: /peuples/i })).getAllByRole(
        "listitem"
      )
    ).toHaveLength(2);
  });

  // @req REQ-114
  it("reads an unset native select as no filter rather than as a value", async () => {
    render(await renderRoute({ famille: "", pays: "" }));

    expect(filtersPassed(mockGetPage)).toEqual({
      familyId: null,
      countryId: null,
      letter: null,
    });
  });

  // @req REQ-106
  it("narrows the list and the map by one and the same selection", async () => {
    render(await renderRoute({ famille: "FLG_NIGER_CONGO", lettre: "A" }));

    expect(filtersPassed(mockGetIndex)).toEqual(filtersPassed(mockGetPage));
  });

  // @req REQ-106
  it("submits its filters to the facet's own address, as a GET a crawler can follow", async () => {
    render(await renderRoute());

    const form = screen.getByTestId("facet-filter-bar");
    expect(form).toHaveAttribute("action", PEUPLES);
    expect(form).toHaveAttribute("method", "get");
    expect(
      within(form).getByRole("combobox", { name: /famille/i })
    ).toBeInTheDocument();
  });

  /**
   * Pays is the first control, as it is the first facet and the first module
   * on the Explorer hub. A reader narrowing 803 peoples reaches for the
   * country they know before the linguistic family they are here to learn,
   * so the order of the two selects follows the order of the axis above them
   * rather than the order the query happens to take its arguments in.
   */
  // @req REQ-106
  it("offers the country filter before the linguistic family", async () => {
    render(await renderRoute());

    const form = screen.getByTestId("facet-filter-bar");
    const labels = within(form)
      .getAllByRole("combobox")
      .map((select) => select.getAttribute("name"));
    expect(labels).toEqual(["pays", "famille"]);
  });
});

describe("the peoples facet — paging a filtered set", () => {
  // @req REQ-108
  it("asks for the page in the address rather than paging what it fetched", async () => {
    mockGetPage.mockResolvedValue({
      peoples: [akan],
      page: 3,
      total: 45,
      totalPages: 3,
    });

    render(await renderRoute({ page: "3" }));

    expect(mockGetPage.mock.calls[0][0]) /* the requested page */
      .toBe(3);
  });

  // @req REQ-108
  it("offers the next page as an address, with the filters still on it", async () => {
    mockGetPage.mockResolvedValue({
      peoples: [akan],
      page: 1,
      total: 45,
      totalPages: 3,
    });

    render(await renderRoute({ famille: "FLG_NIGER_CONGO" }));

    const next = screen.getByRole("link", { name: /suivante/i });
    const href = next.getAttribute("href") ?? "";
    expect(href.startsWith(`${PEUPLES}?`)).toBe(true);

    const query = new URLSearchParams(href.split("?")[1]);
    expect(query.get("page")).toBe("2");
    expect(query.get("famille")).toBe("FLG_NIGER_CONGO");
  });

  // @req REQ-108
  it("offers no page beyond the last one of the filtered set", async () => {
    mockGetPage.mockResolvedValue({
      peoples: [akan],
      page: 3,
      total: 45,
      totalPages: 3,
    });

    render(await renderRoute({ page: "3" }));

    expect(screen.queryByRole("link", { name: /suivante/i })).toBeNull();
    expect(
      screen.getByRole("link", { name: /précédente/i })
    ).toBeInTheDocument();
  });

  // @req REQ-108
  it("drops the page when a letter is chosen, so the first page of that letter is what opens", async () => {
    render(await renderRoute({ page: "4" }));

    const letter = screen.getByRole("link", { name: "A" });
    const query = new URLSearchParams(
      (letter.getAttribute("href") ?? "").split("?")[1]
    );
    expect(query.get("lettre")).toBe("A");
    expect(query.get("page")).toBeNull();
  });
});

describe("the peoples facet — what it tells the shared map", () => {
  // @req REQ-117
  it("publishes, per country, the peoples of the whole filtered set", async () => {
    render(await renderRoute());

    expect(publishedIndex()).toEqual({
      GHA: [
        {
          id: "PPL_AKAN",
          label: "Akan",
          href: getPeopleRoute("fr", "PPL_AKAN"),
        },
        { id: "PPL_EWE", label: "Ewe", href: getPeopleRoute("fr", "PPL_EWE") },
      ],
      CIV: [
        {
          id: "PPL_AKAN",
          label: "Akan",
          href: getPeopleRoute("fr", "PPL_AKAN"),
        },
      ],
      TGO: [
        { id: "PPL_EWE", label: "Ewe", href: getPeopleRoute("fr", "PPL_EWE") },
      ],
    });
  });

  /**
   * The index covers the selection, not the page: a country whose peoples all
   * sort onto page two must still answer when the map is clicked from page one.
   */
  // @req REQ-117
  it("publishes a people the current page does not show", async () => {
    mockGetPage.mockResolvedValue({
      peoples: [akan],
      page: 1,
      total: 2,
      totalPages: 2,
    });

    render(await renderRoute());

    expect(publishedIndex().TGO).toEqual([
      { id: "PPL_EWE", label: "Ewe", href: getPeopleRoute("fr", "PPL_EWE") },
    ]);
  });
});
