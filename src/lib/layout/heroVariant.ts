import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { ACCESS_MODES } from "@/lib/hubs/moduleRegistry";

/**
 * Two heroes, and the route decides which.
 *
 * The home and the three axis hubs are entry points: a reader arrives there
 * to choose, so the band takes the viewport and the page below it is the
 * reward for scrolling. Every other route is a destination: the reader came
 * for what is under the band, and a viewport-height hero there is a wall
 * between them and it.
 *
 * Deriving this from the path rather than from a prop is the point. A prop is
 * a decision twenty-odd page authors each take again, and the shell's four
 * competing widths are what that looks like after a year.
 */
export type HeroVariant = "immersive" | "compact";

/**
 * The locale segment is stripped from both sides rather than matched, so the
 * rule is about the shape of the route and not about today's only language.
 */
const withoutLocale = (path: string): string[] =>
  path
    .split("/")
    .filter((segment) => segment.length > 0)
    .slice(1);

/**
 * Read back from the slug table rather than spelled out. The three segments
 * are already written down once in `AXIS_HUB_PAGE`; a second copy here would
 * go stale the day a hub is renamed, and go stale silently — the hubs would
 * quietly fall back to the short band with nothing failing.
 */
const IMMERSIVE_HUB_SEGMENTS = new Set(
  ACCESS_MODES.map((mode) =>
    withoutLocale(getAxisHubRoute("fr", mode)).join("/")
  )
);

// @req REQ-115
export function heroVariantForPath(pathname: string | null): HeroVariant {
  if (!pathname) return "compact";

  const segments = withoutLocale(pathname.split(/[?#]/, 1)[0]);

  if (segments.length === 0) return "immersive";

  return IMMERSIVE_HUB_SEGMENTS.has(segments.join("/"))
    ? "immersive"
    : "compact";
}
