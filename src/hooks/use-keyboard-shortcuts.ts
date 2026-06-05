"use client";

import { useEffect, useRef } from "react";

interface UseKeyboardShortcutsOptions {
  navigate: (path: string) => void;
  openSearch: () => void;
  openShortcutsModal: () => void;
  searchRoute: string;
  peoplesRoute?: string;
  familiesRoute?: string;
}

const CHORD_TIMEOUT_MS = 1000;

export function useKeyboardShortcuts({
  navigate,
  openSearch,
  openShortcutsModal,
  searchRoute,
  peoplesRoute,
  familiesRoute,
}: UseKeyboardShortcutsOptions) {
  // Track pending chord prefix ('g' key for g-p / g-f combos)
  const pendingChord = useRef<string | null>(null);
  const chordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearChord = () => {
      pendingChord.current = null;
      if (chordTimer.current) {
        clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const inInput =
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.isContentEditable;

      // ⌘K / Ctrl+K → global search page
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        navigate(searchRoute);
        clearChord();
        return;
      }

      // Skip remaining shortcuts when typing in a field
      if (inInput) return;

      // Chord: g → p (peoples) or g → f (families)
      if (pendingChord.current === "g") {
        if (e.key === "p" && peoplesRoute) {
          e.preventDefault();
          navigate(peoplesRoute);
          clearChord();
          return;
        }
        if (e.key === "f" && familiesRoute) {
          e.preventDefault();
          navigate(familiesRoute);
          clearChord();
          return;
        }
        // Unrecognised chord completion — clear
        clearChord();
      }

      // Start chord on 'g'
      if (e.key === "g") {
        pendingChord.current = "g";
        chordTimer.current = setTimeout(clearChord, CHORD_TIMEOUT_MS);
        return;
      }

      // / → open search
      if (e.key === "/") {
        e.preventDefault();
        openSearch();
        return;
      }

      // ? → keyboard shortcuts modal
      if (e.key === "?") {
        e.preventDefault();
        openShortcutsModal();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearChord();
    };
  }, [
    navigate,
    openSearch,
    openShortcutsModal,
    searchRoute,
    peoplesRoute,
    familiesRoute,
  ]);
}
