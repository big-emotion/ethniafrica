"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type DirectoryEntityType = "people" | "country" | "language-family";

/**
 * Accent scope per directory (Charter §3.2, §7 · ETNI-801 · FR106) — one
 * accent per directory, distinct from FicheSequence.ACCENT_CLASS_BY_ENTITY:
 * fiches reserve terre for IdentityPanel's colonial-marker accent, but a
 * directory has no such marker, so peoples takes terre here instead.
 */
export const DIRECTORY_ACCENT_CLASS: Record<DirectoryEntityType, string> = {
  people: "afh-accent-terre",
  country: "afh-accent-ocre",
  "language-family": "afh-accent-teal",
};

interface DirectoryHeroProps {
  entityType: DirectoryEntityType;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Directory page root (ETNI-801 · FR106): scopes --accent/--accent-tint to
 * the entity's hue for every descendant (cards, pills, alphabet rail) and
 * renders the page's sole Display-scale H1.
 */
export function DirectoryHero({
  entityType,
  title,
  children,
  className,
}: DirectoryHeroProps) {
  return (
    <div
      data-testid="directory-root"
      data-entity={entityType}
      className={cn(DIRECTORY_ACCENT_CLASS[entityType], className)}
    >
      <h1 className="text-[clamp(48px,13vw,96px)] font-display font-bold leading-[1.02] text-afh-text">
        {title}
      </h1>
      {children}
    </div>
  );
}
