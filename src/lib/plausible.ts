/**
 * Plausible Analytics utility — cookie-less, GDPR-compliant.
 *
 * Reads environment variables at call time so that tests can override
 * `process.env` without module-level caching.
 */

const PLAUSIBLE_SCRIPT_PATH = "/js/script.js";
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
export function buildPlausibleSrc(): string {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return "";

  const host =
    process.env.NEXT_PUBLIC_PLAUSIBLE_CUSTOM_DOMAIN ?? DEFAULT_PLAUSIBLE_HOST;

  // Strip any trailing slash from the host before appending the path.
  return `${host.replace(/\/$/, "")}${PLAUSIBLE_SCRIPT_PATH}`;
}
