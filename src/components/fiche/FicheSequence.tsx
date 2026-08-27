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

import { ContextTriad } from "@/components/fiche/ContextTriad";
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

/**
 * Where the entity's own dossier goes.
 *
 * `"gated"` is FR97: the dossier closes the sequence, behind RecordPanel's
 * reading gate.
 *
 * `"body"` is what the Atlas mockup asks of a fiche whose dossier *is* the
 * page — the parchment opens directly under the globe, unfolded, and the
 * reading gate does not apply to it. The two are mutually exclusive by
 * construction: in `"body"` the `record` kind is dropped from the sequence,
 * so the dossier can never be rendered twice.
 */
export type FicheRecordPlacement = "gated" | "body";

export interface FicheSequenceProps {
  context: FichePanelContext;
  /** The entity detail view — the sequence decides whether it is a gated chapter or the page's body. */
  record: ReactNode;
  /** Defaults to the FR97 reading gate; see FicheRecordPlacement. */
  recordPlacement?: FicheRecordPlacement;
  /** The REQ-116 atlas globe (AtlasGlobe) — rendered above ContextTriad, ahead of every panel, on the DEC-022 Night surface. Omitted entirely when a route has not built one. */
  globe?: ReactNode;
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
  globe,
  recordPlacement = "gated",
  className,
}: FicheSequenceProps) {
  const recordIsBody = recordPlacement === "body";
  const sequence = panelSequenceFor(context).filter(
    (kind) => !(recordIsBody && kind === "record")
  );

  return (
    <div
      className={cn(
        ACCENT_CLASS_BY_ENTITY[context.entityType],
        "flex flex-col gap-afh-3xl",
        className
      )}
    >
      {globe}
      {/* The globe is the only full-bleed element: the shell went edge to edge,
          so the reading carries its own measure rather than inheriting one from
          a container the globe would otherwise be boxed into too.

          A record placed as the body is the second — it is a parchment, not a
          chapter, and it carries its own reading measure. Boxing it here would
          apply a second, wider one on top of that. It keeps the `fiche-record`
          anchor either way, because the globe's facts panel links to it. */}
      {recordIsBody && record ? (
        <section id={sectionIdForPanel("record")}>{record}</section>
      ) : null}
      {(!recordIsBody || sequence.length > 0) && (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-afh-3xl px-4">
          {/* The triad states the entity's place in the AFRIK hierarchy. A
              parchment body opens on its own breadcrumbs and country chips, so
              on that shape the triad would be the same statement twice. */}
          {!recordIsBody && <ContextTriad context={context} />}
          {sequence.map((kind) => {
            const panel = resolvePanel(kind, context, record);
            if (!panel) return null;

            return (
              <section key={kind} id={sectionIdForPanel(kind)}>
                {panel}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
