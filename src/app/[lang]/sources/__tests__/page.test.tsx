import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Source } from "@/api/v2/schemas/sources";

/**
 * The sources directory.
 *
 * It replaces a bibliography of about ninety citations typed into a TSX file,
 * which had no relationship with the 4 395 sources the corpus actually rests
 * on. Every assertion here is really an assertion about *where* a narrowing is
 * applied: a directory that fetched a page and then dropped the rows that did
 * not match would page through "whichever of the first twenty happen to be
 * official", counted against a total describing the whole table.
 */

const { getSourcesFacetPageMock, getSourcesFacetChoicesMock } = vi.hoisted(
  () => ({
    getSourcesFacetPageMock: vi.fn(),
    getSourcesFacetChoicesMock: vi.fn(),
  })
);

vi.mock("@/api/v2/services/sourcesFacet", async () => {
  const actual = await vi.importActual<
    typeof import("@/api/v2/services/sourcesFacet")
  >("@/api/v2/services/sourcesFacet");
  return {
    ...actual,
    getSourcesFacetPage: getSourcesFacetPageMock,
    getSourcesFacetChoices: getSourcesFacetChoicesMock,
  };
});

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
  }: {
    children: ReactNode;
    title?: string;
  }) => (
    <div data-testid="page-layout" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/pages/SourcesPageContent", () => ({
  default: () => <div data-testid="legacy-bibliography" />,
}));

import SourcesPage from "../page";

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    sourceKey: null,
    sourceKind: null,
    tier: "official",
    identifiers: null,
    title: "Ethnologue",
    url: "https://www.ethnologue.com",
    pinnedUrl: null,
    year: null,
    author: null,
    publisher: null,
    resolvable: null,
    lastVerifiedAt: null,
    notes: null,
    page: null,
    addedAt: null,
    policy: { key: "ethnologue", tier: "official", sourceKind: "unknown" },
    ...overrides,
  };
}

function renderRoute(query: Record<string, string> = {}) {
  return SourcesPage({
    params: Promise.resolve({ lang: "fr" }),
    searchParams: Promise.resolve(query),
  });
}

describe("sources directory", () => {
  beforeEach(() => {
    getSourcesFacetPageMock.mockReset().mockResolvedValue({
      sources: [makeSource()],
      page: 1,
      total: 1,
      totalPages: 1,
    });
    getSourcesFacetChoicesMock.mockReset().mockResolvedValue({
      standings: [{ id: "official", label: "Officielle", count: 1037 }],
      sourceKinds: [],
      decades: [],
      total: 4395,
      withSourceKind: 20,
    });
  });

  // @req REQ-114
  it("narrows at the database rather than in the render", async () => {
    render(await renderRoute({ q: "ethnologue", autorite: "official" }));

    expect(getSourcesFacetPageMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ search: "ethnologue", standing: "official" }),
      20
    );
  });

  /**
   * An empty `<option value="">` submits an empty string. Read as a value it
   * narrows the corpus to nothing; read as "no filter" it does what the reader
   * meant by choosing the blank line.
   */
  // @req REQ-114
  it("reads an empty select as no filter at all", async () => {
    render(await renderRoute({ autorite: "", q: "   " }));

    expect(getSourcesFacetPageMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ standing: null, search: null }),
      20
    );
  });

  // @req REQ-108
  it("carries the requested page and size through to the query", async () => {
    render(await renderRoute({ page: "3", taille: "50" }));

    expect(getSourcesFacetPageMock).toHaveBeenCalledWith(
      3,
      expect.anything(),
      50
    );
  });

  // @req REQ-114
  it("states how many sources the selection holds", async () => {
    getSourcesFacetPageMock.mockResolvedValue({
      sources: [makeSource()],
      page: 1,
      total: 4395,
      totalPages: 220,
    });

    render(await renderRoute());

    // One string, not text around an expression: JSX drops the whitespace
    // between an expression and the text on the next line, which reads as
    // "4 395 sourcesdans cette sélection".
    expect(screen.getByTestId("sources-lede").textContent).toMatch(
      /4\s395 sources dans cette sélection/
    );
  });

  // @req REQ-114
  it("links each row to the source's own page", async () => {
    render(await renderRoute());

    expect(screen.getByRole("link", { name: /Ethnologue/ })).toHaveAttribute(
      "href",
      "/fr/sources/11111111-1111-1111-1111-111111111111"
    );
  });

  // @req REQ-092
  it("shows an unclassified source as awaiting review, never as unverified", async () => {
    getSourcesFacetPageMock.mockResolvedValue({
      sources: [makeSource({ tier: null })],
      page: 1,
      total: 1,
      totalPages: 1,
    });

    render(await renderRoute());

    expect(screen.getByText("En attente d'examen")).toBeInTheDocument();
    expect(screen.queryByText("Non vérifiée")).not.toBeInTheDocument();
  });

  // @req REQ-114
  it("names the empty state and offers the way back to the whole bibliography", async () => {
    getSourcesFacetPageMock.mockResolvedValue({
      sources: [],
      page: 1,
      total: 0,
      totalPages: 1,
    });

    render(await renderRoute({ q: "zzzz" }));

    expect(screen.getByTestId("sources-facet-empty")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /toutes les sources/i })
    ).toHaveAttribute("href", "/fr/sources");
  });

  /**
   * A facet that offers a narrowing set on twenty of 4 395 rows must say so.
   * The charter forbids asserting an absence by silence, and a reader who
   * filters by provenance and sees the corpus almost vanish deserves the
   * reason on screen rather than in a ticket.
   */
  // @req REQ-114
  it("owns up to how sparsely provenance is recorded", async () => {
    render(await renderRoute());

    expect(screen.getByTestId("sources-provenance-note").textContent).toMatch(
      /20 sources sur 4\s395/
    );
  });

  /**
   * The hand-written bibliography is kept: it carries about ninety citations
   * written by hand that the table does not hold in that form, and deleting it
   * would lose them to gain tidiness.
   */
  // @req REQ-114
  it("keeps the project's written bibliography below the directory", async () => {
    render(await renderRoute());

    expect(screen.getByTestId("legacy-bibliography")).toBeInTheDocument();
  });
});
