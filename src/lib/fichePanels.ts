/**
 * Fiche panel composition engine (Epic 15 · Story 15.2 · FR98).
 *
 * Pure function deriving the ordered panel sequence for an entity from its
 * payload — empty panels are impossible by construction, not by review.
 * Identity(1), Scale(2) and The Record(8) are mandatory and always present;
 * the rest (Territory, Fragmentation, Links, Voices) are data-gated
 * and vary per entity type.
 *
 * `epic-15-fiche-vivante.md` (the spec this story's ticket references) is
 * absent from the repo. The panel table below is derived from the Epic 15
 * story names recorded on the delivery plan (ETNI-544: 15.3 identity,
 * 15.4 scale, 15.5 territory, 15.6 tongue+fragmentation, 15.7 links+voices)
 * and mapped onto the concrete AFRIK section fields of PeopleDetail,
 * CountryDetail and LanguageFamilyDetail (src/types/afrik-frontend.ts).
 * ETNI-544 has since been deleted, so that derivation can no longer be
 * re-checked at the source. This is a best-effort reconstruction pending
 * stakeholder confirmation — see ETNI-884.
 */

import type {
  PeopleDetail,
  CountryDetail,
  LanguageFamilyDetail,
} from "@/types/afrik-frontend";

export type PanelKind =
  | "identity"
  | "scale"
  | "territory"
  | "fragmentation"
  | "links"
  | "voices"
  | "record";

export type FicheEntityType = "people" | "country" | "language-family";

export interface PanelDefinition {
  kind: PanelKind;
  order: number;
  mandatory: boolean;
}

/** Single source of truth: every panel's intrinsic order and mandatory flag. */
// @req REQ-091
export const PANEL_TABLE: readonly PanelDefinition[] = [
  { kind: "identity", order: 1, mandatory: true },
  { kind: "scale", order: 2, mandatory: true },
  { kind: "territory", order: 3, mandatory: false },
  { kind: "fragmentation", order: 5, mandatory: false },
  { kind: "links", order: 6, mandatory: false },
  { kind: "voices", order: 7, mandatory: false },
  { kind: "record", order: 8, mandatory: true },
];

/**
 * Which panel kinds apply at all for a given entity type.
 *
 * A people has only its dossier. The Atlas mockup gives the people fiche one
 * globe and one parchment, and every chapter the panel sequence used to add
 * above that parchment either restates it or competes with it: identity and
 * scale repeat the fiche head's autonym and population chips, territory draws
 * a second, coarser map under the globe, and fragmentation and voices are the
 * very components the parchment already renders — twice on screen, and twice
 * fetched, in the voices case.
 *
 * `links` was the one chapter with no parchment equivalent, so its data moved
 * rather than being dropped: the route now feeds the sourced ego-network to
 * PeopleRelatedPeoplesSection, which had been standing there with an empty
 * `relationsPreview` waiting for it.
 */
const ENTITY_INVENTORY: Record<FicheEntityType, readonly PanelKind[]> = {
  people: ["record"],
  // A country has only its dossier. The Atlas mockup gives the country fiche
  // one globe and one parchment, and every chapter the sequence used to add
  // above it either restated the parchment or resolved to nothing: `scale`
  // repeated the peoples count the parchment already prints, `links` had no
  // country relation source to read (getEgoNetwork is people-centred), and
  // identity, territory, fragmentation and voices are people-shaped panels the
  // registry declines for a country. Nothing moved, because nothing rendered.
  country: ["record"],
  // A family keeps its scale figure — `generalInfo.numberOfLanguages` is a
  // declared editorial field — and its dossier. The five panels that stood
  // between them were people-shaped: identity, territory, fragmentation and
  // voices are declined by the registry for anything but a people, and `links`
  // reads a `relations` context the family route never passes. `tongue` did
  // render, but it drew the same family → language → people hierarchy the
  // withdrawn Classification chapter drew, from the same deduplicated ISO
  // codes, under the heading "Classification — <famille>".
  "language-family": ["scale", "record"],
};

/** True when a value (or any of its nested leaves) carries actual content. */
// @req REQ-119
export function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(isPresent);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(isPresent);
  }
  return true;
}

type GatingPredicate<T> = (payload: T) => boolean;

/**
 * A people's inventory holds only the mandatory record, which no gate can
 * remove — so there is nothing left for a predicate to decide. The gates that
 * stood here keyed on fields unrelated to what the panels actually read
 * (`territory` on `origins`, `links` on `historicalRole`), and kept a people
 * passing the composer only to resolve to null downstream.
 */
const PEOPLE_GATES: Partial<Record<PanelKind, GatingPredicate<PeopleDetail>>> =
  {};

/**
 * A country's inventory holds only the mandatory record, which no gate can
 * remove — so there is nothing left for a predicate to decide. The gates that
 * stood here keyed on fields unrelated to what the panels actually read
 * (`territory` on `historicalNames`, `links` on `historicalFacts`), and let a
 * country pass the composer only to resolve to null downstream.
 */
const COUNTRY_GATES: Partial<
  Record<PanelKind, GatingPredicate<CountryDetail>>
> = {};

/**
 * A family's inventory holds the mandatory scale and record, which no gate can
 * remove. The gates that stood here keyed on fields unrelated to what the
 * panels actually read — `tongue` on `linguisticCharacteristics` when the panel
 * read `context.branches`, `links` on `associatedPeoples` when the panel read
 * `context.relations` — and let a family pass the composer only to resolve to
 * null downstream, the same defect already cleared for peoples and countries.
 */
const LANGUAGE_FAMILY_GATES: Partial<
  Record<PanelKind, GatingPredicate<LanguageFamilyDetail>>
> = {};

function derivePanels<T>(
  entityType: FicheEntityType,
  payload: T,
  gates: Partial<Record<PanelKind, GatingPredicate<T>>>
): PanelKind[] {
  const inventory = new Set(ENTITY_INVENTORY[entityType]);

  return PANEL_TABLE.filter((panel) => inventory.has(panel.kind))
    .filter((panel) => {
      if (panel.mandatory) return true;
      const gate = gates[panel.kind];
      return gate ? gate(payload) : false;
    })
    .sort((a, b) => a.order - b.order)
    .map((panel) => panel.kind);
}

// @req REQ-091
export function derivePanelSequence(
  entityType: "people",
  payload: PeopleDetail
): PanelKind[];
// @req REQ-091
export function derivePanelSequence(
  entityType: "country",
  payload: CountryDetail
): PanelKind[];
// @req REQ-091
export function derivePanelSequence(
  entityType: "language-family",
  payload: LanguageFamilyDetail
): PanelKind[];
// @req REQ-091
export function derivePanelSequence(
  entityType: FicheEntityType,
  payload: PeopleDetail | CountryDetail | LanguageFamilyDetail
): PanelKind[] {
  switch (entityType) {
    case "people":
      return derivePanels(entityType, payload as PeopleDetail, PEOPLE_GATES);
    case "country":
      return derivePanels(entityType, payload as CountryDetail, COUNTRY_GATES);
    case "language-family":
      return derivePanels(
        entityType,
        payload as LanguageFamilyDetail,
        LANGUAGE_FAMILY_GATES
      );
  }
}
