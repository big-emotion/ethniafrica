import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The countries facet of the unified Explorer hub.
 *
 * It opened a detail pane of its own once, with no globe, and that pane is what
 * a reader comparing the page to its mockup was looking at. The pane's
 * `?country=` links are answered with a redirect to the fiche rather than being
 * rendered a second time.
 *
 * The globe it then grew has since moved up to the Explorer layout, where one
 * map serves all three facets and survives a switch between them. So what this
 * route owes is no longer a globe of its own: it is the index the shared map
 * reads — which countries this facet has, and what each one opens — plus the
 * two things the map cannot be, a list and a filter. The list is the facet's
 * only access path for a reader on a keyboard, without JavaScript, or without
 * WebGL, and the map is a second one for everybody else.
 */

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => getLocalizedRoute("fr", "countries"),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
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

const { mockGetCountryFacetSelection } = vi.hoisted(() => ({
  mockGetCountryFacetSelection: vi.fn(),
}));

vi.mock("@/api/v2/services/countryFacet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/v2/services/countryFacet")>()),
  getCountryFacetSelection: (...args: unknown[]) =>
    mockGetCountryFacetSelection(...args),
}));

import PaysHubPage from "../page";
import { getCountryRoute, getLocalizedRoute } from "@/lib/routing";

/** The route signature Next 16 hands a page: both bags arrive as promises. */
function renderRoute(searchParams: Record<string, string | string[]>) {
  return PaysHubPage({
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

function listedCountries() {
  return within(screen.getByTestId("country-facet-list")).getAllByRole("link");
}

const SELECTION = {
  rows: [
    { id: "KEN", label: "Kenya", documentedPeopleCount: 12 },
    { id: "NGA", label: "Nigeria", documentedPeopleCount: 40 },
  ],
  familyOptions: [
    { value: "FLG_NIGER_CONGO", label: "Niger-Congo" },
    { value: "FLG_NILO_SAHARIEN", label: "Nilo-saharien" },
  ],
  totalCountries: 54,
};

describe("the countries facet", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockGetCountryFacetSelection.mockReset();
    mockGetCountryFacetSelection.mockResolvedValue(SELECTION);
  });

  // @req REQ-091
  it("sends a ?country= deep link to that country's fiche", async () => {
    await expect(renderRoute({ country: "NGA" })).rejects.toThrow(
      `NEXT_REDIRECT:${getCountryRoute("fr", "NGA")}`
    );
    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      getCountryRoute("fr", "NGA")
    );
  });

  // A 308 rather than a 307: the query form is retired, not merely moved, so a
  // crawler should transfer the standing it had gathered.
  // @req REQ-091
  it("redirects permanently, never temporarily", async () => {
    await expect(renderRoute({ country: "SEN" })).rejects.toThrow(
      `NEXT_REDIRECT:${getCountryRoute("fr", "SEN")}`
    );
  });

  /**
   * The rule that stops the retired query shape being an open redirect. It has
   * exactly one implementation — `resolveCountryDeepLink` — and this is the
   * assertion that keeps the page from growing a second: a browser reads two
   * leading slashes as the start of a host, so an unencoded identifier would
   * send the reader off-site under our own domain.
   */
  // @req REQ-091
  it("encodes the identifier, so ?country=//evil.com cannot leave the site", async () => {
    await expect(renderRoute({ country: "//evil.com" })).rejects.toThrow(
      "NEXT_REDIRECT:"
    );

    const [target] = mockPermanentRedirect.mock.calls[0];
    expect(target).toBe(
      getCountryRoute("fr", encodeURIComponent("//evil.com"))
    );
    expect(target).not.toContain("//evil.com");
  });

  // @req REQ-091
  it("tells the shared map what this facet has in each country", async () => {
    render(await renderRoute({}));

    expect(publishedIndex()).toEqual({
      KEN: [{ id: "KEN", label: "Kenya", href: getCountryRoute("fr", "KEN") }],
      NGA: [
        { id: "NGA", label: "Nigeria", href: getCountryRoute("fr", "NGA") },
      ],
    });
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("publishes rather than guessing when the query is repeated", async () => {
    render(await renderRoute({ country: ["NGA", "KEN"] }));

    expect(Object.keys(publishedIndex())).toEqual(["KEN", "NGA"]);
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  /**
   * The name is the shell's, printed above the globe where it is read before
   * the band fills the screen — see `facetHubHeadCharter.test.tsx`. The page
   * owes the count, which changes with the filters it sits above, and owes no
   * second h1.
   */
  // @req REQ-091
  it("leaves its name to the shell, and counts what it offers", async () => {
    render(await renderRoute({}));

    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getByText(/54 pays au corpus/)).toBeInTheDocument();
  });

  /**
   * The globe is the layout's, so a country the map cannot draw costs this
   * facet nothing: every country the corpus lists is published, whether or not
   * the admin-0 asset has a shape for it.
   */
  // @req REQ-091
  it("publishes a country the map may not be able to draw", async () => {
    mockGetCountryFacetSelection.mockResolvedValue({
      ...SELECTION,
      rows: [{ id: "SSD", label: "Soudan du Sud", documentedPeopleCount: 27 }],
    });

    render(await renderRoute({}));

    expect(publishedIndex().SSD).toHaveLength(1);
    expect(listedCountries()).toHaveLength(1);
  });
});

describe("the countries facet's list", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockGetCountryFacetSelection.mockReset();
    mockGetCountryFacetSelection.mockResolvedValue(SELECTION);
  });

  /**
   * Before this list, aiming at the map was the only way to reach a country —
   * which is no way at all for a reader on a keyboard, on a page whose script
   * has not run, or on a device with no WebGL.
   */
  // @req REQ-116
  it("opens every country of the selection from a link, in the order chosen", async () => {
    render(await renderRoute({}));

    const rows = listedCountries();
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Kenya"),
      expect.stringContaining("Nigeria"),
    ]);
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([
      getCountryRoute("fr", "KEN"),
      getCountryRoute("fr", "NGA"),
    ]);
  });

  /**
   * Charter rule: the map opens the panel, the list does not. A row is a plain
   * anchor to the fiche — no button, no handler, nothing that could put a panel
   * between the reader and the country they asked for.
   */
  // @req REQ-116
  it("navigates from a row instead of opening a panel", async () => {
    render(await renderRoute({}));

    const list = screen.getByTestId("country-facet-list");
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    for (const row of listedCountries()) {
      expect(row.getAttribute("href")).toMatch(/\/[A-Z]{3}$/);
    }
  });

  // @req REQ-116
  it("says how many peoples the corpus documents in each country", async () => {
    render(await renderRoute({}));

    expect(listedCountries()[1].textContent).toContain("40");
  });

  /**
   * The panel and the list must agree. Publishing the whole corpus while the
   * list showed a narrowed selection would make a map click contradict the page
   * it was clicked from.
   */
  // @req REQ-116
  it("publishes the selection it lists, not the corpus behind it", async () => {
    mockGetCountryFacetSelection.mockResolvedValue({
      ...SELECTION,
      rows: [{ id: "KEN", label: "Kenya", documentedPeopleCount: 12 }],
    });

    render(await renderRoute({ famille: "FLG_NILO_SAHARIEN" }));

    expect(Object.keys(publishedIndex())).toEqual(["KEN"]);
    expect(listedCountries()).toHaveLength(1);
  });

  /**
   * A filter that leaves nothing has to say so. Rendering an empty list under
   * an unchanged heading reads as a broken page rather than as an answer.
   */
  // @req REQ-116
  it("says a narrowed selection is empty rather than showing an empty list", async () => {
    mockGetCountryFacetSelection.mockResolvedValue({ ...SELECTION, rows: [] });

    render(await renderRoute({ famille: "FLG_NOWHERE" }));

    expect(screen.queryByTestId("country-facet-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("country-facet-empty")).toBeInTheDocument();
  });
});

describe("the countries facet's filters", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockGetCountryFacetSelection.mockReset();
    mockGetCountryFacetSelection.mockResolvedValue(SELECTION);
  });

  /**
   * Submitting is a navigation, which is what makes a filtered view something
   * a reader can bookmark and send. It also means the filter works before any
   * script has run, and for a crawler.
   */
  // @req REQ-116
  it("submits its filters to the facet's own address, by GET", async () => {
    render(await renderRoute({}));

    const form = screen.getByTestId("facet-filter-bar");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute(
      "action",
      getLocalizedRoute("fr", "countries")
    );
  });

  // @req REQ-116
  it("offers the families the corpus places somewhere, and an unfiltered option", async () => {
    render(await renderRoute({}));

    const family = screen.getByLabelText(/famille linguistique/i);
    expect(
      [...family.querySelectorAll("option")].map((option) => option.value)
    ).toEqual(["", "FLG_NIGER_CONGO", "FLG_NILO_SAHARIEN"]);
  });

  /**
   * The filter the URL carries is the one the control shows, or a reader who
   * arrives on a shared link sees a narrowed list beside a control claiming
   * nothing is filtered.
   */
  // @req REQ-116
  it("shows the filter the URL is already carrying", async () => {
    render(await renderRoute({ famille: "FLG_NILO_SAHARIEN", tri: "peuples" }));

    expect(screen.getByLabelText(/famille linguistique/i)).toHaveValue(
      "FLG_NILO_SAHARIEN"
    );
    expect(screen.getByLabelText(/^Tri$/i)).toHaveValue("peuples");
  });

  /**
   * A native `<select>` submits its empty option as `""`. Read as a value it
   * would narrow the corpus to a family called "", and the reader would be
   * shown an empty page they never asked for.
   */
  // @req REQ-116
  it("reads a cleared select as no filter rather than as a family named ''", async () => {
    render(await renderRoute({ famille: "", tri: "" }));

    expect(mockGetCountryFacetSelection).toHaveBeenCalledWith({
      languageFamilyId: null,
      sort: "nom",
    });
  });

  // @req REQ-108
  it("passes the requested order to the query rather than reordering what came back", async () => {
    render(await renderRoute({ tri: "peuples" }));

    expect(mockGetCountryFacetSelection).toHaveBeenCalledWith({
      languageFamilyId: null,
      sort: "peuples",
    });
  });
});
