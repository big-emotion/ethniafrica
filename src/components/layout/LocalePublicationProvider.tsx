"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { LocalePublicationMode } from "@/lib/locale";

/**
 * Carries the server-resolved publication state across the client boundary.
 * The conservative default keeps isolated renders and Storybook French-only.
 */
const LocalePublicationContext =
  createContext<LocalePublicationMode>("fr-only");

// @req REQ-140
export function LocalePublicationProvider({
  value,
  children,
}: {
  value: LocalePublicationMode;
  children: ReactNode;
}) {
  return (
    <LocalePublicationContext.Provider value={value}>
      {children}
    </LocalePublicationContext.Provider>
  );
}

// @req REQ-140
export function useLocalePublicationMode(): LocalePublicationMode {
  return useContext(LocalePublicationContext);
}
