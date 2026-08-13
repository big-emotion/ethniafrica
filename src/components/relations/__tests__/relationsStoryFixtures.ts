/**
 * Relations Storybook fixtures (illustrative, not data) — Epic 11, ETNI-509.
 * Never loaded into Supabase; shaped only to proof `RelationTypeBadge` and
 * `RelationsList` rendering states.
 */

import type { RelationListItem } from "@/lib/relationsDataTransformer";

// @req REQ-097
export const SOURCED_MIGRATORY_ITEM: RelationListItem = {
  id: "REL_YORUBA_FON_MIGRATION",
  type: "migratory",
  derived: false,
  neighbor: { id: "PPL_FON", nameMain: "Fon", languageFamilyId: "FLG_KWA" },
  period: { startYear: 1600, endYear: 1700, label: "XVIIe siècle" },
  description: "Migration conjointe vers le golfe du Bénin.",
  confidence: { score: 82, sourceCount: 3 },
};

// @req REQ-097
export const SOURCED_COMMERCIAL_ITEM: RelationListItem = {
  id: "REL_YORUBA_ASHANTI_TRADE",
  type: "commercial",
  derived: false,
  neighbor: {
    id: "PPL_ASHANTI",
    nameMain: "Ashanti",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
  period: { startYear: null, endYear: null, label: "XIXe siècle" },
  description: "Réseaux commerciaux transsahariens partagés.",
  confidence: null,
};

// @req REQ-097
export const SOURCED_RELIGIOUS_ITEM: RelationListItem = {
  id: "REL_YORUBA_NUPE_RELIGIOUS",
  type: "religious",
  derived: false,
  neighbor: {
    id: "PPL_NUPE",
    nameMain: "Nupé",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
  period: {
    startYear: 1800,
    endYear: null,
    label: "XIXe siècle - aujourd'hui",
  },
  description: "Échanges de pratiques religieuses syncrétiques.",
  confidence: { score: 64, sourceCount: 1 },
};

// @req REQ-097
export const DERIVED_LINGUISTIC_ITEM: RelationListItem = {
  id: "derived_PPL_BAMILEKE",
  type: "linguistic",
  derived: true,
  neighbor: {
    id: "PPL_BAMILEKE",
    nameMain: "Bamiléké",
    languageFamilyId: "FLG_NIGER_CONGO",
  },
  period: null,
  description: null,
  confidence: null,
};

// @req REQ-097
export const RELATIONS_LIST_ITEMS: RelationListItem[] = [
  DERIVED_LINGUISTIC_ITEM,
  SOURCED_MIGRATORY_ITEM,
  SOURCED_COMMERCIAL_ITEM,
  SOURCED_RELIGIOUS_ITEM,
];
