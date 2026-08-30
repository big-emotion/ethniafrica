"use client";

import React, { lazy, Suspense, useState } from "react";
import { FicheProse } from "@/components/fiche/FicheProse";
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

/** Keyed by the four `content.culture` fields the strict model declares. */
export interface CultureChips {
  majorRites?: ParagraphChipData;
  symbols?: ParagraphChipData;
  artsAndMusic?: ParagraphChipData;
  spiritualities?: ParagraphChipData;
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
        className="text-afh-small underline underline-offset-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))] hover:text-[color:var(--afh-text,var(--country-text,#2C2018))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--afh-focus,var(--country-text,#2C2018))]"
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
// @req REQ-003
export function ProseWithChip({ text, chip, className }: ProseWithChipProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const paraClass = className ?? "people-section-body";

  if (!chip) {
    return <FicheProse text={text} paragraphClassName={paraClass} />;
  }

  const anchorId = `chip-${chip.chipId}`;

  return (
    <>
      <FicheProse
        text={text}
        paragraphClassName={paraClass}
        trailing={
          <Suspense
            fallback={<FallbackLink onOpen={() => setSheetOpen(true)} />}
          >
            <LazyConfidenceChip
              id={anchorId}
              confidenceScore={chip.confidenceScore}
              sourceCount={chip.sourceCount}
              lastHumanAuditAt={chip.lastHumanAuditAt}
              variant={chip.contested ? "contested" : "inline"}
              onOpen={() => setSheetOpen(true)}
            />
          </Suspense>
        }
      />
      {/* The sheet is a dialog, so it renders a div. Inside the paragraph the
          HTML parser closed the <p> before it and the server markup stopped
          matching what the client hydrated. It belongs beside the prose. */}
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
    </>
  );
}

export default ProseWithChip;
