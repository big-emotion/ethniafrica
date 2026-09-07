/**
 * Plausible Analytics utility — cookie-less, GDPR-compliant.
 *
 * Reads environment variables at call time so that tests can override
 * `process.env` without module-level caching.
 */

/**
 * The script variant decides what is measurable at all.
 *
 * Production ran the base `/js/script.js` until 2026-09-07, which records
 * pageviews and nothing else. Three extensions are loaded instead, each
 * answering a question the base script could not:
 *
 * - `outbound-links` — a click on a cited source. The atlas's whole promise is
 *   that every claim carries one; whether readers follow them was unknown.
 * - `file-downloads` — a corpus export actually taken.
 * - `tagged-events` — a control tracked by adding a class to it, so a link or
 *   button can be measured without threading a handler through the tree.
 *
 * Custom events still go through `lib/analytics/trackEvent`; the variant only
 * decides which ones the script can record on its own.
 */
// @req REQ-046
export const PLAUSIBLE_SCRIPT_PATH =
  "/js/script.outbound-links.file-downloads.tagged-events.js";
const DEFAULT_PLAUSIBLE_HOST = "https://plausible.io";

/**
 * Returns the full URL to the Plausible script.
 *
 * - Uses `NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN` as the host when set
 *   (for self-hosted Plausible instances).
 * - Falls back to `https://plausible.io` otherwise.
 * - Returns an empty string if `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is not
 *   configured (no domain → no analytics injection).
 */
// @req REQ-046
export function buildPlausibleSrc(): string {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return "";

  const host =
    process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN ?? DEFAULT_PLAUSIBLE_HOST;

  // Strip any trailing slash from the host before appending the path.
  return `${host.replace(/\/$/, "")}${PLAUSIBLE_SCRIPT_PATH}`;
}
