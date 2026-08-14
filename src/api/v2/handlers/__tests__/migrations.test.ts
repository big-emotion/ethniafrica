/**
 * Test-first: migrations handler (Epic 12, Story 12.5, ETNI-518). Covers
 * envelope assembly, pagination meta, confidence passthrough, and the
 * NOT_FOUND / SEMANTIC_ERROR mappings the route layer relies on.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const listMigrationsMock = vi.fn();
const getMigrationByIdMock = vi.fn();

vi.mock("@/api/v2/services/migrations", async () => {
  const actual = await vi.importActual<
    typeof import("@/api/v2/services/migrations")
  >("@/api/v2/services/migrations");
  return {
    ...actual,
    listMigrations: (...args: unknown[]) => listMigrationsMock(...args),
    getMigrationById: (...args: unknown[]) => getMigrationByIdMock(...args),
  };
});

import {
  listMigrationsHandler,
  getMigrationDetailHandler,
} from "../migrations";
import { UnknownPeopleFilterError } from "@/api/v2/services/migrations";
import type {
  MigrationSummary,
  MigrationDetailRecord,
} from "@/types/migrations";

const summary: MigrationSummary = {
  id: "MGR_BANTU_HOMELAND_DISPERSAL",
  nameMain: "Dispersion bantoue",
  migrationGroup: "bantu-expansion",
  eventType: "expansion",
  classificationStatus: "contested",
  timeRange: { startYear: -3000, endYear: -1500, datingNote: null },
  summary: "Résumé",
};

const detail: MigrationDetailRecord = {
  ...summary,
  geometry: { type: "LineString", coordinates: [[11.5, 6.5]] },
  narrative: "Récit",
  debate: "Débat",
  peoples: [{ id: "PPL_KONGO", nameMain: "Kongo", role: "destination" }],
  sources: [{ id: "src-1", title: "Source", url: null, tier: "secondary" }],
};

describe("listMigrationsHandler", () => {
  beforeEach(() => {
    listMigrationsMock.mockReset();
  });

  // @req REQ-100
  it("returns an envelope with data and pagination meta", async () => {
    listMigrationsMock.mockResolvedValue({ data: [summary], total: 1 });

    const result = await listMigrationsHandler({ limit: 20, offset: 0 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data).toEqual([summary]);
      expect(result.envelope.meta.license).toBe("CC-BY-SA-4.0");
      expect(result.envelope.meta.pagination).toEqual({
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });
    }
  });

  // @req REQ-100
  it("computes page from offset/limit", async () => {
    listMigrationsMock.mockResolvedValue({ data: [], total: 45 });

    const result = await listMigrationsHandler({ limit: 20, offset: 40 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.meta.pagination).toEqual({
        total: 45,
        page: 3,
        perPage: 20,
        totalPages: 3,
      });
    }
  });
});

describe("getMigrationDetailHandler", () => {
  beforeEach(() => {
    getMigrationByIdMock.mockReset();
  });

  // @req REQ-100
  it("returns ok:false NOT_FOUND for an unknown id", async () => {
    getMigrationByIdMock.mockResolvedValue(null);

    const result = await getMigrationDetailHandler("MGR_UNKNOWN");

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: expect.any(String),
    });
  });

  // @req REQ-100
  it("returns ok:true with confidence embedded in meta", async () => {
    getMigrationByIdMock.mockResolvedValue({ record: detail, confidence: 73 });

    const result = await getMigrationDetailHandler(
      "MGR_BANTU_HOMELAND_DISPERSAL"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.data).toEqual(detail);
      expect(result.envelope.meta.confidence).toBe(73);
    }
  });
});

describe("listMigrationsHandler — SEMANTIC_ERROR mapping", () => {
  // @req REQ-100
  it("returns ok:false SEMANTIC_ERROR for an unresolvable peopleId filter", async () => {
    listMigrationsMock.mockReset();
    listMigrationsMock.mockRejectedValue(
      new UnknownPeopleFilterError("PPL_UNKNOWN")
    );

    const result = await listMigrationsHandler({
      peopleId: "PPL_UNKNOWN",
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual({
      ok: false,
      code: "SEMANTIC_ERROR",
      message: expect.any(String),
    });
  });
});
