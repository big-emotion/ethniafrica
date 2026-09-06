"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FALLBACK_LOCALE } from "@/lib/locale";
import { getTranslation } from "@/lib/translations";
import type { Language } from "@/types/shared";

interface KeyboardShortcutsModalProps {
  language?: Language;
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

// @req REQ-065
export function KeyboardShortcutsModal({
  language = FALLBACK_LOCALE,
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  const copy = getTranslation(language).chrome.shortcuts;
  const shortcuts: ShortcutRow[] = [
    { keys: ["/"], description: copy.openSearch },
    { keys: ["Ctrl", "K"], description: copy.searchPage },
    { keys: ["g", "p"], description: copy.peoples },
    { keys: ["g", "f"], description: copy.families },
    { keys: ["?"], description: copy.show },
    { keys: ["Esc"], description: copy.closePanel },
  ];
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-3 mt-2">
          {shortcuts.map(({ keys, description }) => (
            <li
              key={keys.join("+")}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-afh-small text-muted-foreground">
                {description}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-afh-caption text-muted-foreground">
                        +
                      </span>
                    )}
                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-afh-caption font-mono font-semibold">
                      {k}
                    </kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
