import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListNames } = vi.hoisted(() => ({
  mockListNames: vi.fn(),
}));

vi.mock("@/api/v2/services/names", () => {
  class NamesSchemaUnavailableError extends Error {}

  return {
    NamesSchemaUnavailableError,
    listNames: (...args: unknown[]) => mockListNames(...args),
  };
});

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/names/NamesAtlasView", () => ({
  NamesAtlasView: ({ initialTotal }: { initialTotal: number }) => (
    <div data-testid="names-atlas" data-total={initialTotal} />
  ),
}));

import {
  NamesSchemaUnavailableError,
  type ListNamesResult,
} from "@/api/v2/services/names";
import NomsPage from "../page";

describe("/[lang]/noms page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListNames.mockResolvedValue({ names: [], total: 0 });
  });

  // @req REQ-056
  it("renders the atlas when the names schema has not been deployed yet", async () => {
    mockListNames.mockRejectedValueOnce(
      new NamesSchemaUnavailableError("name_records is unavailable")
    );

    const ui = await NomsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByTestId("names-atlas")).toHaveAttribute(
      "data-total",
      "0"
    );
  });

  // @req REQ-056
  it("does not hide unrelated database failures", async () => {
    mockListNames.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      NomsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("database unavailable");
  });

  // @req REQ-056
  it("passes successful results to the atlas", async () => {
    mockListNames.mockResolvedValueOnce({
      names: [],
      total: 4,
    } satisfies ListNamesResult);

    const ui = await NomsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByTestId("names-atlas")).toHaveAttribute(
      "data-total",
      "4"
    );
  });

  // ETNI-1196/DEC-019: the lede must state which question the ethnonym
  // atlas answers, so a visitor is not left inferring it from the title.
  // @req REQ-022
  it("renders a lede stating which question the module answers", async () => {
    const ui = await NomsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(
      screen.getByText(/Comment un peuple se nomme-t-il/)
    ).toBeInTheDocument();
  });

  // ETNI-1196/DEC-019: a visitor looking for the origin of a family name
  // must be told that personal-name genealogy is not (yet) covered.
  // @req REQ-092
  it("renders a note that personal-name genealogy is not yet covered", async () => {
    const ui = await NomsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(
      screen.getByText(
        /ne couvre pas encore la généalogie des noms de personnes/
      )
    ).toBeInTheDocument();
  });
});
