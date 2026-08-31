/**
 * Name-record types - TypeScript definitions for AFRIK name records (Epic 8, FR55-FR57)
 *
 * Mirrors public/modele-nom.json exactly.
 */

import type { ReactNode } from "react";

import type { PeopleId } from "@/types/afrik";
import type { SourceTier } from "@/types/sources";

// @req REQ-135
export const NAME_RECORD_ENTITY_TYPES = ["people", "patronyme"] as const;

export type NameRecordEntityType = (typeof NAME_RECORD_ENTITY_TYPES)[number];

export type PatronymeId = `PAT_${string}`;

export type NameRecordType =
  | "endonym"
  | "exonym"
  | "historical_spelling"
  | "surname";

export interface NameRecordSource {
  title: string;
  author: string;
  year: number;
  url: string;
  tier: SourceTier;
  notes?: string;
}

export interface NameRecordEntry {
  nameText: string;
  nameType: NameRecordType;
  languageOfOrigin: string | null;
  meaning: string | null;
  periodLabel: string | null;
  imposedBy: string | null;
  impositionPeriod: string | null;
  whyProblematic: string | null;
  contemporaryUsage: string | null;
  sortRank: number;
  sources: NameRecordSource[];
}

export interface NameRecordDossier {
  id: PeopleId | PatronymeId;
  entityType: NameRecordEntityType;
  names: NameRecordEntry[];
}

/**
 * View-model for `NameOriginCard` (Epic 8, Story 8.8) — the rendering-facing
 * shape of a single name record. Deliberately excludes `sortRank` and
 * `sources`: ordering and source evidence are the caller's / `ConfidenceChip`
 * slot's concern, not the card's.
 */
export type NameRecordView = Omit<NameRecordEntry, "sortRank" | "sources">;

/** One entry of `NameSpellingHistory` — a historical spelling paired with its own source-attached chip. */
export interface NameSpellingHistoryEntry {
  nameText: string;
  periodLabel: string | null;
  confidenceChip: ReactNode;
}
