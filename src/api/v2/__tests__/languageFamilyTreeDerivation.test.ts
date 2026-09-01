import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Language, LanguageFamily, People } from "@/types/afrik";

vi.mock("@/lib/supabase/queries/afrik/languageFamilies", () => ({
  getAfrikLanguageFamilyById: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/languages", () => ({
  getAfrikLanguagesByFamily: vi.fn(),
}));
vi.mock("@/lib/supabase/queries/afrik/peoples", () => ({
  getAfrikPeoplesByLanguageFamily: vi.fn(),
}));
vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  getFamilyTreeSkeleton,
  getFamilyTreeBranch,
} from "../services/languageFamilyTreeService";
import { getAfrikLanguageFamilyById } from "@/lib/supabase/queries/afrik/languageFamilies";
import { getAfrikLanguagesByFamily } from "@/lib/supabase/queries/afrik/languages";
import { getAfrikPeoplesByLanguageFamily } from "@/lib/supabase/queries/afrik/peoples";

/**
 * The language corpus can populate `afrik_languages` from its sourced CSV and
 * strict language fiches. These tests pin both that authoritative path and the
 * compatibility fallback for a family with no loaded languages: derive what
 * the people fiches declare and identify the result as derived rather than
 * reporting a projection lag as an editorial silence.
 */
const atlantique: LanguageFamily = {
  id: "FLG_ATLANTIQUE",
  nameFr: "Atlantique",
  classificationStatus: "consensual",
  content: {
    generalInfo: {
      branches: ["Atlantique central", "Peul-Sérère", "Wolof-BKK"],
      numberOfLanguages: 45,
    },
  },
};

function makePeople(
  id: string,
  nameMain: string,
  isoCodes: string[],
  mainLanguage?: string
): People {
  return {
    id,
    nameMain,
    languageFamilyId: "FLG_ATLANTIQUE",
    currentCountries: [],
    classificationStatus: null,
    content: { languages: { isoCodes, mainLanguage } },
  };
}

const fula = makePeople(
  "PPL_FULA",
  "Fula",
  ["ful", "fuc"],
  "Fulfulde / Pulaar / Pular"
);
const fulbe = makePeople(
  "PPL_FULBE",
  "Fulbe",
  ["ful", "fuf"],
  "Fulfulde / Pulaar / Pular"
);
const atlanticGroup = makePeople(
  "PPL_ATLANTIQUES",
  "Peuples atlantiques",
  ["ful", "wol"],
  "Groupe atlantique (branche de la famille Niger-Congo)"
);
const wolof = makePeople("PPL_WOLOF", "Wolof", ["wol", "wof"], "Wolof (wol)");
const speechless = makePeople("PPL_SANS_LANGUE", "Sans langue", []);

const atlantiquePeoples: People[] = [
  fula,
  fulbe,
  atlanticGroup,
  wolof,
  speechless,
];

describe("languageFamilyTreeService — branch derivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAfrikLanguageFamilyById).mockResolvedValue(atlantique);
    vi.mocked(getAfrikPeoplesByLanguageFamily).mockResolvedValue(
      atlantiquePeoples
    );
  });

  describe("when the language corpus holds no language for the family", () => {
    beforeEach(() => {
      vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue([]);
    });

    // @req REQ-033
    it("builds one branch per ISO code the people fiches declare, ordered by the name the reader scans", async () => {
      const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

      expect(result?.branches.map((branch) => branch.name)).toEqual([
        "fuc",
        "fuf",
        "Fulfulde",
        "wof",
        "Wolof",
      ]);
      expect(
        result?.branches.find((branch) => branch.iso639_3 === "ful")
          ?.peopleCount
      ).toBe(3);
    });

    // @req REQ-033
    it("counts as unlinked only the peoples that declare no ISO code at all", async () => {
      const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

      expect(result?.unlinkedPeopleCount).toBe(1);
    });

    // @req REQ-033
    it("names a derived branch after the main language of the peoples whose first ISO code it is", async () => {
      const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

      // "ful" is first for Fula, Fulbe ("Fulfulde …") and Peuples atlantiques
      // ("Groupe atlantique …"); the majority reading wins.
      expect(
        result?.branches.find((branch) => branch.iso639_3 === "ful")?.name
      ).toBe("Fulfulde");
      expect(
        result?.branches.find((branch) => branch.iso639_3 === "wol")?.name
      ).toBe("Wolof");
    });

    // @req REQ-033
    it("falls back to the bare ISO code when no people leads with that code", async () => {
      const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

      // "fuc" and "fuf" are only ever secondary codes, so nothing names them.
      expect(
        result?.branches.find((branch) => branch.iso639_3 === "fuc")?.name
      ).toBe("fuc");
    });

    // @req REQ-033
    it("reports the branches as derived from the people fiches", async () => {
      const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

      expect(result?.branchProvenance).toBe("people-fiches");
    });

    // @req REQ-033
    it("groups under unlinked only the peoples declaring no ISO code", async () => {
      const result = await getFamilyTreeBranch(
        "FLG_ATLANTIQUE",
        { group: "unlinked" },
        { limit: 10, offset: 0 }
      );

      expect(result.total).toBe(1);
      expect(result.nodes[0]?.id).toBe("PPL_SANS_LANGUE");
    });
  });

  describe("when the language corpus does hold the family's languages", () => {
    const languages: Language[] = [
      { id: "ful", name: "Fulfulde", familyId: "FLG_ATLANTIQUE", content: {} },
    ];

    beforeEach(() => {
      vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue(languages);
    });

    // @req REQ-033
    it("keeps the corpus as the authority and reports the branches as declared", async () => {
      const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

      expect(result?.branches).toEqual([
        { iso639_3: "ful", name: "Fulfulde", peopleCount: 3 },
      ]);
      expect(result?.branchProvenance).toBe("language-corpus");
      expect(result?.unlinkedPeopleCount).toBe(2);
    });
  });

  // @req REQ-033
  it("surfaces the branch names the family fiche itself declares", async () => {
    vi.mocked(getAfrikLanguagesByFamily).mockResolvedValue([]);

    const result = await getFamilyTreeSkeleton("FLG_ATLANTIQUE");

    expect(result?.declaredBranches).toEqual([
      "Atlantique central",
      "Peul-Sérère",
      "Wolof-BKK",
    ]);
  });
});
