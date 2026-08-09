/**
 * Handlers for the `/v2` relations endpoints (Epic 11, Story 11.7, ETNI-508).
 *
 * Business logic incl. the derived-link computation policy: `types` filters
 * the sourced collection by relationType; `includeDerived` independently
 * toggles whether the derived collection is populated at all — the
 * sourced/derived split stays structural (FR73), never a flag on a shared
 * item shape.
 */

import {
  getEgoNetworkOrNotFound,
  listRelations,
  getRelationById,
  PeopleNotFoundError,
} from "@/api/v2/services/relations";
import type {
  EgoNetworkQuery,
  ListRelationsQuery,
} from "@/api/v2/schemas/relations";
import { createApiResponse, type ApiEnvelope } from "@/api/v2/utils/response";
import type { PublicRelationRecord, RelationNeighbor } from "@/types/relations";

export interface PublicSourcedRelationItem {
  relationId: string;
  type: string;
  direction: string;
  otherPeople: RelationNeighbor;
  period: { startYear: number | null; endYear: number | null; label: string };
  description: string;
  confidence: { score: number; sourceCount: number | null } | null;
}

export interface PublicDerivedRelationItem {
  type: "linguistic";
  derived: true;
  basis: "sharedLanguageFamily";
  languageFamilyId: string;
  otherPeople: RelationNeighbor;
}

export interface EgoNetworkData {
  peopleId: string;
  sourced: PublicSourcedRelationItem[];
  derived: PublicDerivedRelationItem[];
}

export type EgoNetworkHandlerResult =
  | { ok: true; envelope: ApiEnvelope<EgoNetworkData> }
  | { ok: false; code: "NOT_FOUND"; message: string };

export async function getEgoNetworkHandler(
  peopleId: string,
  query: EgoNetworkQuery
): Promise<EgoNetworkHandlerResult> {
  try {
    const network = await getEgoNetworkOrNotFound(peopleId, query.limit);

    const sourcedRows = query.types
      ? network.sourced.filter((r) => query.types!.includes(r.relationType))
      : network.sourced;

    const sourced: PublicSourcedRelationItem[] = sourcedRows.map((r) => ({
      relationId: r.id,
      type: r.relationType,
      direction: r.direction,
      otherPeople: r.neighbor,
      period: r.period,
      description: r.description,
      confidence: r.confidence,
    }));

    const derived: PublicDerivedRelationItem[] = query.includeDerived
      ? network.derived.map((d) => ({
          type: "linguistic" as const,
          derived: true as const,
          basis: d.basis,
          languageFamilyId: d.neighbor.languageFamilyId,
          otherPeople: d.neighbor,
        }))
      : [];

    return {
      ok: true,
      envelope: createApiResponse({ peopleId, sourced, derived }),
    };
  } catch (error) {
    if (error instanceof PeopleNotFoundError) {
      return { ok: false, code: "NOT_FOUND", message: error.message };
    }
    throw error;
  }
}

export async function listRelationsHandler(
  query: ListRelationsQuery
): Promise<ApiEnvelope<PublicRelationRecord[]>> {
  // `limit`/`offset` carry zod `.default()`s, which zod's TS types mark
  // optional in the inferred output even though they're always present at
  // runtime post-parse — the `??` fallbacks satisfy the type checker without
  // changing behavior.
  const limit = query.limit ?? 20;
  const offset = query.offset ?? 0;
  const { data, total } = await listRelations({ ...query, limit, offset });

  return createApiResponse(data, {
    pagination: {
      total,
      page: Math.floor(offset / limit) + 1,
      perPage: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export type RelationDetailHandlerResult =
  | { ok: true; envelope: ApiEnvelope<PublicRelationRecord> }
  | { ok: false; code: "NOT_FOUND"; message: string };

export async function getRelationDetailHandler(
  id: string
): Promise<RelationDetailHandlerResult> {
  const record = await getRelationById(id);
  if (!record) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `Relation not found: ${id}`,
    };
  }
  return { ok: true, envelope: createApiResponse(record) };
}
