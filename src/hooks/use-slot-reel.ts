"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * One word replacing another in place, on a timer.
 *
 * Extracted from HomeHeroSeeds, which had it first and paid for every line of
 * it. The home now runs two of these — the seed chips under the field and the
 * class the headline names — and a second copy of this timing would have been
 * a second set of the same bugs.
 *
 * The hook owns the cadence and hands back the two words the caller must draw:
 * the settled one and the one rolling in behind it. It does not own the
 * markup, because the two callers need different markup — a chip's settled
 * word is a click payload and its accessible name, a headline's is neither.
 */

/** Mirrors --afh-duration-slow. WAAPI cannot read a CSS custom property. */
// @req REQ-002
export const REEL_MS = 320;
/** Mirrors --afh-ease-out. */
// @req REQ-002
export const REEL_EASING = "cubic-bezier(0, 0, 0.2, 1)";

// @req REQ-002
export interface ReelPool {
  words: string[];
  dwellMs: number;
  startDelayMs: number;
}

// @req REQ-002
export interface ReelHold {
  /** Transient: a pointer or a focus ring is on the row. Leaving takes it up. */
  paused: boolean;
  /** For the life of the page: the reader has reached the field. */
  ended: boolean;
}

// @req REQ-002
export function useSlotReel(
  { words, dwellMs, startDelayMs }: ReelPool,
  { paused, ended }: ReelHold
) {
  const trackRef = useRef<HTMLSpanElement>(null);
  const [cursor, setCursor] = useState(0);
  const reduced = usePrefersReducedMotion();

  const animation = useRef<Animation | null>(null);
  // The start delay staggers the reels, and only on first paint: a reel
  // taking up again after a pause owes the reader a dwell, not the stagger.
  const turned = useRef(false);

  // Post-commit, pre-paint. The freshly rendered pair already draws the roll's
  // destination word at translateY(0), which is pixel-identical to the held
  // -50%, so cancelling the filled animation here is invisible. After paint it
  // would snap back for a frame and flash the word the reader just left.
  useLayoutEffect(() => {
    animation.current?.cancel();
    animation.current = null;
  }, [cursor]);

  // A hidden tab throttles timers to once a minute and paints nothing, so a
  // reel left running there spends its words on no one and hands the returning
  // reader a word that changed while they were away. Held, like a hover.
  const [documentHidden, setDocumentHidden] = useState(false);
  useEffect(() => {
    const readVisibility = () =>
      setDocumentHidden(document.visibilityState !== "visible");
    readVisibility();
    document.addEventListener("visibilitychange", readVisibility);
    return () =>
      document.removeEventListener("visibilitychange", readVisibility);
  }, []);

  const held = reduced || ended || paused || documentHidden;

  useEffect(() => {
    if (held) return;

    let timer: ReturnType<typeof setTimeout>;

    const settle = () => {
      turned.current = true;
      setCursor((current) => (current + 1) % words.length);
      timer = setTimeout(roll, dwellMs);
    };

    const roll = () => {
      const track = trackRef.current;
      if (!track) return;

      // No WAAPI (an old browser, or the test environment): the word still
      // changes, it simply does not travel. The teaching survives; only the
      // flourish is lost.
      if (typeof track.animate !== "function") {
        settle();
        return;
      }

      const rolling = track.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(-50%)" }],
        { duration: REEL_MS, easing: REEL_EASING, fill: "forwards" }
      );
      animation.current = rolling;
      // onfinish rather than the `finished` promise: cancel() rejects that
      // promise, and Sentry reports unhandled rejections — leaving the home
      // would file one per reel.
      rolling.onfinish = settle;
    };

    timer = setTimeout(roll, turned.current ? dwellMs : startDelayMs);

    return () => {
      // finish() rather than cancel(), and before the timer is cleared: a roll
      // caught in flight is jumped to its destination, so a hold leaves the
      // reel on a whole word and by the same path as a roll nobody touched.
      // cancel() would rewind it and the reader would watch the outgoing word
      // travel backwards. The settle this fires books one more turn, which the
      // next line then cancels.
      animation.current?.finish();
      clearTimeout(timer);
    };
  }, [held, words, dwellMs, startDelayMs]);

  return {
    trackRef,
    settled: words[cursor],
    incoming: words[(cursor + 1) % words.length],
  };
}
