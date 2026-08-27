import type { CSSProperties } from "react";

import { FICHE_BAND_BREAKPOINT_PX } from "@/components/fiche/FicheHeroBand";
import {
  FOOTPRINT_WORDING,
  type FamilyFootprintProvenance,
} from "@/lib/familyFootprintSource";

/**
 * The sentence that justifies the dashed edge.
 *
 * Without it the reader sees a tinted, outlined area over Africa and has every
 * reason to read it as a declared territory — which is exactly the colonial
 * cartographic habit the atlas sets out not to repeat. The dash carries that
 * meaning visually; this says it in words.
 *
 * Hidden below the band's breakpoint, where the globe is small enough that a
 * two-line caption over it competes with the map rather than annotating it. The
 * same claim is made in full in the parchment's "L'empreinte, et d'où elle
 * vient" section, which is where a phone reader meets it — the caption is a
 * shortcut for the wide layout, never the only place the point is made.
 */
const LEGEND_STYLE: CSSProperties = {
  position: "absolute",
  top: 16,
  left: 18,
  zIndex: 6,
  margin: 0,
  maxWidth: 220,
  fontFamily: "var(--afh-font-mono)",
  fontSize: "var(--afh-text-nano)",
  lineHeight: 1.6,
  color: "var(--afh-night-ink-2)",
  pointerEvents: "none",
};

// @req REQ-116
export function FamilyFootprintLegend({
  provenance = "member-peoples",
}: {
  /** Which rule built the area. The caption names it, so it cannot claim a rule the page did not apply. */
  provenance?: FamilyFootprintProvenance;
}) {
  const [firstLine, secondLine] = FOOTPRINT_WORDING[provenance].legend;

  return (
    <>
      <p className="afh-footprint-legend" style={LEGEND_STYLE}>
        {firstLine}
        <br />
        {secondLine}
      </p>
      <style>{`
        @container (max-width: ${FICHE_BAND_BREAKPOINT_PX - 1}px) {
          .afh-footprint-legend { display: none; }
        }
      `}</style>
    </>
  );
}
