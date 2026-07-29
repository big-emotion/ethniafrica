/**
 * Relation types - TypeScript definitions for AFRIK people-relations (Epic 11, FR72-FR77)
 *
 * Mirrors public/modele-relation.json exactly. "linguistic" is intentionally
 * excluded from RelationType: linguistic proximity is derived at read time
 * from languageFamilyId and is never stored (FR73).
 */

import type { PeopleId } from "@/types/afrik";

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
  tier: 1 | 2;
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
