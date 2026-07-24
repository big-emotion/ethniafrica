"use client";

import React, { lazy, Suspense, useState } from "react";
import type { Source } from "@/components/source-transparency/SourceChainSheet";

// Wave-2 imports — excluded from the initial bundle.
// The Suspense fallback renders the prose immediately (Wave 1), protecting LCP.
const LazyConfidenceChip = lazy(async () => {
  const { ConfidenceChip } =
    await import("@/components/source-transparency/ConfidenceChip");
  return { default: ConfidenceChip };
});

const LazySourceChainSheet = lazy(
  () =>
    import("@/components/source-transparency/SourceChainSheet") as Promise<{
      default: React.ComponentType<
        import("@/components/source-transparency/SourceChainSheet").SourceChainSheetProps
      >;
    }>
);

export interface ParagraphChipData {
  chipId: string;
  confidenceScore: number | null;
  sourceCount: number | null;
  lastHumanAuditAt: string | null;
  assertionStatement: string;
  sources: Source[];
  /** When true, renders chip with "contested" variant (per-sentence granularity). */
  contested?: boolean;
}

/** Chip props subsets keyed by prose field name — one per section component. */
export interface OriginChips {
  ancientOrigins?: ParagraphChipData;
  formationPeriod?: ParagraphChipData;
  unificationsOrDivisions?: ParagraphChipData;
  externalInfluences?: ParagraphChipData;
  majorHistoricalEvents?: ParagraphChipData;
}

export interface HistoryChips {
  kingdomsOrChiefdoms?: ParagraphChipData;
  relationsWithNeighbors?: ParagraphChipData;
  conflictsOrAlliances?: ParagraphChipData;
  diaspora?: ParagraphChipData;
}

export interface CultureChips {
  initiation?: ParagraphChipData;
  femaleInitiation?: ParagraphChipData;
  funerary?: ParagraphChipData;
  music?: ParagraphChipData;
  gastronomy?: ParagraphChipData;
  syncretism?: ParagraphChipData;
}

export interface LanguageChips {
  vehicularRole?: ParagraphChipData;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function FallbackLink({ onOpen }: { onOpen: () => void }) {
  return (
    <span className="inline-flex items-center p-1">
      <a
        href="#sources"
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        className="text-sm underline underline-offset-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))] hover:text-[color:var(--afh-text,var(--country-text,#2C2018))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--afh-focus,var(--country-text,#2C2018))]"
      >
        voir les sources
      </a>
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProseWithChip
// ---------------------------------------------------------------------------

interface ProseWithChipProps {
  text: string;
  chip?: ParagraphChipData;
  className?: string;
}

/**
 * Renders a prose paragraph with an optional inline ConfidenceChip at the end.
 *
 * Two-wave hydration (protects LCP, UX-DR46):
 *   Wave 1 — prose text renders immediately via Suspense fallback.
 *   Wave 2 — lazy chip JS loads after the prose is interactive.
 *
 * Fallback (AC: hydration fails or data missing):
 *   ConfidenceChip itself renders "voir les sources" when any data field is null.
 *   The Suspense fallback also shows "voir les sources" while the lazy chunk loads.
 */
export function ProseWithChip({ text, chip, className }: ProseWithChipProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const paraClass = className ?? "people-section-body";

  if (!chip) {
    return <p className={paraClass}>{text}</p>;
  }

  const anchorId = `chip-${chip.chipId}`;

  return (
    <p className={paraClass}>
      {text}{" "}
      <Suspense fallback={<FallbackLink onOpen={() => setSheetOpen(true)} />}>
        <LazyConfidenceChip
          id={anchorId}
          confidenceScore={chip.confidenceScore}
          sourceCount={chip.sourceCount}
          lastHumanAuditAt={chip.lastHumanAuditAt}
          variant={chip.contested ? "contested" : "inline"}
          onOpen={() => setSheetOpen(true)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <LazySourceChainSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          assertion={{
            statement: chip.assertionStatement,
            confidenceScore: chip.confidenceScore ?? 0,
            sourceCount: chip.sourceCount ?? 0,
            lastHumanAuditAt: chip.lastHumanAuditAt,
          }}
          sources={chip.sources}
          anchorId={anchorId}
        />
      </Suspense>
    </p>
  );
}

export default ProseWithChip;
