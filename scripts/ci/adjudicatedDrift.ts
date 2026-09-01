/**
 * Drift that has been looked at, explained, and closed.
 *
 * Drift is normally a defect, and the gate should fail on it. But a ledger row
 * is history: it records the statements a database actually executed, and no
 * later migration rewrites it. So a migration whose file legitimately says more
 * than the database was given stays "drifted" forever, and a gate that can
 * never go green stops being read — which is how this repository already lost
 * the signal from its Lighthouse budget.
 *
 * Each entry therefore has to say what the difference is and what closed it, so
 * the list documents settled questions rather than hiding open ones. Anything
 * not listed still fails.
 */
export interface AdjudicatedDrift {
  /** Migration filename, exactly as it appears on disk. */
  filename: string;
  /** When the difference was examined. */
  adjudicatedOn: string;
  /** What differs, and what closed it. */
  reason: string;
}

export const ADJUDICATED_DRIFT: readonly AdjudicatedDrift[] = [
  {
    filename: "038_user_roles_rls_recursion_fix.sql",
    adjudicatedOn: "2026-09-01",
    reason:
      "Every function and every policy is byte-identical between the file and " +
      "the ledger. What the database never received is the documentation — the " +
      "fourteen COMMENT ON statements recording why is_admin() and " +
      "is_moderator_or_admin() are SECURITY DEFINER. Migration 062 applied them, " +
      "and the schema now matches; the ledger's record of 038 cannot be rewritten, " +
      "so the comparison stays unequal. ETNI-1186, DEC-017.",
  },
];

/** The drifted filenames that are still unexplained. */
export function unadjudicatedDrift(
  driftedFilenames: readonly string[]
): string[] {
  const settled = new Set(ADJUDICATED_DRIFT.map((entry) => entry.filename));
  return driftedFilenames.filter((filename) => !settled.has(filename));
}
