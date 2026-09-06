"use client";

import { useCallback, useState } from "react";
import { compareCopy } from "@/lib/i18n/copy/compare";
import type { Language } from "@/types/shared";

export type CompareEntityType = "peoples" | "countries" | "language-families";

export interface CompareCandidate {
  id: string;
  type: CompareEntityType;
  /** Display name (French exonym for countries/families, nameMain for peoples). */
  exonym: string;
  /** Self-appellation, when known — preferred over `exonym` in user-facing announcements. */
  autonym?: string | null;
}

export type CompareAddRejectReason =
  "max-reached" | "type-locked" | "duplicate";

export interface CompareAddResult {
  ok: boolean;
  reason?: CompareAddRejectReason;
}

export interface UseCompareSelectionResult {
  selected: CompareCandidate[];
  lockedType: CompareEntityType | null;
  count: number;
  maxReached: boolean;
  canCompare: boolean;
  /** Latest aria-live="polite" announcement text (add/remove/rejection). */
  announcement: string;
  add: (candidate: CompareCandidate) => CompareAddResult;
  remove: (id: string) => void;
  clear: () => void;
}

// @req REQ-097
export const COMPARE_MAX_SELECTION = 3;
// @req REQ-097
export const COMPARE_MIN_TO_COMPARE = 2;

const displayName = (candidate: CompareCandidate) =>
  candidate.autonym ?? candidate.exonym;

// @req REQ-097
export function useCompareSelection(
  language: Language = "fr"
): UseCompareSelectionResult {
  const [selected, setSelected] = useState<CompareCandidate[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const copy = compareCopy[language];

  const lockedType = selected[0]?.type ?? null;

  const add = useCallback(
    (candidate: CompareCandidate): CompareAddResult => {
      if (selected.length >= COMPARE_MAX_SELECTION) {
        setAnnouncement(copy.maximum(COMPARE_MAX_SELECTION));
        return { ok: false, reason: "max-reached" };
      }
      if (lockedType && candidate.type !== lockedType) {
        return { ok: false, reason: "type-locked" };
      }
      if (selected.some((entity) => entity.id === candidate.id)) {
        return { ok: false, reason: "duplicate" };
      }

      const next = [...selected, candidate];
      setSelected(next);
      setAnnouncement(
        copy.addedAnnouncement(
          displayName(candidate),
          next.length,
          COMPARE_MAX_SELECTION
        )
      );
      return { ok: true };
    },
    [selected, lockedType, copy]
  );

  const remove = useCallback(
    (id: string) => {
      const target = selected.find((entity) => entity.id === id);
      if (!target) return;

      const next = selected.filter((entity) => entity.id !== id);
      setSelected(next);
      setAnnouncement(
        copy.removedAnnouncement(
          displayName(target),
          next.length,
          COMPARE_MAX_SELECTION
        )
      );
    },
    [selected, copy]
  );

  const clear = useCallback(() => {
    setSelected([]);
    setAnnouncement("");
  }, []);

  return {
    selected,
    lockedType,
    count: selected.length,
    maxReached: selected.length >= COMPARE_MAX_SELECTION,
    canCompare: selected.length >= COMPARE_MIN_TO_COMPARE,
    announcement,
    add,
    remove,
    clear,
  };
}
