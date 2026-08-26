import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPeoplesMock,
  getCountriesMock,
  countAfrikLanguageFamiliesMock,
  listMigrationsMock,
} = vi.hoisted(() => ({
  getPeoplesMock: vi.fn(),
  getCountriesMock: vi.fn(),
  countAfrikLanguageFamiliesMock: vi.fn(),
  listMigrationsMock: vi.fn(),
}));

vi.mock("@/api/v2/services/migrations", () => ({
  listMigrations: listMigrationsMock,
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
  it("sources every count from the service layer, not from a literal", async () => {
    getPeoplesMock.mockResolvedValue({ data: [], total: 4213 });
    getCountriesMock.mockResolvedValue({ data: [], total: 91 });
    countAfrikLanguageFamiliesMock.mockResolvedValue(37);
    listMigrationsMock.mockResolvedValue({ data: [], total: 6 });

    const counts = await getCorpusCounts();

    expect(counts).toEqual({
      peoples: 4213,
      countries: 91,
      families: 37,
      migrations: 6,
    });
  });

  // @req REQ-113
  it("calls the service functions directly rather than fetching over HTTP", async () => {
    getPeoplesMock.mockResolvedValue({ data: [], total: 1 });
    getCountriesMock.mockResolvedValue({ data: [], total: 1 });
    countAfrikLanguageFamiliesMock.mockResolvedValue(1);
    listMigrationsMock.mockResolvedValue({ data: [], total: 1 });

    await getCorpusCounts();

    expect(getPeoplesMock).toHaveBeenCalledOnce();
    expect(getCountriesMock).toHaveBeenCalledOnce();
    expect(countAfrikLanguageFamiliesMock).toHaveBeenCalledOnce();
    expect(listMigrationsMock).toHaveBeenCalledOnce();
  });

  // The home used to promise "3 000 ans" of history the corpus never held
  // (ETNI-1198). The figure a card shows has to be something the reader
  // can go and count.
  // @req REQ-113
  it("reports the migration events the corpus actually holds", async () => {
    getPeoplesMock.mockResolvedValue({ data: [], total: 1 });
    getCountriesMock.mockResolvedValue({ data: [], total: 1 });
    countAfrikLanguageFamiliesMock.mockResolvedValue(1);
    listMigrationsMock.mockResolvedValue({ data: [], total: 6 });

    const counts = await getCorpusCounts();

    expect(counts.migrations).toBe(6);
  });
});
