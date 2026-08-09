"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface RecordPanelProps {
  children: ReactNode;
  className?: string;
}

const SUMMARY_LABEL = "Lire le dossier complet";

/**
 * The Record (Epic 15 · Story 15.8 · FR97) — a native `<details>` reading
 * gate wrapping an existing entity detail view. The wrapped view is always
 * rendered unconditionally into the DOM (crawlable, works without JS); only
 * its *visibility* is gated by the browser's native disclosure behaviour.
 * A deep link into the wrapped content auto-opens the gate as a progressive
 * enhancement — JS-disabled visitors still reach the content via the
 * summary itself.
 */
// @req REQ-091
export function RecordPanel({ children, className }: RecordPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIfHashTargetsContent = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      const target = document.getElementById(hash);
      if (target && contentRef.current?.contains(target)) {
        setOpen(true);
      }
    };

    openIfHashTargetsContent();
    window.addEventListener("hashchange", openIfHashTargetsContent);
    return () =>
      window.removeEventListener("hashchange", openIfHashTargetsContent);
  }, []);

  return (
    <details
      className={cn("reading-gate", className)}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer">{SUMMARY_LABEL}</summary>
      <div ref={contentRef}>{children}</div>
    </details>
  );
}
