/**
 * Migration types - TypeScript definitions for AFRIK migration events
 * (Epic 12, FR80). Mirrors public/modele-migration.json exactly.
 */

import type { PeopleId } from "@/types/afrik";

export type MigrationEventType =
  | "expansion"
  | "trade_route"
  | "forced_displacement"
  | "pastoral_movement";

export type MigrationClassificationStatus =
  | "consensual"
  | "contested"
  | "colonial-legacy"
  | "reconstructive";

export interface MigrationTimeRange {
  startYear: number;
  endYear: number;
  datingNote: string | null;
}

export type MigrationGeometry =
  | { type: "LineString"; coordinates: Array<[number, number]> }
  | { type: "MultiLineString"; coordinates: Array<Array<[number, number]>> }
  | { type: "Polygon"; coordinates: Array<Array<[number, number]>> };

export interface MigrationPeopleInvolved {
  id: PeopleId;
  role: string;
}

export interface MigrationSource {
  title: string;
  url: string;
  year: number;
  tier: 1 | 2;
  notes?: string;
}

export interface MigrationContent {
  summary: string;
  narrative: string;
  debate: string | null;
  sources: MigrationSource[];
}

export interface MigrationRecord {
  id: string; // MGR_xxxxx
  nameMain: string;
  migrationGroup: string | null;
  eventType: MigrationEventType;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  geometry: MigrationGeometry;
  peoplesInvolved: MigrationPeopleInvolved[];
  content: MigrationContent;
}
