/**
 * Relations Service — two-query ego network (Epic 11, Story 11.6, ETNI-507)
 *
 * Composes a people's ego network from exactly two query-layer calls
 * (FR73): sourced relations (getRelationsForPeople) and derived
 * linguistic-proximity links (getDerivedLinguisticLinks). The
 * sourced/derived split is guaranteed by construction — derived is filtered
 * against the sourced neighbor set here, independent of query-layer
 * correctness.
 */

import {
  getRelationsForPeople,
  getDerivedLinguisticLinks,
  peopleExists,
  listRelationRecords,
  getRelationRecordById,
  type ListRelationRecordsFilters,
} from "@/lib/supabase/queries/afrik/relations";
import type {
  SourcedRelation,
  DerivedLinguisticLink,
  PublicRelationRecord,
} from "@/types/relations";

const DEFAULT_DERIVED_LIMIT = 24;

export interface EgoNetwork {
  sourced: SourcedRelation[];
  derived: DerivedLinguisticLink[];
}

export class PeopleNotFoundError extends Error {
  constructor(pplId: string) {
    super(`People not found: ${pplId}`);
    this.name = "PeopleNotFoundError";
  }
}

/**
 * Get the ego network for a people: sourced relations plus AFRIK-derived
 * linguistic-proximity links, with derived peoples already present in
 * sourced excluded. Never returns null; never throws for an unknown or
 * relation-less people (both collections default to empty arrays).
 */
export async function getEgoNetwork(
  pplId: string,
  derivedLimit: number = DEFAULT_DERIVED_LIMIT
): Promise<EgoNetwork> {
  const [sourced, derived] = await Promise.all([
    getRelationsForPeople(pplId),
    getDerivedLinguisticLinks(pplId, derivedLimit),
  ]);

  const sourcedNeighborIds = new Set(sourced.map((r) => r.neighbor.id));

  return {
    sourced,
    derived: derived.filter(
      (link) => !sourcedNeighborIds.has(link.neighbor.id)
    ),
  };
}

/**
 * Ego network for `GET /v2/peoples/{id}/relations`, 404-checked. getEgoNetwork
 * itself never distinguishes "unknown people" from "known, zero relations"
 * (by design — Story 11.6); this wrapper adds that check for the route layer
 * without changing getEgoNetwork's existing contract.
 */
export async function getEgoNetworkOrNotFound(
  pplId: string,
  derivedLimit: number = DEFAULT_DERIVED_LIMIT
): Promise<EgoNetwork> {
  if (!(await peopleExists(pplId))) {
    throw new PeopleNotFoundError(pplId);
  }
  return getEgoNetwork(pplId, derivedLimit);
}

/**
 * Paginated, filterable relation records for `GET /v2/relations`.
 */
export async function listRelations(
  filters: ListRelationRecordsFilters
): Promise<{ data: PublicRelationRecord[]; total: number }> {
  return listRelationRecords(filters);
}

/**
 * Single relation detail for `GET /v2/relations/{id}`. Returns null for an
 * unknown id — the handler maps that to 404 NOT_FOUND.
 */
export async function getRelationById(
  id: string
): Promise<PublicRelationRecord | null> {
  return getRelationRecordById(id);
}
