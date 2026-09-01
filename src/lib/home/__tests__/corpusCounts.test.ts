import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPeoplesMock,
  getCountriesMock,
  countAfrikLanguageFamiliesMock,
  countAfrikLanguagesMock,
  listNameFormsMock,
  listMigrationsMock,
} = vi.hoisted(() => ({
  getPeoplesMock: vi.fn(),
  getCountriesMock: vi.fn(),
  countAfrikLanguageFamiliesMock: vi.fn(),
  countAfrikLanguagesMock: vi.fn(),
  listNameFormsMock: vi.fn(),
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
vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  countAfrikLanguages: countAfrikLanguagesMock,
}));
vi.mock("@/api/v2/services/names", () => ({
  listNameForms: listNameFormsMock,
}));

import { getCorpusCounts } from "../corpusCounts";

function everyReadSucceeds() {
  getPeoplesMock.mockResolvedValue({ data: [], total: 4213 });
  getCountriesMock.mockResolvedValue({ data: [], total: 91 });
  countAfrikLanguageFamiliesMock.mockResolvedValue(37);
  countAfrikLanguagesMock.mockResolvedValue(748);
  listNameFormsMock.mockResolvedValue({ forms: [], total: 3134, pageCount: 1 });
  listMigrationsMock.mockResolvedValue({ data: [], total: 6 });
}

describe("getCorpusCounts (ETNI-1327, REQ-113)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-113
  it("sources every count from the service layer, not from a literal", async () => {
    everyReadSucceeds();

    const counts = await getCorpusCounts();

    expect(counts).toEqual({
      peoples: 4213,
      countries: 91,
      families: 37,
      languages: 748,
      nameForms: 3134,
      migrations: 6,
    });
  });

  // @req REQ-113
  it("calls the service functions directly rather than fetching over HTTP", async () => {
    everyReadSucceeds();

    await getCorpusCounts();

    expect(getPeoplesMock).toHaveBeenCalledOnce();
    expect(getCountriesMock).toHaveBeenCalledOnce();
    expect(countAfrikLanguageFamiliesMock).toHaveBeenCalledOnce();
    expect(countAfrikLanguagesMock).toHaveBeenCalledOnce();
    expect(listNameFormsMock).toHaveBeenCalledOnce();
    expect(listMigrationsMock).toHaveBeenCalledOnce();
  });

  // The nomenclature counts folded forms, not name records: migration 071
  // split "3679" from "3141" precisely because the two answer different
  // questions, and the tile claims the number the Appellations page shows.
  // @req REQ-113
  it("reads the name-form total from the smallest page it can ask for", async () => {
    everyReadSucceeds();

    await getCorpusCounts();

    expect(listNameFormsMock).toHaveBeenCalledWith({
      page: 1,
      perPage: 1,
      imposedOnly: false,
    });
  });

  // The home used to promise "3 000 ans" of history the corpus never held
  // (ETNI-1198). The figure a card shows has to be something the reader
  // can go and count.
  // @req REQ-113
  it("reports the migration events the corpus actually holds", async () => {
    everyReadSucceeds();

    const counts = await getCorpusCounts();

    expect(counts.migrations).toBe(6);
  });

  // The six reads used to share one Promise.all, so a single rejection blanked
  // the whole band. listNameForms throws whenever its view is missing, which
  // would have taken the three original figures down with it.
  // @req REQ-113
  it("costs a failed read its own figure and no other", async () => {
    everyReadSucceeds();
    listNameFormsMock.mockRejectedValue(new Error("view is unavailable"));

    const counts = await getCorpusCounts();

    expect(counts.nameForms).toBeNull();
    expect(counts.peoples).toBe(4213);
    expect(counts.languages).toBe(748);
  });

  // Zero is a valid total, so it may never stand in for a failure: a tile
  // reading "0 Langues" is a false claim about the corpus, where
  // "Indisponible" is an honest one.
  // @req REQ-113
  it("never falls back to zero when a read fails", async () => {
    everyReadSucceeds();
    countAfrikLanguagesMock.mockRejectedValue(new Error("relation missing"));

    const counts = await getCorpusCounts();

    expect(counts.languages).toBeNull();
    expect(counts.languages).not.toBe(0);
  });
});
