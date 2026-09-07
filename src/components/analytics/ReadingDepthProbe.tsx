"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  readingDepthPercent,
  thresholdsCrossed,
} from "@/lib/analytics/readingDepth";

export interface ReadingDepthProbeProps {
  /** Which kind of page is being read, so depth can be compared across them. */
  surface: string;
}

/**
 * Records how far down the page a reader got.
 *
 * Renders nothing. The arithmetic lives in `lib/analytics/readingDepth` and is
 * tested there; what is left here is the wiring, kept deliberately thin because
 * it is the part a test can only observe through a scroll event and a frame.
 *
 * Three details that are not decoration:
 *
 * **Throttled on a clock, not on a frame.** Scroll fires far more often than a
 * measurement is worth taking, and reading `scrollHeight` per event forces a
 * synchronous layout — the fiche routes are the ones already under a Total
 * Blocking Time budget (`peuples/[slug]/page.tsx`). `requestAnimationFrame`
 * would be the usual throttle and is deliberately not used: the fiche motion
 * charter (`fiche/__tests__/reducedMotion.test.tsx`) treats a raw animation
 * frame in a fiche module as ungated motion, and a scroll probe is not worth an
 * exemption from a rule whose value is that it has none.
 *
 * **Measured once on mount.** A fiche shorter than the viewport is fully read
 * on arrival and fires no scroll event at all. Without this the shortest fiches
 * — the ones the corpus fills least — would report no depth whatsoever, and
 * their absence would read as readers bouncing.
 *
 * **Thresholds are recorded, never re-sent.** The ref survives re-renders; a
 * state hook here would re-render the whole fiche on every scroll.
 */

/** Far below a reader's scroll, far above one layout read per scroll event. */
const MEASURE_INTERVAL_MS = 250;
// @req REQ-046
export function ReadingDepthProbe({ surface }: ReadingDepthProbeProps) {
  const recorded = useRef<number[]>([]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function measure() {
      timer = null;
      const percent = readingDepthPercent(
        window.scrollY,
        window.innerHeight,
        document.documentElement.scrollHeight
      );
      for (const threshold of thresholdsCrossed(percent, recorded.current)) {
        recorded.current.push(threshold);
        trackEvent("fiche:depth", { surface, depth: threshold });
      }
    }

    function schedule() {
      if (timer !== null) return;
      timer = setTimeout(measure, MEASURE_INTERVAL_MS);
    }

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [surface]);

  return null;
}
