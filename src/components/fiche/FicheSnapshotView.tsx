import { getCountryRoute, getFamilyRoute, getPeopleRoute } from "@/lib/routing";
import type { Language } from "@/types/shared";
import type { FrozenDoctrineReference } from "@/api/v2/services/revisions";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { PinnedVersionBanner } from "@/components/source-transparency/PinnedVersionBanner";
import {
  DoctrineLinkCard,
  isDoctrineSlug,
} from "@/components/source-transparency/DoctrineLinkCard";

/**
 * What a pinned URL renders: an archived capture of a fiche, read from the
 * revisions table and never from the live corpus.
 *
 * The three fiche routes each carried their own copy of this — 45 identical
 * lines between familles and pays, 42 between pays and peuples — differing
 * only in a route builder, a test id, and which key of the snapshot holds the
 * name. That is the same shape the fiche models already have: one gabarit held
 * by convention across three files rather than by a piece, so a change to what
 * an archived reading owes its reader had to be made three times, correctly,
 * to hold.
 */
export type FicheSnapshotKind = "country" | "people" | "languageFamily";

interface SnapshotShape {
  testId: string;
  liveRoute: (language: Language, id: string) => string;
  /**
   * Where the display name sits in the snapshot, most specific first. It is
   * not one key across the corpus: a people's revision carries `nameMain`, a
   * country's `name_fr`, and reading the wrong one silently heads the page
   * with the raw identifier.
   */
  nameKeys: string[];
}

const SNAPSHOT_SHAPE: Record<FicheSnapshotKind, SnapshotShape> = {
  country: {
    testId: "country-snapshot-view",
    liveRoute: getCountryRoute,
    nameKeys: ["name_fr", "nameFr"],
  },
  people: {
    testId: "people-snapshot-view",
    liveRoute: getPeopleRoute,
    nameKeys: ["nameMain", "name_main"],
  },
  languageFamily: {
    testId: "family-snapshot-view",
    liveRoute: getFamilyRoute,
    nameKeys: ["name_fr", "nameFr"],
  },
};

export interface FicheSnapshotViewProps {
  kind: FicheSnapshotKind;
  entityId: string;
  version: number;
  publishedAt: string | null;
  confidence: number | null;
  snapshotData: Record<string, unknown>;
  doctrine: FrozenDoctrineReference | null;
  lang: string;
}

// @req REQ-019
export function FicheSnapshotView({
  kind,
  entityId,
  version,
  publishedAt,
  confidence,
  snapshotData,
  doctrine,
  lang,
}: FicheSnapshotViewProps) {
  const { testId, liveRoute, nameKeys } = SNAPSHOT_SHAPE[kind];

  const displayName =
    nameKeys
      .map((key) => snapshotData[key])
      .find((value): value is string => typeof value === "string") ?? entityId;

  return (
    <div data-testid={testId} className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-afh-h2 font-semibold">{displayName}</h1>
        <p className="text-afh-small text-muted-foreground font-mono">
          {entityId}
        </p>
      </div>

      <PinnedVersionBanner
        pinnedAt={publishedAt}
        versionTag={String(version)}
        liveUrl={liveRoute(lang as Language, entityId)}
      />

      {confidence !== null && (
        <div className="px-1">
          <ConfidenceChip
            confidenceScore={confidence}
            sourceCount={null}
            lastHumanAuditAt={publishedAt}
            variant="hero"
          />
        </div>
      )}

      <div className="prose prose-neutral max-w-none text-afh-small text-muted-foreground">
        <p>
          Ce contenu est une capture archivée&nbsp;(v{version}) et ne sera
          jamais modifié.
        </p>
      </div>

      {doctrine && isDoctrineSlug(doctrine.slug) && (
        <DoctrineLinkCard slug={doctrine.slug} version={doctrine.version} />
      )}
    </div>
  );
}
