import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { trackEvent } from "@/lib/analytics/trackEvent";

/**
 * What the interaction layer owes the page it is measuring.
 *
 * Measured on production 2026-09-07: Plausible carried zero configured goals
 * and the base `/js/script.js`, so no click, no search and no game round was
 * ever recorded. Adding events is easy; the part that has to be provable is
 * that adding them cannot break a page or outlive a withdrawn consent.
 */

/**
 * Reached through a local cast rather than a `declare global`: widening the
 * real `Window` here would apply to every suite in the run, and the flags
 * suite already assigns its own differently-shaped stub to this property.
 */
const analyticsWindow = window as unknown as {
  plausible?: (event: string, options?: unknown) => void;
};

beforeEach(() => {
  delete analyticsWindow.plausible;
  vi.restoreAllMocks();
});

afterEach(() => {
  delete analyticsWindow.plausible;
});

describe("trackEvent", () => {
  // @req REQ-046
  it("sends the event name and its props to Plausible", () => {
    const plausible = vi.fn();
    analyticsWindow.plausible = plausible;

    trackEvent("search:submit", { surface: "atlas", results: 12 });

    expect(plausible).toHaveBeenCalledWith("search:submit", {
      props: { surface: "atlas", results: 12 },
    });
  });

  // @req REQ-046
  it("sends an event that carries no props", () => {
    const plausible = vi.fn();
    analyticsWindow.plausible = plausible;

    trackEvent("report:open");

    expect(plausible).toHaveBeenCalledWith("report:open", undefined);
  });

  /**
   * `PlausibleScript` returns null until analytics consent is granted, so
   * `window.plausible` is absent for a visitor who refused. Queuing the call
   * for a script that will never load would retain what the visitor declined
   * to give — the drop is the consent being honoured, not a bug.
   */
  // @req REQ-046
  it("drops the event when consent has not loaded the script", () => {
    expect(() => trackEvent("game:start", { game: "mercator" })).not.toThrow();
    expect(analyticsWindow.plausible).toBeUndefined();
  });

  // @req REQ-046
  it("never lets an analytics failure reach the page", () => {
    analyticsWindow.plausible = vi.fn(() => {
      throw new Error("blocked by an extension");
    });

    expect(() => trackEvent("fiche:source_click")).not.toThrow();
  });
});
