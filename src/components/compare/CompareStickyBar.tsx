"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  COMPARE_MAX_SELECTION,
  COMPARE_MIN_TO_COMPARE,
} from "@/hooks/use-compare-selection";

export interface CompareStickyBarProps {
  count: number;
  max?: number;
  onCompare: () => void;
  className?: string;
}

// @req REQ-097
/**
 * Bottom action bar for the entity comparison picker (FR59, UX-DR29).
 * The consuming page is responsible for placing this component as the last
 * child of <main> so it sits at the end of the DOM order while staying
 * visually pinned to the viewport bottom via `sticky`.
 */
export function CompareStickyBar({
  count,
  max = COMPARE_MAX_SELECTION,
  onCompare,
  className,
}: CompareStickyBarProps) {
  const canCompare = count >= COMPARE_MIN_TO_COMPARE;

  return (
    <div
      role="region"
      aria-label="Sélection de comparaison"
      className={cn(
        "sticky bottom-0 z-40 flex w-full items-center justify-between gap-3 border-t border-afh-border bg-afh-surface px-4 py-3",
        className
      )}
    >
      <span className="text-sm font-medium text-afh-text">
        {count}/{max} sélectionnés
      </span>
      <Button type="button" onClick={onCompare} disabled={!canCompare}>
        comparer
      </Button>
    </div>
  );
}

export default CompareStickyBar;
