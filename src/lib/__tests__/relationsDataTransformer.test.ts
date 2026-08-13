import { describe, expect, it } from "vitest";

import { transformRelationsToListItems } from "../relationsDataTransformer";
import type { DerivedLinguisticLink, SourcedRelation } from "@/types/relations";

const FON: SourcedRelation = {
  id: "REL_YORUBA_FON_MIGRATION",
  relationType: "migratory",
  direction: "bidirectional",
  period: { startYear: 1600, endYear: 1700, label: "XVIIe siècle" },
  description: "Migration conjointe vers le golfe du Bénin.",
  sources: [],
  confidence: { score: 82, sourceCount: 3 },
  neighbor: { id: "PPL_FON", nameMain: "Fon", languageFamilyId: "FLG_KWA" },
};

const ASHANTI: SourcedRelation = {
  id: "REL_YORUBA_ASHANTI_TRADE",
  relationType: "commercial",
  direction: "a_to_b",
  period: { startYear: null, endYear: null, label: "XIXe siècle" },
  description: "Réseaux commerciaux transsahariens partagés.",
  sources: [],
  confidence: null,
  neighbor: {
    id: "PPL_ASHANTI",
    nameMain: "Ashanti",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
};

const BAMILEKE_LINK: DerivedLinguisticLink = {
  derived: true,
  basis: "sharedLanguageFamily",
  neighbor: {
    id: "PPL_BAMILEKE",
    nameMain: "Bamiléké",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
};

describe("transformRelationsToListItems", () => {
  // @req REQ-097
  it("merges sourced relations and derived links into one list", () => {
    const items = transformRelationsToListItems([FON], [BAMILEKE_LINK]);
    expect(items).toHaveLength(2);
  });

  // @req REQ-097
  it("carries a sourced relation's fields and marks it as not derived", () => {
    const [item] = transformRelationsToListItems([FON], []);
    expect(item).toEqual({
      id: "REL_YORUBA_FON_MIGRATION",
      type: "migratory",
      derived: false,
      neighbor: FON.neighbor,
      period: FON.period,
      description: FON.description,
      confidence: FON.confidence,
    });
  });

  // @req REQ-097
  it("marks derived links as linguistic-typed with no period, description, or confidence", () => {
    const [item] = transformRelationsToListItems([], [BAMILEKE_LINK]);
    expect(item).toEqual({
      id: "derived_PPL_BAMILEKE",
      type: "linguistic",
      derived: true,
      neighbor: BAMILEKE_LINK.neighbor,
      period: null,
      description: null,
      confidence: null,
    });
  });

  // @req REQ-097
  it("sorts items by type (linguistic, migratory, commercial, religious) then by neighbor name", () => {
    const items = transformRelationsToListItems(
      [FON, ASHANTI],
      [BAMILEKE_LINK]
    );
    expect(items.map((i) => i.id)).toEqual([
      "derived_PPL_BAMILEKE",
      "REL_YORUBA_FON_MIGRATION",
      "REL_YORUBA_ASHANTI_TRADE",
    ]);
  });

  // @req REQ-097
  it("sorts neighbors alphabetically within the same type", () => {
    const zerma: SourcedRelation = {
      ...FON,
      id: "REL_YORUBA_ZERMA_MIGRATION",
      neighbor: { ...FON.neighbor, id: "PPL_ZERMA", nameMain: "Zerma" },
    };
    const items = transformRelationsToListItems([zerma, FON], []);
    expect(items.map((i) => i.neighbor.nameMain)).toEqual(["Fon", "Zerma"]);
  });

  // @req REQ-097
  it("returns an empty list when there is nothing to show", () => {
    expect(transformRelationsToListItems([], [])).toEqual([]);
  });
});
