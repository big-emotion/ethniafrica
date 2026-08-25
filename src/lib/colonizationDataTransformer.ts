/**
 * Pure transformer feeding `/fr/regards/colonisation-et-resistances`
 * (Epic 13, Story 13.9, ETNI-533). Carte vivante pattern: never queries
 * Supabase, never throws on missing/malformed input, and omits a section
 * (returns `null`) rather than rendering an empty shell when its data is
 * absent — per-component ad-hoc mapping is not allowed (AC3).
 *
 * `mapSection` / `imposedNames` / `displacement` / `resistances` have no
 * wired data source yet (Stories 13.8/13.10/13.11 are unlanded
 * dependencies of this story) and stay structurally `null` until those
 * stories land and extend this transformer's input.
 *
 * The `timeline` section (Story 13.12, ETNI-536) restricts
 * `MIGRATION_EVENT_TYPES` to the four `COLONIAL_EVENT_TYPES` and resolves
 * people endonym-first via a caller-supplied lookup — the migration_events
 * data model carries no "place" field (only GeoJSON geometry), so
 * `place` stays `null` until a real source backs it rather than being
 * derived/invented from coordinates.
 */

import type { DoctrineSlug } from "@/components/source-transparency/DoctrineLinkCard";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import {
  COLONIAL_EVENT_TYPES,
  type ColonialEventType,
} from "@/lib/afrik/migrationEventTypes";
import type {
  MigrationClassificationStatus,
  MigrationPeopleRef,
  MigrationSourceRef,
  MigrationTimeRange,
} from "@/types/migrations";

export interface RawColonizationTimelineEvent {
  id: string;
  nameMain: string;
  eventType: string;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  peoples: MigrationPeopleRef[];
  sources: MigrationSourceRef[];
}

export interface ColonizationEndonymLookup {
  endonym: string | null;
  endonymLanguage: string | null;
}

export interface RawColonizationModuleData {
  fragmentations: PeopleFragmentation[];
  timelineEvents?: RawColonizationTimelineEvent[];
  peopleEndonyms?: Record<string, ColonizationEndonymLookup>;
}

export interface ColonizationDoctrineIntro {
  slug: DoctrineSlug;
}

export interface ColonizationFragmentationEntry {
  peopleId: string;
  fragmentation: PeopleFragmentation;
}

export interface ColonizationSourceEntry {
  peopleId: string;
  countryIso3: string;
  assertionId: string;
}

export interface ColonizationTimelinePeopleRef {
  id: string;
  nameMain: string;
  endonym: string | null;
  endonymLanguage: string | null;
}

export interface ColonizationTimelineSourceRef {
  title: string;
  url: string;
}

export interface ColonizationTimelineEntry {
  id: string;
  nameMain: string;
  eventType: ColonialEventType;
  classificationStatus: MigrationClassificationStatus;
  timeRange: MigrationTimeRange;
  peoples: ColonizationTimelinePeopleRef[];
  place: string | null;
  primarySource: ColonizationTimelineSourceRef | null;
}

export interface ColonizationTimelineBounds {
  min: number;
  max: number;
}

export interface ColonizationModuleData {
  doctrine: ColonizationDoctrineIntro;
  fragmentation: ColonizationFragmentationEntry[] | null;
  mapSection: null;
  imposedNames: null;
  displacement: null;
  resistances: null;
  sources: ColonizationSourceEntry[] | null;
  timeline: ColonizationTimelineEntry[] | null;
  timelineBounds: ColonizationTimelineBounds | null;
}

function isFragmented(
  fragmentation: PeopleFragmentation | null | undefined
): fragmentation is PeopleFragmentation {
  return Boolean(
    fragmentation &&
    fragmentation.countryCount >= 2 &&
    Array.isArray(fragmentation.countries) &&
    fragmentation.countries.length >= 2
  );
}

function toSourceEntries(
  fragmentation: PeopleFragmentation
): ColonizationSourceEntry[] {
  return fragmentation.countries
    .filter((country) => Boolean(country.assertionId))
    .map((country) => ({
      peopleId: fragmentation.peopleId,
      countryIso3: country.iso3,
      assertionId: country.assertionId as string,
    }));
}

function isColonialEvent(
  event: RawColonizationTimelineEvent | null | undefined
): event is RawColonizationTimelineEvent {
  return Boolean(
    event &&
    event.id &&
    COLONIAL_EVENT_TYPES.includes(event.eventType as ColonialEventType)
  );
}

function toTimelinePeople(
  peoples: MigrationPeopleRef[] | null | undefined,
  peopleEndonyms: Record<string, ColonizationEndonymLookup>
): ColonizationTimelinePeopleRef[] {
  if (!Array.isArray(peoples)) return [];
  return peoples.map((people) => {
    const lookup = peopleEndonyms[people.id];
    return {
      id: people.id,
      nameMain: people.nameMain,
      endonym: lookup?.endonym ?? null,
      endonymLanguage: lookup?.endonymLanguage ?? null,
    };
  });
}

function toPrimarySource(
  sources: MigrationSourceRef[] | null | undefined
): ColonizationTimelineSourceRef | null {
  if (!Array.isArray(sources) || sources.length === 0) return null;
  const tier1 = sources.find((source) => source.tier === "1");
  const chosen = tier1 ?? sources[0];
  if (!chosen || !chosen.url) return null;
  return { title: chosen.title, url: chosen.url };
}

function toTimelineEntry(
  event: RawColonizationTimelineEvent,
  peopleEndonyms: Record<string, ColonizationEndonymLookup>
): ColonizationTimelineEntry {
  return {
    id: event.id,
    nameMain: event.nameMain ?? "",
    eventType: event.eventType as ColonialEventType,
    classificationStatus: event.classificationStatus,
    timeRange: event.timeRange,
    peoples: toTimelinePeople(event.peoples, peopleEndonyms),
    place: null,
    primarySource: toPrimarySource(event.sources),
  };
}

function computeTimelineBounds(
  entries: ColonizationTimelineEntry[]
): ColonizationTimelineBounds | null {
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

// @req FR90
export function transformColonizationModuleData(
  raw: RawColonizationModuleData | null | undefined
): ColonizationModuleData {
  const fragmentations = Array.isArray(raw?.fragmentations)
    ? raw.fragmentations.filter(isFragmented)
    : [];

  const fragmentationEntries: ColonizationFragmentationEntry[] =
    fragmentations.map((fragmentation) => ({
      peopleId: fragmentation.peopleId,
      fragmentation,
    }));

  const sources = fragmentations.flatMap(toSourceEntries);

  const peopleEndonyms = raw?.peopleEndonyms ?? {};
  const timelineEntries = (
    Array.isArray(raw?.timelineEvents) ? raw.timelineEvents : []
  )
    .filter(isColonialEvent)
    .map((event) => toTimelineEntry(event, peopleEndonyms))
    .sort((a, b) => {
      const diff = a.timeRange.startYear - b.timeRange.startYear;
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });

  return {
    doctrine: { slug: "heritage-colonial" },
    fragmentation:
      fragmentationEntries.length > 0 ? fragmentationEntries : null,
    mapSection: null,
    imposedNames: null,
    displacement: null,
    resistances: null,
    sources: sources.length > 0 ? sources : null,
    timeline: timelineEntries.length > 0 ? timelineEntries : null,
    timelineBounds: computeTimelineBounds(timelineEntries),
  };
}
