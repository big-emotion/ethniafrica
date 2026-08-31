/**
 * Relation types - TypeScript definitions for AFRIK people-relations (Epic 11, FR72-FR77)
 *
 * Mirrors public/modele-relation.json exactly. "linguistic" is intentionally
 * excluded from RelationType: linguistic proximity is derived at read time
 * from languageFamilyId and is never stored (FR73).
 */

import type { PeopleId } from "@/types/afrik";
import type { SourceTier } from "@/types/sources";

export type RelationType = "migratory" | "commercial" | "religious";

export type RelationDirection = "a_to_b" | "b_to_a" | "bidirectional";

export interface RelationPeriod {
  startYear: number | null;
  endYear: number | null;
  label: string;
}

export interface RelationSource {
  title: string;
  author: string;
  year: number;
  url: string;
  tier: SourceTier;
  notes?: string;
}

export interface RelationRecord {
  id: string; // REL_xxxxx
  relationType: RelationType;
  peopleIdA: PeopleId;
  peopleIdB: PeopleId;
  direction: RelationDirection;
  period: RelationPeriod;
  description: string;
  sources: RelationSource[];
}

/**
 * Read-time shapes for the relations service/query layer (Epic 11, Story
 * 11.6). SourcedRelation and DerivedLinguisticLink are deliberately disjoint
 * types — the sourced/derived distinction is structural (FR73), not a flag
 * on a shared interface. DerivedLinguisticLink has no period, description,
 * or sources: it is computed from the AFRIK hierarchy, never stored.
 */

export interface RelationNeighbor {
  id: PeopleId;
  nameMain: string;
  languageFamilyId: string;
}

export interface RelationConfidence {
  score: number;
  sourceCount: number | null;
}

export interface RelationSourceRef {
  id: string;
  title: string;
  url: string | null;
  tier: SourceTier | null;
}

export interface SourcedRelation {
  id: string; // REL_xxxxx
  relationType: RelationType;
  direction: RelationDirection;
  period: RelationPeriod;
  description: string;
  sources: RelationSourceRef[];
  confidence: RelationConfidence | null;
  neighbor: RelationNeighbor;
}

export interface DerivedLinguisticLink {
  derived: true;
  basis: "sharedLanguageFamily";
  neighbor: RelationNeighbor;
}

/**
 * Read-time shape for the non-ego-centered `/v2/relations` list and
 * `/v2/relations/{id}` detail endpoints (Epic 11, Story 11.7, ETNI-508).
 * Unlike SourcedRelation, this is not centered on one people: both sides are
 * exposed directly as peopleIdA/peopleIdB rather than a single `neighbor`.
 */
export interface PublicRelationRecord {
  id: string; // REL_xxxxx
  relationType: RelationType;
  peopleIdA: PeopleId;
  peopleIdB: PeopleId;
  direction: RelationDirection;
  period: RelationPeriod;
  description: string;
  sources: RelationSourceRef[];
  confidence: RelationConfidence | null;
}
