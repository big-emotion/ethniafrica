import { beforeEach, describe, expect, it, vi } from "vitest";

// unstable_cache would otherwise memoize across cases and hide the second call.
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: T) => fn,
}));

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAfrikLanguageFamilyRoster: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/afrik/languageFamilyFacet", () => ({
  getCountryIdsByLanguageFamily: vi.fn(),
}));

import { getLanguageFamilyPresence } from "../languageFamilyAtlas";
import { getAfrikLanguageFamilyRoster } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getCountryIdsByLanguageFamily } from "@/lib/supabase/queries/afrik/languageFamilyFacet";

describe("getLanguageFamilyPresence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-117
  it("gives every published family the countries its peoples reach", async () => {
    vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue([
      { id: "FLG_BANTU", nameFr: "Bantou" },
      { id: "FLG_MANDE", nameFr: "Mandé" },
    ]);
    vi.mocked(getCountryIdsByLanguageFamily).mockResolvedValue(
      new Map([
        ["FLG_BANTU", ["MOZ", "ZWE"]],
        ["FLG_MANDE", ["MLI"]],
      ])
    );

    const presence = await getLanguageFamilyPresence();

    expect(presence).toEqual([
      { id: "FLG_BANTU", nameFr: "Bantou", countryIds: ["MOZ", "ZWE"] },
      { id: "FLG_MANDE", nameFr: "Mandé", countryIds: ["MLI"] },
    ]);
  });

  /**
   * Afro-asiatique reaches no country through the peoples that carry its id.
   * It still belongs in the reading list — dropping it would make the corpus
   * look tidier than it is.
   */
  // @req REQ-117
  it("keeps a family the derivation places nowhere, with an empty footprint", async () => {
    vi.mocked(getAfrikLanguageFamilyRoster).mockResolvedValue([
      { id: "FLG_AFROASIATIQUE", nameFr: "Afro-asiatique" },
    ]);
    vi.mocked(getCountryIdsByLanguageFamily).mockResolvedValue(new Map());

    const presence = await getLanguageFamilyPresence();

    expect(presence).toEqual([
      { id: "FLG_AFROASIATIQUE", nameFr: "Afro-asiatique", countryIds: [] },
    ]);
  });
});
