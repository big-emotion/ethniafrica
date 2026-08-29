import { LOADER_REVEAL_DELAY_MS } from "@/components/system/AfricaTraceLoader";

/**
 * How long the interstitial stays once it has actually been painted.
 *
 * Without a floor, a navigation that resolves just past the reveal threshold
 * paints the fact and takes it away inside a frame or two — a flash, which is
 * the exact failure the threshold exists to prevent, arriving from the other
 * side. Long enough to read a headline, short enough that nobody waits on the
 * loader for a page that is already there.
 */
// @req REQ-104
export const MIN_VISIBLE_MS = 650;

/**
 * How long the overlay may stay up before it lets go regardless.
 *
 * The overlay is raised on a click and lowered when the pathname changes. A
 * navigation that never commits — a route that throws, a click the router
 * declines to act on — would otherwise leave the reader behind a screen with
 * no way out. This is the escape hatch, not a timeout for slow pages.
 */
// @req REQ-104
export const MAX_VISIBLE_MS = 15000;

/**
 * How much longer the interstitial owes the reader, given how long the
 * navigation has already taken.
 *
 * Below the reveal threshold nothing was ever painted, so nothing is owed and
 * the overlay can go at once. Past it, the fact has been on screen and has to
 * stay for the minimum before it may be taken away.
 */
// @req REQ-104
export function remainingVisibleMs(elapsedMs: number): number {
  if (elapsedMs < LOADER_REVEAL_DELAY_MS) return 0;
  return Math.max(0, LOADER_REVEAL_DELAY_MS + MIN_VISIBLE_MS - elapsedMs);
}

export interface NavigationIntentInput {
  /** The anchor the click landed on, or null when it landed on nothing. */
  anchor: HTMLAnchorElement | null;
  /** Where the reader currently is, as an absolute URL. */
  currentUrl: string;
  /** Left button is 0; anything else is not a plain navigation. */
  button: number;
  /** A modified click opens a tab or downloads — the current page stays put. */
  hasModifier: boolean;
  /** Something upstream already handled the click. */
  defaultPrevented: boolean;
}

/**
 * Whether a click is about to replace the page the reader is looking at.
 *
 * Every exclusion here is a case where raising the interstitial would be a
 * lie: the page is not going anywhere, so an overlay would sit there until
 * its own escape hatch fired. In-page anchors are the subtle one — `#section`
 * resolves to a perfectly valid same-origin URL and changes nothing.
 *
 * A query-string-only change counts as staying put. On this site those are
 * filters — a facet hub narrowing its list, the search page taking a term —
 * and covering the screen while a list re-sorts underneath hides the very
 * thing the reader is watching for.
 *
 * `data-opens-in-place` is the one case a click cannot be read from the URLs
 * alone. The home's three entry cards are anchors to their hub — the path a
 * crawler and a reader without JavaScript take — but a click deploys the
 * modules around the card instead (REQ-114), and `defaultPrevented` cannot
 * separate that from an ordinary internal navigation, because Next's own
 * `Link` cancels the native navigation on every one of those too. So the
 * link that keeps the reader where they are declares it.
 */
// @req REQ-104
export function isPageReplacingNavigation({
  anchor,
  currentUrl,
  button,
  hasModifier,
  defaultPrevented,
}: NavigationIntentInput): boolean {
  if (!anchor || defaultPrevented || button !== 0 || hasModifier) return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.getAttribute("data-opens-in-place") === "true") return false;

  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  let destination: URL;
  let current: URL;
  try {
    current = new URL(currentUrl);
    destination = new URL(href, currentUrl);
  } catch {
    return false;
  }

  if (destination.origin !== current.origin) return false;

  return destination.pathname !== current.pathname;
}
