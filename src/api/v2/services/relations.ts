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
} from "@/lib/supabase/queries/afrik/relations";
import type { SourcedRelation, DerivedLinguisticLink } from "@/types/relations";

const DEFAULT_DERIVED_LIMIT = 24;

export interface EgoNetwork {
  sourced: SourcedRelation[];
  derived: DerivedLinguisticLink[];
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
