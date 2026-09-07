/**
 * The interactions the atlas measures.
 *
 * Measured on production 2026-09-07: Plausible held zero goals and the base
 * `/js/script.js`, so the only thing the site knew about a visit was which
 * pages it loaded. "How do we get more interaction" was not a question the
 * instrumentation could answer — the clicks that matter most on this surface
 * (a source consulted, a search that found nothing, a game abandoned in ten
 * seconds) all left no trace.
 *
 * The list is a closed union rather than a free string for one reason: an
 * event name typed twice with two spellings is two goals in the dashboard and
 * neither is complete. Adding an event here is the deliberate act; emitting
 * one is not.
 *
 * Names read `surface:action`. Plausible shows them verbatim in the goals
 * list, so they stay short and mechanical.
 */
// @req REQ-046
export type AnalyticsEvent =
  /** A search was actually run — with how many results it returned. */
  | "search:submit"
  /** A result was opened, which is what separates a useful search from a dead one. */
  | "search:result_click"
  /** A source was consulted: the atlas's own promise, exercised. */
  | "fiche:source_click"
  /** A reader continued to another fiche instead of leaving. */
  | "fiche:related_click"
  /** How far down a fiche the reader actually got. */
  | "fiche:depth"
  | "game:start"
  | "game:complete"
  /** A reader opened the correction dialog — the contribution funnel's first step. */
  | "report:open"
  /** …and completed it. The pair is the funnel; either alone is a number. */
  | "report:submit"
  /** A URL nothing serves, today invisible. */
  | "page:not_found";

/** Plausible accepts only scalars as custom properties. */
export type AnalyticsProps = Record<string, string | number | boolean>;

/**
 * What the Plausible script installs on the page, declared once.
 *
 * It used to be declared inside `components/flags/FlagTarget`, the single
 * component that emitted an event — which is also why that event was named
 * `flag_submitted` while nothing else in the product had a naming convention
 * at all. The ambient type belongs with the helper that owns the contract.
 */
declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: AnalyticsProps; callback?: () => void }
    ) => void;
  }
}

/**
 * Records an interaction, if the visitor allowed it.
 *
 * Three silences are deliberate, and all three are the same rule — analytics
 * observes the page, it never affects it:
 *
 * **No browser, no event.** Called from a server component, this returns.
 *
 * **No consent, no event.** `PlausibleScript` renders nothing until analytics
 * consent is granted, so `window.plausible` is absent for a visitor who
 * refused. Buffering the call in a queue for a script that will never load
 * would retain exactly what the visitor declined to give. The event is dropped.
 *
 * **No throw, ever.** An ad blocker can replace `window.plausible` with a stub
 * that raises. A measurement that breaks the thing it measures is worse than
 * no measurement.
 */
// @req REQ-046
export function trackEvent(
  event: AnalyticsEvent,
  props?: AnalyticsProps
): void {
  if (typeof window === "undefined") return;

  const plausible = window.plausible;
  if (typeof plausible !== "function") return;

  try {
    plausible(event, props ? { props } : undefined);
  } catch {
    // Deliberately swallowed — see the third silence above.
  }
}
