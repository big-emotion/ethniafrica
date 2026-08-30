import { act, fireEvent, render, screen } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackToTop } from "@/components/layout/BackToTop";

/**
 * Frames the component has asked for and not yet been given. Held rather than
 * run on the spot: the handler stores the id it gets back and clears it from
 * inside the callback, so a stub that calls straight through leaves an id
 * behind that the handler reads as "a frame is already pending" — and every
 * scroll after the first is dropped, in the test only.
 */
let pendingFrames: FrameRequestCallback[] = [];

/**
 * The control is only ever exercised through the page: a reader scrolls, the
 * button appears, they press it, the page goes back to the top and their
 * focus goes with it. Every test here drives it that way.
 */
function scrollTo(y: number) {
  window.scrollY = y;
  fireEvent.scroll(window);

  const due = pendingFrames;
  pendingFrames = [];
  act(() => {
    for (const frame of due) frame(0);
  });
}

/** The masthead the control returns the reader to, as PageLayout renders it. */
function mountMasthead(): RefObject<HTMLElement | null> {
  const masthead = document.createElement("header");
  masthead.tabIndex = -1;
  document.body.prepend(masthead);
  return { current: masthead };
}

const button = () =>
  screen.getByRole("button", { name: "Revenir en haut de la page" });

beforeEach(() => {
  window.innerHeight = 800;
  window.scrollY = 0;
  // happy-dom leaves scrollTo unimplemented, and the assertions here are
  // about what the control asks the page to do, not about the page moving.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  pendingFrames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pendingFrames.push(callback);
    return pendingFrames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.querySelector("body > header")?.remove();
});

describe("BackToTop", () => {
  // @req REQ-114
  it("stays out of the way while the first screenful is still in view", () => {
    render(<BackToTop />);

    expect(button()).not.toHaveAttribute("data-offered");
  });

  // @req REQ-114
  it("offers itself once a screenful is behind the reader", () => {
    render(<BackToTop />);

    scrollTo(1200);

    expect(button()).toHaveAttribute("data-offered");
  });

  // @req REQ-114
  it("withdraws again when the reader comes back up", () => {
    render(<BackToTop />);

    scrollTo(1200);
    scrollTo(100);

    expect(button()).not.toHaveAttribute("data-offered");
  });

  // @req REQ-114
  it("offers itself on a page restored mid-document, with no scroll to hear", () => {
    window.scrollY = 2400;

    render(<BackToTop />);

    expect(button()).toHaveAttribute("data-offered");
  });

  // @req REQ-114
  it("takes the reader back to the top", () => {
    render(<BackToTop />);

    fireEvent.click(button());

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  // @req REQ-114
  it("takes the focus back with the page, not just the view", () => {
    const masthead = mountMasthead();
    render(<BackToTop returnFocusTo={masthead} />);

    fireEvent.click(button());

    expect(document.activeElement).toBe(masthead.current);
  });

  // @req REQ-114
  it("jumps rather than glides for a reader who asked for less motion", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
    } as MediaQueryList);
    render(<BackToTop />);

    fireEvent.click(button());

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });
});
