import * as React from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Wraps the `prefers-reduced-motion` media query as a hook (ARCH-014):
 * existing components (DottedContinent, ScalePanel, ...) read
 * `window.matchMedia` directly and once at mount; this hook additionally
 * reacts if the user's OS preference changes while the page is open, which
 * the globe needs since it keeps a live render loop rather than drawing a
 * single canvas frame.
 */
// @req REQ-112
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia(REDUCED_MOTION_QUERY).matches
  );

  React.useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
