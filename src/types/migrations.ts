/**
 * Migration types - TypeScript definitions for AFRIK migration events
 * (Epic 12, FR80). Mirrors public/modele-migration.json exactly.
 */

import type { PeopleId } from "@/types/afrik";
import type { MigrationEventType } from "@/lib/afrik/migrationEventTypes";
import type { SourceTier } from "@/types/sources";

export type { MigrationEventType };

export type MigrationClassificationStatus =
  "consensual" | "contested" | "colonial-legacy" | "reconstructive";

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
  tier: SourceTier;
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

/**
 * Read-time shapes for the `/v2/migrations` service/route layer (Epic 12,
 * Story 12.5, ETNI-518). MigrationSummary carries no geometry (list
 * payload-size discipline, AR18); MigrationDetailRecord extends it with the
 * full detail fields per the module spec's list/detail column split.
 */

export interface MigrationPeopleRef {
  id: PeopleId;
  nameMain: string;
  role: string | null;
}

export interface MigrationSourceRef {
  id: string;
  title: string;
  url: string | null;
  tier: SourceTier | null;
}

export interface MigrationSummary {
  id: string; // MGR_xxxxx
  nameMain: string;
  migrationGroup: string | null;
  eventType: MigrationEventType;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  summary: string;
}

export interface MigrationDetailRecord extends MigrationSummary {
  geometry: MigrationGeometry;
  narrative: string;
  debate: string | null;
  peoples: MigrationPeopleRef[];
  sources: MigrationSourceRef[];
}
