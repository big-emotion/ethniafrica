import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockGetPeopleById = vi.fn();
const mockGetEgoNetwork = vi.fn();
const mockGetLanguageFamilyById = vi.fn();

vi.mock("@/api/v2/services/peopleService", () => ({
  getPeopleById: (...args: unknown[]) => mockGetPeopleById(...args),
}));

vi.mock("@/api/v2/services/relations", () => ({
  getEgoNetwork: (...args: unknown[]) => mockGetEgoNetwork(...args),
}));

vi.mock("@/api/v2/services/languageFamilyService", () => ({
  getLanguageFamilyById: (...args: unknown[]) =>
    mockGetLanguageFamilyById(...args),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-layout">{children}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Import page AFTER mocks
// ---------------------------------------------------------------------------
import { notFound } from "next/navigation";
import PeopleLinksPage, { generateMetadata } from "../page";
import { RELATIONS } from "@/components/fiche/__tests__/ficheContextFixtures";

async function renderPage(slug: string, lang = "fr") {
  const ui = await PeopleLinksPage({
    params: Promise.resolve({ lang, slug }),
  });
  return render(ui as React.ReactElement);
}

async function callPage(slug: string, lang = "fr") {
  return PeopleLinksPage({ params: Promise.resolve({ lang, slug }) });
}

const YORUBA_ROW = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  currentCountries: ["NGA", "BEN"],
  content: {},
};

describe("/[lang]/peuples/[slug]/liens page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPeopleById.mockResolvedValue(YORUBA_ROW);
    mockGetEgoNetwork.mockResolvedValue({ sourced: [], derived: [] });
    mockGetLanguageFamilyById.mockResolvedValue({
      id: "FLG_NIGER_CONGO",
      nameFr: "Niger-Congo",
      content: {},
    });
  });

  // @req REQ-097 FR72
  it("404s when the people does not exist", async () => {
    mockGetPeopleById.mockResolvedValue(null);
    await expect(callPage("PPL_UNKNOWN")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  // @req REQ-097 FR72
  it("renders the AFRIK-hierarchy breadcrumb down to the people and the current page", async () => {
    await renderPage("PPL_YORUBA");

    const nav = screen.getByRole("navigation", { name: "Fil d'ariane" });
    expect(nav).toHaveTextContent("Familles");
    expect(nav).toHaveTextContent("Niger-Congo");
    expect(nav).toHaveTextContent("Yoruba");
    expect(nav).toHaveTextContent("Liens");
    expect(screen.getByRole("link", { name: "Yoruba" })).toHaveAttribute(
      "href",
      "/fr/peuples/PPL_YORUBA"
    );
  });

  // @req REQ-097 FR72
  it("server-renders RelationsList from the ego-network fixture payload", async () => {
    mockGetEgoNetwork.mockResolvedValue({ sourced: RELATIONS, derived: [] });

    await renderPage("PPL_YORUBA");

    expect(screen.getByText("Fon")).toBeInTheDocument();
    expect(mockGetEgoNetwork).toHaveBeenCalledWith("PPL_YORUBA");
  });

  // @req REQ-097 FR72
  it("renders a calm empty state when the corpus has no relations", async () => {
    await renderPage("PPL_YORUBA");
    expect(screen.getByText(/aucune relation documentée/i)).toBeInTheDocument();
  });

  // @req REQ-097 FR72
  it("builds French metadata for the people's links page", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "fr", slug: "PPL_YORUBA" }),
    });
    expect(metadata.title).toContain("Yoruba");
    expect(typeof metadata.description).toBe("string");
  });

  // @req REQ-097 FR72
  it("metadata 404s gracefully when the people does not exist", async () => {
    mockGetPeopleById.mockResolvedValue(null);
    const metadata = await generateMetadata({
      params: Promise.resolve({ lang: "fr", slug: "PPL_UNKNOWN" }),
    });
    expect(metadata.title).toBeTruthy();
  });
});
