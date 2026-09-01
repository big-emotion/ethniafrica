import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListNameForms, mockGetNameTypeCounts } = vi.hoisted(() => ({
  mockListNameForms: vi.fn(),
  mockGetNameTypeCounts: vi.fn(),
}));

vi.mock("@/api/v2/services/names", () => {
  class NamesSchemaUnavailableError extends Error {}

  return {
    NamesSchemaUnavailableError,
    listNameForms: (...args: unknown[]) => mockListNameForms(...args),
    getNameTypeCounts: (...args: unknown[]) => mockGetNameTypeCounts(...args),
  };
});

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/names/NameNomenclature", () => ({
  NameNomenclature: ({
    total,
    page,
    perPage,
  }: {
    total: number;
    page: number;
    perPage: number;
  }) => (
    <div
      data-testid="nomenclature"
      data-total={total}
      data-page={page}
      data-per-page={perPage}
    />
  ),
}));

import { NamesSchemaUnavailableError } from "@/api/v2/services/names";
import AppellationsPage from "../page";

describe("the Appellations nomenclature page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListNameForms.mockResolvedValue({ forms: [], total: 0, pageCount: 1 });
    mockGetNameTypeCounts.mockResolvedValue({ byType: {}, imposed: 0 });
  });

  // @req REQ-056
  it("renders an empty nomenclature when the name-forms view is not deployed yet", async () => {
    mockListNameForms.mockRejectedValueOnce(
      new NamesSchemaUnavailableError("afrik_name_forms is unavailable")
    );

    const ui = await AppellationsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByTestId("nomenclature")).toHaveAttribute(
      "data-total",
      "0"
    );
  });

  // @req REQ-056
  it("does not hide unrelated database failures", async () => {
    mockListNameForms.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      AppellationsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("database unavailable");
  });

  // @req REQ-054
  it("asks the service for the page the URL names", async () => {
    mockListNameForms.mockResolvedValueOnce({
      forms: [],
      total: 3134,
      pageCount: 66,
    });

    const ui = await AppellationsPage({
      searchParams: Promise.resolve({ page: "3", nameType: "exonym" }),
    });
    render(ui);

    expect(mockListNameForms).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, nameType: "exonym" })
    );
    expect(screen.getByTestId("nomenclature")).toHaveAttribute(
      "data-total",
      "3134"
    );
  });

  // A hand-edited URL is this page's state, so an unknown filter value must
  // degrade to the default listing rather than 500 the route.
  // @req REQ-054
  it("falls back to the first page when the URL carries an unreadable filter", async () => {
    const ui = await AppellationsPage({
      searchParams: Promise.resolve({ nameType: "not-a-type", page: "0" }),
    });
    render(ui);

    const [askedFor] = mockListNameForms.mock.calls[0];
    expect(askedFor.page).toBe(1);
    expect(askedFor.nameType).toBeUndefined();
  });

  // ETNI-1196/DEC-019: the lede must state which question the ethnonym
  // atlas answers, so a visitor is not left inferring it from the title.
  // @req REQ-022
  it("renders a lede stating which question the module answers", async () => {
    const ui = await AppellationsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(
      screen.getByText(/Comment un peuple se nomme-t-il/)
    ).toBeInTheDocument();
  });

  // DEC-038 separates the two objects the corpus calls "name". A visitor
  // looking for the origin of a family name must be sent to the Nom
  // dimension, which now exists, rather than told it does not.
  // @req REQ-092
  it("sends a visitor after a family name to the Nom dimension", async () => {
    const ui = await AppellationsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByText(/C'est la dimension Nom/)).toBeInTheDocument();
  });
});
