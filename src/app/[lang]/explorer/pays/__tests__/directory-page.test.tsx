import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/fr/pays` — the way into the countries.
 *
 * It opened a detail pane of its own once, with no globe, and that pane is what
 * a reader comparing the page to its mockup was looking at. The pane's
 * `?country=` links are answered with a redirect to the fiche rather than being
 * rendered a second time, and what the route renders now is the hub's globe:
 * the same object the three fiches open on, doing the hub's own job.
 */

const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  // PageLayout wires search and the keyboard shortcuts through the router.
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => getLocalizedRoute("fr", "countries"),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Stood in for, rather than mounted: the route's own behaviour is what is under
 * test, and the real layout drags the header, the search modal and the footer
 * in with it. The stand-in keeps the one part of the contract this route can
 * break — dropping `hideHeader` would put a second h1 above the hub's own.
 */
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    sectionName,
    hideHeader,
  }: {
    children: React.ReactNode;
    sectionName?: string;
    hideHeader?: boolean;
  }) => (
    <div>
      {!hideHeader && <h1>{sectionName}</h1>}
      {children}
    </div>
  ),
}));

vi.mock("@/components/hubs/CountryHubGlobe", () => ({
  CountryHubGlobe: () => <div data-testid="pays-hub-globe" />,
}));

const { mockGetCountryIndex, mockGetCounts } = vi.hoisted(() => ({
  mockGetCountryIndex: vi.fn(),
  mockGetCounts: vi.fn(),
}));

vi.mock("@/api/v2/services/countryService", () => ({
  getCountryIndex: () => mockGetCountryIndex(),
}));

vi.mock("@/api/v2/services/continentPeopleCounts", () => ({
  getContinentPeopleCounts: () => mockGetCounts(),
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

describe("the countries hub", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockGetCountryIndex.mockResolvedValue([
      { id: "NGA", nameFr: "République fédérale du Nigéria" },
      { id: "KEN", nameFr: "République du Kenya" },
    ]);
    mockGetCounts.mockResolvedValue({ NGA: 40 });
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
  it("opens on the globe when no country is named", async () => {
    render(await renderRoute({}));

    expect(screen.getByTestId("pays-hub-globe")).toBeInTheDocument();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("opens on the globe rather than guessing when the query is repeated", async () => {
    render(await renderRoute({ country: ["NGA", "KEN"] }));

    expect(screen.getByTestId("pays-hub-globe")).toBeInTheDocument();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  // The hub is a page in its own right, so it names itself — and names itself
  // once. Leaving the section band on top would have given it two h1s, the
  // first of them the same word.
  // @req REQ-091
  it("names itself exactly once, and counts what it offers", async () => {
    render(await renderRoute({}));

    expect(
      screen.getByRole("heading", { level: 1, name: /pays d'Afrique/i })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(/2 pays au corpus/)).toBeInTheDocument();
  });

  // A failed count shades the map less richly; it must never cost the way in.
  // @req REQ-091
  it("still opens when the corpus counts cannot be read", async () => {
    mockGetCounts.mockRejectedValue(new Error("supabase down"));

    render(await renderRoute({}));

    expect(screen.getByTestId("pays-hub-globe")).toBeInTheDocument();
  });
});
