"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ModuleAvailabilityMap } from "@/lib/hubs/moduleOffer";

/**
 * Carries the server-resolved module availability across the client boundary.
 *
 * The hub and the home are server components and simply await
 * `getHubModules`. The header cannot: it is a client component, and so is the
 * `PageLayout` above it, so the only ways down were a prop threaded through
 * `PageLayout`'s fifteen-odd callers or a client fetch that would flash a
 * wrong menu before correcting itself. A context set once in the `[lang]`
 * layout — the one server component every page under `/fr` already renders
 * beneath — costs neither.
 *
 * `null` is a real value and means *no probe result reached this surface*,
 * which is where Storybook and most unit tests sit. It is deliberately not
 * conflated with an empty map: an empty map would be the server saying every
 * module came back empty. `isModuleOffered` handles the distinction.
 */
const ModuleAvailabilityContext = createContext<ModuleAvailabilityMap | null>(
  null
);

// @req REQ-106
export function ModuleAvailabilityProvider({
  value,
  children,
}: {
  value: ModuleAvailabilityMap | null;
  children: ReactNode;
}) {
  return (
    <ModuleAvailabilityContext.Provider value={value}>
      {children}
    </ModuleAvailabilityContext.Provider>
  );
}

// @req REQ-106
export function useModuleAvailability(): ModuleAvailabilityMap | null {
  return useContext(ModuleAvailabilityContext);
}
