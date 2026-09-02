import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListAfrikLanguages } = vi.hoisted(() => ({
  mockListAfrikLanguages: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  listAfrikLanguages: (...args: unknown[]) => mockListAfrikLanguages(...args),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import LanguesPage, { metadata } from "../page";
import type { AfrikLanguageListItem } from "@/lib/supabase/queries/afrik/languages";
import { getLanguageRoute, getLocalizedRoute } from "@/lib/routing";

const FULFULDE_FUF: AfrikLanguageListItem = {
  id: "fuf",
  name: "Fulfulde",
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
};

const FULFULDE_FUV: AfrikLanguageListItem = {
  id: "fuv",
  name: "Fulfulde",
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
};

const YORUBA: AfrikLanguageListItem = {
  id: "yor",
  name: "Yoruba",
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
};

describe("the languages index page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-139
  // @req REQ-136
  it("renders a paginated list of languages, each linking to its fiche", async () => {
    mockListAfrikLanguages.mockResolvedValueOnce({
      languages: [YORUBA, FULFULDE_FUF],
      total: 2,
      pageCount: 1,
    });

    const ui = await LanguesPage({ searchParams: Promise.resolve({}) });
    render(ui);

    const yorubaLink = screen.getByRole("link", { name: /Yoruba/ });
    expect(yorubaLink).toHaveAttribute("href", getLanguageRoute("fr", "yor"));

    const fulfuldeLinks = screen.getAllByRole("link", { name: /Fulfulde/ });
    expect(fulfuldeLinks[0]).toHaveAttribute(
      "href",
      getLanguageRoute("fr", "fuf")
    );
  });

  // A homonym pair must never render as two indistinguishable rows: the
  // corpus has 748 languages for 532 distinct names.
  // @req REQ-139
  // @req REQ-136
  it("visibly distinguishes a homonym pair by family and id", async () => {
    mockListAfrikLanguages.mockResolvedValueOnce({
      languages: [FULFULDE_FUF, FULFULDE_FUV],
      total: 2,
      pageCount: 1,
    });

    const ui = await LanguesPage({ searchParams: Promise.resolve({}) });
    render(ui);

    const fulfuldeLinks = screen.getAllByRole("link", { name: /Fulfulde/ });
    expect(fulfuldeLinks).toHaveLength(2);
    expect(fulfuldeLinks[0]).toHaveAttribute(
      "href",
      getLanguageRoute("fr", "fuf")
    );
    expect(fulfuldeLinks[1]).toHaveAttribute(
      "href",
      getLanguageRoute("fr", "fuv")
    );
    // Same name, different id — both must surface the id text so the two
    // rows read as distinct entries, not a duplicate.
    expect(screen.getByText(/Niger-Congo · fuf/)).toBeInTheDocument();
    expect(screen.getByText(/Niger-Congo · fuv/)).toBeInTheDocument();
  });

  // A failed corpus read must never be presented as an empty corpus.
  // @req REQ-139
  // @req REQ-136
  it("renders an explicit unavailability state on a Supabase read failure, not an empty corpus", async () => {
    mockListAfrikLanguages.mockRejectedValueOnce(
      new Error("database unavailable")
    );

    const ui = await LanguesPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByRole("status")).toHaveTextContent(
      /momentanément indisponibles/
    );
    expect(screen.queryByText(/Aucune langue/)).not.toBeInTheDocument();
  });

  // @req REQ-139
  it("declares a canonical URL for the index", () => {
    expect(metadata.alternates?.canonical).toBe(
      getLocalizedRoute("fr", "languages")
    );
  });
});
