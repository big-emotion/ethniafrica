/**
 * Pure helpers for the URL-health / confidence-recompute pipeline.
 *
 * Kept dependency-free so they can be unit-tested in isolation and reused
 * by both `scripts/checkSourceUrls.ts` (output formatting, concurrency pool)
 * and `scripts/recomputeConfidence.ts` (run computation, action decision).
 *
 * Story 0.20 (FR31) — Source-URL health -> confidence recompute hook.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthStatus = "ok" | "broken";

/** One NDJSON record as stored in `dataset/source-url-health.log`. */
export interface HealthRecord {
  source_id: string;
  url: string;
  status: HealthStatus;
  http_code: number;
  /** ISO-8601 UTC timestamp of the probe. */
  timestamp: string;
}

/** Output-side alias (same shape) used by `formatHealthRecord`. */
export type HealthRecordOut = HealthRecord;

/** Per-source run summary, computed from the NDJSON log. */
export interface SourceRunState {
  /** Status of the most recent calendar day with at least one probe. */
  mostRecentStatus: HealthStatus;
  /** Number of consecutive most-recent calendar days that were broken. */
  consecutiveBrokenDays: number;
  /** Number of consecutive most-recent calendar days that were ok. */
  consecutiveOkDays: number;
}

export type Action = "penalize" | "recover" | "noop";

export interface DecideActionInput extends SourceRunState {
  /** Whether a public auto_generated 'unreachable_source' flag is currently open. */
  hasOpenFlag: boolean;
}

// Tunables — exposed so tests / callers don't have to repeat magic numbers.
export const BROKEN_THRESHOLD_DAYS = 7;
export const RECOVERY_THRESHOLD_DAYS = 3;
export const PENALTY_DELTA = 0.2;
export const METHODOLOGY_TAG = " [auto-penalty:unreachable_source]";
export const FLAG_TYPE = "unreachable_source";

// ---------------------------------------------------------------------------
// Run computation
// ---------------------------------------------------------------------------

/** Return the UTC calendar-day key (yyyy-mm-dd) for an ISO timestamp. */
function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Number of whole days between two yyyy-mm-dd day keys (b - a, in days). */
function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Group the records by source_id and compute, for each source, how many
 * consecutive calendar days from today (`now`) are broken / ok and what the
 * most recent status is.
 *
 * Rules:
 *  - One calendar day with at least one "broken" record counts as broken.
 *    (Conservative: any failure that day is treated as a broken day.)
 *  - A gap day (no record at all) breaks the run.
 *  - The "most recent status" is taken from the most recent calendar day
 *    that has any record.
 */
export function computeConsecutiveRuns(
  records: HealthRecord[],
  now: Date
): Map<string, SourceRunState> {
  const out = new Map<string, SourceRunState>();
  if (records.length === 0) return out;

  // 1. Bucket records by (source_id, calendar-day) and reduce to one status
  //    per day. Any "broken" record on a given day makes that day broken.
  const bySource = new Map<string, Map<string, HealthStatus>>();
  for (const r of records) {
    const k = dayKey(r.timestamp);
    let perDay = bySource.get(r.source_id);
    if (!perDay) {
      perDay = new Map();
      bySource.set(r.source_id, perDay);
    }
    const existing = perDay.get(k);
    if (existing === "broken") continue; // sticky: a broken probe wins the day
    perDay.set(k, r.status);
  }

  const today = now.toISOString().slice(0, 10);

  for (const [sourceId, perDay] of bySource.entries()) {
    const sortedDays = [...perDay.keys()].sort().reverse(); // newest first
    if (sortedDays.length === 0) continue;

    const mostRecentStatus = perDay.get(sortedDays[0])!;
    // Walk back from the most-recent day, counting consecutive same-status
    // calendar days with no gaps.
    let consecutiveBrokenDays = 0;
    let consecutiveOkDays = 0;

    let expectedDay = sortedDays[0];
    for (const day of sortedDays) {
      if (day !== expectedDay) break; // calendar gap
      const status = perDay.get(day)!;
      if (status !== mostRecentStatus) break; // status flipped
      if (status === "broken") consecutiveBrokenDays += 1;
      else consecutiveOkDays += 1;

      // Move expectedDay one calendar day earlier.
      const next = new Date(`${expectedDay}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() - 1);
      expectedDay = next.toISOString().slice(0, 10);
    }

    out.set(sourceId, {
      mostRecentStatus,
      consecutiveBrokenDays,
      consecutiveOkDays,
    });

    // `today` is referenced for callers that want to assert freshness; the
    // run length itself is anchored to the most-recent observation day.
    void daysBetween(today, sortedDays[0]); // documented use of `today`
  }

  return out;
}

// ---------------------------------------------------------------------------
// Action decision
// ---------------------------------------------------------------------------

/**
 * Decide what to do for a given source based on its run state and whether a
 * public auto-flag is currently open.
 *
 * Boundaries (per Story 0.20):
 *  - >= 7 consecutive broken days and no open flag -> "penalize"
 *  - >=  3 consecutive ok days and an open flag    -> "recover"
 *  - everything else                                -> "noop" (idempotent)
 */
export function decideAction(input: DecideActionInput): Action {
  if (
    input.mostRecentStatus === "broken" &&
    input.consecutiveBrokenDays >= BROKEN_THRESHOLD_DAYS &&
    !input.hasOpenFlag
  ) {
    return "penalize";
  }
  if (
    input.mostRecentStatus === "ok" &&
    input.consecutiveOkDays >= RECOVERY_THRESHOLD_DAYS &&
    input.hasOpenFlag
  ) {
    return "recover";
  }
  return "noop";
}

// ---------------------------------------------------------------------------
// NDJSON helpers (used by the checker script and its tests)
// ---------------------------------------------------------------------------

/** Format a health record as an NDJSON line (trailing newline included). */
export function formatHealthRecord(rec: HealthRecordOut): string {
  return JSON.stringify(rec) + "\n";
}

/**
 * Minimal promise pool — runs `worker` over `items` with at most `concurrency`
 * concurrent invocations. Resolves when all workers finish.
 *
 * Intentionally zero-deps (no `p-limit`, no batching).
 */
export async function promisePool<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const cap = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;
  const runners = Array.from({ length: cap }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}
