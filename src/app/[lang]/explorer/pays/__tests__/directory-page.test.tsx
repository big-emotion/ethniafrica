import { render, screen } from "@testing-library/react";
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
 * reads — which countries this facet has, and what each one opens.
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

const { mockGetCountryIndex } = vi.hoisted(() => ({
  mockGetCountryIndex: vi.fn(),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: () => mockGetCountryIndex(),
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

describe("the countries facet", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockGetCountryIndex.mockResolvedValue([
      { id: "NGA", nameFr: "République fédérale du Nigéria" },
      { id: "KEN", nameFr: "République du Kenya" },
    ]);
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

  // @req REQ-091
  it("tells the shared map what this facet has in each country", async () => {
    render(await renderRoute({}));

    expect(publishedIndex()).toEqual({
      NGA: [
        {
          id: "NGA",
          label: "République fédérale du Nigéria",
          href: getCountryRoute("fr", "NGA"),
        },
      ],
      KEN: [
        {
          id: "KEN",
          label: "République du Kenya",
          href: getCountryRoute("fr", "KEN"),
        },
      ],
    });
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("publishes rather than guessing when the query is repeated", async () => {
    render(await renderRoute({ country: ["NGA", "KEN"] }));

    expect(Object.keys(publishedIndex())).toEqual(["NGA", "KEN"]);
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  // The facet is a page in its own right, so it names itself — and names itself
  // once. The shell above it renders no heading, so this is the page's only h1.
  // @req REQ-091
  it("names itself exactly once, and counts what it offers", async () => {
    render(await renderRoute({}));

    expect(
      screen.getByRole("heading", { level: 1, name: /pays d'Afrique/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/2 pays au corpus/)).toBeInTheDocument();
  });

  /**
   * The globe is the layout's, so a country the map cannot draw costs this
   * facet nothing: every country the corpus lists is published, whether or not
   * the admin-0 asset has a shape for it.
   */
  // @req REQ-091
  it("publishes a country the map may not be able to draw", async () => {
    mockGetCountryIndex.mockResolvedValue([
      { id: "SSD", nameFr: "République du Soudan du Sud" },
    ]);

    render(await renderRoute({}));

    expect(publishedIndex().SSD).toHaveLength(1);
  });
});
