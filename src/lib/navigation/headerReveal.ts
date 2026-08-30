/**
 * When the masthead gives way and when it comes back.
 *
 * The bar used to scroll off the top of the document and stay gone: on a
 * fiche two thousand pixels long the reader had no way back to the nav short
 * of scrolling all the way up. Pinning it instead would cost a sixth of a
 * 430px screen on every page. The resolution both sites that solved this use
 * — grande-chancellerie.ci among them — is to let the bar retract while the
 * reader moves *into* the document and return the moment they move back out
 * of it, which is also the moment they are looking for a way out.
 *
 * The decision is a pure function of the scroll positions so it can be
 * reasoned about and tested without a viewport; `use-header-reveal.ts` is the
 * adapter that feeds it scroll events and paints the result.
 */

/**
 * How far the reader must be into the document before the bar may retract at
 * all. Above it the page has barely moved, and a masthead that flicks away on
 * the first notch of the wheel reads as a glitch rather than as room being
 * made — which is also why coming back above this line always restores it,
 * whatever direction the reader was travelling in.
 *
 * @req REQ-114
 */
export const RETRACT_BELOW_PX = 140;

/**
 * How far the reader must travel one way before the bar changes its mind.
 * Trackpads and inertial phone scrolls both emit single-pixel reversals; with
 * no slack the bar blinks on every one of them.
 *
 * @req REQ-114
 */
export const DIRECTION_TOLERANCE_PX = 8;

export interface RevealState {
  /** Whether the masthead is currently translated out of the viewport. */
  retracted: boolean;
  /**
   * Distance covered since the reader last reversed, signed: positive going
   * down the document, negative coming back up. This is what the tolerance is
   * measured against, so a reversal has to be *sustained* to count.
   */
  travelled: number;
}

/** The bar as a page opens: in place, with no run behind it. @req REQ-114 */
export const INITIAL_REVEAL_STATE: RevealState = {
  retracted: false,
  travelled: 0,
};

/**
 * The bar's state after a scroll from `previousY` to `y`.
 *
 * Note the ordering: the floor is checked before the tolerance, so a reader
 * who lands back at the top of the document finds the masthead there even if
 * they arrived travelling downwards — a jump to an anchor near the top, say.
 *
 * @req REQ-114
 */
export function nextRevealState(
  state: RevealState,
  previousY: number,
  y: number
): RevealState {
  const step = y - previousY;

  if (y <= RETRACT_BELOW_PX) {
    return { retracted: false, travelled: 0 };
  }

  if (step === 0) return state;

  // A reversal starts the run over rather than eating into it, so the
  // tolerance measures the new direction and not the balance of the old one.
  const travelled =
    Math.sign(state.travelled) === Math.sign(step)
      ? state.travelled + step
      : step;

  if (travelled > DIRECTION_TOLERANCE_PX) {
    return { retracted: true, travelled };
  }
  if (travelled < -DIRECTION_TOLERANCE_PX) {
    return { retracted: false, travelled };
  }
  return { ...state, travelled };
}
