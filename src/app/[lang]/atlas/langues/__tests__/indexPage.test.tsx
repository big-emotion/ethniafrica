import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The language facet of the atlas hub.
 *
 * It replaces an index that fetched the whole corpus on every render — 748
 * rows with an embedded family join — and filtered and paged it in memory,
 * against a `perPage: 1000` sitting exactly on PostgREST's max-rows ceiling.
 * Every assertion about a filter here is really an assertion that the
 * narrowing reaches the service rather than being applied to rows already
 * fetched.
 *
 * The frame is not this route's: `FacetHubShell` owns the `PageLayout`, the
 * accent, the switcher and the one globe the facets share.
 */

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn(),
  usePathname: () => getLocalizedRoute("fr", "languages"),
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

vi.mock("@/api/v2/services/languagesFacet", () => ({
  LANGUAGES_FACET_PAGE_SIZES: [48, 96],
  getLanguagesFacetPage: (...args: unknown[]) => mockGetPage(...args),
  getLanguagesFacetCountryIndex: (...args: unknown[]) => mockGetIndex(...args),
  getLanguagesFacetChoices: (...args: unknown[]) => mockGetChoices(...args),
}));

import LanguesHubPage, { generateMetadata } from "../page";

const FR = Promise.resolve({ lang: "fr" });
import { getLanguageRoute, getLocalizedRoute } from "@/lib/routing";

/** Two languages sharing one name — the corpus holds 748 for 532 names. */
const FULFULDE_FUF = {
  id: "fuf",
  name: "Fulfulde",
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
};
const FULFULDE_FUV = {
  id: "fuv",
  name: "Fulfulde",
  family: { id: "FLG_AFRO_ASIATIQUE", name: "Afro-asiatique" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetChoices.mockResolvedValue({
    families: [{ id: "FLG_NIGER_CONGO", label: "Niger-Congo" }],
    countries: [{ id: "MLI", label: "Mali" }],
  });
  mockGetPage.mockResolvedValue({
    languages: [FULFULDE_FUF, FULFULDE_FUV],
    page: 1,
    total: 2,
    totalPages: 1,
  });
  mockGetIndex.mockResolvedValue([
    { id: "fuf", name: "Fulfulde", countryIds: ["MLI"] },
  ]);
});

describe("the language facet page", () => {
  // @req REQ-139 @req REQ-136
  it("lists the languages of the selection and links each to its fiche", async () => {
    render(
      await LanguesHubPage({ params: FR, searchParams: Promise.resolve({}) })
    );

    const links = screen.getAllByRole("link", { name: /Fulfulde/ });
    expect(links[0]).toHaveAttribute("href", getLanguageRoute("fr", "fuf"));
  });

  /**
   * 748 languages for 532 distinct names — « Fulfulde » names both `fuf` and
   * `fuv` — so a row that printed the name alone would show the reader the
   * same entry twice and link them to two different fiches.
   */
  // @req REQ-136
  it("visibly distinguishes a homonym pair by family and id", async () => {
    const { container } = render(
      await LanguesHubPage({ params: FR, searchParams: Promise.resolve({}) })
    );

    expect(container.textContent).toContain("Niger-Congo · fuf");
    expect(container.textContent).toContain("Afro-asiatique · fuv");
  });

  // @req REQ-139
  it("carries the reader's narrowing to the service, not to the rendered page", async () => {
    render(
      await LanguesHubPage({
        params: FR,
        searchParams: Promise.resolve({
          pays: "MLI",
          famille: "FLG_NIGER_CONGO",
          lettre: "f",
        }),
      })
    );

    expect(mockGetPage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        countryId: "MLI",
        familyId: "FLG_NIGER_CONGO",
        letter: "F",
      }),
      48
    );
    expect(mockGetIndex).toHaveBeenCalledWith(
      expect.objectContaining({ countryId: "MLI" })
    );
  });

  /**
   * The map and the list read one selection. A country is addressable on the
   * globe exactly when the current selection places a language in it.
   */
  // @req REQ-117
  it("publishes the selection's languages to the shared globe", async () => {
    render(
      await LanguesHubPage({ params: FR, searchParams: Promise.resolve({}) })
    );

    const published = screen.getByTestId("published-country-index");
    const index = JSON.parse(published.getAttribute("data-index") ?? "{}");

    expect(index.MLI).toEqual([
      { id: "fuf", label: "Fulfulde", href: getLanguageRoute("fr", "fuf") },
    ]);
  });

  // A read failure is not an empty corpus — the page must say "unavailable",
  // never "0 résultats".
  // @req REQ-139
  it("states unavailability on a read failure rather than an empty corpus", async () => {
    mockGetPage.mockRejectedValueOnce(new Error("database unavailable"));

    render(
      await LanguesHubPage({ params: FR, searchParams: Promise.resolve({}) })
    );

    const status = screen.getByRole("status");
    expect(status.textContent).not.toMatch(/aucune/i);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // @req REQ-091
  it("declares the canonical URL for the langues index", async () => {
    const metadata = await generateMetadata({ params: FR });

    expect(metadata.alternates?.canonical).toBe(
      getLocalizedRoute("fr", "languages")
    );
  });

  // @req REQ-140
  it("composes the canonical and the fiche links in the route's locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "en" }),
    });
    expect(metadata.alternates?.canonical).toBe(
      getLocalizedRoute("en", "languages")
    );

    render(
      await LanguesHubPage({
        params: Promise.resolve({ lang: "en" }),
        searchParams: Promise.resolve({}),
      })
    );
    const links = screen.getAllByRole("link", { name: /Fulfulde/ });
    expect(links[0]).toHaveAttribute("href", getLanguageRoute("en", "fuf"));
  });
});
