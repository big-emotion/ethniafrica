import { describe, it, expect } from "vitest";
import { transformComparisonData } from "../comparisonDataTransformer";
import {
  COMPARABLE_ROWS,
  ComparisonInputError,
  type CompareEntityPayload,
  type ComparePeopleEntity,
  type CompareCountryEntity,
  type CompareFamilyEntity,
} from "@/types/compare";

// ==========================================
// ILLUSTRATIVE FIXTURES (not AFRIK data)
// ==========================================

const fullPeople: ComparePeopleEntity = {
  type: "peuple",
  id: "PPL_ILLUSTRATIVE_ONE",
  label: "Peuple Illustratif Un",
  appellations: {
    mainName: "Peuple Illustratif Un",
    selfAppellation: "Endonyme Un",
  },
  origins: { ancientOrigins: "Origine illustrative" },
  organization: { traditionalPoliticalSystem: "Système illustratif" },
  languages: { mainLanguage: "Langue illustrative (xxx)" },
  culture: {
    symbolsAndArts: { artsAndMusic: { songs: "Chants illustratifs" } },
  },
  historicalRole: { diaspora: "Diaspora illustrative" },
  demography: { totalPopulation: 1000, referenceYear: 2025 },
};

const sparsePeople: ComparePeopleEntity = {
  type: "peuple",
  id: "PPL_ILLUSTRATIVE_TWO",
  label: "Peuple Illustratif Deux",
  appellations: {
    mainName: "Peuple Illustratif Deux",
    selfAppellation: "Endonyme Deux",
  },
  demography: { totalPopulation: 500, referenceYear: 2025 },
  // origins, organization, languages, culture, historicalRole intentionally absent
};

const emptyPeople: ComparePeopleEntity = {
  type: "peuple",
  id: "PPL_ILLUSTRATIVE_THREE",
  label: "Peuple Illustratif Trois",
};

const fullCountry: CompareCountryEntity = {
  type: "pays",
  id: "XX1",
  label: "Pays Illustratif Un",
  historicalNames: { antiquity: "Nom antique illustratif" },
  kingdoms: [{ name: "Royaume Illustratif" }],
  majorPeoples: [{ name: "Peuple Illustratif" }],
  culture: { mainLanguages: [{ name: "Langue illustrative" }] },
  historicalFacts: { colonization: "Faits illustratifs" },
  demographics: { peoples: [{ name: "Peuple Illustratif", population: 10 }] },
};

const sparseCountry: CompareCountryEntity = {
  type: "pays",
  id: "XX2",
  label: "Pays Illustratif Deux",
  historicalNames: { antiquity: "Nom antique illustratif" },
  // kingdoms, majorPeoples, culture, historicalFacts, demographics absent
};

const emptyCountry: CompareCountryEntity = {
  type: "pays",
  id: "XX3",
  label: "Pays Illustratif Trois",
};

const fullFamily: CompareFamilyEntity = {
  type: "famille",
  id: "FLG_ILLUSTRATIVE_ONE",
  label: "Famille Illustrative Un",
  decolonialHeader: { selfAppellation: "Auto-appellation illustrative" },
  generalInfo: { branches: ["Branche A"], numberOfLanguages: 3 },
  associatedPeoples: [{ name: "Peuple Illustratif" }],
  linguisticCharacteristics: { typology: "Typologie illustrative" },
  historyAndOrigins: { probableOrigin: "Origine probable illustrative" },
  distribution: { totalSpeakers: 100 },
};

const sparseFamily: CompareFamilyEntity = {
  type: "famille",
  id: "FLG_ILLUSTRATIVE_TWO",
  label: "Famille Illustrative Deux",
  generalInfo: { branches: ["Branche B"] },
  // decolonialHeader, associatedPeoples, linguisticCharacteristics,
  // historyAndOrigins, distribution absent
};

const emptyFamily: CompareFamilyEntity = {
  type: "famille",
  id: "FLG_ILLUSTRATIVE_THREE",
  label: "Famille Illustrative Trois",
};

// ==========================================
// TESTS
// ==========================================

describe("transformComparisonData", () => {
  describe("happy path — peuple", () => {
    it("returns type 'peuple' for a peuple comparison", () => {
      // @req REQ-097
      const result = transformComparisonData([fullPeople, sparsePeople]);
      expect(result.type).toBe("peuple");
    });

    it("returns one column per entity, in input order", () => {
      // @req REQ-097
      const result = transformComparisonData([fullPeople, sparsePeople]);
      expect(result.columns).toEqual([
        { id: fullPeople.id, label: fullPeople.label, type: "peuple" },
        { id: sparsePeople.id, label: sparsePeople.label, type: "peuple" },
      ]);
    });

    it("orders rows per the COMPARABLE_ROWS registry for peuple", () => {
      // @req REQ-097
      const result = transformComparisonData([fullPeople, fullPeople2()]);
      const keys = result.rows.map((r) => r.key);
      const registryOrder = COMPARABLE_ROWS.peuple.filter((k) =>
        keys.includes(k)
      );
      expect(keys).toEqual(registryOrder);
    });

    it("keys every row's values by entity id", () => {
      // @req REQ-097
      const result = transformComparisonData([fullPeople, sparsePeople]);
      for (const row of result.rows) {
        expect(Object.keys(row.values).sort()).toEqual(
          [fullPeople.id, sparsePeople.id].sort()
        );
      }
    });

    it("carries the section value as-is for a populated field", () => {
      // @req REQ-097
      const result = transformComparisonData([fullPeople, sparsePeople]);
      const appellationsRow = result.rows.find((r) => r.key === "appellations");
      expect(appellationsRow?.values[fullPeople.id]).toEqual(
        fullPeople.appellations
      );
    });

    it("accepts exactly 3 peuple entities", () => {
      // @req REQ-097
      const result = transformComparisonData([
        fullPeople,
        sparsePeople,
        emptyPeople,
      ]);
      expect(result.columns).toHaveLength(3);
    });
  });

  describe("happy path — pays", () => {
    it("returns type 'pays' for a pays comparison", () => {
      // @req REQ-097
      const result = transformComparisonData([fullCountry, sparseCountry]);
      expect(result.type).toBe("pays");
    });

    it("returns one column per entity for pays", () => {
      // @req REQ-097
      const result = transformComparisonData([fullCountry, sparseCountry]);
      expect(result.columns).toEqual([
        { id: fullCountry.id, label: fullCountry.label, type: "pays" },
        { id: sparseCountry.id, label: sparseCountry.label, type: "pays" },
      ]);
    });

    it("orders rows per the COMPARABLE_ROWS registry for pays", () => {
      // @req REQ-097
      const result = transformComparisonData([fullCountry, sparseCountry]);
      const keys = result.rows.map((r) => r.key);
      const registryOrder = COMPARABLE_ROWS.pays.filter((k) =>
        keys.includes(k)
      );
      expect(keys).toEqual(registryOrder);
    });

    it("carries the section value as-is for a populated pays field", () => {
      // @req REQ-097
      const result = transformComparisonData([fullCountry, sparseCountry]);
      const kingdomsRow = result.rows.find((r) => r.key === "kingdoms");
      expect(kingdomsRow?.values[fullCountry.id]).toEqual(fullCountry.kingdoms);
    });
  });

  describe("happy path — famille", () => {
    it("returns type 'famille' for a famille comparison", () => {
      // @req REQ-097
      const result = transformComparisonData([fullFamily, sparseFamily]);
      expect(result.type).toBe("famille");
    });

    it("returns one column per entity for famille", () => {
      // @req REQ-097
      const result = transformComparisonData([fullFamily, sparseFamily]);
      expect(result.columns).toEqual([
        { id: fullFamily.id, label: fullFamily.label, type: "famille" },
        { id: sparseFamily.id, label: sparseFamily.label, type: "famille" },
      ]);
    });

    it("orders rows per the COMPARABLE_ROWS registry for famille", () => {
      // @req REQ-097
      const result = transformComparisonData([fullFamily, sparseFamily]);
      const keys = result.rows.map((r) => r.key);
      const registryOrder = COMPARABLE_ROWS.famille.filter((k) =>
        keys.includes(k)
      );
      expect(keys).toEqual(registryOrder);
    });

    it("carries the section value as-is for a populated famille field", () => {
      // @req REQ-097
      const result = transformComparisonData([fullFamily, sparseFamily]);
      const generalInfoRow = result.rows.find((r) => r.key === "generalInfo");
      expect(generalInfoRow?.values[fullFamily.id]).toEqual(
        fullFamily.generalInfo
      );
    });
  });

  describe("missing-value semantics (FR59, FR61)", () => {
    it("never throws on a sparse peuple fiche", () => {
      // @req REQ-098
      expect(() =>
        transformComparisonData([fullPeople, sparsePeople])
      ).not.toThrow();
    });

    it("sets an explicit null (key present) for a missing peuple section", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, sparsePeople]);
      const originsRow = result.rows.find((r) => r.key === "origins");
      expect(originsRow).toBeDefined();
      expect(originsRow?.values).toHaveProperty(sparsePeople.id);
      expect(originsRow?.values[sparsePeople.id]).toBeNull();
    });

    it("sets an explicit null (key present) for a missing pays section", () => {
      // @req REQ-098
      const result = transformComparisonData([fullCountry, sparseCountry]);
      const kingdomsRow = result.rows.find((r) => r.key === "kingdoms");
      expect(kingdomsRow).toBeDefined();
      expect(kingdomsRow?.values).toHaveProperty(sparseCountry.id);
      expect(kingdomsRow?.values[sparseCountry.id]).toBeNull();
    });

    it("sets an explicit null (key present) for a missing famille section", () => {
      // @req REQ-098
      const result = transformComparisonData([fullFamily, sparseFamily]);
      const distributionRow = result.rows.find((r) => r.key === "distribution");
      expect(distributionRow).toBeDefined();
      expect(distributionRow?.values).toHaveProperty(sparseFamily.id);
      expect(distributionRow?.values[sparseFamily.id]).toBeNull();
    });

    it("excludes a row that is null for every entity (peuple)", () => {
      // @req REQ-098
      const result = transformComparisonData([emptyPeople, sparsePeople]);
      // both entities lack `organization`
      const organizationRow = result.rows.find((r) => r.key === "organization");
      expect(organizationRow).toBeUndefined();
    });

    it("excludes a row that is null for every entity (pays)", () => {
      // @req REQ-098
      const result = transformComparisonData([emptyCountry, sparseCountry]);
      const kingdomsRow = result.rows.find((r) => r.key === "kingdoms");
      expect(kingdomsRow).toBeUndefined();
    });

    it("excludes a row that is null for every entity (famille)", () => {
      // @req REQ-098
      const result = transformComparisonData([emptyFamily, sparseFamily]);
      const decolonialHeaderRow = result.rows.find(
        (r) => r.key === "decolonialHeader"
      );
      expect(decolonialHeaderRow).toBeUndefined();
    });

    it("only keeps rows with at least one non-null value across entities", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, emptyPeople]);
      expect(
        result.rows.every((r) =>
          Object.values(r.values).some((v) => v !== null)
        )
      ).toBe(true);
    });

    it("never throws when every entity is empty", () => {
      // @req REQ-098
      const other: ComparePeopleEntity = {
        type: "peuple",
        id: "PPL_ILLUSTRATIVE_FIVE",
        label: "Peuple Illustratif Cinq",
      };
      expect(() => transformComparisonData([emptyPeople, other])).not.toThrow();
    });

    it("produces an empty rows array for two fully empty entities", () => {
      // @req REQ-098
      const other: ComparePeopleEntity = {
        type: "peuple",
        id: "PPL_ILLUSTRATIVE_SIX",
        label: "Peuple Illustratif Six",
      };
      const result = transformComparisonData([emptyPeople, other]);
      expect(result.rows).toEqual([]);
    });

    it("keeps a row when at least one entity has a non-null value", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, emptyPeople]);
      const appellationsRow = result.rows.find((r) => r.key === "appellations");
      expect(appellationsRow).toBeDefined();
      expect(appellationsRow?.values[emptyPeople.id]).toBeNull();
      expect(appellationsRow?.values[fullPeople.id]).not.toBeNull();
    });
  });

  describe("input validation — ComparisonInputError", () => {
    it("throws ComparisonInputError for mixed entity types", () => {
      // @req REQ-097
      expect(() =>
        transformComparisonData([
          fullPeople,
          fullCountry as unknown as CompareEntityPayload,
        ])
      ).toThrow(ComparisonInputError);
    });

    it("throws with reason MIXED_TYPES for mixed entity types", () => {
      // @req REQ-097
      try {
        transformComparisonData([
          fullPeople,
          fullCountry as unknown as CompareEntityPayload,
        ]);
        expect.unreachable("expected ComparisonInputError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ComparisonInputError);
        expect((err as ComparisonInputError).reason).toBe("MIXED_TYPES");
      }
    });

    it("throws ComparisonInputError for fewer than 2 entities", () => {
      // @req REQ-097
      expect(() => transformComparisonData([fullPeople])).toThrow(
        ComparisonInputError
      );
    });

    it("throws with reason INVALID_COUNT for a single entity", () => {
      // @req REQ-097
      try {
        transformComparisonData([fullPeople]);
        expect.unreachable("expected ComparisonInputError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ComparisonInputError);
        expect((err as ComparisonInputError).reason).toBe("INVALID_COUNT");
      }
    });

    it("throws ComparisonInputError for zero entities", () => {
      // @req REQ-097
      expect(() => transformComparisonData([])).toThrow(ComparisonInputError);
    });

    it("throws ComparisonInputError for more than 3 entities", () => {
      // @req REQ-097
      const fourth: ComparePeopleEntity = {
        type: "peuple",
        id: "PPL_ILLUSTRATIVE_SEVEN",
        label: "Peuple Illustratif Sept",
      };
      expect(() =>
        transformComparisonData([fullPeople, sparsePeople, emptyPeople, fourth])
      ).toThrow(ComparisonInputError);
    });

    it("throws with reason INVALID_COUNT for 4 entities", () => {
      // @req REQ-097
      const fourth: ComparePeopleEntity = {
        type: "peuple",
        id: "PPL_ILLUSTRATIVE_EIGHT",
        label: "Peuple Illustratif Huit",
      };
      try {
        transformComparisonData([
          fullPeople,
          sparsePeople,
          emptyPeople,
          fourth,
        ]);
        expect.unreachable("expected ComparisonInputError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ComparisonInputError);
        expect((err as ComparisonInputError).reason).toBe("INVALID_COUNT");
      }
    });

    it("throws ComparisonInputError for duplicate entity ids", () => {
      // @req REQ-097
      const duplicate: ComparePeopleEntity = {
        ...sparsePeople,
        id: fullPeople.id,
      };
      expect(() => transformComparisonData([fullPeople, duplicate])).toThrow(
        ComparisonInputError
      );
    });

    it("throws with reason DUPLICATE_IDS for duplicate entity ids", () => {
      // @req REQ-097
      const duplicate: ComparePeopleEntity = {
        ...sparsePeople,
        id: fullPeople.id,
      };
      try {
        transformComparisonData([fullPeople, duplicate]);
        expect.unreachable("expected ComparisonInputError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ComparisonInputError);
        expect((err as ComparisonInputError).reason).toBe("DUPLICATE_IDS");
      }
    });

    it("does not throw for valid 2-entity input", () => {
      // @req REQ-097
      expect(() =>
        transformComparisonData([fullPeople, sparsePeople])
      ).not.toThrow();
    });

    it("does not throw for valid 3-entity input", () => {
      // @req REQ-097
      expect(() =>
        transformComparisonData([fullPeople, sparsePeople, emptyPeople])
      ).not.toThrow();
    });

    it("validates before doing any transform work (throws even if all sections would be sparse)", () => {
      // @req REQ-097
      expect(() => transformComparisonData([emptyPeople])).toThrow(
        ComparisonInputError
      );
    });
  });

  describe("no-derived-claims rule", () => {
    it("never includes a 'delta' key anywhere in row values", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, sparsePeople]);
      for (const row of result.rows) {
        for (const value of Object.values(row.values)) {
          expect(JSON.stringify(value ?? {})).not.toMatch(/delta/i);
        }
      }
    });

    it("never includes 'ranking' or 'rank' keys in the output", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, sparsePeople]);
      expect(JSON.stringify(result)).not.toMatch(/rank/i);
    });

    it("never includes a computed 'total' key at the ComparisonPageData level", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, sparsePeople]);
      expect(result).not.toHaveProperty("total");
      expect(result).not.toHaveProperty("totals");
    });

    it("does not reorder rows by value — order always follows the registry", () => {
      // @req REQ-098
      // fullPeople has more populated sections than sparsePeople; if the
      // transformer sorted by "richness" the order would differ from the
      // fixed registry order asserted here.
      const result = transformComparisonData([sparsePeople, fullPeople]);
      const keys = result.rows.map((r) => r.key);
      const registryOrder = COMPARABLE_ROWS.peuple.filter((k) =>
        keys.includes(k)
      );
      expect(keys).toEqual(registryOrder);
    });

    it("returns exactly the columns/rows/type keys at the top level (no extra derived fields)", () => {
      // @req REQ-098
      const result = transformComparisonData([fullPeople, sparsePeople]);
      expect(Object.keys(result).sort()).toEqual(
        ["columns", "rows", "type"].sort()
      );
    });
  });
});

function fullPeople2(): ComparePeopleEntity {
  return {
    ...fullPeople,
    id: "PPL_ILLUSTRATIVE_NINE",
    label: "Peuple Illustratif Neuf",
  };
}
