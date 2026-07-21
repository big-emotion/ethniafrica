"use client";

import { useEffect, useRef } from "react";

interface UseSheetHistoryOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function useSheetHistory({
  open,
  onOpenChange,
}: UseSheetHistoryOptions) {
  const scrollY = useRef(0);
  const didPushState = useRef(false);

  // Capture scroll when sheet opens; push a history entry
  useEffect(() => {
    if (open) {
      scrollY.current = window.scrollY;
      window.history.pushState({ sheetOpen: true }, "");
      didPushState.current = true;
    } else if (didPushState.current) {
      // Restore scroll after Radix applies body lock
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollY.current,
          behavior: "instant" as ScrollBehavior,
        });
      });
      didPushState.current = false;
    }
  }, [open]);

  // Intercept browser back button while sheet is open
  useEffect(() => {
    const handlePopState = () => {
      if (open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [open, onOpenChange]);
}
