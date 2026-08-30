/**
 * FicheSequence — the shell every fiche stands in.
 *
 * Head, globe band, reading rail, dossier. It began (Epic 15 · Story 15.9) as
 * a chapter engine: it asked a composer which chapters an entity had, a
 * registry what rendered each one, and dropped whatever resolved to nothing.
 * The Atlas mockup asks for something simpler than that engine could express —
 * one globe and one parchment — and each of the three fiches reached that
 * shape in turn, until no entity had a chapter left to compose. What the
 * engine did is now done by the parchment itself, which reads every section
 * the chapters used to claim and carries its own reading measure.
 *
 * So this file is the shell and nothing else. It still decides the two things
 * that are genuinely shared: which accent the page is scoped to, and the order
 * head → globe → rail → dossier.
 */

import type { ReactNode } from "react";

import { FicheChapterBar } from "@/components/fiche/FicheChapterBar";
import { FICHE_RECORD_ANCHOR } from "@/lib/ficheChapters";
import type { FicheEntityType } from "@/types/fiche";
import { cn } from "@/lib/utils";

/**
 * Accent scope per entity type (src/styles/tokens/color.css) — one class on
 * the sequence root rebinds --accent for everything below it.
 *
 * Terre is deliberately absent: it is reserved as the colonial-marker accent
 * for imposed exonyms. A fiche scoped to terre would paint that marker in the
 * page's own accent and it would stop reading as a marker at all.
 */
// @req REQ-091
export const ACCENT_CLASS_BY_ENTITY: Record<FicheEntityType, string> = {
  people: "afh-accent-ocre",
  country: "afh-accent-teal",
  "language-family": "afh-accent-perv",
};

export interface FicheSequenceProps {
  entityType: FicheEntityType;
  /** The entity's dossier — the parchment the page is. */
  record: ReactNode;
  /**
   * The fiche's own head — eyebrow, name, lede, chips — rendered *above* the
   * globe.
   *
   * It used to sit inside the parchment, below a full-bleed band some 520px
   * tall, so a reader arriving on a fiche saw a globe and no indication of
   * which fiche they were on: the name was below the fold on every screen.
   * The band still opens the page; it just no longer opens it alone.
   *
   * This carries the page's only h1. PageLayout's own title band stays off
   * (`hideHeader`) precisely so there is never a second one.
   */
  title?: ReactNode;
  /** The REQ-116 atlas globe (AtlasGlobe), on the DEC-022 Night surface. Omitted entirely when a route has not built one. */
  globe?: ReactNode;
  className?: string;
}

// @req REQ-091
export function FicheSequence({
  entityType,
  record,
  title,
  globe,
  className,
}: FicheSequenceProps) {
  return (
    <div
      data-fiche-sequence=""
      className={cn(
        ACCENT_CLASS_BY_ENTITY[entityType],
        "flex flex-col gap-afh-3xl",
        className
      )}
    >
      {/* The head comes first, so the reader knows which fiche they opened
          before the band fills their screen. */}
      {title ? (
        <div
          data-fiche-title-band=""
          className="mx-auto w-full max-w-4xl px-4 pt-afh-base"
        >
          {title}
        </div>
      ) : null}
      {globe}
      {/* The rail opens the reading, not the map: pinned here it starts
          following the reader exactly where the parchment starts, and the globe
          keeps the screen to itself while it is the subject. */}
      <FicheChapterBar />
      {/* Neither the globe nor the parchment is boxed in a measured column.
          The globe runs edge to edge; the parchment carries its own reading
          measure, and a column here would apply a second, wider one on top of
          it. The anchor stays because the globe's facts panel links to it. */}
      {record ? <section id={FICHE_RECORD_ANCHOR}>{record}</section> : null}
    </div>
  );
}
