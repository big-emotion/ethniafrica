import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetPublicFlagsPage } = vi.hoisted(() => ({
  mockGetPublicFlagsPage: vi.fn(),
}));
const { pageLayoutProps } = vi.hoisted(() => ({
  pageLayoutProps: vi.fn(),
}));
const { unstableCacheMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn(
    (callback: (...args: unknown[]) => unknown) => callback
  ),
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
}));

vi.mock("@/lib/supabase/queries/flags/getPublicFlagsPage", () => ({
  getPublicFlagsPage: (...args: unknown[]) => mockGetPublicFlagsPage(...args),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    title,
    ...props
  }: {
    children: React.ReactNode;
    title?: string;
  }) => {
    pageLayoutProps({ title, ...props });
    return (
      <div data-testid="page-layout">
        <h1>{title}</h1>
        {children}
      </div>
    );
  },
}));

vi.mock("@/components/flags/PublicFlagsQueue", () => ({
  PublicFlagsQueue: ({
    initialPage,
    initialFilters,
  }: {
    initialPage: unknown;
    initialFilters?: unknown;
  }) => (
    <div
      data-testid="public-flags-queue"
      data-page={JSON.stringify(initialPage)}
      data-filters={JSON.stringify(initialFilters)}
    >
      <h2>Signalement rendu côté serveur</h2>
    </div>
  ),
}));

import SignalementsPage, { metadata } from "../page";

const initialPage = {
  items: [],
  nextCursor: null,
};

describe("/[lang]/signalements page", () => {
  beforeEach(() => {
    mockGetPublicFlagsPage.mockClear();
    pageLayoutProps.mockClear();
    mockGetPublicFlagsPage.mockResolvedValue(initialPage);
  });

  // @req REQ-014
  it("queries the unfiltered SSR page without using dynamic search params", async () => {
    const ui = await SignalementsPage();
    render(ui);

    expect(mockGetPublicFlagsPage).toHaveBeenCalledWith({
      pageSize: 50,
    });
    expect(screen.getByTestId("public-flags-queue")).toHaveAttribute(
      "data-page",
      JSON.stringify(initialPage)
    );
    expect(screen.getByTestId("public-flags-queue")).toHaveAttribute(
      "data-filters",
      JSON.stringify({})
    );
    expect(pageLayoutProps).toHaveBeenCalledWith(
      expect.not.objectContaining({ onLanguageChange: expect.any(Function) })
    );
  });

  // @req REQ-014
  it("keeps one h1 above queue-row h2 headings", async () => {
    const ui = await SignalementsPage();
    render(ui);

    expect(mockGetPublicFlagsPage).toHaveBeenCalledWith({
      pageSize: 50,
    });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tous les signalements",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Signalement rendu côté serveur",
      })
    ).toBeInTheDocument();
  });

  // @req REQ-014
  it("exports the public index metadata and caches its data for one minute", () => {
    expect(metadata).toEqual({
      title: "Tous les signalements — EthniAfrica",
      description:
        "Transparence éditoriale — explorez les signalements de la communauté",
    });
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ["public-flags-index"],
      { revalidate: 60 }
    );
  });
});
