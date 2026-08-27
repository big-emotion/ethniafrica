/**
 * Migrations service — Supabase queries for `/v2/migrations` (Epic 12, Story
 * 12.5, ETNI-518). camelCase mapping happens only here (N3); route/handler
 * layers never see snake_case. Peoples are joined via one embedded-select
 * query (AR17 — no N+1 per event).
 */

import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/api/logger";
import {
  getSourcesMap,
  getConfidenceMap,
} from "@/lib/supabase/queries/afrik/module-zero-batch";
import type {
  MigrationEventType,
  MigrationClassificationStatus,
  MigrationGeometry,
  MigrationTimeRange,
  MigrationSummary,
  MigrationDetailRecord,
  MigrationPeopleRef,
} from "@/types/migrations";

type SupabaseClient = ReturnType<typeof createServerClient>;

// @req REQ-099
export class UnknownPeopleFilterError extends Error {
  constructor(public readonly peopleId: string) {
    super(`Unknown peopleId filter: ${peopleId}`);
    this.name = "UnknownPeopleFilterError";
  }
}

/**
 * A genuine data-access failure (e.g. 42P17 self-referential RLS
 * recursion) — distinct from the legitimate "schema not deployed yet" empty
 * result, so the page can render a failure state instead of an empty one.
 */
// @req REQ-099
export class MigrationsDataAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationsDataAccessError";
  }
}

/**
 * True only for the two codes that mean "the table/schema isn't deployed
 * yet" (pre-migration state) — the one case where degrading to an empty
 * result is legitimate. Any other error (e.g. 42P17 self-referential RLS
 * recursion) must propagate, not be swallowed into a false empty state.
 */
function isSchemaUnavailable(error: { code?: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205";
}

interface MigrationEventRow {
  id: string;
  name: string;
  migration_group: string | null;
  event_type: MigrationEventType;
  classification_status: MigrationClassificationStatus;
  time_start_year: number;
  time_end_year: number;
  dating_note: string | null;
  geometry_geojson: MigrationGeometry;
  summary: string;
  narrative: string;
  debate: string | null;
}

function mapRowToSummary(row: MigrationEventRow): MigrationSummary {
  return {
    id: row.id,
    nameMain: row.name,
    migrationGroup: row.migration_group,
    eventType: row.event_type,
    classificationStatus: row.classification_status,
    timeRange: {
      startYear: row.time_start_year,
      endYear: row.time_end_year,
      datingNote: row.dating_note,
    },
    summary: row.summary,
  };
}

/**
 * A migration event reduced to what it takes to draw it on a map: the
 * four fields MigrationPathLayer reads, and nothing else.
 *
 * It exists because MigrationSummary deliberately withholds the geometry —
 * a contract the service's own tests assert — and widening that type would
 * change the public /api/v2/migrations payload and trip the OpenAPI
 * breaking-change gate. The row is the same row; only the projection
 * differs, so the geometry costs no query and no extra bytes: the select
 * was already `*`.
 */
// @req REQ-115
export interface MigrationPath {
  id: string;
  nameMain: string;
  geometry: MigrationGeometry;
  timeRange: MigrationTimeRange;
}

/**
 * The sourced migration events as drawable paths, oldest first.
 *
 * One query, on migration_events alone. Never getMigrationById: its
 * narrative, sources and confidence fan-out is the N+1 that makes
 * /fr/migrations too heavy to open a home page with.
 *
 * An event the corpus left without geometry is dropped rather than
 * rendered as an empty stroke, and a failed read degrades to an empty
 * list rather than throwing into whatever is rendering — the discipline
 * the hub's availability probe already follows.
 */
// @req REQ-115
export async function listMigrationPaths(
  limit: number
): Promise<MigrationPath[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("migration_events")
    .select("*")
    .order("time_start_year")
    .range(0, limit - 1);

  if (error) {
    logger.error("migrations.listMigrationPaths failed", error);
    return [];
  }

  return ((data || []) as MigrationEventRow[])
    .filter((row) => row.geometry_geojson)
    .map((row) => ({
      id: row.id,
      nameMain: row.name,
      geometry: row.geometry_geojson,
      timeRange: {
        startYear: row.time_start_year,
        endYear: row.time_end_year,
        datingNote: row.dating_note,
      },
    }));
}

// @req REQ-099
export interface ListMigrationsFilters {
  from?: number;
  to?: number;
  eventType?: MigrationEventType;
  peopleId?: string;
  classificationStatus?: MigrationClassificationStatus;
  group?: string;
  limit: number;
  offset: number;
}

async function peopleIdExists(
  supabase: SupabaseClient,
  peopleId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("afrik_peoples")
    .select("id")
    .eq("id", peopleId)
    .maybeSingle();

  if (error) {
    logger.error(`migrations.peopleIdExists failed for ${peopleId}`, error);
    return false;
  }
  return Boolean(data);
}

async function getMigrationIdsForPeople(
  supabase: SupabaseClient,
  peopleId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("migration_event_peoples")
    .select("migration_id")
    .eq("people_id", peopleId);

  if (error) {
    logger.error(
      `migrations.getMigrationIdsForPeople failed for ${peopleId}`,
      error
    );
    return [];
  }
  return ((data || []) as Array<{ migration_id: string }>).map(
    (r) => r.migration_id
  );
}

/**
 * Paginated, filterable migration event summaries for `GET /v2/migrations`.
 * from/to bound the requested [from, to] window; an event is included when
 * its own [startYear, endYear] intersects it (interval intersection, not
 * containment — an event straddling either boundary is included).
 *
 * Throws UnknownPeopleFilterError if peopleId does not resolve to a known
 * people — the handler maps that to 422 SEMANTIC_ERROR.
 */
// @req REQ-099
export async function listMigrations(
  filters: ListMigrationsFilters
): Promise<{ data: MigrationSummary[]; total: number }> {
  const {
    from,
    to,
    eventType,
    peopleId,
    classificationStatus,
    group,
    limit,
    offset,
  } = filters;
  const supabase = createServerClient();

  if (peopleId) {
    const exists = await peopleIdExists(supabase, peopleId);
    if (!exists) {
      throw new UnknownPeopleFilterError(peopleId);
    }
  }

  let query = supabase.from("migration_events").select("*", { count: "exact" });

  if (eventType) query = query.eq("event_type", eventType);
  if (classificationStatus) {
    query = query.eq("classification_status", classificationStatus);
  }
  if (group) query = query.eq("migration_group", group);
  // Interval intersection: [time_start_year, time_end_year] ∩ [from, to] ≠ ∅
  if (from !== undefined) query = query.gte("time_end_year", from);
  if (to !== undefined) query = query.lte("time_start_year", to);

  if (peopleId) {
    const migrationIds = await getMigrationIdsForPeople(supabase, peopleId);
    if (migrationIds.length === 0) {
      return { data: [], total: 0 };
    }
    query = query.in("id", migrationIds);
  }

  const { data, error, count } = await query
    .order("time_start_year")
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error("migrations.listMigrations failed", error);
    if (!isSchemaUnavailable(error)) {
      throw new MigrationsDataAccessError(
        `Failed to list migration events: ${error.message}`
      );
    }
    return { data: [], total: 0 };
  }

  const rows = (data || []) as MigrationEventRow[];
  return {
    data: rows.map(mapRowToSummary),
    total: count ?? rows.length,
  };
}

/**
 * Peoples involved in a migration event, via one embedded-select query
 * (migration_event_peoples joined to afrik_peoples through the FK) — never
 * two round-trips (junction + names), per AR17.
 */
async function getMigrationPeoples(
  supabase: SupabaseClient,
  migrationId: string
): Promise<MigrationPeopleRef[]> {
  const { data, error } = await supabase
    .from("migration_event_peoples")
    .select("people_id, role, afrik_peoples(id, name_main)")
    .eq("migration_id", migrationId);

  if (error) {
    logger.error(
      `migrations.getMigrationPeoples failed for ${migrationId}`,
      error
    );
    return [];
  }

  return (
    (data || []) as unknown as Array<{
      people_id: string;
      role: string | null;
      afrik_peoples: { id: string; name_main: string } | null;
    }>
  ).map((row) => ({
    id: row.people_id,
    nameMain: row.afrik_peoples?.name_main ?? row.people_id,
    role: row.role,
  }));
}

/**
 * Single migration detail for `GET /v2/migrations/{id}`, including full
 * geometry, peoples (one batched join query, AR17), sources, and confidence.
 * Returns null for an unknown id — the handler maps that to 404 NOT_FOUND.
 */
// @req REQ-099
export async function getMigrationById(id: string): Promise<{
  record: MigrationDetailRecord;
  confidence: number | null;
} | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("migration_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error(`migrations.getMigrationById failed for ${id}`, error);
    throw new MigrationsDataAccessError(
      `Failed to load migration event ${id}: ${error.message}`
    );
  }
  if (!data) return null;

  const row = data as MigrationEventRow;

  const [peoples, sourcesMap, confidenceMap] = await Promise.all([
    getMigrationPeoples(supabase, id),
    getSourcesMap([id]),
    getConfidenceMap([id], "migration"),
  ]);

  const record: MigrationDetailRecord = {
    ...mapRowToSummary(row),
    geometry: row.geometry_geojson,
    narrative: row.narrative,
    debate: row.debate,
    peoples,
    sources: sourcesMap.get(id) || [],
  };

  const confidence = confidenceMap.get(id);

  return { record, confidence: confidence ? confidence.score : null };
}
