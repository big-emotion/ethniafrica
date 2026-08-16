/**
 * Feature flags (Epic 10, Story 10.8, ETNI-497, AR39). Read from
 * `NEXT_PUBLIC_*` so the value is available both server- and client-side
 * without a Supabase round-trip.
 */

export function isQuizFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_QUIZ === "true";
}
