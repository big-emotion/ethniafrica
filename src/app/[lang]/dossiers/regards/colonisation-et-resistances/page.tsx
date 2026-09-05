/**
 * Bilingual doctrine-bound module page — Epic 13, Story 13.9 (ETNI-533).
 * Each locale keeps its canonical route, and no children-facing surface
 * links appear here (asserted in
 * `src/lib/__tests__/colonizationChildrenExclusion.test.tsx`).
 *
 * `listPeopleFragmentations` reuses the Story 13.7 per-people service over a
 * bounded candidate sweep — there is no bulk fragmentation endpoint yet.
 * Later sections (map, imposed names, displacement) stay gracefully omitted
 * until Stories 13.8/13.10 land.
 *
 * The timeline (Story 13.12, ETNI-536) fetches the four
 * `COLONIAL_EVENT_TYPES` via the Epic 12 migrations service — one
 * `listMigrations` call per type (there is no bulk multi-type filter) plus
 * one `getMigrationById` per surviving summary for its full peoples/sources
 * — then resolves each involved people's endonym via the Names Atlas
 * service (`getPeopleNamesDossier`, one call per unique people, defaulted
 * to null on a per-people failure rather than failing the whole page).
 */

import type { Metadata } from "next";
import { ColonizationModulePage } from "@/components/colonization/ColonizationModulePage";
import {
  transformColonizationModuleData,
  type ColonizationEndonymLookup,
  type RawColonizationTimelineEvent,
} from "@/lib/colonizationDataTransformer";
import { listPeopleFragmentations } from "@/api/v2/services/peopleFragmentation";
import { listMigrations, getMigrationById } from "@/api/v2/services/migrations";
import { getPeopleNamesDossier } from "@/api/v2/services/names";
import { COLONIAL_EVENT_TYPES } from "@/lib/afrik/migrationEventTypes";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

const TIMELINE_LIST_LIMIT = 200;

interface PageProps {
  params: Promise<{ lang: string }>;
}

// @req REQ-141 FR90
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  const t = getTranslation(lang as Language).colonization;
  return {
    title: t.pageTitle,
    description: t.pageSubtitle,
    alternates: {
      canonical: getLocalizedRoute(lang as Language, "colonization"),
    },
  };
}

async function loadColonialTimelineEvents(): Promise<
  RawColonizationTimelineEvent[]
> {
  const listsByType = await Promise.all(
    COLONIAL_EVENT_TYPES.map((eventType) =>
      listMigrations({ eventType, limit: TIMELINE_LIST_LIMIT, offset: 0 })
    )
  );
  const summaries = listsByType.flatMap((list) => list.data);

  const details = await Promise.all(
    summaries.map((summary) => getMigrationById(summary.id))
  );

  return details
    .filter((detail): detail is NonNullable<typeof detail> => detail !== null)
    .map((detail) => ({
      id: detail.record.id,
      nameMain: detail.record.nameMain,
      eventType: detail.record.eventType,
      classificationStatus: detail.record.classificationStatus,
      timeRange: detail.record.timeRange,
      peoples: detail.record.peoples,
      sources: detail.record.sources,
    }));
}

async function resolvePeopleEndonyms(
  peopleIds: string[]
): Promise<Record<string, ColonizationEndonymLookup>> {
  const uniqueIds = Array.from(new Set(peopleIds));

  const entries = await Promise.all(
    uniqueIds.map(async (id): Promise<[string, ColonizationEndonymLookup]> => {
      try {
        const dossier = await getPeopleNamesDossier(id);
        const endonymRecord = dossier.names.find(
          (name) => name.nameType === "endonym"
        );
        return [
          id,
          {
            endonym: dossier.autonym,
            endonymLanguage: endonymRecord?.languageOfOrigin ?? null,
          },
        ];
      } catch {
        return [id, { endonym: null, endonymLanguage: null }];
      }
    })
  );

  return Object.fromEntries(entries);
}

async function loadColonizationPageData() {
  const [fragmentations, timelineEvents] = await Promise.all([
    listPeopleFragmentations(),
    loadColonialTimelineEvents(),
  ]);

  const peopleIds = timelineEvents.flatMap((event) =>
    event.peoples.map((people) => people.id)
  );
  const peopleEndonyms = await resolvePeopleEndonyms(peopleIds);

  return transformColonizationModuleData({
    fragmentations,
    timelineEvents,
    peopleEndonyms,
  });
}

// @req REQ-141 FR90
export default async function ColonizationPage({ params }: PageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const t = getTranslation(language).colonization;
  const data = await loadColonizationPageData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t.pageTitle,
    description: t.pageSubtitle,
    inLanguage: language,
    url: getLocalizedRoute(language, "colonization"),
  };

  return (
    <>
      {}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ColonizationModulePage data={data} language={language} />
    </>
  );
}
