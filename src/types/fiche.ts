/**
 * FichePanel contract (Epic 15 · Story 15.1 · FR98, FR99, FR100, FR101).
 *
 * Shared shape every entity fiche (peoples, countries, language families)
 * composes against, so panels share one layout/gating contract instead of
 * duplicating it per entity type. Concrete panels (15.3+) provide the
 * data; this file only defines the contract.
 */

import type { ReactNode } from "react";

/** Canvas size selector — maps to the fixed 300/400/440px breakpoint heights (FR100). */
export type FichePanelSize = "sm" | "md" | "lg";

/** Which side the panel's canvas sits on at >=768px, for the alternating layout (FR100). */
export type FichePanelSide = "left" | "right";

/**
 * Per-panel source citation (FR99). Required on every panel — a panel
 * with data but no source line is not a valid fiche panel.
 */
export interface FichePanelSourceLine {
  label: string;
  href?: string;
}

/**
 * The panel's content payload. Optional at the FichePanelProps level so a
 * panel can be gated to zero DOM output when its underlying data is absent
 * (FR98) — see FichePanelProps.data.
 */
export interface FichePanelData {
  /** Small label preceding the heading (chapter anatomy "step" marker). */
  stepLabel: string;
  /** Emitted at H2 (FR101). */
  heading: string;
  /** Subject to the 25-word body budget. */
  body: string;
  /** Optional aside note rendered after the body. */
  note?: string;
  /** Optional visual content rendered inside the fixed-height canvas slot. */
  canvas?: ReactNode;
}

export interface FichePanelProps {
  /**
   * When omitted, the panel is gated to zero DOM output (FR98) — no
   * wrapper element, no heading, nothing rendered.
   */
  data?: FichePanelData;
  size: FichePanelSize;
  side: FichePanelSide;
  /** Required regardless of `data` — the type enforces the source-line slot (FR99). */
  sourceLine: FichePanelSourceLine;
  className?: string;
}
