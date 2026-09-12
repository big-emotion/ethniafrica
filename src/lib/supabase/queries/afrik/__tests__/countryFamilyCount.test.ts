import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCountryFamilyCount } from "@/lib/supabase/queries/afrik/countryFamilyCount";
import { getAfrikPeopleIdsInCountry } from "@/lib/supabase/queries/afrik/peoples";

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeopleIdsInCountry: vi.fn(),
}));

describe("country linguistic family count", () => {
  beforeEach(() => vi.clearAllMocks());

  // @req REQ-151
  it("counts distinct family IDs across all resident peoples", async () => {
    vi.mocked(getAfrikPeopleIdsInCountry).mockResolvedValue([
      "PPL_1",
      "PPL_2",
      "PPL_3",
    ]);
    const query = {
      select: vi.fn(),
      in: vi.fn().mockResolvedValue({
        data: [
          { language_family_id: "FLG_BANTU" },
          { language_family_id: "FLG_BANTU" },
          { language_family_id: "FLG_NIGERCONGO" },
        ],
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    mockSupabase.from.mockReturnValue(query);

    expect(await getCountryFamilyCount("BDI")).toBe(2);
    expect(query.in).toHaveBeenCalledWith("id", ["PPL_1", "PPL_2", "PPL_3"]);
  });

  // @req REQ-151
  it("reports missing rather than zero when no resident people is recorded", async () => {
    vi.mocked(getAfrikPeopleIdsInCountry).mockResolvedValue([]);

    expect(await getCountryFamilyCount("BDI")).toBeNull();
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
