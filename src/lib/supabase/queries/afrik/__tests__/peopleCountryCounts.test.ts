import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getPeopleCountsByCountry,
  PEOPLE_COUNTRY_PAGE_SIZE,
} from "@/lib/supabase/queries/afrik/peopleCountryCounts";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => mockSupabase,
}));

describe("getPeopleCountsByCountry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Serves the given pages of afrik_people_countries through successive .range() calls. */
  function mockRelationPages(
    pages: Array<Array<{ country_id: string }>>,
    error: unknown = null
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = { select: vi.fn(), range: vi.fn() };
    chain.select.mockReturnValue(chain);
    let served = 0;
    chain.range.mockImplementation(() =>
      Promise.resolve({ data: error ? null : (pages[served++] ?? []), error })
    );
    mockSupabase.from.mockReturnValue(chain);
    return chain;
  }

  const fullPage = (countryId: string) =>
    Array.from({ length: PEOPLE_COUNTRY_PAGE_SIZE }, () => ({
      country_id: countryId,
    }));

  // @req REQ-110
  it("should walk the join table with an explicit range, which an unranged select would let PostgREST silently cap", async () => {
    const chain = mockRelationPages([fullPage("NGA"), [{ country_id: "KEN" }]]);

    const counts = await getPeopleCountsByCountry();

    expect(mockSupabase.from).toHaveBeenCalledWith("afrik_people_countries");
    expect(chain.select).toHaveBeenCalledWith("country_id");
    expect(chain.range).toHaveBeenNthCalledWith(
      1,
      0,
      PEOPLE_COUNTRY_PAGE_SIZE - 1
    );
    expect(chain.range).toHaveBeenNthCalledWith(
      2,
      PEOPLE_COUNTRY_PAGE_SIZE,
      PEOPLE_COUNTRY_PAGE_SIZE * 2 - 1
    );
    expect(counts.get("NGA")).toBe(PEOPLE_COUNTRY_PAGE_SIZE);
    expect(counts.get("KEN")).toBe(1);
  });

  // @req REQ-110
  it("should stop at the first short page instead of querying past the end of the table", async () => {
    const chain = mockRelationPages([
      [{ country_id: "NGA" }, { country_id: "KEN" }],
    ]);

    await getPeopleCountsByCountry();

    expect(chain.range).toHaveBeenCalledTimes(1);
  });

  // @req REQ-116
  it("should count one documented people per relation row of a country", async () => {
    mockRelationPages([
      [
        { country_id: "NGA" },
        { country_id: "NGA" },
        { country_id: "BEN" },
        { country_id: "NGA" },
      ],
    ]);

    const counts = await getPeopleCountsByCountry();

    expect(counts.get("NGA")).toBe(3);
    expect(counts.get("BEN")).toBe(1);
    expect(counts.has("KEN")).toBe(false);
  });

  // @req REQ-116
  it("should throw rather than return a half-walked corpus when a page fails", async () => {
    mockRelationPages([], { message: "boom" });

    await expect(getPeopleCountsByCountry()).rejects.toBeTruthy();
  });
});
