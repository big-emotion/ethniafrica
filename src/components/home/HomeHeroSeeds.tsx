"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { SearchEntityType } from "@/types/afrik-frontend";

/**
 * The three example queries under the hero's search field, each a slot reel.
 *
 * The chips exist to state the breadth of the corpus: three entity kinds, side
 * by side, before the reader has typed anything. Reeling the words extends
 * that from three examples to twelve without asking for a second line — and
 * it is safe *here* in a way it would not be in the field's placeholder, which
 * is a control's name and vanishes at the moment of focus. A chip is neither.
 *
 * What that costs, and what is paid for it:
 *
 * - **The label is the payload.** A click has to search the settled word, so
 *   the query is read from state, never from the two words the track holds
 *   mid-roll.
 * - **The label is also the accessible name.** `overflow: hidden` does not
 *   remove text from name computation, so a rolling chip would be called
 *   "Yoruba Kongo" for 320 ms and voice control would lose its target. The
 *   reel is therefore `aria-hidden` and the name comes from a visually hidden
 *   span that only changes once a roll has settled.
 * - **A wider word would move the neighbours.** The mask sizes to its content,
 *   so each chip carries a zero-height ghost of its whole pool and takes the
 *   width of the longest word from the first paint.
 * - **Motion that starts by itself has to be stoppable** (WCAG 2.2.2). It
 *   stops for good at the first sign of the reader — hover, focus, or a
 *   keystroke in the field — and in any case after a bounded number of turns.
 */

/** Mirrors --afh-duration-slow. WAAPI cannot read a CSS custom property. */
// @req REQ-002
export const REEL_MS = 320;
/** Mirrors --afh-ease-out. */
const REEL_EASING = "cubic-bezier(0, 0, 0.2, 1)";
/** Read twice, a ticker stops teaching and starts interrupting. */
// @req REQ-002
export const MAX_CYCLES = 6;

export interface SeedPool {
  kind: SearchEntityType;
  words: string[];
  /**
   * Deliberately non-commensurate across the three pools: dwells that share a
   * factor drift back into step after a few turns, and three chips turning
   * together read as one blinking block rather than as three examples.
   */
  dwellMs: number;
  startDelayMs: number;
}

/**
 * An editorial selection, not a query of the corpus — but asserted against it
 * by homeHeroSeedsCorpus.test.ts, because a first pass of this list held four
 * words the fiches do not carry under those spellings.
 */
// @req REQ-002
export const SEED_POOLS: SeedPool[] = [
  {
    kind: "people",
    words: ["Yoruba", "Bété", "Himba", "Zoulou"],
    dwellMs: 2300,
    startDelayMs: 600,
  },
  {
    kind: "country",
    words: ["Cameroun", "Bénin", "Namibie", "Éthiopie"],
    dwellMs: 2900,
    startDelayMs: 1400,
  },
  {
    kind: "languageFamily",
    words: ["Bantou", "Afro-asiatique", "Mandé", "Nilotique"],
    dwellMs: 3700,
    startDelayMs: 2200,
  },
];

function useSlotReel(pool: SeedPool, engaged: boolean) {
  const { words, dwellMs, startDelayMs } = pool;
  const trackRef = useRef<HTMLSpanElement>(null);
  const [cursor, setCursor] = useState(0);
  const reduced = usePrefersReducedMotion();

  const stopped = useRef(false);
  const cycles = useRef(0);
  const animation = useRef<Animation | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Post-commit, pre-paint. The freshly rendered pair already draws the roll's
  // destination word at translateY(0), which is pixel-identical to the held
  // -50%, so cancelling the filled animation here is invisible. After paint it
  // would snap back for a frame and flash the word the reader just left.
  useLayoutEffect(() => {
    animation.current?.cancel();
    animation.current = null;
  }, [cursor]);

  useEffect(() => {
    if (reduced) return;

    const settle = () => {
      setCursor((current) => (current + 1) % words.length);
      cycles.current += 1;
      if (cycles.current >= MAX_CYCLES) {
        stopped.current = true;
        return;
      }
      timer.current = setTimeout(roll, dwellMs);
    };

    const roll = () => {
      const track = trackRef.current;
      if (!track || stopped.current) return;
      if (document.visibilityState !== "visible") return;

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

    const onVisibility = () => {
      if (stopped.current) return;
      if (document.visibilityState === "visible") {
        timer.current = setTimeout(roll, dwellMs);
      } else {
        clearTimeout(timer.current);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    timer.current = setTimeout(roll, startDelayMs);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timer.current);
      animation.current?.cancel();
    };
  }, [reduced, words, dwellMs, startDelayMs]);

  // Engagement stops the reel for good, and settles it on a whole word:
  // finish() jumps to the animation's end state, so an interrupted roll leaves
  // through the same path as one that was never touched. cancel() would rewind
  // it and the reader would watch the outgoing word scroll backwards.
  useEffect(() => {
    if (!engaged) return;
    stopped.current = true;
    clearTimeout(timer.current);
    animation.current?.finish();
  }, [engaged]);

  return {
    trackRef,
    settled: words[cursor],
    incoming: words[(cursor + 1) % words.length],
  };
}

interface SeedChipProps {
  pool: SeedPool;
  engaged: boolean;
  onPick: (word: string) => void;
}

function SeedChip({ pool, engaged, onPick }: SeedChipProps) {
  const { trackRef, settled, incoming } = useSlotReel(pool, engaged);

  return (
    <li>
      <button type="button" onClick={() => onPick(settled)}>
        <span className="sr-only">{settled}</span>
        <span className="home-hero-seed-reel" aria-hidden="true">
          <span
            className="home-hero-seed-sizer"
            data-reel-sizer
            aria-hidden="true"
          >
            {pool.words.map((word) => (
              <span key={word}>{word}</span>
            ))}
          </span>
          <span className="home-hero-seed-track" ref={trackRef}>
            <span data-reel-current>{settled}</span>
            <span>{incoming}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

export interface HomeHeroSeedsProps {
  onPick: (word: string) => void;
  /** Raised by the field as soon as the reader types, alongside hover and focus. */
  engaged?: boolean;
}

// @req REQ-002
export function HomeHeroSeeds({ onPick, engaged = false }: HomeHeroSeedsProps) {
  const [touched, setTouched] = useState(false);
  const stop = () => setTouched(true);

  return (
    <ul
      className="home-hero-search-seeds"
      aria-label="Exemples de recherche"
      onPointerEnter={stop}
      onFocus={stop}
    >
      {SEED_POOLS.map((pool) => (
        <SeedChip
          key={pool.kind}
          pool={pool}
          engaged={engaged || touched}
          onPick={onPick}
        />
      ))}

      <style>{`
        /* The mask. An opaque ground is not decoration here: a running
           transform promotes the element to its own compositor layer, and a
           transparent layer loses subpixel antialiasing — the word would thin
           at the start of every roll and thicken at the end. */
        .home-hero-seed-reel {
          position: relative;
          display: inline-block;
          overflow: hidden;
          height: 1.4em;
          line-height: 1.4;
          vertical-align: bottom;
        }

        /* Zero height, full width: the chip takes the measure of the longest
           word in its pool at first paint, so no roll ever reflows the row. */
        .home-hero-seed-sizer {
          display: block;
          height: 0;
          overflow: hidden;
          visibility: hidden;
        }
        .home-hero-seed-sizer > span {
          display: block;
        }

        /* No bottom edge, so the track is two line-heights tall rather than
           one: pinned to all four sides it would be clamped to the mask, the
           flex children would shrink to half a line each — both words legible
           at once — and translateY(-50%) would travel half a word. */
        .home-hero-seed-track {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
        }
        .home-hero-seed-track > span {
          display: block;
          flex: 0 0 auto;
          height: 1.4em;
        }
      `}</style>
    </ul>
  );
}
