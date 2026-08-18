/**
 * Client-only difficulty-rung progression (Epic 10, Story 10.9, ETNI-1136,
 * FR68). A session finishing at >= 75% correct advances the player's rung
 * for that segment; the rung is persisted in localStorage only, keyed per
 * segment, and pre-selected next time the segment is opened. Nothing here
 * ever reaches the server.
 */

import { DIFFICULTY_RUNGES, type QuizAudience } from "@/lib/quiz/segmentPolicy";

export const RUNG_STORAGE_PREFIX = "ethni-quiz-rung";

const ADVANCE_THRESHOLD = 0.75;

function storageKey(segment: QuizAudience): string {
  return `${RUNG_STORAGE_PREFIX}:${segment}`;
}

/** The rung previously earned for `segment`, or `null` if none is stored / unavailable. */
export function getStoredRung(segment: QuizAudience): number | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(segment));
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists the next rung for `segment` when `correctRatio` meets the FR68
 * threshold, capped at the segment's maximum difficulty. Returns the
 * persisted rung, or `null` when the threshold was not met (nothing is
 * written in that case).
 */
export function persistRungIfEarned(
  segment: QuizAudience,
  difficulty: number,
  correctRatio: number
): number | null {
  if (correctRatio < ADVANCE_THRESHOLD) return null;
  if (typeof window === "undefined") return null;

  const nextRung = Math.min(difficulty + 1, DIFFICULTY_RUNGES[segment].max);

  try {
    window.localStorage.setItem(storageKey(segment), String(nextRung));
    return nextRung;
  } catch {
    return null;
  }
}
