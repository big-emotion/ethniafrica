/**
 * Display labels for a person search result (REQ-126).
 *
 * Two mappings, kept in one place each so a new role or relation value is
 * added once rather than wherever a card happens to render it:
 *
 * - `getPersonRoleLabel` — the role category (`ethnographer`, `head_of_state`,
 *   ...) in French. An unmapped slug falls back to itself rather than being
 *   hidden, because the acceptance criterion is that the role is *always*
 *   visible — a missing translation must never regress into a missing field.
 * - `getPersonRelationLabel` — `membership` vs `observation`, worded so the
 *   two cannot be mistaken for one another at a glance. This is the pairing
 *   the ticket exists for: an observer (an ethnographer) must read as
 *   documentation of a people, never as membership in it.
 */

import type { PersonPeopleRelationLabel } from "@/types/persons";

const PERSON_ROLE_LABELS: Record<string, string> = {
  ethnographer: "Ethnographe",
  historian: "Historien·ne",
  missionary: "Missionnaire",
  explorer: "Explorateur·rice",
  colonial_administrator: "Administrateur·rice colonial·e",
  head_of_state: "Chef·fe d'État",
  author: "Auteur·rice",
  translator: "Traducteur·rice",
  informant: "Informateur·rice",
  linguist: "Linguiste",
  journalist: "Journaliste",
};

// @req REQ-126
export function getPersonRoleLabel(roleCategory: string): string {
  return PERSON_ROLE_LABELS[roleCategory] ?? roleCategory;
}

const PERSON_RELATION_LABELS: Record<PersonPeopleRelationLabel, string> = {
  membership: "Membre de",
  observation: "Observe / documente",
};

// @req REQ-126
export function getPersonRelationLabel(
  relationLabel: PersonPeopleRelationLabel
): string {
  return PERSON_RELATION_LABELS[relationLabel];
}
