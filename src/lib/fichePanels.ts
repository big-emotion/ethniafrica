/**
 * Fiche panel composition engine (Epic 15 · Story 15.2 · FR98).
 *
 * Pure function deriving the ordered panel sequence for an entity from its
 * payload — empty panels are impossible by construction, not by review.
 * Identity(1), Scale(2) and The Record(8) are mandatory and always present;
 * the rest (Territory, Tongue, Fragmentation, Links, Voices) are data-gated
 * and vary per entity type.
 *
 * `epic-15-fiche-vivante.md` (the spec this story's ticket references) is
 * absent from the repo. The panel table below is derived from the Epic 15
 * story names recorded on the delivery plan (ETNI-544: 15.3 identity,
 * 15.4 scale, 15.5 territory, 15.6 tongue+fragmentation, 15.7 links+voices)
 * and mapped onto the concrete AFRIK section fields of PeopleDetail,
 * CountryDetail and LanguageFamilyDetail (src/types/afrik-frontend.ts).
 * This is a best-effort reconstruction pending stakeholder confirmation —
 * see ETNI-884.
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
  | "tongue"
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
  { kind: "tongue", order: 4, mandatory: false },
  { kind: "fragmentation", order: 5, mandatory: false },
  { kind: "links", order: 6, mandatory: false },
  { kind: "voices", order: 7, mandatory: false },
  { kind: "record", order: 8, mandatory: true },
];

/** Which panel kinds apply at all for a given entity type. */
const ENTITY_INVENTORY: Record<FicheEntityType, readonly PanelKind[]> = {
  people: [
    "identity",
    "scale",
    "territory",
    "tongue",
    "fragmentation",
    "links",
    "voices",
    "record",
  ],
  country: [
    "identity",
    "scale",
    "territory",
    "fragmentation",
    "links",
    "voices",
    "record",
  ],
  "language-family": [
    "identity",
    "scale",
    "territory",
    "tongue",
    "fragmentation",
    "links",
    "voices",
    "record",
  ],
};

/** True when a value (or any of its nested leaves) carries actual content. */
function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(isPresent);
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(isPresent);
  }
  return true;
}

type GatingPredicate<T> = (payload: T) => boolean;

const PEOPLE_GATES: Partial<Record<PanelKind, GatingPredicate<PeopleDetail>>> =
  {
    territory: (payload) => isPresent(payload.origins),
    tongue: (payload) => isPresent(payload.languages),
    fragmentation: (payload) => isPresent(payload.ethnicities),
    links: (payload) => isPresent(payload.historicalRole),
    voices: (payload) => isPresent(payload.culture),
  };

const COUNTRY_GATES: Partial<
  Record<PanelKind, GatingPredicate<CountryDetail>>
> = {
  territory: (payload) =>
    isPresent(payload.historicalNames) || isPresent(payload.kingdoms),
  fragmentation: (payload) => isPresent(payload.majorPeoples),
  links: (payload) => isPresent(payload.historicalFacts),
  voices: (payload) => isPresent(payload.culture),
};

const LANGUAGE_FAMILY_GATES: Partial<
  Record<PanelKind, GatingPredicate<LanguageFamilyDetail>>
> = {
  territory: (payload) =>
    isPresent(payload.generalInfo?.geographicArea) ||
    isPresent(payload.distribution),
  tongue: (payload) => isPresent(payload.linguisticCharacteristics),
  fragmentation: (payload) => isPresent(payload.generalInfo?.branches),
  links: (payload) => isPresent(payload.associatedPeoples),
  voices: (payload) => isPresent(payload.historyAndOrigins),
};

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
