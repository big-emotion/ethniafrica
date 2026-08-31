"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import {
  BOTTOM_SHEET_VIEW_FRACTION,
  SIDE_PANEL_VIEW_FRACTION,
  type PanelAnchor,
} from "@/lib/atlas/panelBias";
import { cn } from "@/lib/utils";

export interface AtlasFactsPanelProps {
  open: boolean;
  anchor: PanelAnchor;
  title: string;
  description?: string;
  /** Decoration beside the title — the panel already names the subject in text. */
  icon?: ReactNode;
  /** The globe stage the panel is anchored inside. Null before the stage ref resolves. */
  container: HTMLElement | null;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * The panel must cover exactly the share of the stage `biasForPanel()` assumes,
 * so the size is read off panelBias.ts rather than retyped: should the CSS and
 * the constant drift apart, the camera parks the chosen subject underneath the
 * panel instead of beside it.
 */
const ANCHOR_SIZE: Record<PanelAnchor, CSSProperties> = {
  bottom: { height: `${BOTTOM_SHEET_VIEW_FRACTION * 100}%` },
  side: { width: `${SIDE_PANEL_VIEW_FRACTION * 100}%` },
};

/**
 * Anchored inside the stage, never to the viewport — the bias is
 * stage-relative. Above the breakpoint the panel is a card posed on the
 * globe, inset from the edge and rounded on every side; below it, a sheet
 * rising from the bottom, rounded only where it leaves the edge.
 */
const ANCHOR_POSITION: Record<PanelAnchor, string> = {
  bottom: "absolute inset-x-0 bottom-0 rounded-t-afh-lg border-t",
  // Capped, not stretched. Pinning both edges gave a card the height of the
  // whole band with its content in the first third, which read as a panel that
  // had failed to load rather than one that had finished.
  side: "absolute right-[22px] top-[22px] max-h-[calc(100%-44px)] rounded-afh-lg border",
};

/**
 * The panel is parchment, laid on a night stage.
 *
 * DEC-022 put the whole globe stage on the night surface, and this panel with
 * it. That reading has narrowed twice since: the home globe was repainted on
 * parchment (1669c944), and the night scope is now the dataviz itself rather
 * than everything sitting on it. The panel is not dataviz — it is an extract of
 * the fiche, lifted out and laid over the map. Painted night it reads as one
 * more layer of the map; painted parchment it reads as what it is, a piece of
 * the page's own reading placed on top. That distinction is the reason this is
 * a panel and not a tooltip, and it is what the mockup asks for.
 *
 * (The shadcn Sheet parts are styled for the light palette — hence the bare
 * Radix primitives here.)
 */
const PARCHMENT_PANEL_SURFACE: CSSProperties = {
  backgroundColor: "var(--afh-bg)",
  borderColor: "var(--afh-border)",
  color: "var(--afh-text)",
};

/**
 * REQ-117: the facts of the target the reader chose on a fiche globe, as a
 * bottom sheet below 760 px and a side panel above — one component, one set of
 * facts. It is deliberately non-modal and backdrop-free: the reader is meant to
 * keep watching the globe while reading, and picking another target must swap
 * the facts rather than dismiss the panel.
 */
// @req REQ-117
export function AtlasFactsPanel({
  open,
  anchor,
  title,
  description,
  icon,
  container,
  onClose,
  children,
}: AtlasFactsPanelProps): ReactElement | null {
  if (!container) return null;

  return (
    <DialogPrimitive.Root
      open={open}
      modal={false}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal container={container}>
        <DialogPrimitive.Content
          data-atlas-facts-panel=""
          data-atlas-panel-anchor={anchor}
          className={cn(
            "z-10 flex flex-col gap-3 overflow-y-auto p-4",
            ANCHOR_POSITION[anchor]
          )}
          style={{ ...PARCHMENT_PANEL_SURFACE, ...ANCHOR_SIZE[anchor] }}
          // Without a Description, Radix would still point aria-describedby at
          // an id that never renders; clearing it keeps the panel valid.
          {...(description ? {} : { "aria-describedby": undefined })}
          // Choosing another target on the globe is an outside pointerdown;
          // letting Radix dismiss on it would close the panel on every pick.
          onInteractOutside={(event) => event.preventDefault()}
        >
          {anchor === "bottom" ? (
            <div
              data-atlas-panel-handle=""
              aria-hidden="true"
              className="mx-auto h-1 w-9 shrink-0 rounded-full opacity-40"
              style={{ backgroundColor: "var(--afh-text-muted)" }}
            />
          ) : null}
          <div className="flex items-start justify-between gap-3">
            {icon ? (
              <span
                aria-hidden="true"
                className="shrink-0 text-afh-h2 leading-none"
              >
                {icon}
              </span>
            ) : null}
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-afh-small font-semibold leading-tight">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description
                  className="text-afh-small"
                  style={{ color: "var(--afh-text-soft)" }}
                >
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Fermer"
              className="rounded-full p-1 opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              style={{ color: "var(--afh-text-soft)" }}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div
            className="text-afh-small"
            style={{ color: "var(--afh-text-soft)" }}
          >
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default AtlasFactsPanel;
