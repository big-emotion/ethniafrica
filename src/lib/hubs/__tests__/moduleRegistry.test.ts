import { describe, expect, it } from "vitest";

import {
  ACCESS_MODES,
  MODULE_DEFINITIONS,
  getModulesForAccessMode,
} from "@/lib/hubs/moduleRegistry";

describe("moduleRegistry — access-mode → module mapping (ETNI-1216, REQ-114)", () => {
  // @req REQ-114
  it("enumerates exactly three access modes", () => {
    expect(ACCESS_MODES).toEqual(["peuples", "pays", "familles"]);
  });

  // @req REQ-114
  it("maps every registered module to exactly one of the three access modes", () => {
    for (const def of MODULE_DEFINITIONS) {
      expect(ACCESS_MODES).toContain(def.accessMode);
    }
  });

  // @req REQ-114
  it("resolves each access mode to its module list with no orphans", () => {
    const grouped = ACCESS_MODES.flatMap((mode) =>
      getModulesForAccessMode(mode)
    );
    expect(grouped).toHaveLength(MODULE_DEFINITIONS.length);
    expect(new Set(grouped.map((m) => m.id)).size).toBe(
      MODULE_DEFINITIONS.length
    );
  });

  // @req REQ-114
  it("gives the peuples access mode its peoples-affinity modules", () => {
    const ids = getModulesForAccessMode("peuples").map((m) => m.id);
    expect(ids).toEqual(["peuples", "noms", "comparer"]);
  });

  // @req REQ-114
  it("gives the pays access mode its countries-affinity modules", () => {
    const ids = getModulesForAccessMode("pays").map((m) => m.id);
    expect(ids).toEqual(["pays", "frise"]);
  });

  // @req REQ-114
  it("gives the familles access mode its families-affinity modules", () => {
    const ids = getModulesForAccessMode("familles").map((m) => m.id);
    expect(ids).toEqual(["familles", "liens"]);
  });

  // @req REQ-114
  it("forces comparer and liens unavailable regardless of routing or data", () => {
    const comparer = MODULE_DEFINITIONS.find((m) => m.id === "comparer");
    const liens = MODULE_DEFINITIONS.find((m) => m.id === "liens");
    expect(comparer?.availability).toBe("unavailable");
    expect(liens?.availability).toBe("unavailable");
    expect(liens?.page).toBeNull();
  });

  // @req REQ-114
  it("gives every data module a dataSource and every non-data module none", () => {
    for (const def of MODULE_DEFINITIONS) {
      if (def.availability === "data") {
        expect(def.dataSource).toBeDefined();
      } else {
        expect(def.dataSource).toBeUndefined();
      }
    }
  });
});
