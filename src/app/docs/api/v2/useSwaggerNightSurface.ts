"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * The class Swagger's own bundled dark theme is gated behind. Nothing else in
 * this app writes it, and no `*.css` we own reads it — it belongs to
 * `swagger-ui.css`, which ships 180 rules under `html.dark-mode`.
 * @req REQ-115
 */
export const SWAGGER_NIGHT_CLASS = "dark-mode";

/**
 * Puts the API explorer on the reader's chosen surface.
 *
 * `swagger-ui.css` is a light theme with its inks hardcoded (#3b4151 on the
 * body copy, the section titles and the model tree). Dropped on the night
 * ground it stays dark-on-dark, which is how the page shipped unreadable.
 * Rather than chase fifty vendor selectors we did not write, this mirrors the
 * reader's surface onto the class the vendor's own dark theme already listens
 * for; `swagger-night.css` then only has to re-tint that theme's cold slate to
 * the atlas night.
 *
 * The class is written on `<html>`, outside this route's subtree, so it has to
 * be removed on unmount — otherwise it outlives the page and repaints every
 * later route the reader navigates to.
 * @req REQ-115
 */
export function useSwaggerNightSurface(): void {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme !== "dark") {
      root.classList.remove(SWAGGER_NIGHT_CLASS);
      return;
    }

    root.classList.add(SWAGGER_NIGHT_CLASS);
    return () => root.classList.remove(SWAGGER_NIGHT_CLASS);
  }, [resolvedTheme]);
}
