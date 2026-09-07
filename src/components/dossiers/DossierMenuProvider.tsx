"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { DossierMenuEntry } from "@/lib/dossiers/menu";

/**
 * Carries the dossier corpus across the client boundary, for the menu only.
 *
 * The same shape of problem `ModuleAvailabilityProvider` solves, for the same
 * reason: the header is a client component under a client `PageLayout`, and the
 * corpus is read off disk. A context set once in the `[lang]` layout — the one
 * server component every page already renders beneath — is the cheapest way
 * down.
 *
 * An empty array is a legitimate value and means the corpus holds no dossier;
 * the menu then shows the axis's own surfaces and no rubric, which is honest.
 */
const DossierMenuContext = createContext<DossierMenuEntry[]>([]);

// @req REQ-120
export function DossierMenuProvider({
  value,
  children,
}: {
  value: DossierMenuEntry[];
  children: ReactNode;
}) {
  return (
    <DossierMenuContext.Provider value={value}>
      {children}
    </DossierMenuContext.Provider>
  );
}

// @req REQ-120
export function useDossierMenu(): DossierMenuEntry[] {
  return useContext(DossierMenuContext);
}
