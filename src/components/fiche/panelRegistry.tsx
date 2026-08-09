import { ScalePanel } from "@/components/fiche/ScalePanel";
import { PANEL_TABLE, type FicheEntityType } from "@/lib/fichePanels";
import type { FichePanelSide, FichePanelSize } from "@/types/fiche";
import type {
  CountryDetail,
  LanguageFamilyDetail,
  PeopleDetail,
} from "@/types/afrik-frontend";

/**
 * Panel-kind → component wiring (Epic 15 · Story 15.4 · ETNI-910).
 *
 * Only "scale" (PANEL_TABLE order 2, mandatory) is wired so far — the
 * remaining PanelKind entries from fichePanels.ts get their own resolver as
 * their story lands; this file does not introduce new panels.
 */

const SCALE_ORDER = PANEL_TABLE.find((panel) => panel.kind === "scale")!.order;

/** FR100 alternation: odd panel order sits left, even order sits right. */
export function sideForPanelOrder(order: number): FichePanelSide {
  return order % 2 === 1 ? "left" : "right";
}

export const SCALE_PANEL_SIDE = sideForPanelOrder(SCALE_ORDER);

interface ResolveScalePanelArgs {
  entityType: FicheEntityType;
  payload: PeopleDetail | CountryDetail | LanguageFamilyDetail;
  size?: FichePanelSize;
}

/** Resolves the "scale" PanelKind to ScalePanel for any of the three fiche entity types. */
// @req REQ-091
export function resolveScalePanel({
  entityType,
  payload,
  size = "md",
}: ResolveScalePanelArgs) {
  switch (entityType) {
    case "people":
      return (
        <ScalePanel
          entityType="people"
          payload={payload as PeopleDetail}
          size={size}
          side={SCALE_PANEL_SIDE}
        />
      );
    case "country":
      return (
        <ScalePanel
          entityType="country"
          payload={payload as CountryDetail}
          size={size}
          side={SCALE_PANEL_SIDE}
        />
      );
    case "language-family":
      return (
        <ScalePanel
          entityType="language-family"
          payload={payload as LanguageFamilyDetail}
          size={size}
          side={SCALE_PANEL_SIDE}
        />
      );
  }
}
