import { describe, expect, it } from "vitest";

import {
  declaredAssociatedPeopleIds,
  resolveFootprintProvenance,
} from "@/lib/familyFootprintSource";
import type { LanguageFamily } from "@/types/afrik";

function family(overrides: Partial<LanguageFamily> = {}): LanguageFamily {
  return {
    id: "FLG_AFROASIATIQUE",
    nameFr: "Afro-asiatique",
    content: {},
    ...overrides,
  } as LanguageFamily;
}

describe("declaredAssociatedPeopleIds", () => {
  // @req REQ-116
  it("keeps the fiche's declaration order, which is the order it argues in", () => {
    const ids = declaredAssociatedPeopleIds(
      family({
        associatedPeoples: [
          { name: "Arabes", peopleId: "PPL_ARABES_AFRIQUE" },
          { name: "Amazighs", peopleId: "PPL_AMAZIGH_MACRO" },
          { name: "Haoussa", peopleId: "PPL_HAUSA" },
        ],
      })
    );

    expect(ids).toEqual([
      "PPL_ARABES_AFRIQUE",
      "PPL_AMAZIGH_MACRO",
      "PPL_HAUSA",
    ]);
  });

  // @req REQ-116
  it("drops a reference the fiche names without identifying", () => {
    const ids = declaredAssociatedPeopleIds(
      family({
        associatedPeoples: [
          { name: "Égyptiens anciens" },
          { name: "Somali", peopleId: "PPL_SOMALI" },
        ],
      })
    );

    expect(ids).toEqual(["PPL_SOMALI"]);
  });

  // @req REQ-116
  it("counts a people declared twice once, so it cannot inflate a country's tint", () => {
    const ids = declaredAssociatedPeopleIds(
      family({
        associatedPeoples: [
          { name: "Touaregs", peopleId: "PPL_TUAREG" },
          { name: "Touaregs (Kel Tamasheq)", peopleId: "PPL_TUAREG" },
        ],
      })
    );

    expect(ids).toEqual(["PPL_TUAREG"]);
  });

  // @req REQ-116
  it("falls back to the JSONB content when the row carries no lifted field", () => {
    const ids = declaredAssociatedPeopleIds(
      family({
        content: {
          associatedPeoples: [{ name: "Oromo", peopleId: "PPL_OROMO" }],
        },
      })
    );

    expect(ids).toEqual(["PPL_OROMO"]);
  });

  // @req REQ-116
  it("returns nothing when the fiche declares no associated people", () => {
    expect(declaredAssociatedPeopleIds(family())).toEqual([]);
  });
});

describe("resolveFootprintProvenance", () => {
  // @req REQ-116
  it("reads member peoples whenever the family has any of its own", () => {
    expect(resolveFootprintProvenance(3)).toBe("member-peoples");
  });

  /**
   * Afro-asiatique is the one family of the twenty-four whose peoples all
   * carry a sub-family id (Berbère, Tchadique, Couchitique, Sémitique), so
   * counting by `language_family_id` returns zero and the footprint would
   * collapse to the missing-overlay placeholder.
   */
  // @req REQ-116
  it("falls back to the fiche's own declaration when the family has no member people", () => {
    expect(resolveFootprintProvenance(0)).toBe("declared-associated-peoples");
  });
});
