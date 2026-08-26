import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPeoplesMock, getCountriesMock, countAfrikLanguageFamiliesMock } =
  vi.hoisted(() => ({
    getPeoplesMock: vi.fn(),
    getCountriesMock: vi.fn(),
    countAfrikLanguageFamiliesMock: vi.fn(),
  }));

vi.mock("@/api/v2/services/peopleService", () => ({
  getPeoples: getPeoplesMock,
}));
vi.mock("@/api/v2/services/countryService", () => ({
  getCountries: getCountriesMock,
}));
vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  countAfrikLanguageFamilies: countAfrikLanguageFamiliesMock,
}));

import { getCorpusCounts } from "../corpusCounts";

describe("getCorpusCounts (ETNI-1327, REQ-113)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-113
  it("sources the three counts from the service layer, not from a literal", async () => {
    getPeoplesMock.mockResolvedValue({ data: [], total: 4213 });
    getCountriesMock.mockResolvedValue({ data: [], total: 91 });
    countAfrikLanguageFamiliesMock.mockResolvedValue(37);

    const counts = await getCorpusCounts();

    expect(counts).toEqual({ peoples: 4213, countries: 91, families: 37 });
  });

  // @req REQ-113
  it("calls the service functions directly rather than fetching over HTTP", async () => {
    getPeoplesMock.mockResolvedValue({ data: [], total: 1 });
    getCountriesMock.mockResolvedValue({ data: [], total: 1 });
    countAfrikLanguageFamiliesMock.mockResolvedValue(1);

    await getCorpusCounts();

    expect(getPeoplesMock).toHaveBeenCalledOnce();
    expect(getCountriesMock).toHaveBeenCalledOnce();
    expect(countAfrikLanguageFamiliesMock).toHaveBeenCalledOnce();
  });
});
