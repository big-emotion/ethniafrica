/**
 * Pure transformer from `/v2/migrations` detail payloads to the `/fr/migrations`
 * page view model (Epic 12, Story 12.8, ETNI-521). Never throws on missing
 * optional fields — malformed entries are defensively defaulted or dropped.
 */

import type {
  MigrationClassificationStatus,
  MigrationDetailRecord,
  MigrationEventType,
  MigrationGeometry,
  MigrationPeopleRef,
  MigrationSourceRef,
  MigrationTimeRange,
} from "@/types/migrations";

export interface MigrationConfidenceData {
  score: number | null;
  sourceCount: number | null;
  lastHumanAuditAt: string | null;
}

export interface RawMigrationDetailPayload {
  data: MigrationDetailRecord;
  confidence?: MigrationConfidenceData | null;
}

export interface MigrationNarrativeParagraph {
  text: string;
  confidence: MigrationConfidenceData | null;
}

export interface MigrationNarrativeEntry {
  id: string;
  nameMain: string;
  migrationGroup: string | null;
  eventType: MigrationEventType;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  peoples: MigrationPeopleRef[];
  paragraphs: MigrationNarrativeParagraph[];
  debate: string | null;
  sourceCount: number;
}

export interface MigrationListEntry {
  id: string;
  nameMain: string;
  eventType: MigrationEventType;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  peopleIds: string[];
}

/**
 * View model for the interactive `/fr/migrations` Carte panel (Epic 12,
 * Story 12.9, ETNI-522): unlike `MigrationNarrativeEntry`, it carries
 * geometry (for `MigrationPathLayer`) and the full source list with URLs and
 * tiers (for `MigrationDetailSheet`'s source chips / `SourceChainSheet`).
 */
export interface MigrationAtlasEntry {
  id: string;
  nameMain: string;
  eventType: MigrationEventType;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  geometry: MigrationGeometry;
  peoples: MigrationPeopleRef[];
  sources: MigrationSourceRef[];
  confidence: MigrationConfidenceData | null;
}

export interface MigrationScrubberBounds {
  min: number;
  max: number;
}

export interface MigrationsPageData {
  list: MigrationListEntry[];
  narrative: MigrationNarrativeEntry[];
  atlas: MigrationAtlasEntry[];
  scrubberBounds: MigrationScrubberBounds | null;
}

function toTimeRange(
  timeRange: MigrationTimeRange | null | undefined
): MigrationTimeRange {
  return {
    startYear: timeRange?.startYear ?? 0,
    endYear: timeRange?.endYear ?? 0,
    datingNote: timeRange?.datingNote ?? null,
  };
}

function toConfidenceData(
  confidence: MigrationConfidenceData | null | undefined
): MigrationConfidenceData | null {
  if (!confidence) return null;
  return {
    score: confidence.score ?? null,
    sourceCount: confidence.sourceCount ?? null,
    lastHumanAuditAt: confidence.lastHumanAuditAt ?? null,
  };
}

function toParagraphs(
  narrative: string | null | undefined,
  confidence: MigrationConfidenceData | null
): MigrationNarrativeParagraph[] {
  const text = typeof narrative === "string" ? narrative : "";
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => ({ text: paragraph, confidence }));
}

function toNarrativeEntry(
  item: RawMigrationDetailPayload | null | undefined
): MigrationNarrativeEntry | null {
  const record = item?.data;
  if (!record || !record.id) return null;

  const confidence = toConfidenceData(item?.confidence);

  return {
    id: record.id,
    nameMain: record.nameMain ?? "",
    migrationGroup: record.migrationGroup ?? null,
    eventType: record.eventType,
    classificationStatus: record.classificationStatus,
    timeRange: toTimeRange(record.timeRange),
    peoples: Array.isArray(record.peoples) ? record.peoples : [],
    paragraphs: toParagraphs(record.narrative, confidence),
    debate: record.debate ?? null,
    sourceCount: Array.isArray(record.sources) ? record.sources.length : 0,
  };
}

function toGeometry(
  geometry: MigrationGeometry | null | undefined
): MigrationGeometry {
  return geometry ?? { type: "LineString", coordinates: [] };
}

function toAtlasEntry(
  item: RawMigrationDetailPayload | null | undefined
): MigrationAtlasEntry | null {
  const record = item?.data;
  if (!record || !record.id) return null;

  return {
    id: record.id,
    nameMain: record.nameMain ?? "",
    eventType: record.eventType,
    classificationStatus: record.classificationStatus,
    timeRange: toTimeRange(record.timeRange),
    geometry: toGeometry(record.geometry),
    peoples: Array.isArray(record.peoples) ? record.peoples : [],
    sources: Array.isArray(record.sources) ? record.sources : [],
    confidence: toConfidenceData(item?.confidence),
  };
}

function toListEntry(record: MigrationDetailRecord): MigrationListEntry {
  return {
    id: record.id,
    nameMain: record.nameMain ?? "",
    eventType: record.eventType,
    classificationStatus: record.classificationStatus,
    timeRange: toTimeRange(record.timeRange),
    peopleIds: Array.isArray(record.peoples)
      ? record.peoples.map((people) => people.id).filter(Boolean)
      : [],
  };
}

/**
 * Groups phases sharing a `migrationGroup` together (module spec: a
 * macro-migration is modeled as one event per phase, no phase sub-table),
 * ordered by the group's earliest startYear; standalone events sort by
 * their own startYear, interleaved chronologically with groups.
 */
function sortNarrative(
  entries: MigrationNarrativeEntry[]
): MigrationNarrativeEntry[] {
  const groupMinYear = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.migrationGroup) continue;
    const current = groupMinYear.get(entry.migrationGroup);
    if (current === undefined || entry.timeRange.startYear < current) {
      groupMinYear.set(entry.migrationGroup, entry.timeRange.startYear);
    }
  }

  const sortKey = (entry: MigrationNarrativeEntry): number =>
    entry.migrationGroup
      ? (groupMinYear.get(entry.migrationGroup) ?? entry.timeRange.startYear)
      : entry.timeRange.startYear;

  return [...entries].sort((a, b) => {
    const keyDiff = sortKey(a) - sortKey(b);
    if (keyDiff !== 0) return keyDiff;
    const startDiff = a.timeRange.startYear - b.timeRange.startYear;
    if (startDiff !== 0) return startDiff;
    return a.id.localeCompare(b.id);
  });
}

function computeScrubberBounds(
  entries: MigrationNarrativeEntry[]
): MigrationScrubberBounds | null {
  if (entries.length === 0) return null;

  let min = Infinity;
  let max = -Infinity;
  for (const entry of entries) {
    if (entry.timeRange.startYear < min) min = entry.timeRange.startYear;
    if (entry.timeRange.endYear > max) max = entry.timeRange.endYear;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

// @req FR81 @req FR82
export function transformMigrationData(
  raw: RawMigrationDetailPayload[] | null | undefined
): MigrationsPageData {
  const items = Array.isArray(raw) ? raw : [];

  const narrativeEntries = items
    .map(toNarrativeEntry)
    .filter((entry): entry is MigrationNarrativeEntry => entry !== null);

  const list = items
    .map((item) => item?.data)
    .filter((record): record is MigrationDetailRecord => Boolean(record?.id))
    .map(toListEntry)
    .sort((a, b) => a.timeRange.startYear - b.timeRange.startYear);

  const atlas = items
    .map(toAtlasEntry)
    .filter((entry): entry is MigrationAtlasEntry => entry !== null)
    .sort((a, b) => a.timeRange.startYear - b.timeRange.startYear);

  return {
    list,
    narrative: sortNarrative(narrativeEntries),
    atlas,
    scrubberBounds: computeScrubberBounds(narrativeEntries),
  };
}
