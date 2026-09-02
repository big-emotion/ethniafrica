"use client";

import React, { lazy, Suspense, useState } from "react";
import { FicheProse } from "@/components/fiche/FicheProse";
import { SourceNoteCall } from "@/components/source-transparency/SourceNoteCall";
import type { ParagraphNoteData } from "@/components/people/peopleFicheNotes";
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

/**
 * A sourced field: its prose, a numbered callout at the end of it, and the
 * source chain the callout opens.
 *
 * The callout is rendered eagerly rather than behind Suspense like the chip.
 * The chip is a verdict the reader can wait for; the number is part of the
 * sentence, and a digit that appears once the lazy chunk lands reflows the
 * paragraph under the eye that is reading it. Only the sheet stays lazy, which
 * is where the weight actually is.
 */
function ProseWithNote({
  text,
  note,
  anchorId,
  paragraphClassName,
  open,
  onOpenChange,
}: {
  text: string;
  note: ParagraphNoteData;
  anchorId: string;
  paragraphClassName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <FicheProse
        text={text}
        paragraphClassName={paragraphClassName}
        trailing={
          <SourceNoteCall
            number={note.noteNumber}
            anchorId={anchorId}
            fieldLabel={note.fieldLabel}
            contested={note.contested}
            onOpen={() => onOpenChange(true)}
          />
        }
      />
      {/* Beside the prose, never inside the paragraph: the sheet is a dialog,
          so it renders a div, and the HTML parser closes the <p> before it. */}
      <Suspense fallback={null}>
        <LazySourceChainSheet
          open={open}
          onOpenChange={onOpenChange}
          assertion={{
            id: note.assertionId,
            statement: note.assertionStatement,
            confidenceScore: 0,
            sourceCount: note.sources.length,
            lastHumanAuditAt: null,
          }}
          sources={note.sources.map((source) => ({
            id: source.id,
            title: source.title,
            url: source.url ?? undefined,
            author: source.author ?? undefined,
            year: source.year ?? undefined,
            // An untiered source keeps its own standing rather than being
            // folded onto "unverified", which would state a judgement no
            // editor made.
            tier: source.tier ?? "needs_review",
            bibliographyNumber: note.numberBySourceId[source.id],
          }))}
          anchorId={anchorId}
        />
      </Suspense>
    </>
  );
}

// ---------------------------------------------------------------------------
// ProseWithChip
// ---------------------------------------------------------------------------

interface ProseWithChipProps {
  text: string;
  chip?: ParagraphChipData;
  /**
   * A note callout for this field, when the corpus sources it.
   *
   * Takes precedence over `chip`: the two occupy the same character position
   * and say different things — the chip states a confidence verdict, the
   * callout states a reference — and a paragraph ending in both would ask the
   * reader to tell two marks apart at six pixels tall.
   */
  note?: ParagraphNoteData;
  /** Content-addressed anchor for the note, so a shared link survives an edit. */
  noteAnchorId?: string;
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
export function ProseWithChip({
  text,
  chip,
  note,
  noteAnchorId,
  className,
}: ProseWithChipProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const paraClass = className ?? "people-section-body";

  if (note) {
    return (
      <ProseWithNote
        text={text}
        note={note}
        anchorId={noteAnchorId ?? note.anchorId}
        paragraphClassName={paraClass}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    );
  }

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
