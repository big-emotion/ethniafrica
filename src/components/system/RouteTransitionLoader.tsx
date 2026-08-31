"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DidYouKnowLoader } from "@/components/system/DidYouKnowLoader";
import {
  MAX_VISIBLE_MS,
  isPageReplacingNavigation,
  remainingVisibleMs,
} from "@/components/system/routeTransitionTiming";
import {
  pickNextDidYouKnowFact,
  type DidYouKnowFact,
} from "@/lib/home/didYouKnowFacts";

interface PendingNavigation {
  fact: DidYouKnowFact | null;
  /** Where the reader was when they clicked — how we know the move landed. */
  from: string;
  startedAt: number;
  /**
   * Where the site header ends, measured at the moment of the click.
   *
   * The server's loading screens keep the header on screen by rendering the
   * arriving page's own `PageLayout` (REQ-098) — the reader never loses their
   * orientation mid-navigation. An overlay pinned to `inset: 0` would take
   * that away on exactly the routes the overlay exists to cover, and the
   * navigation would read as a full reload. There is no header-height token
   * to read, so the header is measured instead.
   */
  topOffset: number;
}

const headerBottom = () => {
  const header = document.querySelector("[data-testid='site-header']");
  if (!header) return 0;
  return Math.max(0, header.getBoundingClientRect().bottom);
};

/**
 * The wait state of a navigation the server never sees (REQ-104).
 *
 * `loading.tsx` covers a segment on both a hard load and a soft one, so most
 * of the site is already answered by the files under `src/app`. Two gaps are
 * not, and both matter:
 *
 * The home has no boundary of its own and cannot be given one. A
 * `[lang]/loading.tsx` is the only file that would cover it, and that file
 * streams a shell above the locale guard in `[lang]/layout.tsx` — the guard
 * that turns `/quiz` into a 404 rather than serving the home at a wrong URL
 * (REQ-052). Adding it would trade a soft-404 for a loading state.
 *
 * The routes that can 404 on a bad slug — the games, the comparison, the
 * reports, the doctrine fiches — cannot take a `loading.tsx` for the same
 * reason at their own scale: a streamed shell fixes the status at 200 before
 * `notFound()` is reached. Measured, not assumed: adding one to `jouer` moved
 * `/fr/jouer/inexistant` from 404 to 200.
 *
 * An overlay has neither problem. It exists only after a click, only in the
 * browser, and touches no status code at all — which is exactly why it is the
 * right tool for the segments a boundary would damage.
 *
 * It raises on the click rather than on the transition, so the wait starts
 * when the reader's intent does. It lowers when the pathname changes, and is
 * held for a floor past that so a fact is never taken away mid-sentence.
 */
// @req REQ-104
// @req REQ-113
export function RouteTransitionLoader() {
  const pathname = usePathname();
  const [pending, setPending] = useState<PendingNavigation | null>(null);
  // The bank is small enough that a uniform draw repeats visibly. Carrying
  // the last id across navigations is what keeps the loader reading as a
  // rotation rather than as a fixed image.
  const lastFactId = useRef<string | null>(null);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      const anchor =
        target instanceof Element
          ? (target.closest("a") as HTMLAnchorElement | null)
          : null;

      const replaces = isPageReplacingNavigation({
        anchor,
        currentUrl: window.location.href,
        button: event.button,
        hasModifier:
          event.metaKey || event.ctrlKey || event.shiftKey || event.altKey,
        defaultPrevented: event.defaultPrevented,
      });
      if (!replaces) return;

      const drawn = pickNextDidYouKnowFact(lastFactId.current);
      lastFactId.current = drawn?.id ?? lastFactId.current;
      setPending({
        fact: drawn,
        from: window.location.pathname,
        startedAt: Date.now(),
        topOffset: headerBottom(),
      });
    };

    // Capture phase: by the time a click bubbles back up, Next's `Link` has
    // cancelled the native navigation on every internal move, so a bubble
    // listener reading `defaultPrevented` would never raise the overlay at
    // all. A link that cancels the click and stays put says so with
    // `data-opens-in-place` instead.
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return undefined;

    // The escape hatch. A click the router declines to act on never changes
    // the pathname, and the reader must not be left behind the overlay.
    const abandon = window.setTimeout(() => setPending(null), MAX_VISIBLE_MS);
    return () => window.clearTimeout(abandon);
  }, [pending]);

  useEffect(() => {
    if (!pending || pathname === pending.from) return undefined;

    // Zero is a legitimate wait here — the navigation resolved before the
    // fact was ever painted — and going through the timer either way keeps
    // one code path instead of two.
    const settle = window.setTimeout(
      () => setPending(null),
      remainingVisibleMs(Date.now() - pending.startedAt)
    );
    return () => window.clearTimeout(settle);
  }, [pathname, pending]);

  if (!pending) return null;

  return (
    <div
      className="afh-rtl afh-accent-ocre"
      data-testid="route-transition-loader"
      style={{ top: `${pending.topOffset}px` }}
    >
      <DidYouKnowLoader
        fact={pending.fact}
        label="Chargement de la page demandée"
      />
      <style>{`
        .afh-rtl {
          position: fixed;
          inset: 0 0 0 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          background: var(--afh-bg);
          /* The same threshold the interstitial itself observes, applied to
             the ground it sits on: without it the page is covered instantly
             and a navigation that resolves in 80 ms reads as a flicker. */
          animation: afh-rtl-raise var(--afh-duration-fade)
            var(--afh-ease-out) 300ms both;
        }
        @keyframes afh-rtl-raise {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default RouteTransitionLoader;
