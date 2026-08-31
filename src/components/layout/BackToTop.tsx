"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";

/**
 * The way back out of a long document.
 *
 * The masthead now returns when the reader scrolls up, which answers "where
 * is the nav"; it does not answer "take me back to the start of this fiche",
 * which on a country page is several thousand pixels of scrolling. This is
 * that control, and it is deliberately the only floating one on the page.
 */

/**
 * How far down the control becomes worth offering, in screenfuls. One screen
 * is the point at which the top of the page has left the reader's memory of
 * where they are; below it, a flick of the wheel does the same job.
 *
 * @req REQ-114
 */
export const OFFER_AFTER_SCREENS = 1;

export interface BackToTopProps {
  /**
   * Where the reader's focus goes when the page does — the masthead of the
   * shell this control belongs to. Scrolling alone would leave a keyboard
   * reader at the foot of the document, still tabbing through the footer.
   *
   * A ref rather than a document lookup by id: a route that streams renders
   * its shell two or three times, once live and once per Suspense template
   * left `hidden` in the body. An id would be ambiguous in the markup and
   * would resolve, in document order, to one of the inert copies.
   */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

// @req REQ-114
export function BackToTop({ returnFocusTo }: BackToTopProps = {}) {
  const [offered, setOffered] = useState(false);

  useEffect(() => {
    let frame = 0;

    const settle = () => {
      frame = 0;
      setOffered(window.scrollY > window.innerHeight * OFFER_AFTER_SCREENS);
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(settle);
    };

    // A restored scroll position — a reload, or the back button — puts the
    // reader mid-document without ever firing a scroll event.
    settle();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  const returnToTop = () => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;

    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });

    // `preventScroll`, because focusing the masthead would otherwise jump the
    // page there instantly and cancel the animation the reader was shown.
    returnFocusTo?.current?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      className="afh-back-to-top"
      data-testid="back-to-top"
      data-offered={offered ? "" : undefined}
      aria-label="Revenir en haut de la page"
      onClick={returnToTop}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  );
}

export default BackToTop;
