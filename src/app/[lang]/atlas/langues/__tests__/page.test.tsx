import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockGetLanguageById = vi.fn();
const mockGetActiveSourceFlags = vi.fn();

vi.mock("@/api/v2/services/languageService", () => ({
  getLanguageById: (...args: unknown[]) => mockGetLanguageById(...args),
}));

vi.mock("@/lib/supabase/queries/afrik/flags", () => ({
  getActiveSourceFlags: (...args: unknown[]) =>
    mockGetActiveSourceFlags(...args),
}));

// PageLayout passthrough
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    children,
    heroHead,
  }: {
    children: React.ReactNode;
    heroHead?: React.ReactNode;
  }) => (
    <div data-testid="page-layout">
      {heroHead}
      {children}
    </div>
  ),
}));

// The record view stub — fed by the route now, not fetching its own fiche.
vi.mock("@/components/language/LanguageDetailViewV2", () => ({
  LanguageDetailViewV2: ({
    data,
    hasSourceFlag,
  }: {
    data: { id: string; name: string };
    hasSourceFlag?: boolean;
  }) => (
    <div
      data-testid="language-detail-live"
      data-language-id={data?.id}
      data-language-name={data?.name}
      data-source-flag={hasSourceFlag}
    >
      Dossier AFRIK
    </div>
  ),
}));

import { notFound } from "next/navigation";
import LanguesSlugPage from "../[slug]/page";
import { generateMetadata } from "../[slug]/page";
import type { LanguageDetail } from "@/api/v2/services/languageService";

const YORUBA: LanguageDetail = {
  id: "yor",
  name: "Yoruba",
  nameProvenance: "sourced",
  family: { id: "FLG_NIGER_CONGO", name: "Niger-Congo" },
  speakingPeoples: [{ id: "PPL_YORUBA", name: "Yoruba" }],
  vehicularRole: "Langue véhiculaire au Nigeria du Sud-Ouest",
  vitalityStatus: { status: "Institutional", scale: "EGIDS", asOf: 2026 },
  sources: [],
};

async function callPage(slug: string, lang = "fr") {
  return LanguesSlugPage({ params: Promise.resolve({ lang, slug }) });
}

describe("/[lang]/atlas/langues/[slug] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveSourceFlags.mockResolvedValue([]);
  });

  // @req REQ-136
  it("renders LanguageDetailViewV2 with the entity fed by the route", async () => {
    mockGetLanguageById.mockResolvedValue(YORUBA);

    const ui = await callPage("yor");
    const { render, screen } = await import("@testing-library/react");
    render(ui as React.ReactElement);

    expect(mockGetLanguageById).toHaveBeenCalledWith("yor");
    const record = screen.getByTestId("language-detail-live");
    expect(record).toHaveAttribute("data-language-id", "yor");
    expect(record).toHaveAttribute("data-language-name", "Yoruba");
  });

  // @req REQ-136
  it("404s on an unknown language id", async () => {
    mockGetLanguageById.mockResolvedValue(null);

    await expect(callPage("zzz")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  // The language layer has no revision history yet — a pinned or @latest
  // slug names a capability that does not exist for this entity.
  // @req REQ-136
  it("404s on a pinned (@vNN) slug rather than pretend to resolve a snapshot", async () => {
    await expect(callPage("yor@v3")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetLanguageById).not.toHaveBeenCalled();
  });

  // @req REQ-136
  it("404s on an @latest slug rather than pretend to resolve a version", async () => {
    await expect(callPage("yor@latest")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetLanguageById).not.toHaveBeenCalled();
  });

  // @req REQ-091
  it("generates a canonical URL dropping any version suffix", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "fr", slug: "yor@v3" }),
    });

    expect(metadata.alternates?.canonical).toBe(
      "https://ethniafrica.com/fr/atlas/langues/yor"
    );
  });
});
