/**
 * MigrationsAtlasView — the "Carte" panel shell for `/fr/migrations`
 * (Epic 12, Story 12.8, ETNI-521). Renders a static placeholder; the actual
 * interactive map ships in Story 12.9.
 */

import { translations } from "@/lib/translations";

const t = translations.fr.migrations;

export interface MigrationsAtlasViewProps {
  className?: string;
}

// @req FR81
export function MigrationsAtlasView({ className }: MigrationsAtlasViewProps) {
  return (
    <div
      className={`rounded-md border border-dashed border-border bg-muted/40 p-8 text-center ${className ?? ""}`}
    >
      <p className="mx-auto max-w-[65ch] text-sm text-muted-foreground">
        {t.mapPlaceholder}
      </p>
    </div>
  );
}

export default MigrationsAtlasView;
