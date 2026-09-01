import { describe, it, expect } from "vitest";

import {
  getPersonRelationLabel,
  getPersonRoleLabel,
} from "@/lib/search/personResultLabels";

describe("getPersonRoleLabel", () => {
  // @req REQ-126
  it("translates a known role category to French", () => {
    expect(getPersonRoleLabel("ethnographer")).toBe("Ethnographe");
    expect(getPersonRoleLabel("head_of_state")).toBe("Chef·fe d'État");
  });

  // @req REQ-126
  it("falls back to the raw slug for an unmapped role, rather than hiding it", () => {
    expect(getPersonRoleLabel("cartographer")).toBe("cartographer");
  });
});

describe("getPersonRelationLabel", () => {
  // @req REQ-126
  it("words membership and observation so they cannot be mistaken for one another", () => {
    expect(getPersonRelationLabel("membership")).toBe("Membre de");
    expect(getPersonRelationLabel("observation")).toBe("Observe / documente");
  });
});
