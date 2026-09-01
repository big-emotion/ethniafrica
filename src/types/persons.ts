/**
 * Person types — TypeScript definitions for the ARCH-018 individual-person
 * entity (ethnographer, author, informant, translator, historian, etc.).
 *
 * Distinct from `People` (src/types/afrik.ts), which is the AFRIK
 * ethnic-group entity. Mirrors supabase/migrations/057_person_schema.sql.
 */

import type { CountryId, PeopleId } from "@/types/afrik";
import type { SourceTier } from "@/types/sources";

export type PersonId = `PER_${string}`;

// @req REQ-137
export const PERSON_PEOPLE_RELATION_LABELS = [
  "membership",
  "observation",
] as const;

export type PersonPeopleRelationLabel =
  (typeof PERSON_PEOPLE_RELATION_LABELS)[number];

export interface PersonSource {
  title: string;
  author: string;
  year: number;
  url: string;
  tier: SourceTier;
  notes?: string;
}

/**
 * A person's link to a people, labelled membership (belongs to the people)
 * or observation (studied the people — e.g. an ethnographer). Never
 * inferred: always the value the fiche declares.
 */
export interface PersonPeopleLink {
  peopleId: PeopleId;
  relationLabel: PersonPeopleRelationLabel;
}

/** The strict-model shape a person JSON fiche must satisfy. */
export interface PersonDossier {
  id: PersonId;
  fullName: string;
  roleCategory: string;
  countryIds: CountryId[];
  peopleLinks: PersonPeopleLink[];
  sources: PersonSource[];
}

/** A persisted person, as read back through the data-access layer. */
export interface Person {
  id: PersonId;
  fullName: string;
  roleCategory: string;
  countryIds: CountryId[];
  peopleLinks: PersonPeopleLink[];
  sources: PersonSource[];
}
