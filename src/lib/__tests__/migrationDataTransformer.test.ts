import { describe, expect, it } from "vitest";

import {
  transformMigrationData,
  type RawMigrationDetailPayload,
} from "../migrationDataTransformer";
import type { MigrationDetailRecord } from "@/types/migrations";

function makeRecord(
  overrides: Partial<MigrationDetailRecord> = {}
): MigrationDetailRecord {
  return {
    id: "MGR_TEST",
    nameMain: "Test migration",
    migrationGroup: null,
    eventType: "expansion",
    classificationStatus: "consensual",
    timeRange: { startYear: 100, endYear: 200, datingNote: null },
    summary: "Summary",
    geometry: { type: "LineString", coordinates: [] },
    narrative: "Paragraph one.\n\nParagraph two.",
    debate: null,
    peoples: [{ id: "PPL_TEST", nameMain: "Test people", role: "origin" }],
    sources: [{ id: "src-1", title: "Source", url: null, tier: "1" }],
    ...overrides,
  };
}

describe("transformMigrationData (Epic 12, Story 12.8, ETNI-521)", () => {
  // @req REQ-101 FR81 FR82
  it("returns empty list/narrative/atlas and null scrubber bounds for an empty corpus", () => {
    expect(transformMigrationData([])).toEqual({
      list: [],
      narrative: [],
      atlas: [],
      scrubberBounds: null,
    });
  });

  // @req REQ-101 FR81 FR82
  it("never throws on null/undefined input, returning empty page data", () => {
    expect(transformMigrationData(null as unknown as [])).toEqual({
      list: [],
      narrative: [],
      atlas: [],
      scrubberBounds: null,
    });
    expect(transformMigrationData(undefined as unknown as [])).toEqual({
      list: [],
      narrative: [],
      atlas: [],
      scrubberBounds: null,
    });
  });

  // @req REQ-101 FR81 FR82
  it("never throws and drops entries with missing/malformed data payloads", () => {
    const raw = [
      {} as RawMigrationDetailPayload,
      { data: undefined } as unknown as RawMigrationDetailPayload,
      { data: makeRecord({ id: "MGR_OK" }) },
    ];
    const result = transformMigrationData(raw);
    expect(result.narrative).toHaveLength(1);
    expect(result.narrative[0].id).toBe("MGR_OK");
  });

  // @req REQ-101 FR81 FR82
  it("defaults missing optional fields instead of throwing", () => {
    const record = makeRecord({
      id: "MGR_MINIMAL",
      migrationGroup: undefined as unknown as null,
      debate: undefined as unknown as null,
      narrative: undefined as unknown as string,
      peoples: undefined as unknown as [],
      sources: undefined as unknown as [],
      timeRange: undefined as unknown as MigrationDetailRecord["timeRange"],
    });
    const result = transformMigrationData([{ data: record }]);

    expect(result.narrative[0]).toMatchObject({
      id: "MGR_MINIMAL",
      migrationGroup: null,
      debate: null,
      peoples: [],
      paragraphs: [],
      sourceCount: 0,
      timeRange: { startYear: 0, endYear: 0, datingNote: null },
    });
  });

  // @req REQ-101 FR82
  it("splits the narrative into paragraphs, attaching confidence data to each", () => {
    const record = makeRecord({
      narrative: "First paragraph.\n\nSecond paragraph.\n\nThird.",
    });
    const confidence = {
      score: 87,
      sourceCount: 3,
      lastHumanAuditAt: "2026-01-05",
    };
    const result = transformMigrationData([{ data: record, confidence }]);

    expect(result.narrative[0].paragraphs).toEqual([
      { text: "First paragraph.", confidence },
      { text: "Second paragraph.", confidence },
      { text: "Third.", confidence },
    ]);
  });

  // @req REQ-101 FR82
  it("degrades paragraph confidence to null when no confidence payload is provided", () => {
    const record = makeRecord({ narrative: "Only paragraph." });
    const result = transformMigrationData([{ data: record }]);

    expect(result.narrative[0].paragraphs).toEqual([
      { text: "Only paragraph.", confidence: null },
    ]);
  });

  // @req REQ-101 FR81
  it("orders phases sharing a migrationGroup chronologically, grouped together", () => {
    const raw: RawMigrationDetailPayload[] = [
      {
        data: makeRecord({
          id: "MGR_STANDALONE_EARLY",
          migrationGroup: null,
          timeRange: { startYear: -500, endYear: -400, datingNote: null },
        }),
      },
      {
        data: makeRecord({
          id: "MGR_BANTU_PHASE_2",
          migrationGroup: "bantu-expansion",
          timeRange: { startYear: 500, endYear: 1000, datingNote: null },
        }),
      },
      {
        data: makeRecord({
          id: "MGR_BANTU_PHASE_1",
          migrationGroup: "bantu-expansion",
          timeRange: { startYear: -2000, endYear: -1000, datingNote: null },
        }),
      },
      {
        data: makeRecord({
          id: "MGR_STANDALONE_LATE",
          migrationGroup: null,
          timeRange: { startYear: 1600, endYear: 1700, datingNote: null },
        }),
      },
    ];

    const result = transformMigrationData(raw);

    expect(result.narrative.map((e) => e.id)).toEqual([
      "MGR_BANTU_PHASE_1",
      "MGR_BANTU_PHASE_2",
      "MGR_STANDALONE_EARLY",
      "MGR_STANDALONE_LATE",
    ]);
  });

  // @req REQ-101 FR81
  it("derives scrubber bounds from the corpus min startYear and max endYear", () => {
    const raw: RawMigrationDetailPayload[] = [
      {
        data: makeRecord({
          id: "MGR_A",
          timeRange: { startYear: -2000, endYear: -1000, datingNote: null },
        }),
      },
      {
        data: makeRecord({
          id: "MGR_B",
          timeRange: { startYear: 100, endYear: 1500, datingNote: null },
        }),
      },
    ];

    expect(transformMigrationData(raw).scrubberBounds).toEqual({
      min: -2000,
      max: 1500,
    });
  });

  // @req REQ-101 FR83
  it("builds list entries carrying peopleIds for the ?peuple filter", () => {
    const record = makeRecord({
      id: "MGR_LIST",
      peoples: [
        { id: "PPL_A", nameMain: "A", role: "origin" },
        { id: "PPL_B", nameMain: "B", role: "destination" },
      ],
    });
    const result = transformMigrationData([{ data: record }]);

    expect(result.list).toEqual([
      {
        id: "MGR_LIST",
        nameMain: "Test migration",
        eventType: "expansion",
        classificationStatus: "consensual",
        timeRange: { startYear: 100, endYear: 200, datingNote: null },
        peopleIds: ["PPL_A", "PPL_B"],
      },
    ]);
  });

  // @req REQ-101 FR78 FR79 ETNI-522
  it("builds atlas entries carrying geometry, full sources and confidence for the Carte panel", () => {
    const record = makeRecord({
      id: "MGR_ATLAS",
      geometry: {
        type: "LineString",
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
      sources: [
        { id: "src-1", title: "Source", url: "https://x.test", tier: "1" },
      ],
    });
    const confidence = {
      score: 90,
      sourceCount: 1,
      lastHumanAuditAt: "2026-01-05",
    };
    const result = transformMigrationData([{ data: record, confidence }]);

    expect(result.atlas).toEqual([
      {
        id: "MGR_ATLAS",
        nameMain: "Test migration",
        eventType: "expansion",
        classificationStatus: "consensual",
        timeRange: { startYear: 100, endYear: 200, datingNote: null },
        geometry: {
          type: "LineString",
          coordinates: [
            [1, 2],
            [3, 4],
          ],
        },
        peoples: [{ id: "PPL_TEST", nameMain: "Test people", role: "origin" }],
        sources: [
          { id: "src-1", title: "Source", url: "https://x.test", tier: "1" },
        ],
        confidence,
      },
    ]);
  });

  // @req REQ-101 FR78 FR79 ETNI-522
  it("defaults atlas geometry and drops malformed atlas entries without throwing", () => {
    const raw = [
      {} as RawMigrationDetailPayload,
      {
        data: makeRecord({
          id: "MGR_NO_GEOMETRY",
          geometry: undefined as unknown as MigrationDetailRecord["geometry"],
        }),
      },
    ];
    const result = transformMigrationData(raw);

    expect(result.atlas).toHaveLength(1);
    expect(result.atlas[0].geometry).toEqual({
      type: "LineString",
      coordinates: [],
    });
  });

  // @req REQ-101 FR81
  it("preserves debate text and sourceCount for contested events", () => {
    const record = makeRecord({
      classificationStatus: "contested",
      debate: "Historians disagree on the dating.",
      sources: [
        { id: "s1", title: "A", url: null, tier: "1" },
        { id: "s2", title: "B", url: null, tier: "2" },
      ],
    });
    const result = transformMigrationData([{ data: record }]);

    expect(result.narrative[0].debate).toBe(
      "Historians disagree on the dating."
    );
    expect(result.narrative[0].sourceCount).toBe(2);
  });
});
