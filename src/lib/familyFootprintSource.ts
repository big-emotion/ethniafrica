/**
 * Which peoples a family fiche's footprint is built from, and what the page is
 * then allowed to claim about it.
 *
 * The charter's rule (atlas-charter §1, REQ-116) is that a family's footprint
 * is the union of `currentCountries` over every people carrying its
 * `languageFamilyId`. That rule assumes every family sits at the leaf of the
 * classification, and twenty-three of the twenty-four do.
 *
 * Afro-asiatique does not. It is a macro-family: its peoples carry the id of a
 * sub-family (Berbère, Tchadique, Couchitique, Sémitique), so counting by
 * `language_family_id` returns zero and the globe collapses to the
 * missing-overlay placeholder — an empty map on a fiche that has plenty to
 * draw.
 *
 * The fallback deliberately does NOT union the sub-families' peoples, which
 * would be the wider footprint. This fiche's whole argument is that
 * "afroasiatique" is a nineteenth-century construct with no reconstructed
 * proto-language, and tinting the map from an inferred descent would make the
 * atlas assert exactly the unity the fiche disputes. `content.associatedPeoples`
 * is the fiche's own declaration — the peoples it says belong to it — so the
 * map claims no more than the text does. The provenance travels with it so the
 * caption and the parchment can say which of the two rules produced the area.
 */
import type { LanguageFamily, PeopleId } from "@/types/afrik";

/**
 * `member-peoples` is the charter rule; `declared-associated-peoples` is the
 * fallback above. The page states which one it used — an area whose rule the
 * reader cannot see is an area they have to take on trust.
 */
export type FamilyFootprintProvenance =
  | "member-peoples"
  | "declared-associated-peoples";

/**
 * The peoples the fiche names in `associatedPeoples`, deduplicated, in the
 * order the fiche declares them.
 *
 * A reference carrying only a `name` is dropped: the corpus uses those for
 * peoples with no fiche of their own (Afro-asiatique's "Égyptiens anciens"),
 * and they resolve to no `currentCountries` to union.
 */
// @req REQ-116
export function declaredAssociatedPeopleIds(
  family: LanguageFamily
): PeopleId[] {
  const references =
    family.associatedPeoples ?? family.content?.associatedPeoples ?? [];

  const ids = references
    .map((reference) => reference.peopleId)
    .filter((peopleId): peopleId is PeopleId => Boolean(peopleId));

  return Array.from(new Set(ids));
}

/**
 * The fallback is keyed on the member count alone, never on whether the
 * footprint came out empty: a family with member peoples whose countries the
 * admin-0 asset cannot draw has a real gap to show, and quietly swapping in a
 * different rule would hide it.
 */
// @req REQ-116
export function resolveFootprintProvenance(
  memberPeopleCount: number
): FamilyFootprintProvenance {
  return memberPeopleCount > 0
    ? "member-peoples"
    : "declared-associated-peoples";
}

export interface FootprintWording {
  /** The globe caption, already split at the line break it is drawn with. */
  legend: readonly [string, string];
  /** The provenance line beside the parchment section's title. */
  sectionNote: string;
  /** What `FieldProvenanceMarker` names the derived field's origin. */
  origin: string;
}

/**
 * The caption over the globe and the parchment's provenance line say the same
 * thing in two places, so they live in one table: a reader who scrolls from the
 * map to the text must not meet two different accounts of how the area was
 * built.
 */
// @req REQ-116
export const FOOTPRINT_WORDING: Record<
  FamilyFootprintProvenance,
  FootprintWording
> = {
  "member-peoples": {
    legend: ["Empreinte reconstruite", "depuis les peuples, pas déclarée."],
    sectionNote: "dérivée · union des pays actuels des peuples rattachés",
    origin: "peuples rattachés à la famille",
  },
  "declared-associated-peoples": {
    legend: [
      "Empreinte reconstruite",
      "depuis les peuples que la fiche nomme.",
    ],
    sectionNote:
      "dérivée · union des pays actuels des peuples que la fiche nomme",
    origin: "peuples que la fiche nomme elle-même",
  },
};
