"use client";

import { useState } from "react";

import { REEL_MS, type ReelHold, useSlotReel } from "@/hooks/use-slot-reel";
import {
  FALLBACK_SEED_WORDS,
  type SeedKind,
  type SeedWordsByKind,
} from "@/lib/home/seedWords";

/**
 * The example queries under the hero's search field, each a slot reel.
 *
 * The chips exist to state the breadth of the corpus: three entity kinds, side
 * by side, before the reader has typed anything. Reeling the words extends
 * that from three examples to twelve without asking for a second line — and
 * it is safe *here* in a way it would not be in the field's placeholder, which
 * is a control's name and vanishes at the moment of focus. A chip is neither.
 *
 * Phones show one chip for each searchable entity kind. Desktop adds a second
 * people chip because people are the home question and the largest corpus;
 * both people chips reel through the pool supplied by the server, offset by
 * one word. They share a cadence so that offset remains stable and the wider
 * layout never presents the same people example twice.
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
 * - **Motion that starts by itself has to be stoppable** (WCAG 2.2.2), and
 *   there are two ways to stop it because there are two reasons to. Resting a
 *   pointer or a focus ring on the row **pauses** it, and leaving takes it up
 *   again: a word being aimed at must not move, but a pointer merely crossing
 *   the row on its way to the field should not spend the teaching. Reaching
 *   the field itself **ends** it, for as long as the page lives — a reader
 *   composing a query is owed a still row beside what they are typing.
 *
 *   An earlier pass also capped the reel at six turns. That counted turns
 *   since the page loaded rather than turns this reader saw, so a home left
 *   open, or read from the second band down, showed a row already dead. The
 *   reader who has had enough now says so, by hovering or by typing.
 */

/**
 * Re-exported because the reel's timing is what a test of this row has to
 * advance by, and the row is what it renders. The value itself belongs with
 * the hook that spends it.
 */
// @req REQ-002
export { REEL_MS };

export interface SeedPool {
  id: string;
  kind: SeedKind;
  words: string[];
  desktopOnly?: boolean;
  /**
   * Deliberately non-commensurate across the three pools: dwells that share a
   * factor drift back into step after a few turns, and three chips turning
   * together read as one blinking block rather than as three examples.
   */
  dwellMs: number;
  startDelayMs: number;
}

/**
 * The cadence of each reel, which is presentation and belongs here. The words
 * are the corpus' business and arrive as a prop — drawn per request by
 * loadSeedWords, or the curated dozen when the database has nothing to say.
 */
const SEED_CADENCE: {
  id: string;
  kind: SeedKind;
  dwellMs: number;
  startDelayMs: number;
  wordOffset?: number;
  desktopOnly?: boolean;
}[] = [
  { id: "people-primary", kind: "people", dwellMs: 2300, startDelayMs: 600 },
  { id: "country", kind: "country", dwellMs: 2900, startDelayMs: 1400 },
  {
    id: "language-family",
    kind: "languageFamily",
    dwellMs: 3700,
    startDelayMs: 2200,
  },
  {
    id: "people-secondary",
    kind: "people",
    dwellMs: 2300,
    startDelayMs: 600,
    wordOffset: 1,
    desktopOnly: true,
  },
];

/** The desktop breakpoint shared by the project and the approved mockup. */
// @req REQ-002
export const DESKTOP_SEED_BREAKPOINT_PX = 1200;

// @req REQ-002
export function seedPools(words: SeedWordsByKind): SeedPool[] {
  return SEED_CADENCE.map(({ wordOffset = 0, ...cadence }) => {
    const pool = words[cadence.kind];
    const offset = pool.length === 0 ? 0 : wordOffset % pool.length;

    return {
      ...cadence,
      words: [...pool.slice(offset), ...pool.slice(0, offset)],
    };
  });
}

interface SeedChipProps {
  pool: SeedPool;
  hold: ReelHold;
  onPick: (word: string) => void;
}

function SeedChip({ pool, hold, onPick }: SeedChipProps) {
  const { trackRef, settled, incoming } = useSlotReel(pool, hold);

  return (
    <li className={pool.desktopOnly ? "home-hero-seed-desktop" : undefined}>
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
  /**
   * Drawn from the corpus by the server on every request. Defaults to the
   * curated dozen so Storybook and a test can render the row without a
   * database behind it.
   */
  words?: SeedWordsByKind;
}

// @req REQ-002
export function HomeHeroSeeds({
  onPick,
  engaged = false,
  words = FALLBACK_SEED_WORDS,
}: HomeHeroSeedsProps) {
  // React maps onFocus/onBlur to focusin/focusout, which bubble — so a chip
  // taking keyboard focus holds the whole row, and the reader tabbing to a
  // word gets the same still row the reader pointing at one gets.
  const [visiting, setVisiting] = useState(false);
  const hold = { paused: visiting, ended: engaged };
  const pools = seedPools(words);

  return (
    <ul
      className="home-hero-search-seeds"
      aria-label="Exemples de recherche"
      onPointerEnter={() => setVisiting(true)}
      onPointerLeave={() => setVisiting(false)}
      onFocus={() => setVisiting(true)}
      onBlur={() => setVisiting(false)}
    >
      {pools.map((pool) => (
        <SeedChip key={pool.id} pool={pool} hold={hold} onPick={onPick} />
      ))}

      <style>{`
        /* The compact composition teaches the three searchable kinds without
           wrapping. The approved desktop composition spends its extra room
           on a second corpus-provided people example. Hiding it also
           removes that extra control from the mobile accessibility tree. */
        .home-hero-seed-desktop {
          display: none;
        }

        @media (min-width: ${DESKTOP_SEED_BREAKPOINT_PX}px) {
          .home-hero-seed-desktop {
            display: list-item;
          }
        }

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
