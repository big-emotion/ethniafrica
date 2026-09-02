import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The name facet of the atlas hub.
 *
 * It replaces an index that took a page and a size and offered no narrowing at
 * all: thirty rows, a prev/next pager of its own, no globe and no filters,
 * beside three sibling axes sharing a shell. Every assertion about a filter
 * here is really an assertion that the narrowing reaches the service rather
 * than being applied to a page already fetched.
 *
 * The frame is not this route's: `FacetHubShell` owns the `PageLayout`, the
 * accent, the switcher and the one globe the facets share. What this page owes
 * is the reading, and the index the shared map reads.
 */

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn(),
  usePathname: () => getLocalizedRoute("fr", "patronymes"),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Stood in for so the index it publishes can be read as data. The real
 * publisher writes into a context the shell owns, which is the shell's
 * contract to test, not this route's.
 */
vi.mock("@/components/hubs/facets/FacetCountryIndex", () => ({
  PublishFacetCountryIndex: ({
    index,
    narrowing,
  }: {
    index: unknown;
    narrowing: unknown;
  }) => (
    <div
      data-testid="published-country-index"
      data-index={JSON.stringify(index)}
      data-narrowing={JSON.stringify(narrowing)}
    />
  ),
}));

const { mockGetPage, mockGetIndex, mockGetChoices } = vi.hoisted(() => ({
  mockGetPage: vi.fn(),
  mockGetIndex: vi.fn(),
  mockGetChoices: vi.fn(),
}));

vi.mock("@/api/v2/services/patronymesFacet", () => ({
  PATRONYMES_FACET_PAGE_SIZES: [24, 48],
  getPatronymesFacetPage: (...args: unknown[]) => mockGetPage(...args),
  getPatronymesFacetCountryIndex: (...args: unknown[]) => mockGetIndex(...args),
  getPatronymesFacetChoices: (...args: unknown[]) => mockGetChoices(...args),
}));

import NomsHubPage, { metadata } from "../page";
import { getLocalizedRoute, getPatronymeRoute } from "@/lib/routing";

const KEITA = {
  id: "PAT_KEITA",
  nameMain: "Keïta",
  nameSystem: "clan_name" as const,
};

function readingOf(patronymes = [KEITA]) {
  return {
    patronymes,
    page: 1,
    total: patronymes.length,
    totalPages: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetChoices.mockResolvedValue({
    peoples: [{ id: "PPL_BAMANA", label: "Bamana" }],
    countries: [{ id: "MLI", label: "Mali" }],
    nameSystems: [{ id: "clan_name", label: "Nom de clan" }],
  });
  mockGetPage.mockResolvedValue(readingOf());
  mockGetIndex.mockResolvedValue([
    { id: "PAT_KEITA", nameMain: "Keïta", countryIds: ["MLI"] },
  ]);
});

describe("the name facet page", () => {
  // @req REQ-139 @req REQ-133
  it("lists the names of the selection and links each to its fiche", async () => {
    render(await NomsHubPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: /^Keïta\s/ })).toHaveAttribute(
      "href",
      getPatronymeRoute("fr", "PAT_KEITA")
    );
  });

  // @req REQ-139
  it("carries the reader's narrowing to the service, not to the rendered page", async () => {
    render(
      await NomsHubPage({
        searchParams: Promise.resolve({ peuple: "PPL_BAMANA", pays: "MLI" }),
      })
    );

    expect(mockGetPage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ peopleId: "PPL_BAMANA", countryId: "MLI" }),
      24
    );
    expect(mockGetIndex).toHaveBeenCalledWith(
      expect.objectContaining({ peopleId: "PPL_BAMANA", countryId: "MLI" })
    );
  });

  /**
   * The map and the list read one selection. A country is addressable on the
   * globe exactly when the current selection attests a name in it, so a
   * narrowing offered there can never land on an empty list.
   */
  // @req REQ-117
  it("publishes the selection's names to the shared globe", async () => {
    render(await NomsHubPage({ searchParams: Promise.resolve({}) }));

    const published = screen.getByTestId("published-country-index");
    const index = JSON.parse(published.getAttribute("data-index") ?? "{}");

    expect(index.MLI).toEqual([
      {
        id: "PAT_KEITA",
        label: "Keïta",
        href: getPatronymeRoute("fr", "PAT_KEITA"),
      },
    ]);
  });

  /**
   * The facet grew out of an index whose copy still holds « patronyme » —
   * DEC-038's internal identifier — in its count and its empty state. A new
   * surface is a new place to print it, so the unit is stated here instead,
   * the way `peuples/page.tsx` states its own.
   */
  // Scoped to the count and not to the page: « Patronyme non héréditaire » is
  // one of the five naming systems and is legitimate wherever a card names
  // one. It is the axis's own unit that must not carry the internal word.
  // @req REQ-138
  it("counts noms, never the internal word", async () => {
    const { container } = render(
      await NomsHubPage({ searchParams: Promise.resolve({}) })
    );
    const lede = container.querySelector(".afh-facet-reading-lede");

    expect(lede?.textContent).toMatch(/1 nom dans cette sélection/);
    expect(lede?.textContent).not.toMatch(/patronyme/i);
  });

  // @req REQ-139
  it("asks the service for the page the URL names", async () => {
    render(await NomsHubPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(mockGetPage).toHaveBeenCalledWith(2, expect.anything(), 24);
  });

  // A read failure is not an empty corpus — thirty names are always
  // published, so the page says "unavailable", never "0 résultats".
  // @req REQ-139 @req REQ-133
  it("states unavailability on a read failure rather than an empty corpus", async () => {
    mockGetPage.mockRejectedValueOnce(new Error("database unavailable"));

    render(await NomsHubPage({ searchParams: Promise.resolve({}) }));

    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toMatch(/aucun/i);
    expect(alert.textContent?.toLowerCase()).toContain("pas pu être charg");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("declares the canonical URL for the noms index", () => {
    expect(metadata.alternates?.canonical).toBe(
      getLocalizedRoute("fr", "patronymes")
    );
  });
});
