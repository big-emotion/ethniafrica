"use client";

/**
 * MigrationDetailSheet — responsive detail sheet for a selected atlas
 * migration event (Epic 12, Story 12.9, ETNI-522/1100). Bottom sheet under
 * 720px, side sheet at/above (UX-DR30). Dismissible via Escape, scrim tap,
 * swipe-down (bottom variant) and the Android hardware back button
 * (UX-DR29). Source chips lazily open `SourceChainSheet` (FR78).
 */

import * as React from "react";
import Link from "next/link";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { ClassificationBadge } from "@/components/ui/classification-badge";
import { ConfidenceChip } from "@/components/source-transparency/ConfidenceChip";
import { LazySourceChainSheet } from "@/components/source-transparency/SourceChainSheet.lazy";
import type { Source as SourceChainSource } from "@/components/source-transparency/SourceChainSheet";
import { toSourceTier } from "@/types/sources";
import { useSheetHistory } from "@/hooks/use-sheet-history";
import { getPeopleRoute } from "@/lib/routing";
import { formatYearFr } from "@/lib/atlas/formatYearFr";
import { cn } from "@/lib/utils";
import type { MigrationAtlasEntry } from "@/lib/migrationDataTransformer";
import type { Language } from "@/types/shared";

export interface MigrationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: MigrationAtlasEntry | null;
  language?: Language;
  className?: string;
}

const SWIPE_CLOSE_THRESHOLD_PX = 80;

function useSheetVariant(): "bottom" | "side" {
  const [variant, setVariant] = React.useState<"bottom" | "side">("bottom");

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 720px)");
    const compute = () =>
      setVariant((prev) => {
        const next = mq.matches ? "side" : "bottom";
        return prev === next ? prev : next;
      });
    compute();
    mq.addEventListener?.("change", compute);
    return () => mq.removeEventListener?.("change", compute);
    // Recomputed on every render (not just mount) so a viewport change that
    // swaps out `window.matchMedia` between renders — as the test harness
    // does — is picked up even when the mock's own change listener is inert.
  });

  return variant;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function formatPeriod(timeRange: MigrationAtlasEntry["timeRange"]): string {
  const start = formatYearFr(timeRange.startYear);
  const end = formatYearFr(timeRange.endYear);
  const range = `${start} – ${end}`;
  return timeRange.datingNote ? `${range} (${timeRange.datingNote})` : range;
}

// @req REQ-101
export function MigrationDetailSheet({
  open,
  onOpenChange,
  event,
  language = "fr",
  className,
}: MigrationDetailSheetProps) {
  const variant = useSheetVariant();
  const reducedMotion = usePrefersReducedMotion();
  useSheetHistory({ open, onOpenChange });

  const [sourceSheetOpen, setSourceSheetOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) setSourceSheetOpen(false);
  }, [open]);

  const touchStartY = React.useRef<number | null>(null);
  const touchDeltaY = React.useRef(0);

  function handleTouchStart(touchEvent: React.TouchEvent) {
    if (variant !== "bottom") return;
    touchStartY.current = touchEvent.touches[0]?.clientY ?? null;
    touchDeltaY.current = 0;
  }

  function handleTouchMove(touchEvent: React.TouchEvent) {
    if (variant !== "bottom" || touchStartY.current === null) return;
    const currentY = touchEvent.touches[0]?.clientY ?? touchStartY.current;
    touchDeltaY.current = currentY - touchStartY.current;
  }

  function handleTouchEnd() {
    if (
      variant === "bottom" &&
      touchDeltaY.current > SWIPE_CLOSE_THRESHOLD_PX
    ) {
      onOpenChange(false);
    }
    touchStartY.current = null;
    touchDeltaY.current = 0;
  }

  if (!event) return null;

  const motionStyle: React.CSSProperties = reducedMotion
    ? { animationDuration: "0.01ms" }
    : {};

  const titleId = `migration-detail-${event.id}-title`;
  const sourceChainSources: SourceChainSource[] = event.sources.map(
    (source) => ({
      id: source.id,
      title: source.title,
      url: source.url ?? undefined,
      tier: toSourceTier(source.tier),
    })
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={variant === "bottom" ? "bottom" : "right"}
        data-variant={variant}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        style={motionStyle}
        aria-labelledby={titleId}
        className={cn(
          variant === "bottom"
            ? "w-full max-h-[85vh] overflow-y-auto"
            : "w-[420px] sm:max-w-[420px]",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <SheetTitle id={titleId}>{event.nameMain}</SheetTitle>
        <SheetDescription className="sr-only">
          Détail de l&apos;événement migratoire {event.nameMain}
        </SheetDescription>

        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-afh-small text-muted-foreground">
            {formatPeriod(event.timeRange)}
          </p>
          <ClassificationBadge status={event.classificationStatus} />
        </div>

        <ConfidenceChip
          id={`${event.id}-confidence`}
          confidenceScore={event.confidence?.score ?? null}
          sourceCount={event.confidence?.sourceCount ?? null}
          lastHumanAuditAt={event.confidence?.lastHumanAuditAt ?? null}
          variant="hero"
        />

        {event.peoples.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-2">
            {event.peoples.map((people) => (
              <li key={people.id}>
                <Link href={getPeopleRoute(language, people.id)}>
                  <AutonymExonymHeading
                    variant="compact"
                    exonym={people.nameMain}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {event.sources.length > 0 && (
          <ul className="flex flex-wrap gap-2 mt-2">
            {event.sources.map((source) => (
              <li key={source.id}>
                <button
                  type="button"
                  data-testid={`migration-source-chip-${source.id}`}
                  onClick={() => setSourceSheetOpen(true)}
                  className="rounded-full border border-border px-3 py-1 text-afh-caption font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {source.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        <LazySourceChainSheet
          open={sourceSheetOpen}
          onOpenChange={setSourceSheetOpen}
          anchorId={`migration-${event.id}`}
          assertion={{
            statement: event.nameMain,
            confidenceScore: (event.confidence?.score ?? 0) / 100,
            sourceCount: event.sources.length,
            lastHumanAuditAt: event.confidence?.lastHumanAuditAt ?? null,
          }}
          sources={sourceChainSources}
        />
      </SheetContent>
    </Sheet>
  );
}
