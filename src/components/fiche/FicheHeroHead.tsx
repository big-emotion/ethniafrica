import type { ReactNode } from "react";

import { ACCENT_CLASS_BY_ENTITY } from "@/components/fiche/FicheSequence";
import type { FicheEntityType } from "@/types/fiche";

/**
 * A fiche's head, on its way into the shell's hero plate.
 *
 * The head used to be the first child of `FicheSequence`, which is what put it
 * inside the fiche's accent scope: one class on the sequence root rebinds
 * `--accent` for everything below it. The head reads that binding — the
 * predicate that finishes a fiche title is set in `--accent-ink`, and
 * `AutonymExonymHeading` inks the autonym in the same variable — so lifting it
 * out of the sequence and into the plate takes it out of the scope. Unbound,
 * `--accent` falls back to shadcn's bare HSL triplet from index.css and the
 * ink resolves to an invalid colour.
 *
 * So the scope travels with the head. One wrapper here rather than the class
 * spelled out at all three routes: the mapping is already stated once, and a
 * fiche that quietly rendered its title in the wrong hue is not a failure any
 * test would catch by looking at the markup.
 */
// @req REQ-115
export function FicheHeroHead({
  entityType,
  children,
}: {
  entityType: FicheEntityType;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="fiche-hero-head"
      className={ACCENT_CLASS_BY_ENTITY[entityType]}
    >
      {children}
    </div>
  );
}
