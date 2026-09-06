"use client";

import type { Language } from "@/types/shared";
import { useModuleAvailability } from "@/components/hubs/ModuleAvailabilityProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import {
  getFicheDossiers,
  type FicheDossierContext,
} from "@/lib/dossiers/catalog";

// @req REQ-114
export function DossierLinks({
  language = "fr",
  ...context
}: FicheDossierContext & { language?: Language }) {
  const label = language === "en" ? "Explore further" : "Pour approfondir";
  const dossiers = getFicheDossiers(context, useModuleAvailability(), language);
  if (dossiers.length === 0) return null;
  return (
    <aside
      aria-label={label}
      className="mt-4 border-t border-[var(--afh-border)] pt-4"
    >
      <p className="text-afh-caption text-[color:var(--afh-text-soft)]">
        {label}
      </p>
      {dossiers.map((dossier) => (
        <ActionLink key={dossier.id} href={dossier.href}>
          {dossier.title}
        </ActionLink>
      ))}
    </aside>
  );
}
