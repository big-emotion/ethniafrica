import { describe, it, expect, vi } from "vitest";

// unstable_cache registrations happen at module load, so they are recorded
// outside the mock — beforeEach's clearAllMocks would otherwise erase them.
const { unstableCacheMock, cacheRegistrations } = vi.hoisted(() => {
  const registrations: Array<{ keys: unknown; options: unknown }> = [];
  return {
    cacheRegistrations: registrations,
    unstableCacheMock: vi.fn(
      (
        callback: (...args: unknown[]) => unknown,
        keys: unknown,
        options: unknown
      ) => {
        registrations.push({ keys, options });
        return callback;
      }
    ),
  };
});
vi.mock("next/cache", () => ({ unstable_cache: unstableCacheMock }));

vi.mock("@/lib/supabase/queries/afrik/peopleCountryCounts", () => ({
  getPeopleCountsByCountry: vi.fn(),
}));

import { getContinentPeopleCounts } from "../continentPeopleCounts";
import { getPeopleCountsByCountry } from "@/lib/supabase/queries/afrik/peopleCountryCounts";

describe("getContinentPeopleCounts", () => {
  // @req REQ-116
  it("should hand the continent scene a plain record, which is what survives the cache round trip a Map would not", async () => {
    vi.mocked(getPeopleCountsByCountry).mockResolvedValue(
      new Map([
        ["NGA", 40],
        ["KEN", 12],
      ])
    );

    const counts = await getContinentPeopleCounts();

    expect(counts).toEqual({ NGA: 40, KEN: 12 });
    expect(counts).not.toBeInstanceOf(Map);
    expect(JSON.parse(JSON.stringify(counts))).toEqual(counts);
  });

  // @req REQ-116
  it("should cache the walk of the join table for an hour rather than repeat it on every hub render", () => {
    expect(cacheRegistrations).toContainEqual({
      keys: ["continent-people-counts"],
      options: { revalidate: 3600 },
    });
  });
});
