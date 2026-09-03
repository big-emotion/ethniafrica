/**
 * Counts the migrations a `supabase db push --dry-run` says it would apply.
 *
 * This lived inline in `deploy-production.yml` as a `grep -cE` looking for a
 * line beginning with three digits. The CLI prefixes each entry with a bullet,
 * so it matched nothing — the count was 0 on every release, which left the
 * "refuse a plan wider than the measurement" gate incapable of refusing
 * anything at all. It is a script with fixtures now, because a gate whose
 * parser can be silently wrong is not a gate.
 *
 * @req REQ-032
 */
const ENTRY = /^[ \t]*(?:[•*-][ \t]*)?\d{3,}_[A-Za-z0-9_]+\.sql[ \t]*$/;

export function countPlannedMigrations(planOutput: string): number {
  return planOutput.split("\n").filter((line) => ENTRY.test(line)).length;
}
