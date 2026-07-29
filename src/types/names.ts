/**
 * Name-record types - TypeScript definitions for AFRIK name records (Epic 8, FR55-FR57)
 *
 * Mirrors public/modele-nom.json exactly.
 */

import type { PeopleId } from "@/types/afrik";

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
  tier: 1 | 2;
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
  id: PeopleId; // PPL_xxxxx — the entity this naming dossier is for
  entityType: "people";
  names: NameRecordEntry[];
}
