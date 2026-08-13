/**
 * Relations Data Transformer
 *
 * Merges sourced relations and AFRIK-derived linguistic links into one
 * pre-sorted list for `RelationsList` (Epic 11, Story 11.8). Pure data
 * mapping only — no JSX, no fetching (Carte vivante precedent, UX-DR48).
 */

import type {
  DerivedLinguisticLink,
  RelationConfidence,
  RelationNeighbor,
  RelationPeriod,
  SourcedRelation,
} from "@/types/relations";

// ==========================================
// OUTPUT TYPES
// ==========================================

export type RelationBadgeType =
  | "linguistic"
  | "migratory"
  | "commercial"
  | "religious";

export interface RelationListItem {
  id: string;
  type: RelationBadgeType;
  derived: boolean;
  neighbor: RelationNeighbor;
  period: RelationPeriod | null;
  description: string | null;
  confidence: RelationConfidence | null;
}

// ==========================================
// TRANSFORM FUNCTIONS
// ==========================================

// Sort precedence matches the ego-graph keyboard traversal order (module
// spec §UX & Components): grouped by type, then by neighbor autonym.
const TYPE_SORT_ORDER: Record<RelationBadgeType, number> = {
  linguistic: 0,
  migratory: 1,
  commercial: 2,
  religious: 3,
};

function transformSourcedRelation(relation: SourcedRelation): RelationListItem {
  return {
    id: relation.id,
    type: relation.relationType,
    derived: false,
    neighbor: relation.neighbor,
    period: relation.period,
    description: relation.description,
    confidence: relation.confidence,
  };
}

function transformDerivedLink(link: DerivedLinguisticLink): RelationListItem {
  return {
    id: `derived_${link.neighbor.id}`,
    type: "linguistic",
    derived: true,
    neighbor: link.neighbor,
    period: null,
    description: null,
    confidence: null,
  };
}

/**
 * Merges sourced relations and AFRIK-derived linguistic links into one
 * list, sorted by type then by neighbor name. The two input shapes stay
 * structurally disjoint (FR73) until this read-time merge.
 */
// @req REQ-097
export function transformRelationsToListItems(
  sourced: SourcedRelation[],
  derived: DerivedLinguisticLink[]
): RelationListItem[] {
  const items = [
    ...sourced.map(transformSourcedRelation),
    ...derived.map(transformDerivedLink),
  ];

  return items.sort((a, b) => {
    const typeDiff = TYPE_SORT_ORDER[a.type] - TYPE_SORT_ORDER[b.type];
    if (typeDiff !== 0) return typeDiff;
    return a.neighbor.nameMain.localeCompare(b.neighbor.nameMain, "fr");
  });
}
