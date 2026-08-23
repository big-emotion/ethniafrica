/**
 * Test-first: colonial eventType filter values (Epic 13, Story 13.6,
 * ETNI-530). Proves GET /v2/migrations filters correctly by each of the
 * four colonization event types (fragmentation, displacement, imposed_name,
 * resistance), the MigrationEventSummary shape and list envelope are
 * unchanged (additive only, NFR31), and an unknown eventType still hits the
 * route's existing 422 VALIDATION_ERROR contract (identical to Epic 12).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { listMigrations } from "@/api/v2/services/migrations";
import { GET as listMigrationsRoute } from "@/app/api/v2/migrations/route";
import { swaggerSpecV2 } from "@/lib/api/openapiV2";
import { MIGRATION_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import type { MigrationEventType } from "@/lib/afrik/migrationEventTypes";

type FakeBuilder = Record<string, ReturnType<typeof vi.fn>> & {
  then: (resolve: (v: unknown) => void) => void;
};

function buildChainable(result: {
  data: unknown;
  error: { message: string } | null;
  count?: number;
}): FakeBuilder {
  const builder = {} as FakeBuilder;
  for (const method of ["select", "eq", "gte", "lte", "in", "order", "range"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.then = ((resolve: (v: unknown) => void) => resolve(result)) as never;
  return builder;
}

function eventRow(eventType: MigrationEventType) {
  return {
    id: `MGR_${eventType.toUpperCase()}_EVENT`,
    name: `Event ${eventType}`,
    migration_group: null,
    event_type: eventType,
    classification_status: "colonial-legacy",
    time_start_year: 1880,
    time_end_year: 1960,
    dating_note: null,
    geometry_geojson: { type: "LineString", coordinates: [[11.5, 6.5]] },
    summary: "Résumé",
    narrative: "Récit",
    debate: null,
  };
}

const COLONIAL_EVENT_TYPES: MigrationEventType[] = [
  "fragmentation",
  "displacement",
  "imposed_name",
  "resistance",
];

const SUMMARY_SHAPE_KEYS = [
  "id",
  "nameMain",
  "migrationGroup",
  "eventType",
  "classificationStatus",
  "timeRange",
  "summary",
].sort();

describe("migrations service — colonial eventType filters (ETNI-530)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-099
  it.each(COLONIAL_EVENT_TYPES)(
    "filters by eventType=%s and returns only events of that type",
    async (eventType) => {
      const row = eventRow(eventType);
      const builder = buildChainable({ data: [row], error: null, count: 1 });
      fromMock.mockImplementation((table: string) => {
        if (table === "migration_events") return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      const result = await listMigrations({ eventType, limit: 20, offset: 0 });

      expect(builder.eq).toHaveBeenCalledWith("event_type", eventType);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].eventType).toBe(eventType);
      // MigrationEventSummary shape unchanged — additive only (NFR31)
      expect(Object.keys(result.data[0]).sort()).toEqual(SUMMARY_SHAPE_KEYS);
    }
  );
});

describe("GET /api/v2/migrations — colonial eventType filter contract (ETNI-530)", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-101
  it.each(COLONIAL_EVENT_TYPES)(
    "accepts eventType=%s as a valid query param and returns the unchanged envelope",
    async (eventType) => {
      const row = eventRow(eventType);
      const builder = buildChainable({ data: [row], error: null, count: 1 });
      fromMock.mockImplementation((table: string) => {
        if (table === "migration_events") return builder;
        throw new Error(`Unexpected table: ${table}`);
      });

      const request = new NextRequest(
        `http://localhost/api/v2/migrations?eventType=${eventType}`
      );
      const response = await listMigrationsRoute(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(builder.eq).toHaveBeenCalledWith("event_type", eventType);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].eventType).toBe(eventType);
      expect(Object.keys(body.data[0]).sort()).toEqual(SUMMARY_SHAPE_KEYS);
      expect(body.meta.pagination).toEqual({
        total: 1,
        page: 1,
        perPage: 20,
        totalPages: 1,
      });
    }
  );

  // @req REQ-101
  it("returns 422 VALIDATION_ERROR for an unknown eventType — identical to Epic 12's existing contract", async () => {
    const request = new NextRequest(
      "http://localhost/api/v2/migrations?eventType=not_a_type"
    );
    const response = await listMigrationsRoute(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
  });
});

describe("OpenAPI v2 spec — /v2/migrations eventType enum (ETNI-530)", () => {
  // @req REQ-101
  it("documents all MIGRATION_EVENT_TYPES on the eventType query param", () => {
    const param = (
      swaggerSpecV2.paths["/api/v2/migrations"].get.parameters as Array<{
        name: string;
        schema: { enum?: readonly string[] };
      }>
    ).find((p) => p.name === "eventType");

    expect(param?.schema.enum).toEqual(MIGRATION_EVENT_TYPES);
  });

  // @req REQ-101
  it("documents all MIGRATION_EVENT_TYPES on the MigrationEventSummary schema (additive only, NFR31)", () => {
    const eventTypeSchema =
      swaggerSpecV2.components.schemas.MigrationEventSummary.properties
        .eventType;

    expect(eventTypeSchema.enum).toEqual(MIGRATION_EVENT_TYPES);
  });
});
