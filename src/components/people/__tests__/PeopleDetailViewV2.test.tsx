import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { PeopleDetailViewV2 } from "../PeopleDetailViewV2";
import type { PeoplePageData } from "@/lib/peopleDataTransformer";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";

vi.mock("@/lib/afrikLoader", () => ({
  getPeople: vi.fn(async () => ({ id: "PPL_EWE" })),
}));

const basePageData: PeoplePageData = {
  hero: {
    peopleId: "PPL_EWE",
    nameMain: "Ewe",
    exonyms: [],
    languageFamilyId: "FLG_KWA",
    currentCountries: ["GHA", "TGO"],
  },
  origin: {
    migrationRoutes: [],
    historicalSettlementZones: [],
  },
  language: { isoCodes: [], dialects: [] },
  history: {},
  culture: { intermediates: [], symbols: [] },
  relatedPeoples: { ethnicities: [] },
  countries: {
    totalPopulation: 0,
    totalPopulationFormatted: "0",
    distributions: [],
  },
  sources: "",
};

vi.mock("@/lib/peopleDataTransformer", () => ({
  transformPeopleData: vi.fn(() => basePageData),
}));

const twoCountryFragmentation: PeopleFragmentation = {
  peopleId: "PPL_EWE",
  autonym: "Eʋeawo",
  exonym: "Ewe",
  countryCount: 2,
  countries: [
    { iso3: "GHA", nameFr: "Ghana", populationShare: 0.55, assertionId: null },
    { iso3: "TGO", nameFr: "Togo", populationShare: 0.45, assertionId: null },
  ],
  borderPairs: [],
};

function mockFragmentationFetch(
  response: { ok: boolean; json: () => Promise<unknown> } | null
) {
  global.fetch = vi.fn(async (url: string | URL) => {
    if (String(url).includes("/fragmentation")) {
      return (response ?? { ok: false, json: async () => ({}) }) as Response;
    }
    return { ok: false, json: async () => ({}) } as Response;
  }) as unknown as typeof fetch;
}

describe("PeopleDetailViewV2 — fragmentation wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // @req REQ-091
  it("renders the fragmentation section when the endpoint returns >= 2 countries", async () => {
    mockFragmentationFetch({
      ok: true,
      json: async () => ({ data: twoCountryFragmentation }),
    });

    render(<PeopleDetailViewV2 peopleId="PPL_EWE" />);

    await waitFor(() => {
      expect(screen.getByText("Fragmentation coloniale")).toBeInTheDocument();
    });
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  // @req REQ-091
  it("does not render the section when the endpoint has no data (single-country / 422)", async () => {
    mockFragmentationFetch({ ok: false, json: async () => ({}) });

    render(<PeopleDetailViewV2 peopleId="PPL_EWE" />);

    await waitFor(() => {
      expect(screen.getAllByText("Ewe").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Fragmentation coloniale")).toBeNull();
  });

  // @req REQ-091
  it("does not break the rest of the fiche when the fragmentation fetch errors", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network error");
    }) as unknown as typeof fetch;

    render(<PeopleDetailViewV2 peopleId="PPL_EWE" />);

    await waitFor(() => {
      expect(screen.getAllByText("Ewe").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Fragmentation coloniale")).toBeNull();
  });
});
