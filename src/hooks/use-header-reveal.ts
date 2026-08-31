"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import {
  INITIAL_REVEAL_STATE,
  nextRevealState,
} from "@/lib/navigation/headerReveal";

/**
 * The measured height of the masthead's bar, published on the document root.
 *
 * Published rather than declared, because the bar's height is the sum of a
 * logo, a row of 44px targets and the type scale — three things that move
 * independently and none of which is going to remember a hardcoded figure in
 * a second stylesheet. Anything else pinned to the top of the screen reads it
 * to sit *under* the bar instead of behind it.
 *
 * @req REQ-114
 */
export const HEADER_HEIGHT_PROPERTY = "--afh-header-height";

/**
 * Set on `<html>` while the masthead is translated out of view, so a rail
 * pinned below it can travel the same distance at the same moment. A data
 * attribute rather than a prop: the fiche's chapter rail is nowhere near the
 * masthead in the tree, and threading a boolean between them would put the
 * whole chrome in one component's hands.
 *
 * @req REQ-114
 */
export const HEADER_RETRACTED_ATTRIBUTE = "data-header-retracted";

/**
 * Drives the masthead's retraction from the reader's scroll, and publishes
 * both halves of the result to the document root.
 *
 * `barRef` points at the bar proper, not at the `<header>`: the axis panel
 * opens *inside* the header, and measuring the whole element would shove
 * every pinned rail on the page down by the height of an open menu.
 *
 * `held` suspends the retraction without unsubscribing from the scroll. The
 * caller raises it while a menu is open, because the scroll position is not
 * a reliable proxy for the reader's intent: it also moves when a font or an
 * image lands, when a lazy section settles, when a smooth scroll runs out its
 * easing, or when the browser restores a position. Every one of those used to
 * cross the threshold and take an open menu down with it — the reader's click
 * answered by nothing. The run is still measured while held, so releasing the
 * hold leaves the bar wherever the reader's own travel has put it rather than
 * snapping it away.
 *
 * @req REQ-114
 */
export function useHeaderReveal(
  barRef: RefObject<HTMLElement | null>,
  held = false
): boolean {
  const [retracted, setRetracted] = useState(false);
  const stateRef = useRef(INITIAL_REVEAL_STATE);
  // Read inside the scroll listener, which subscribes once: a dependency
  // would tear the listener down and rebuild it on every open and close.
  const heldRef = useRef(held);
  useEffect(() => {
    heldRef.current = held;
  }, [held]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const publishHeight = () => {
      document.documentElement.style.setProperty(
        HEADER_HEIGHT_PROPERTY,
        `${bar.offsetHeight}px`
      );
    };

    publishHeight();
    if (typeof ResizeObserver === "undefined") return;

    const tape = new ResizeObserver(publishHeight);
    tape.observe(bar);
    return () => tape.disconnect();
  }, [barRef]);

  useEffect(() => {
    let previousY = window.scrollY;
    let frame = 0;

    // Scroll fires far faster than the screen repaints, and the decision is
    // only worth taking once per frame.
    const settle = () => {
      frame = 0;
      const y = window.scrollY;
      const next = nextRevealState(stateRef.current, previousY, y);
      previousY = y;
      stateRef.current = next;
      setRetracted(heldRef.current ? false : next.retracted);
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(settle);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute(
      HEADER_RETRACTED_ATTRIBUTE,
      retracted ? "true" : "false"
    );
  }, [retracted]);

  return retracted;
}
