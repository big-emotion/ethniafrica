/**
 * FicheSequence — Epic 15 · Story 15.9 (ETNI-817 · FR98, FR100).
 *
 * Renders a fiche as the ordered chapter sequence the composer derives: it
 * asks `derivePanelSequence` which chapters the entity has, `resolvePanel`
 * what renders each one, and drops whatever resolves to nothing. A route
 * supplies data and its legacy detail view; it never names a panel, so a
 * panel shipping or changing entity support costs no route change.
 *
 * The anchor a panel gets is only as certain as the panel's own gate: panels
 * that decide their emptiness at render time (ScalePanel from its source line,
 * VoicesPanel from a client fetch) can leave their `<section>` behind empty.
 * The registry does not second-guess them — duplicating their gating rules
 * here would be two rules to keep in sync instead of one.
 */

import type { ReactNode } from "react";

import {
  resolvePanel,
  sectionIdForPanel,
  type FichePanelContext,
} from "@/components/fiche/panelRegistry";
import {
  derivePanelSequence,
  type FicheEntityType,
  type PanelKind,
} from "@/lib/fichePanels";
import { cn } from "@/lib/utils";

/**
 * Accent scope per entity type (src/styles/tokens/color.css) — one class on
 * the sequence root rebinds --accent for every panel below it.
 *
 * Terre is deliberately absent: IdentityPanel reserves --afh-cat-terre as the
 * colonial-marker accent for imposed exonyms. A fiche scoped to terre would
 * paint that marker in the page's own accent and it would stop reading as a
 * marker at all.
 */
// @req REQ-091
export const ACCENT_CLASS_BY_ENTITY: Record<FicheEntityType, string> = {
  people: "afh-accent-ocre",
  country: "afh-accent-teal",
  "language-family": "afh-accent-perv",
};

export interface FicheSequenceProps {
  context: FichePanelContext;
  /** The legacy entity detail view — the sequence gates it behind The Record (FR97). */
  record: ReactNode;
  className?: string;
}

/** Bridges the discriminated context onto the composer's per-entity overloads. */
function panelSequenceFor(context: FichePanelContext): PanelKind[] {
  switch (context.entityType) {
    case "people":
      return derivePanelSequence("people", context.payload);
    case "country":
      return derivePanelSequence("country", context.payload);
    case "language-family":
      return derivePanelSequence("language-family", context.payload);
  }
}

// @req REQ-091
export function FicheSequence({
  context,
  record,
  className,
}: FicheSequenceProps) {
  return (
    <div
      className={cn(
        ACCENT_CLASS_BY_ENTITY[context.entityType],
        "flex flex-col gap-afh-3xl",
        className
      )}
    >
      {panelSequenceFor(context).map((kind) => {
        const panel = resolvePanel(kind, context, record);
        if (!panel) return null;

        return (
          <section key={kind} id={sectionIdForPanel(kind)}>
            {panel}
          </section>
        );
      })}
    </div>
  );
}
