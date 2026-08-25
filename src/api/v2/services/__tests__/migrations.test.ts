/**
 * Test-first: migrations service (Epic 12, Story 12.5, ETNI-518). Covers
 * happy path, each filter, intersect-boundary semantics, and the
 * batched-join guarantee (no N+1 peoples query).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/api/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const getSourcesMapMock = vi.fn();
const getConfidenceMapMock = vi.fn();

vi.mock("@/lib/supabase/queries/afrik/module-zero-batch", () => ({
  getSourcesMap: (...args: unknown[]) => getSourcesMapMock(...args),
  getConfidenceMap: (...args: unknown[]) => getConfidenceMapMock(...args),
}));

import {
  listMigrations,
  getMigrationById,
  UnknownPeopleFilterError,
} from "../migrations";

type FakeBuilder = Record<string, ReturnType<typeof vi.fn>> & {
  then: (resolve: (v: unknown) => void) => void;
};

function buildChainable(result: {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number;
}): FakeBuilder {
  const builder = {} as FakeBuilder;
  for (const method of ["select", "eq", "gte", "lte", "in", "order", "range"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Any chain step is awaitable — real supabase-js builders are PromiseLike.
  builder.then = ((resolve: (v: unknown) => void) => resolve(result)) as never;
  return builder;
}

const eventRow = {
  id: "MGR_BANTU_HOMELAND_DISPERSAL",
  name: "Dispersion bantoue",
  migration_group: "bantu-expansion",
  event_type: "expansion",
  classification_status: "contested",
  time_start_year: -3000,
  time_end_year: -1500,
  dating_note: "note",
  geometry_geojson: { type: "LineString", coordinates: [[11.5, 6.5]] },
  summary: "Résumé",
  narrative: "Récit",
  debate: "Débat",
};

describe("migrations service — listMigrations", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  // @req REQ-099
  it("returns summaries (no geometry) with total count on the happy path", async () => {
    const migrationEventsBuilder = buildChainable({
      data: [eventRow],
      error: null,
      count: 1,
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "migration_events") return migrationEventsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await listMigrations({ limit: 20, offset: 0 });

    expect(result.total).toBe(1);
    expect(result.data).toEqual([
      {
        id: "MGR_BANTU_HOMELAND_DISPERSAL",
        nameMain: "Dispersion bantoue",
        migrationGroup: "bantu-expansion",
        eventType: "expansion",
        classificationStatus: "contested",
        timeRange: { startYear: -3000, endYear: -1500, datingNote: "note" },
        summary: "Résumé",
      },
    ]);
    expect(
      (result.data[0] as unknown as Record<string, unknown>).geometry
    ).toBeUndefined();
  });

  // @req REQ-099
  it("applies intersect semantics: gte(time_end_year, from) and lte(time_start_year, to) — not containment", async () => {
    const migrationEventsBuilder = buildChainable({
      data: [],
      error: null,
      count: 0,
    });
    fromMock.mockImplementation(() => migrationEventsBuilder);

    await listMigrations({ from: -2000, to: 500, limit: 20, offset: 0 });

    expect(migrationEventsBuilder.gte).toHaveBeenCalledWith(
      "time_end_year",
      -2000
    );
    expect(migrationEventsBuilder.lte).toHaveBeenCalledWith(
      "time_start_year",
      500
    );
  });

  // @req REQ-099
  it("includes an event straddling the range boundary (starts before from, ends after to)", async () => {
    // starts -3000, ends -1500; range [from=-2000, to=-1800] is fully inside
    // the event's own window — the mock DB has no real filter engine, so
    // this asserts the query is built to select on intersection, not on
    // full containment of the requested window inside the event.
    const migrationEventsBuilder = buildChainable({
      data: [eventRow],
      error: null,
      count: 1,
    });
    fromMock.mockImplementation(() => migrationEventsBuilder);

    const result = await listMigrations({
      from: -2000,
      to: -1800,
      limit: 20,
      offset: 0,
    });

    expect(result.data).toHaveLength(1);
    expect(migrationEventsBuilder.gte).toHaveBeenCalledWith(
      "time_end_year",
      -2000
    );
    expect(migrationEventsBuilder.lte).toHaveBeenCalledWith(
      "time_start_year",
      -1800
    );
  });

  // @req REQ-099
  it("filters by eventType", async () => {
    const migrationEventsBuilder = buildChainable({
      data: [],
      error: null,
      count: 0,
    });
    fromMock.mockImplementation(() => migrationEventsBuilder);

    await listMigrations({ eventType: "trade_route", limit: 20, offset: 0 });

    expect(migrationEventsBuilder.eq).toHaveBeenCalledWith(
      "event_type",
      "trade_route"
    );
  });

  // @req REQ-099
  it("filters by classificationStatus", async () => {
    const migrationEventsBuilder = buildChainable({
      data: [],
      error: null,
      count: 0,
    });
    fromMock.mockImplementation(() => migrationEventsBuilder);

    await listMigrations({
      classificationStatus: "contested",
      limit: 20,
      offset: 0,
    });

    expect(migrationEventsBuilder.eq).toHaveBeenCalledWith(
      "classification_status",
      "contested"
    );
  });

  // @req REQ-099
  it("filters by group", async () => {
    const migrationEventsBuilder = buildChainable({
      data: [],
      error: null,
      count: 0,
    });
    fromMock.mockImplementation(() => migrationEventsBuilder);

    await listMigrations({ group: "bantu-expansion", limit: 20, offset: 0 });

    expect(migrationEventsBuilder.eq).toHaveBeenCalledWith(
      "migration_group",
      "bantu-expansion"
    );
  });

  // @req REQ-099
  it("filters by peopleId, restricting to migration ids from the junction table", async () => {
    const migrationEventsBuilder = buildChainable({
      data: [eventRow],
      error: null,
      count: 1,
    });
    const peopleBuilder = buildChainable({
      data: { id: "PPL_KONGO" },
      error: null,
    });
    const junctionBuilder = buildChainable({
      data: [{ migration_id: "MGR_BANTU_HOMELAND_DISPERSAL" }],
      error: null,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "migration_events") return migrationEventsBuilder;
      if (table === "afrik_peoples") return peopleBuilder;
      if (table === "migration_event_peoples") return junctionBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await listMigrations({
      peopleId: "PPL_KONGO",
      limit: 20,
      offset: 0,
    });

    expect(result.data).toHaveLength(1);
    expect(migrationEventsBuilder.in).toHaveBeenCalledWith("id", [
      "MGR_BANTU_HOMELAND_DISPERSAL",
    ]);
  });

  // @req REQ-099
  it("throws UnknownPeopleFilterError for an unresolvable peopleId (maps to 422 SEMANTIC_ERROR)", async () => {
    const peopleBuilder = buildChainable({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "afrik_peoples") return peopleBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(
      listMigrations({ peopleId: "PPL_UNKNOWN", limit: 20, offset: 0 })
    ).rejects.toThrow(UnknownPeopleFilterError);
  });

  // @req REQ-055 — 42P17 (self-referential RLS recursion, DEC-017) must
  // surface as a thrown error, never as a silent empty result.
  it("throws on a real Postgres error (42P17) instead of returning a false empty state", async () => {
    const migrationEventsBuilder = buildChainable({
      data: null,
      error: {
        message:
          'infinite recursion detected in policy for relation "user_roles"',
        code: "42P17",
      },
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "migration_events") return migrationEventsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(listMigrations({ limit: 20, offset: 0 })).rejects.toThrow(
      /Failed to list migration events/
    );
  });

  // @req REQ-055
  it("still degrades to an empty result when the schema isn't deployed yet (42P01)", async () => {
    const migrationEventsBuilder = buildChainable({
      data: null,
      error: {
        message: 'relation "migration_events" does not exist',
        code: "42P01",
      },
    });
    fromMock.mockImplementation((table: string) => {
      if (table === "migration_events") return migrationEventsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await listMigrations({ limit: 20, offset: 0 });

    expect(result).toEqual({ data: [], total: 0 });
  });
});

describe("migrations service — getMigrationById", () => {
  beforeEach(() => {
    fromMock.mockReset();
    getSourcesMapMock.mockReset();
    getConfidenceMapMock.mockReset();
    getSourcesMapMock.mockResolvedValue(new Map());
    getConfidenceMapMock.mockResolvedValue(new Map());
  });

  // @req REQ-099
  it("returns null for an unknown id", async () => {
    const migrationEventBuilder = buildChainable({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === "migration_events") return migrationEventBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await getMigrationById("MGR_UNKNOWN");
    expect(result).toBeNull();
  });

  // @req REQ-099
  it("returns full detail incl. geometry, peoples (one batched query), sources, and confidence", async () => {
    const migrationEventBuilder = buildChainable({
      data: eventRow,
      error: null,
    });
    const peoplesJoinBuilder = buildChainable({
      data: [
        {
          people_id: "PPL_KONGO",
          role: "destination",
          afrik_peoples: { id: "PPL_KONGO", name_main: "Kongo" },
        },
      ],
      error: null,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "migration_events") return migrationEventBuilder;
      if (table === "migration_event_peoples") return peoplesJoinBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    getSourcesMapMock.mockResolvedValue(
      new Map([
        [
          "MGR_BANTU_HOMELAND_DISPERSAL",
          [{ id: "src-1", title: "Source", url: null, tier: "secondary" }],
        ],
      ])
    );
    getConfidenceMapMock.mockResolvedValue(
      new Map([
        [
          "MGR_BANTU_HOMELAND_DISPERSAL",
          {
            entityId: "MGR_BANTU_HOMELAND_DISPERSAL",
            score: 73,
            sourceCount: 1,
            avgSourceQuality: null,
            lastHumanAuditAt: null,
            openFlagCount: 0,
            recomputedAt: null,
          },
        ],
      ])
    );

    const result = await getMigrationById("MGR_BANTU_HOMELAND_DISPERSAL");

    expect(result).not.toBeNull();
    expect(result!.confidence).toBe(73);
    expect(result!.record.geometry).toEqual({
      type: "LineString",
      coordinates: [[11.5, 6.5]],
    });
    expect(result!.record.peoples).toEqual([
      { id: "PPL_KONGO", nameMain: "Kongo", role: "destination" },
    ]);
    expect(result!.record.sources).toEqual([
      { id: "src-1", title: "Source", url: null, tier: "secondary" },
    ]);

    // AR17 — no N+1: exactly one call reads migration_event_peoples.
    const junctionCalls = fromMock.mock.calls.filter(
      ([table]) => table === "migration_event_peoples"
    );
    expect(junctionCalls).toHaveLength(1);
  });
});
