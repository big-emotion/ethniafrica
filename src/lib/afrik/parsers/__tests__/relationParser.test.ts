import { describe, it, expect } from "vitest";
import { parseRelationFile } from "../relationParser";
import { validMigratoryRelation } from "./fixtures/validMigratoryRelation.fixture";
import { validCommercialRelation } from "./fixtures/validCommercialRelation.fixture";
import { invalidLinguisticRelationType } from "./fixtures/invalidLinguisticRelationType.fixture";
import { invalidMissingSources } from "./fixtures/invalidMissingSources.fixture";
import { invalidTier3Source } from "./fixtures/invalidTier3Source.fixture";
import { invalidSamePeopleIds } from "./fixtures/invalidSamePeopleIds.fixture";

describe("parseRelationFile", () => {
  // @req REQ-032
  it("parses a valid migratory relation fixture into a typed RelationRecord", () => {
    const result = parseRelationFile(validMigratoryRelation);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "REL_TEST_MIGRATORY_01",
      relationType: "migratory",
      peopleIdA: "PPL_TEST_A",
      peopleIdB: "PPL_TEST_B",
      direction: "a_to_b",
      period: { startYear: 1200, endYear: 1450, label: expect.any(String) },
    });
    expect(result.data?.sources).toHaveLength(1);
    expect(result.data?.sources[0].tier).toBe(1);
  });

  // @req REQ-032
  it("parses a valid commercial relation fixture (bidirectional, tier 2 source) into a typed RelationRecord", () => {
    const result = parseRelationFile(validCommercialRelation);

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "REL_TEST_COMMERCIAL_01",
      relationType: "commercial",
      direction: "bidirectional",
      period: { startYear: null, endYear: null },
    });
    expect(result.data?.sources[0].tier).toBe(2);
  });

  // @req REQ-032
  it('rejects relationType: "linguistic" with a field-level error (FR73 — derived-only, never stored)', () => {
    const result = parseRelationFile(invalidLinguisticRelationType);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "relationType" })
    );
  });

  // @req REQ-032
  it("rejects a relation with no sources entries", () => {
    const result = parseRelationFile(invalidMissingSources);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "sources" })
    );
  });

  // @req REQ-032
  it("rejects a source with tier: 3 (Tier 3 is forbidden)", () => {
    const result = parseRelationFile(invalidTier3Source);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "sources.0.tier" })
    );
  });

  // @req REQ-032
  it("rejects peopleIdA === peopleIdB", () => {
    const result = parseRelationFile(invalidSamePeopleIds);

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "peopleIdB" })
    );
  });
});
