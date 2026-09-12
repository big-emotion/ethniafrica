import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCountryLanguagesFact } from "@/lib/supabase/queries/afrik/countryLanguages";
import { getLanguageRelations } from "@/lib/supabase/queries/afrik/languageFacet";
import { listAfrikLanguages } from "@/lib/supabase/queries/afrik/languages";
import { getAfrikPeopleIdsInCountry } from "@/lib/supabase/queries/afrik/peoples";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));
vi.mock("@/lib/supabase/queries/afrik/languageFacet", () => ({
  getLanguageRelations: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  listAfrikLanguages: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeopleIdsInCountry: vi.fn(),
}));

function roster(rows: Array<{ id: string; name: string }>) {
  vi.mocked(listAfrikLanguages).mockResolvedValue({
    languages: rows.map((row) => ({
      ...row,
      family: { id: "FLG_1", name: "Family" },
    })),
    total: rows.length,
    pageCount: 1,
  });
}

function metadata(rows: Array<{ id: string; nameProvenance?: string }>) {
  const query = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue({
      data: rows.map(({ id, nameProvenance }) => ({
        id,
        content: { nameProvenance },
      })),
      error: null,
    }),
  };
  query.select.mockReturnValue(query);
  mockSupabase.from.mockReturnValue(query);
  return query;
}

describe("country language provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-119
  it("keeps a country's own named languages authoritative without reading relations", async () => {
    const declared = [{ name: "Kirundi", isoCode: "run", isPrimary: true }];

    expect(await getCountryLanguagesFact("BDI", declared)).toEqual({
      value: declared,
      provenance: "declared",
    });
    expect(getLanguageRelations).not.toHaveBeenCalled();
    expect(listAfrikLanguages).not.toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // @req REQ-119
  it("derives only independently named languages spoken by resident peoples", async () => {
    vi.mocked(getAfrikPeopleIdsInCountry).mockResolvedValue([
      "PPL_TWA",
      "PPL_HUTU",
    ]);
    vi.mocked(getLanguageRelations).mockResolvedValue({
      countriesByLanguage: new Map([
        ["run", ["BDI", "RWA"]],
        ["ruf", ["BDI"]],
        ["xxx", ["BDI"]],
        ["yor", ["NGA"]],
      ]),
      peoplesByLanguage: new Map([
        ["run", ["PPL_HUTU", "PPL_RWA"]],
        ["ruf", ["PPL_TWA"]],
        ["xxx", ["PPL_TWA"]],
        ["yor", ["PPL_YORUBA"]],
      ]),
    });
    roster([
      { id: "ruf", name: " Kirundi " },
      { id: "run", name: "Kirundi" },
      { id: "xxx", name: "Inferred name" },
    ]);
    const query = metadata([
      { id: "ruf", nameProvenance: "sourced" },
      { id: "run", nameProvenance: "sourced" },
      { id: "xxx", nameProvenance: "derived" },
    ]);

    expect(await getCountryLanguagesFact("BDI", [])).toEqual({
      value: [{ name: "Kirundi", isoCode: "ruf" }],
      provenance: "derived",
      from: ["PPL_HUTU", "PPL_TWA"],
    });
    expect(getAfrikPeopleIdsInCountry).toHaveBeenCalledWith("BDI");
    expect(listAfrikLanguages).toHaveBeenCalledWith({
      page: 1,
      perPage: 3,
      filters: { ids: ["ruf", "run", "xxx"] },
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("afrik_languages");
    expect(query.in).toHaveBeenCalledWith("id", ["ruf", "run", "xxx"]);
  });

  // @req REQ-119
  it("returns missing when no resident speaking relation names a language", async () => {
    vi.mocked(getAfrikPeopleIdsInCountry).mockResolvedValue(["PPL_TWA"]);
    vi.mocked(getLanguageRelations).mockResolvedValue({
      countriesByLanguage: new Map([["run", ["RWA"]]]),
      peoplesByLanguage: new Map([["run", ["PPL_RWA"]]]),
    });

    expect(await getCountryLanguagesFact("BDI")).toEqual({
      value: [],
      provenance: "missing",
    });
    expect(listAfrikLanguages).not.toHaveBeenCalled();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // @req REQ-119
  it("does not publish partial provenance after a metadata read fails", async () => {
    vi.mocked(getAfrikPeopleIdsInCountry).mockResolvedValue(["PPL_TWA"]);
    vi.mocked(getLanguageRelations).mockResolvedValue({
      countriesByLanguage: new Map([["run", ["BDI"]]]),
      peoplesByLanguage: new Map([["run", ["PPL_TWA"]]]),
    });
    roster([{ id: "run", name: "Kirundi" }]);
    const query = {
      select: vi.fn(),
      in: vi
        .fn()
        .mockResolvedValue({ data: null, error: new Error("db down") }),
    };
    query.select.mockReturnValue(query);
    mockSupabase.from.mockReturnValue(query);

    await expect(getCountryLanguagesFact("BDI")).rejects.toThrow("db down");
  });
});
