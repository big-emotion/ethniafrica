"use client";

/**
 * CompareEntityHeader — Epic 9 Story 9.7 (ETNI-484).
 *
 * Renders one compared entity's confidence and classification "above the
 * fold", with identical visual weight for every column — no highlighting,
 * sorting, arrows, deltas, or color emphasis distinguishing higher from
 * lower (FR60, FR6, UX-DR8, UX-DR9, dignity rule UX-DR49 #5). Each instance
 * only ever sees its own `column`, so there is no code path that could
 * compare entities against each other.
 *
 * Reuses Epic 1 "Source Transparency Fabric" components as-is:
 * `ConfidenceChip` + `SourceChainSheet` (lazy, same two-wave pattern as
 * `ProseWithChip`), `UnauditedDisclaimer` for the no-`confidence_scores`-row
 * case, and `ClassificationBadge`. The comparator adds no bespoke sheet.
 */

import * as React from "react";
import { lazy, Suspense, useState } from "react";
import Link from "next/link";

import { ClassificationBadge } from "@/components/ui/classification-badge";
import { UnauditedDisclaimer } from "@/components/source-transparency/UnauditedDisclaimer";
import type { Source } from "@/components/source-transparency/SourceChainSheet";
import { getLocalizedRoute } from "@/lib/routing";
import type { ComparisonColumn } from "@/types/compare";
import type { Language } from "@/types/shared";

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

const EMPTY_SOURCES: Source[] = [];

function FallbackLink({ onOpen }: { onOpen: () => void }) {
  return (
    <span className="inline-flex items-center p-1">
      <a
        href="#sources"
        onClick={(event) => {
          event.preventDefault();
          onOpen();
        }}
        className="text-afh-small underline underline-offset-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))] hover:text-[color:var(--afh-text,var(--country-text,#2C2018))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--afh-focus,var(--country-text,#2C2018))]"
      >
        voir les sources
      </a>
    </span>
  );
}

export interface CompareEntityHeaderProps {
  column: ComparisonColumn;
  language?: Language;
}

// @req REQ-097
export function CompareEntityHeader({
  column,
  language = "fr",
}: CompareEntityHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const confidence = column.confidence ?? null;
  const confidenceScore =
    confidence && typeof confidence.score === "number"
      ? Math.round(confidence.score * 100)
      : null;
  const sourceCount = confidence?.sourceCount ?? null;
  const lastHumanAuditAt = confidence?.lastHumanAuditAt ?? null;

  const anchorId = `compare-chip-${column.id}`;
  const explainerHref = getLocalizedRoute(language, "doctrine");

  return (
    <div
      role="group"
      aria-label={column.label}
      className="flex flex-col items-start gap-afh-xs"
    >
      <ClassificationBadge status={column.classificationStatus} />

      {confidence ? (
        <>
          {/* Reserve the chip's 44px tap-target height so resolving the lazy
              chunk never shifts the entity strip above the fold (ETNI-488 AC3). */}
          <div
            data-testid="compare-entity-confidence-slot"
            className="flex min-h-[44px] items-center"
          >
            <Suspense
              fallback={<FallbackLink onOpen={() => setSheetOpen(true)} />}
            >
              <LazyConfidenceChip
                id={anchorId}
                confidenceScore={confidenceScore}
                sourceCount={sourceCount}
                lastHumanAuditAt={lastHumanAuditAt}
                variant="hero"
                ariaSuffix={column.label}
                onOpen={() => setSheetOpen(true)}
              />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            <LazySourceChainSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              assertion={{
                statement: `Confiance éditoriale — ${column.label}`,
                confidenceScore: confidenceScore ?? 0,
                sourceCount: sourceCount ?? 0,
                lastHumanAuditAt,
              }}
              sources={EMPTY_SOURCES}
              anchorId={anchorId}
            />
          </Suspense>
        </>
      ) : (
        <UnauditedDisclaimer
          lastHumanAuditAt={null}
          fiche={column.id}
          entityLabel={column.label}
        />
      )}

      <Link
        href={explainerHref}
        className="text-afh-caption underline underline-offset-2 text-[color:var(--afh-text-soft,var(--country-text-soft,#7A6B5D))] hover:text-[color:var(--afh-text,var(--country-text,#2C2018))]"
      >
        comment ce score est calculé
      </Link>
    </div>
  );
}

export default CompareEntityHeader;
