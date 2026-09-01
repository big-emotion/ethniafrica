"use client";

import { useEffect, useState } from "react";

import { useSlotReel } from "@/hooks/use-slot-reel";

/**
 * The rotating half of the home's headline: the class the question is about.
 *
 * The band used to name one class — "Qui sont les peuples d'Afrique ?" — above
 * a corpus that holds five and a search that resolves six. Turning the class
 * is how the headline stops being narrower than the thing it introduces.
 *
 * It borrows the seed chips' reel wholesale (`useSlotReel`), and differs from
 * them in three ways, each forced by the element it sits in:
 *
 * - **A heading's name is a landmark.** The chips publish their settled word
 *   as an accessible name; a heading whose name changed every three seconds
 *   would be a landmark that moves. So the whole reel is `aria-hidden` and the
 *   h1 carries one fixed `aria-label` naming all five classes.
 * - **The h1 is `text-wrap: balance`.** Balancing re-breaks the entire headline
 *   whenever its content changes width, so a narrower segment would re-flow the
 *   lines above it. The ghost below fixes the width at the longest segment from
 *   the first paint, which is what makes the turn invisible to the layout.
 * - **A heading cannot be hovered by a keyboard.** The chips can be paused by
 *   focus because they are buttons; this is not focusable, so the stop that has
 *   to work for everyone is the one that fires when the reader reaches the
 *   search field. Hovering still pauses, for the pointer reader aiming at a word.
 */

/**
 * Slower than any chip's dwell (2300–3700 ms). The headline is read once, in
 * full, before the eye moves down to the field; a class that changed at chip
 * speed would be read as flicker rather than as a list.
 */
// @req REQ-115
export const HEADLINE_DWELL_MS = 4000;

/**
 * Long enough that the headline is still on its first class when the page
 * settles. A title already turning at first paint reads as an advertisement,
 * and the reader never sees which class the band opened on.
 */
// @req REQ-115
export const HEADLINE_START_DELAY_MS = 2000;

// @req REQ-115
export interface HomeHeadlineReelProps {
  /** One entry per corpus class, figure included when the server could count it. */
  segments: string[];
}

// @req REQ-115
export function HomeHeadlineReel({ segments }: HomeHeadlineReelProps) {
  const [visiting, setVisiting] = useState(false);
  const [engaged, setEngaged] = useState(false);

  // Listened for on the document rather than lifted into a shared client
  // parent: the field lives inside HomeHeroSearch, three components away, and
  // hoisting the state to reach it would turn the whole hero copy block —
  // headline and answer included — into a client component to carry one
  // boolean. `role="search"` is the form's own semantics, not a hook added for
  // this.
  useEffect(() => {
    const stopWhenSearchIsReached = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (target?.closest?.('[role="search"]')) setEngaged(true);
    };

    document.addEventListener("focusin", stopWhenSearchIsReached);
    return () =>
      document.removeEventListener("focusin", stopWhenSearchIsReached);
  }, []);

  const { trackRef, settled, incoming } = useSlotReel(
    {
      words: segments,
      dwellMs: HEADLINE_DWELL_MS,
      startDelayMs: HEADLINE_START_DELAY_MS,
    },
    { paused: visiting, ended: engaged }
  );

  return (
    <span
      className="home-hero-headline-reel"
      aria-hidden="true"
      onPointerEnter={() => setVisiting(true)}
      onPointerLeave={() => setVisiting(false)}
    >
      <span className="home-hero-headline-sizer" data-reel-sizer>
        {segments.map((segment) => (
          <span key={segment}>{segment}</span>
        ))}
      </span>
      <span className="home-hero-headline-track" ref={trackRef}>
        <span data-reel-current>{settled}</span>
        <span>{incoming}</span>
      </span>

      <style>{`
        /* The mask is taller than the h1's 1.04 line box on purpose: at that
           height the descenders of "peuples", "pays" and "langues" are cut off
           by the overflow. The negative block margins hand the extra height
           straight back, so the margin box still measures 1.04em and a wrapped
           headline keeps its leading. */
        .home-hero-headline-reel {
          position: relative;
          display: inline-block;
          overflow: hidden;
          height: 1.3em;
          margin-block: -0.13em;
          line-height: 1.3;
          vertical-align: bottom;
        }

        /* Zero height, full width: the headline takes the measure of its
           longest segment at first paint, so no turn ever re-breaks the lines
           above it. */
        .home-hero-headline-sizer {
          display: block;
          height: 0;
          overflow: hidden;
          visibility: hidden;
        }
        .home-hero-headline-sizer > span {
          display: block;
          white-space: nowrap;
        }

        /* No bottom edge, so the track is two line-heights tall rather than
           one: pinned to all four sides it would be clamped to the mask, the
           flex children would shrink to half a line each — both segments
           legible at once — and translateY(-50%) would travel half a segment. */
        .home-hero-headline-track {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          flex-direction: column;
        }
        .home-hero-headline-track > span {
          display: block;
          flex: 0 0 auto;
          height: 1.3em;
          white-space: nowrap;
        }
      `}</style>
    </span>
  );
}

export default HomeHeadlineReel;
