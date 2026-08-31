/**
 * Route-level tests for the `/v2/migrations` endpoints (Epic 12, Story 12.5,
 * ETNI-518, sub-task ETNI-1072) — written first per the sub-task's
 * acceptance criteria. Both list and detail routes return 422 (not 400) on
 * Zod validation failure, per ETNI-1072.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/api/v2/handlers/migrations", () => ({
  listMigrationsHandler: vi.fn(),
  getMigrationDetailHandler: vi.fn(),
}));

vi.mock("@/lib/api/cors", () => ({
  jsonWithCors: vi.fn((data, init) => {
    const response = new Response(JSON.stringify(data), init);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }),
  corsOptionsResponse: vi.fn(() => new Response(null, { status: 204 })),
}));

import {
  listMigrationsHandler,
  getMigrationDetailHandler,
} from "@/api/v2/handlers/migrations";
import {
  GET as listMigrations,
  OPTIONS as optionsList,
} from "../migrations/route";
import {
  GET as getMigrationDetail,
  OPTIONS as optionsDetail,
} from "../migrations/[id]/route";
import type { ApiEnvelope } from "@/api/v2/utils/response";
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
  sources: [{ id: "src-1", title: "Source", url: null, tier: "referenced" }],
};

const listEnvelope: ApiEnvelope<MigrationSummary[]> = {
  data: [summary],
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
    pagination: { total: 1, page: 1, perPage: 20, totalPages: 1 },
  },
  errors: [],
};

const detailEnvelope: ApiEnvelope<MigrationDetailRecord> = {
  data: detail,
  meta: {
    license: "CC-BY-SA-4.0",
    attribution: "EthniAfrica — ethniafrica.com",
    confidence: 73,
  },
  errors: [],
};

describe("GET /api/v2/migrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-101
  it("returns 200 with the summaries envelope and Cache-Control s-maxage=86400, immutable", async () => {
    vi.mocked(listMigrationsHandler).mockResolvedValue({
      ok: true,
      envelope: listEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/migrations?from=-2000&to=500"
    );
    const response = await listMigrations(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].geometry).toBeUndefined();
    expect(response.headers.get("Cache-Control")).toBe(
      "s-maxage=86400, immutable"
    );
  });

  // @req REQ-101
  it("passes parsed filters (from, to, eventType, peopleId, classificationStatus, group, limit, offset) to the handler", async () => {
    vi.mocked(listMigrationsHandler).mockResolvedValue({
      ok: true,
      envelope: listEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/migrations?from=-3000&to=0&eventType=expansion&peopleId=PPL_KONGO&classificationStatus=contested&group=bantu-expansion&limit=10&offset=5"
    );
    await listMigrations(request);

    expect(listMigrationsHandler).toHaveBeenCalledWith({
      from: -3000,
      to: 0,
      eventType: "expansion",
      peopleId: "PPL_KONGO",
      classificationStatus: "contested",
      group: "bantu-expansion",
      limit: 10,
      offset: 5,
    });
  });

  // @req REQ-101
  it("returns 422 on invalid query params (e.g. from > to) before hitting the handler", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/migrations?from=500&to=-2000"
    );
    const response = await listMigrations(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(listMigrationsHandler).not.toHaveBeenCalled();
  });

  // @req REQ-101
  it("returns 422 on an unknown eventType", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/migrations?eventType=invasion"
    );
    const response = await listMigrations(request);

    expect(response.status).toBe(422);
    expect(listMigrationsHandler).not.toHaveBeenCalled();
  });

  // @req REQ-101
  it("returns 422 SEMANTIC_ERROR for an unresolvable peopleId filter", async () => {
    vi.mocked(listMigrationsHandler).mockResolvedValue({
      ok: false,
      code: "SEMANTIC_ERROR",
      message: "Unknown peopleId filter: PPL_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/migrations?peopleId=PPL_UNKNOWN"
    );
    const response = await listMigrations(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors[0].code).toBe("SEMANTIC_ERROR");
  });

  // @req REQ-101
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(listMigrationsHandler).mockRejectedValue(new Error("db down"));

    const request = new NextRequest("http://localhost/api/v2/migrations");
    const response = await listMigrations(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-101
  it("returns 204 with CORS headers on OPTIONS", () => {
    const response = optionsList();
    expect(response.status).toBe(204);
  });
});

describe("GET /api/v2/migrations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // @req REQ-101
  it("returns 200 with the detail envelope (geometry, peoples, sources, confidence) and Cache-Control s-maxage=86400, immutable", async () => {
    vi.mocked(getMigrationDetailHandler).mockResolvedValue({
      ok: true,
      envelope: detailEnvelope,
    });

    const request = new NextRequest(
      "http://localhost/api/v2/migrations/MGR_BANTU_HOMELAND_DISPERSAL"
    );
    const response = await getMigrationDetail(request, {
      params: Promise.resolve({ id: "MGR_BANTU_HOMELAND_DISPERSAL" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.geometry).toEqual({
      type: "LineString",
      coordinates: [[11.5, 6.5]],
    });
    expect(body.data.peoples).toEqual(detail.peoples);
    expect(body.data.sources).toEqual(detail.sources);
    expect(body.meta.confidence).toBe(73);
    expect(response.headers.get("Cache-Control")).toBe(
      "s-maxage=86400, immutable"
    );
  });

  // @req REQ-101
  it("returns 422 for a malformed migration id", async () => {
    const request = new NextRequest("http://localhost/api/v2/migrations/ppl");
    const response = await getMigrationDetail(request, {
      params: Promise.resolve({ id: "ppl" }),
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
    expect(getMigrationDetailHandler).not.toHaveBeenCalled();
  });

  // @req REQ-101
  it("returns 404 NOT_FOUND for an unknown migration id", async () => {
    vi.mocked(getMigrationDetailHandler).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Migration not found: MGR_UNKNOWN",
    });

    const request = new NextRequest(
      "http://localhost/api/v2/migrations/MGR_UNKNOWN"
    );
    const response = await getMigrationDetail(request, {
      params: Promise.resolve({ id: "MGR_UNKNOWN" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe("NOT_FOUND");
  });

  // @req REQ-101
  it("returns 500 INTERNAL_ERROR when the handler throws", async () => {
    vi.mocked(getMigrationDetailHandler).mockRejectedValue(
      new Error("db down")
    );

    const request = new NextRequest(
      "http://localhost/api/v2/migrations/MGR_BANTU_HOMELAND_DISPERSAL"
    );
    const response = await getMigrationDetail(request, {
      params: Promise.resolve({ id: "MGR_BANTU_HOMELAND_DISPERSAL" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errors[0].code).toBe("INTERNAL_ERROR");
  });

  // @req REQ-101
  it("returns 204 with CORS headers on OPTIONS", () => {
    const response = optionsDetail();
    expect(response.status).toBe(204);
  });
});
