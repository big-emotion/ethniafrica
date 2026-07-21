export type VersionedSlugResult =
  | { slug: string; mode: "live" }
  | { slug: string; mode: "latest" }
  | { slug: string; mode: "pinned"; version: number };

const PINNED_PATTERN = /^(.+)@v(\d+)$/;
const LATEST_PATTERN = /^(.+)@latest$/;

/**
 * Parses a raw URL slug that may carry a @v{n} or @latest suffix.
 *
 * Only lowercase `v` followed by a positive integer is accepted.
 * Uppercase `V`, decimals, zero, or any other suffix → null (signals a 404).
 * An empty base slug → null.
 */
export function parseVersionedSlug(raw: string): VersionedSlugResult | null {
  // Reject anything with an @ that does not match our two known patterns.
  const hasAt = raw.includes("@");

  if (!hasAt) {
    if (!raw) return null;
    return { slug: raw, mode: "live" };
  }

  const latestMatch = LATEST_PATTERN.exec(raw);
  if (latestMatch) {
    const slug = latestMatch[1];
    if (!slug) return null;
    return { slug, mode: "latest" };
  }

  const pinnedMatch = PINNED_PATTERN.exec(raw);
  if (pinnedMatch) {
    const slug = pinnedMatch[1];
    const versionStr = pinnedMatch[2];
    if (!slug) return null;
    const version = parseInt(versionStr, 10);
    if (version < 1) return null;
    return { slug, mode: "pinned", version };
  }

  // Any other @-containing string (uppercase V, decimal, unknown suffix) is invalid.
  return null;
}
