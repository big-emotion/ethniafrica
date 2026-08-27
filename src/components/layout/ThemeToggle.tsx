"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * The reader's choice between the parchment surface and the night one,
 * available from every route's nav (REQ-115).
 *
 * The label names the destination, not the current state: a control that
 * reads "Nuit" while the page is light is unambiguous about what pressing
 * it does, where a control labelled with the state it is already in is not.
 */
// @req REQ-115
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // The server cannot know which surface this reader picked, but by the
  // time React hydrates, next-themes' blocking script already has — so
  // reading resolvedTheme on the first client render produces a button
  // where the server sent a placeholder, and hydration fails. Holding the
  // placeholder for one render is what keeps the two markups identical.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  if (!hydrated || !resolvedTheme) {
    return (
      <span
        data-testid="theme-toggle-placeholder"
        aria-hidden="true"
        className="inline-block h-11 w-11 shrink-0"
      />
    );
  }

  const isNight = resolvedTheme === "dark";
  const Icon = isNight ? Sun : Moon;

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      onClick={() => setTheme(isNight ? "light" : "dark")}
      aria-label={isNight ? "Passer en mode parchemin" : "Passer en mode nuit"}
      title={isNight ? "Mode parchemin" : "Mode nuit"}
      // The 44px box is the hit area; the 30px disc inside it is what the
      // header actually draws, so this control matches the search button
      // beside it instead of standing a third taller than the bar.
      className="sh-icon inline-grid min-h-11 min-w-11 shrink-0 place-items-center border-0 bg-transparent"
    >
      <span className="sh-icon-circle">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

export default ThemeToggle;
