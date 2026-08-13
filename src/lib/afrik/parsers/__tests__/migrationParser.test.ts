import { describe, it, expect } from "vitest";
import { parseMigrationFile } from "../migrationParser";

function validMigration(overrides: Record<string, unknown> = {}) {
  return {
    id: "MGR_TEST_EXPANSION_01",
    nameMain: "Expansion illustrative de test",
    migrationGroup: "test-group",
    eventType: "expansion",
    classificationStatus: "reconstructive",
    timeRange: {
      startYear: -1000,
      endYear: -500,
      datingNote: null,
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [10, 5],
        [12, 3],
      ],
    },
    peoplesInvolved: [{ id: "PPL_TEST_A", role: "origin" }],
    content: {
      summary: "Résumé illustratif.",
      narrative: "Récit illustratif.",
      debate: null,
      sources: [
        {
          title: "Titre illustratif Tier 1",
          url: "https://example.org/source-tier-1",
          year: 2020,
          tier: 1,
          notes: "",
        },
      ],
    },
    ...overrides,
  };
}

describe("parseMigrationFile", () => {
  // @req REQ-080
  it("parses a valid migration fixture into a typed MigrationRecord", () => {
    const result = parseMigrationFile(validMigration());

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: "MGR_TEST_EXPANSION_01",
      eventType: "expansion",
      classificationStatus: "reconstructive",
    });
  });

  // @req REQ-080
  it("rejects an id not matching ^MGR_[A-Z0-9_]+$", () => {
    const result = parseMigrationFile(validMigration({ id: "MGR_lower" }));

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "id" })
    );
  });

  // @req REQ-080
  it("rejects an eventType outside the MVP enum", () => {
    const result = parseMigrationFile(
      validMigration({ eventType: "colonization" })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "eventType" })
    );
  });

  // @req REQ-080
  it("rejects timeRange.startYear after timeRange.endYear", () => {
    const result = parseMigrationFile(
      validMigration({
        timeRange: { startYear: -100, endYear: -500, datingNote: null },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "timeRange.startYear" })
    );
  });

  // @req REQ-080
  it("rejects a source with tier: 3 (Tier 3 is forbidden)", () => {
    const result = parseMigrationFile(
      validMigration({
        content: {
          ...validMigration().content,
          sources: [
            {
              title: "Forbidden",
              url: "https://example.org/forbidden",
              year: 2020,
              tier: 3,
              notes: "",
            },
          ],
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "content.sources.0.tier" })
    );
  });

  // @req REQ-080
  it("rejects a Tier 2 source with empty notes", () => {
    const result = parseMigrationFile(
      validMigration({
        content: {
          ...validMigration().content,
          sources: [
            {
              title: "Tier 2 no notes",
              url: "https://example.org/tier-2",
              year: 2020,
              tier: 2,
              notes: "",
            },
          ],
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "content.sources.0.notes" })
    );
  });

  // @req REQ-080
  it("rejects classificationStatus contested with fewer than 2 sources", () => {
    const result = parseMigrationFile(
      validMigration({
        classificationStatus: "contested",
        timeRange: {
          startYear: -1000,
          endYear: -500,
          datingNote: "Débat de datation illustratif.",
        },
        content: {
          ...validMigration().content,
          debate: "Débat illustratif.",
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "content.sources" })
    );
  });

  // @req REQ-080
  it("rejects classificationStatus contested with no datingNote or debate", () => {
    const result = parseMigrationFile(
      validMigration({
        classificationStatus: "contested",
        content: {
          ...validMigration().content,
          sources: [
            ...validMigration().content.sources,
            {
              title: "Second source",
              url: "https://example.org/second",
              year: 2021,
              tier: 1,
              notes: "",
            },
          ],
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "timeRange.datingNote" })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "content.debate" })
    );
  });

  // @req REQ-080
  it("accepts a fully-formed contested event with 2 sources, datingNote, and debate", () => {
    const result = parseMigrationFile(
      validMigration({
        classificationStatus: "contested",
        timeRange: {
          startYear: -1000,
          endYear: -500,
          datingNote: "Débat de datation illustratif.",
        },
        content: {
          ...validMigration().content,
          debate: "Débat illustratif.",
          sources: [
            ...validMigration().content.sources,
            {
              title: "Second source",
              url: "https://example.org/second",
              year: 2021,
              tier: 1,
              notes: "",
            },
          ],
        },
      })
    );

    expect(result.success).toBe(true);
  });

  // @req REQ-080
  it("rejects an invalid geometry (LineString with a single coordinate)", () => {
    const result = parseMigrationFile(
      validMigration({
        geometry: { type: "LineString", coordinates: [[10, 5]] },
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "geometry.coordinates" })
    );
  });

  // @req REQ-080
  it("rejects an empty peoplesInvolved array", () => {
    const result = parseMigrationFile(validMigration({ peoplesInvolved: [] }));

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ path: "peoplesInvolved" })
    );
  });
});
