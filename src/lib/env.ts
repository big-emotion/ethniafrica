/**
 * Reading deployment-tunable numbers out of the environment.
 *
 * The rule these serve: a value that differs between deployments — a quota, a
 * request deadline, a host — belongs in configuration, not in a literal that
 * only a redeploy can change. A malformed value falls back to the documented
 * default rather than throwing, because a typo in an env var must not be able
 * to take a running deployment down.
 */

/**
 * A positive integer from `process.env`, or the fallback when the variable is
 * unset, unparseable, zero or negative.
 */
// @req REQ-110
export function positiveIntFromEnv(
  value: string | undefined,
  fallback: number
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
