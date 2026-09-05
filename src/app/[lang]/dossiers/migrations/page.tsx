/**
 * `/fr/migrations` — Epic 12, Story 12.8 (ETNI-521). Fetches every migration
 * event, transforms it into page view models, and renders it behind SSR
 * "Carte" / "Récit" tabs: both panels are present in the server-rendered
 * HTML (Radix `forceMount` + CSS visibility toggling), so the Récit text
 * equivalent is complete and readable with JavaScript disabled (FR78).
 *
 * `getMigrationById`'s confidence envelope currently exposes only a bare
 * score (no sourceCount/lastHumanAuditAt) — until that API is enriched, the
 * per-paragraph ConfidenceChips honestly degrade to "voir les sources"
 * links rather than fabricating an audit date.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { MigrationsAtlasView } from "@/components/migrations/MigrationsAtlasView";
import { MigrationNarrative } from "@/components/migrations/MigrationNarrative";
import {
  transformMigrationData,
  type RawMigrationDetailPayload,
  type MigrationsPageData,
} from "@/lib/migrationDataTransformer";
import {
  listMigrations,
  getMigrationById,
  MigrationsDataAccessError,
} from "@/api/v2/services/migrations";
import { logger } from "@/lib/api/logger";
import { getTranslation } from "@/lib/translations";
import { getLocalizedRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";

interface MigrationsPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ peuple?: string }>;
}

// @req REQ-101 @req FR95
export async function generateMetadata({
  params,
}: Pick<MigrationsPageProps, "params">): Promise<Metadata> {
  const { lang } = await params;
  const t = getTranslation(lang as Language).migrations;
  return {
    title: t.pageTitle,
    description: t.pageSubtitle,
    alternates: {
      canonical: getLocalizedRoute(lang as Language, "migrations"),
    },
  };
}

const MAX_MIGRATIONS = 500;

async function loadMigrationsPageData(): Promise<RawMigrationDetailPayload[]> {
  const { data: summaries } = await listMigrations({
    limit: MAX_MIGRATIONS,
    offset: 0,
  });

  const details = await Promise.all(
    summaries.map(
      async (summary): Promise<RawMigrationDetailPayload | null> => {
        const detail = await getMigrationById(summary.id);
        if (!detail) return null;
        return {
          data: detail.record,
          confidence:
            detail.confidence !== null
              ? {
                  score: detail.confidence,
                  sourceCount: detail.record.sources.length,
                  lastHumanAuditAt: null,
                }
              : null,
        };
      }
    )
  );

  return details.filter(
    (detail): detail is RawMigrationDetailPayload => detail !== null
  );
}

function findPeopleName(
  pageData: MigrationsPageData,
  peopleId: string
): string | null {
  for (const entry of pageData.narrative) {
    const match = entry.peoples.find((people) => people.id === peopleId);
    if (match) return match.nameMain;
  }
  return null;
}

function filterByPeople(
  pageData: MigrationsPageData,
  peopleId: string | undefined
): MigrationsPageData {
  if (!peopleId) return pageData;
  return {
    ...pageData,
    list: pageData.list.filter((entry) => entry.peopleIds.includes(peopleId)),
    narrative: pageData.narrative.filter((entry) =>
      entry.peoples.some((people) => people.id === peopleId)
    ),
    atlas: pageData.atlas.filter((entry) =>
      entry.peoples.some((people) => people.id === peopleId)
    ),
  };
}

// @req REQ-101 @req FR78 @req FR81 @req FR82 @req FR83
export default async function MigrationsPage({
  params,
  searchParams,
}: MigrationsPageProps) {
  const { lang } = await params;
  const language = lang as Language;
  const t = getTranslation(language).migrations;
  const migrationsRoute = getLocalizedRoute(language, "migrations");
  const sp = await searchParams;
  const peopleId = sp.peuple?.trim() || undefined;

  let raw: RawMigrationDetailPayload[];
  try {
    raw = await loadMigrationsPageData();
  } catch (error) {
    if (!(error instanceof MigrationsDataAccessError)) {
      throw error;
    }
    logger.error("migrations page: data-access failure", error);
    return (
      <PageLayout
        language={language}
        title={t.pageTitle}
        subtitle={t.pageSubtitle}
      >
        <EmptyState
          message={t.states.failure}
          variant="failure"
          retryHref={migrationsRoute}
          retryLabel={t.states.failureRetry}
        />
      </PageLayout>
    );
  }

  const fullPageData = transformMigrationData(raw);
  const peopleName = peopleId ? findPeopleName(fullPageData, peopleId) : null;
  const pageData = filterByPeople(fullPageData, peopleId);

  const filterChip = peopleId && (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-afh-small">
        {`${t.filterChip.label} : ${peopleName ?? peopleId}`}
        <Link
          href={migrationsRoute}
          aria-label={t.filterChip.clear}
          className="inline-flex min-h-6 min-w-6 items-center justify-center"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </Link>
      </span>
    </div>
  );

  if (peopleId && pageData.list.length === 0) {
    return (
      <PageLayout
        language={language}
        title={t.pageTitle}
        subtitle={t.pageSubtitle}
      >
        {filterChip}
        <EmptyState
          message={`${t.states.filteredEmpty} : ${peopleName ?? peopleId}`}
        />
      </PageLayout>
    );
  }

  if (!peopleId && fullPageData.list.length === 0) {
    return (
      <PageLayout
        language={language}
        title={t.pageTitle}
        subtitle={t.pageSubtitle}
      >
        <EmptyState message={t.states.emptyUnpublished} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      language={language}
      title={t.pageTitle}
      subtitle={t.pageSubtitle}
    >
      {filterChip}

      <Tabs defaultValue="recit">
        <TabsList aria-label={t.pageTitle}>
          <TabsTrigger value="carte">{t.tabs.map}</TabsTrigger>
          <TabsTrigger value="recit">{t.tabs.narrative}</TabsTrigger>
        </TabsList>
        <TabsContent
          value="carte"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <MigrationsAtlasView
            language={language}
            events={pageData.atlas}
            scrubberBounds={pageData.scrubberBounds}
          />
        </TabsContent>
        <TabsContent
          value="recit"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <MigrationNarrative language={language} events={pageData.narrative} />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
