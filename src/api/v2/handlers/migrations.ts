/**
 * Migrations handler — assembles the Module #0 envelope and maps error
 * semantics (404 NOT_FOUND / 422 SEMANTIC_ERROR) for the route layer
 * (Epic 12, Story 12.5, ETNI-518).
 */

import {
  listMigrations,
  getMigrationById,
  UnknownPeopleFilterError,
  type ListMigrationsFilters,
} from "@/api/v2/services/migrations";
import type {
  MigrationSummary,
  MigrationDetailRecord,
} from "@/types/migrations";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";

export type ListMigrationsHandlerResult =
  | { ok: true; envelope: ApiEnvelope<MigrationSummary[]> }
  | { ok: false; code: "SEMANTIC_ERROR"; message: string };

export async function listMigrationsHandler(
  query: Omit<ListMigrationsFilters, "limit" | "offset"> & {
    limit?: number;
    offset?: number;
  }
): Promise<ListMigrationsHandlerResult> {
  try {
    // `limit`/`offset` carry zod `.default()`s, which zod's TS types mark
    // optional in the inferred output even though they're always present at
    // runtime post-parse — the `??` fallbacks satisfy the type checker
    // without changing behavior.
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const { data, total } = await listMigrations({ ...query, limit, offset });

    return {
      ok: true,
      envelope: createApiResponse(data, {
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          perPage: limit,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      }),
    };
  } catch (error) {
    if (error instanceof UnknownPeopleFilterError) {
      return { ok: false, code: "SEMANTIC_ERROR", message: error.message };
    }
    throw error;
  }
}

export type MigrationDetailHandlerResult =
  | { ok: true; envelope: ApiEnvelope<MigrationDetailRecord> }
  | { ok: false; code: "NOT_FOUND"; message: string };

export async function getMigrationDetailHandler(
  id: string
): Promise<MigrationDetailHandlerResult> {
  const result = await getMigrationById(id);
  if (!result) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Migration not found: ${id}`,
    };
  }

  return {
    ok: true,
    envelope: createApiResponse(result.record, {
      confidence: result.confidence,
    }),
  };
}
