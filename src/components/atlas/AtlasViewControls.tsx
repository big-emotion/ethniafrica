"use client";

import type { CSSProperties } from "react";

/**
 * The globe's view buttons, sitting at the foot of the band.
 *
 * "Toute l'empreinte" is a toggle, not a command: it reports whether the whole
 * footprint is currently shown, so a reader can tell at a glance whether they
 * are looking at the family or at one country of it. Pressing it while it is
 * already pressed does nothing, which is what aria-pressed promises.
 */

export interface AtlasViewControlsProps {
  /** True when no single country holds the view. */
  wholeIsShown: boolean;
  onShowWhole: () => void;
}

const ROW_STYLE: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 14,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "center",
  zIndex: 6,
  padding: "0 16px",
};

const VIEW_BUTTON_STYLE: CSSProperties = {
  padding: "7px 14px",
  borderRadius: "var(--afh-radius-full)",
  border: "1px solid var(--afh-night-line)",
  background: "var(--afh-night-surface)",
  color: "var(--afh-night-ink)",
  font: "inherit",
  fontSize: "var(--afh-text-small)",
  cursor: "pointer",
};

const PRESSED_STYLE: CSSProperties = {
  ...VIEW_BUTTON_STYLE,
  background: "var(--accent)",
  borderColor: "var(--accent)",
  color: "var(--afh-night-ground)",
};

// @req REQ-117
export function AtlasViewControls({
  wholeIsShown,
  onShowWhole,
}: AtlasViewControlsProps) {
  return (
    <div style={ROW_STYLE} data-testid="atlas-view-controls">
      <button
        type="button"
        aria-pressed={wholeIsShown}
        onClick={onShowWhole}
        style={wholeIsShown ? PRESSED_STYLE : VIEW_BUTTON_STYLE}
      >
        Toute l&apos;empreinte
      </button>
    </div>
  );
}
