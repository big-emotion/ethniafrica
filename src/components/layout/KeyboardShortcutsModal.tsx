"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ["/"], description: "Ouvrir la recherche" },
  {
    keys: ["Ctrl", "K"],
    description: "Aller à la page recherche (⌘K sur Mac)",
  },
  { keys: ["g", "p"], description: "Aller aux peuples" },
  { keys: ["g", "f"], description: "Aller aux familles linguistiques" },
  { keys: ["?"], description: "Afficher les raccourcis clavier" },
  { keys: ["Esc"], description: "Fermer le panneau ouvert" },
];

export function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
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
          <DialogTitle>Raccourcis clavier</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-3 mt-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <li
              key={keys.join("+")}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm text-muted-foreground">
                {description}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-xs text-muted-foreground">+</span>
                    )}
                    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-xs font-mono font-semibold">
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
