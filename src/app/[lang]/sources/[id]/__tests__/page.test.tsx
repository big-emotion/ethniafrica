import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Source } from "@/api/v2/schemas/sources";
import { getPeopleRoute } from "@/lib/routing";

const { getSourceByIdMock, getSourceCitationsMock, notFoundMock } = vi.hoisted(
  () => ({
    getSourceByIdMock: vi.fn(),
    getSourceCitationsMock: vi.fn(),
    notFoundMock: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
  })
);

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

vi.mock("@/api/v2/services/sources", () => ({
  getSourceById: getSourceByIdMock,
}));

vi.mock("@/api/v2/services/sourceCitations", () => ({
  getSourceCitations: getSourceCitationsMock,
}));

/** The real shell prints `title` as the page's h1; the double keeps that much. */
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
  }: {
    children: ReactNode;
    title?: string;
  }) => (
    <div data-testid="page-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

import SourcePage from "../page";

const ID = "11111111-1111-4111-8111-111111111111";

const source: Source = {
  id: ID,
  sourceKey: null,
  sourceKind: null,
  tier: "official",
  identifiers: null,
  title: "Ethnologue: Languages of the World, 27th edition",
  url: "https://www.ethnologue.com",
  pinnedUrl: null,
  year: 2024,
  author: "SIL International",
  publisher: null,
  resolvable: null,
  lastVerifiedAt: null,
  notes: "Catalogue entry — official tier by domain.",
  page: null,
  addedAt: null,
  policy: {
    key: "ethnologue",
    tier: "official",
    sourceKind: "linguistic_reference",
  },
};

function renderRoute(id: string) {
  return SourcePage({ params: Promise.resolve({ lang: "fr", id }) });
}

describe("source page", () => {
  beforeEach(() => {
    getSourceByIdMock.mockReset().mockResolvedValue(source);
    getSourceCitationsMock
      .mockReset()
      .mockResolvedValue({ total: 0, entities: [], truncated: false });
    notFoundMock.mockClear();
  });

  /**
   * The route is addressed by UUID, so a malformed segment is not a missing
   * source — it is not an identifier at all, and asking the database about it
   * spends a round trip to learn what the string already said.
   */
  // @req REQ-092
  it("refuses a malformed identifier without asking the database", async () => {
    await expect(renderRoute("pas-un-uuid")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(getSourceByIdMock).not.toHaveBeenCalled();
  });

  // @req REQ-092
  it("answers 404 for an identifier the table does not hold", async () => {
    getSourceByIdMock.mockResolvedValue(null);

    await expect(renderRoute(ID)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  // @req REQ-092
  it("states the source, its standing, and why it carries that standing", async () => {
    render(await renderRoute(ID));

    expect(screen.getByText(/Ethnologue/)).toBeInTheDocument();
    expect(screen.getByText("Officielle")).toBeInTheDocument();
    expect(
      screen.getByText("Catalogue entry — official tier by domain.")
    ).toBeInTheDocument();
  });

  // @req REQ-092
  it("opens the work itself without handing it the referrer", async () => {
    render(await renderRoute(ID));

    const outward = screen.getByRole("link", {
      name: /www\.ethnologue\.com/,
    });
    expect(outward).toHaveAttribute("rel", "noreferrer noopener");
    expect(outward).toHaveAttribute("target", "_blank");
  });

  /**
   * The direction that turns a list of titles into something a reader can act
   * on: a source nothing cites is a claim about the corpus, and one fifty
   * fiches rest on is a different object entirely.
   */
  // @req REQ-093
  it("names the fiches that rest on the source", async () => {
    getSourceCitationsMock.mockResolvedValue({
      total: 18,
      entities: [
        {
          entityType: "people",
          entityId: "PPL_YORUBA",
          label: "Yoruba",
          href: getPeopleRoute("fr", "PPL_YORUBA"),
          assertionCount: 18,
        },
      ],
      truncated: false,
    });

    render(await renderRoute(ID));

    expect(screen.getByRole("link", { name: "Yoruba" })).toHaveAttribute(
      "href",
      getPeopleRoute("fr", "PPL_YORUBA")
    );
  });

  // @req REQ-093
  it("says plainly when nothing in the corpus rests on the source", async () => {
    render(await renderRoute(ID));

    expect(screen.getByTestId("source-citations-empty")).toBeInTheDocument();
  });

  /**
   * `assertions.entity_type` carries no CHECK constraint, so a type this app
   * cannot route is a live possibility. It reads as a line without a link,
   * never as a link that 404s.
   */
  // @req REQ-093
  it("lists an unroutable citation without inventing a link for it", async () => {
    getSourceCitationsMock.mockResolvedValue({
      total: 1,
      entities: [
        {
          entityType: "oral_narrative",
          entityId: "ORA_042",
          label: "ORA_042",
          href: null,
          assertionCount: 1,
        },
      ],
      truncated: false,
    });

    render(await renderRoute(ID));

    expect(screen.getByText("ORA_042")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ORA_042" })).toBeNull();
  });
});
