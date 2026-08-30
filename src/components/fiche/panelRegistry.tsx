/**
 * Panel-kind × entity-type resolution matrix (Epic 15 · Story 15.9 · FR98).
 *
 * `derivePanelSequence` (src/lib/fichePanels.ts) says *which* chapters a fiche
 * has; this file says *what component* renders each one for a given entity.
 *
 * Several shipped panels are single-entity by construction — IdentityPanel
 * reads a PeopleNamesDossier, TerritoryPanel reads people country shares,
 * VoicesPanel reads people oral narratives. Their missing per-entity
 * counterparts belong to stories
 * 15.3–15.8, not to this route-integration story, so an unsupported pair
 * resolves to `null` and renders nothing — the FR98 invariant, enforced here
 * instead of by review. The gap is deliberate and legible: when a later story
 * ships (say) a country identity panel, it adds one branch below and every
 * route picks it up with no route change.
 *
 * Current support (× = resolves to null today):
 *                  people  country  language-family
 *   identity          ✓       ×            ×
 *   scale             ✓       ✓            ✓
 *   territory         ✓       ×            ×
 *   fragmentation     ✓       ×            ×
 *   links             ✓       ✓            ✓
 *   voices            ✓       ×            ×
 *   record            ✓       ✓            ✓
 */

import type { ReactNode } from "react";

import { FragmentationPanel } from "@/components/fiche/FragmentationPanel";
import { IdentityPanel } from "@/components/fiche/IdentityPanel";
import { LinksPanel } from "@/components/fiche/LinksPanel";
import { RecordPanel } from "@/components/fiche/RecordPanel";
import { ScalePanel } from "@/components/fiche/ScalePanel";
import { TerritoryPanel } from "@/components/fiche/TerritoryPanel";
import { VoicesPanel } from "@/components/fiche/VoicesPanel";
import { hasScaleContent } from "@/lib/ficheScale";
import { PANEL_TABLE, type PanelKind } from "@/lib/fichePanels";
import type { CountryDistributionRow } from "@/lib/peopleDataTransformer";
import type { PeopleNamesDossier } from "@/api/v2/schemas/names";
import type { PeopleFragmentation } from "@/api/v2/schemas/peopleFragmentation";
import type {
  FichePanelSide,
  FichePanelSize,
  FichePanelSourceLine,
} from "@/types/fiche";
import type {
  CountryDetail,
  LanguageFamilyDetail,
  PeopleDetail,
} from "@/types/afrik-frontend";
import type { SourcedRelation } from "@/types/relations";

/**
 * Everything a route hands the renderer: the AFRIK payload the composer gates
 * on, plus the side-loaded corpus a panel needs but the payload does not carry
 * (names dossier, country shares, fragmentation, relations, family branches).
 * Absent side-loads gate their panel to nothing — a route never has to decide.
 */
export type FichePanelContext =
  | {
      entityType: "people";
      payload: PeopleDetail;
      namesDossier?: PeopleNamesDossier | null;
      distributions?: readonly CountryDistributionRow[];
      fragmentation?: PeopleFragmentation | null;
      relations?: readonly SourcedRelation[];
      /**
       * Resolved server-side by the route. VoicesPanel discovers its own
       * emptiness from a client fetch that lands long after the server has
       * stamped the chapter's anchor, so the presence answer has to arrive
       * here instead — otherwise the sequence emits a journey anchor onto a
       * chapter that will turn out to be empty.
       */
      hasOralNarratives?: boolean;
    }
  | {
      entityType: "country";
      payload: CountryDetail;
      relations?: readonly SourcedRelation[];
    }
  | {
      entityType: "language-family";
      payload: LanguageFamilyDetail;
      relations?: readonly SourcedRelation[];
    };

const PANEL_ORDER = new Map<PanelKind, number>(
  PANEL_TABLE.map((panel) => [panel.kind, panel.order])
);

/**
 * Uniform canvas height across the sequence — no story has made per-panel
 * sizing an editorial decision, so one size keeps the rhythm predictable.
 */
const CANVAS_SIZE: FichePanelSize = "md";

/** FR100 alternation: odd panel order sits left, even order sits right. */
// @req REQ-091
export function sideForPanelOrder(order: number): FichePanelSide {
  return order % 2 === 1 ? "left" : "right";
}

/** Journey anchor for a panel — FicheSequence stamps it, source lines cite it. */
// @req REQ-091
export function sectionIdForPanel(kind: PanelKind): string {
  return `fiche-${kind}`;
}

function sideFor(kind: PanelKind): FichePanelSide {
  return sideForPanelOrder(PANEL_ORDER.get(kind));
}

/**
 * FR99 requires a source line on every panel. The honest one at this layer is
 * the fiche's own AFRIK dossier — the record chapter further down the same
 * page. Anything more specific would be a citation we cannot back (Source Tier
 * Policy), so it stays a pointer, never a fabricated reference.
 */
const AFRIK_DOSSIER_CITATION: FichePanelSourceLine = {
  label: "Source : dossier AFRIK de la fiche",
  href: `#${sectionIdForPanel("record")}`,
};

interface PanelCopy {
  stepLabel: string;
  heading: string;
  body: string;
}

/**
 * Copy for the panels that take it as props (IdentityPanel, ScalePanel and
 * RecordPanel carry their own). Each line describes what the chapter *shows*;
 * none asserts an ethnographic or demographic fact about the entity, because
 * such a claim would need a Tier-1/Tier-2 citation this layer cannot provide.
 */
const PANEL_COPY: Record<
  "territory" | "fragmentation" | "links" | "voices",
  PanelCopy
> = {
  territory: {
    stepLabel: "03 · Territoire",
    heading: "Où la présence est-elle attestée ?",
    body: "Les pays où le corpus atteste une présence, classés par part de population déclarée.",
  },
  fragmentation: {
    stepLabel: "05 · Fragmentation",
    heading: "Que les frontières ont-elles séparé ?",
    body: "La répartition de part et d'autre des frontières actuelles, telle qu'enregistrée dans le corpus.",
  },
  links: {
    stepLabel: "06 · Liens",
    heading: "Quelles relations sont documentées ?",
    body: "Les relations sourcées du corpus, chacune portant son type et ses références.",
  },
  voices: {
    stepLabel: "07 · Voix",
    heading: "Quelles voix ont été recueillies ?",
    body: "Les récits oraux publiés pour cette fiche, avec leurs métadonnées de droits.",
  },
};

/**
 * Resolves one chapter of a fiche to its component, or to `null` when no panel
 * supports the pair or the data it needs is absent (FR98).
 *
 * `record` is the legacy entity detail view the route already renders; the
 * "record" kind gates it behind the reading gate (FR97).
 */
// @req REQ-091
export function resolvePanel(
  kind: PanelKind,
  context: FichePanelContext,
  record: ReactNode
): ReactNode | null {
  const side = sideFor(kind);

  switch (kind) {
    case "identity": {
      if (context.entityType !== "people" || !context.namesDossier) return null;
      return (
        <IdentityPanel
          peopleId={context.payload.id}
          nameMain={context.payload.nameMain}
          dossier={context.namesDossier}
        />
      );
    }

    case "scale": {
      // ScalePanel gates itself and renders nothing without a sourced figure,
      // but that verdict only exists at render time — the registry has to ask
      // for it here, or FicheSequence stamps a journey anchor onto an empty
      // chapter.
      if (!hasScaleContent(context)) return null;
      switch (context.entityType) {
        case "people":
          return (
            <ScalePanel
              entityType="people"
              payload={context.payload}
              size={CANVAS_SIZE}
              side={side}
            />
          );
        case "country":
          return (
            <ScalePanel
              entityType="country"
              payload={context.payload}
              size={CANVAS_SIZE}
              side={side}
            />
          );
        case "language-family":
          return (
            <ScalePanel
              entityType="language-family"
              payload={context.payload}
              size={CANVAS_SIZE}
              side={side}
            />
          );
      }
    }

    case "territory": {
      if (context.entityType !== "people") return null;
      if (!context.distributions?.length) return null;
      return (
        <TerritoryPanel
          distributions={context.distributions}
          size={CANVAS_SIZE}
          side={side}
          sourceLine={AFRIK_DOSSIER_CITATION}
          {...PANEL_COPY.territory}
        />
      );
    }

    case "fragmentation": {
      if (context.entityType !== "people" || !context.fragmentation) {
        return null;
      }
      return (
        <FragmentationPanel
          fragmentation={context.fragmentation}
          size={CANVAS_SIZE}
          side={side}
          sourceLine={AFRIK_DOSSIER_CITATION}
          {...PANEL_COPY.fragmentation}
        />
      );
    }

    case "links": {
      if (!context.relations?.length) return null;
      return (
        <LinksPanel
          relations={[...context.relations]}
          size={CANVAS_SIZE}
          side={side}
          sourceLine={AFRIK_DOSSIER_CITATION}
          {...PANEL_COPY.links}
        />
      );
    }

    case "voices": {
      if (context.entityType !== "people") return null;
      if (!context.hasOralNarratives) return null;
      return (
        <VoicesPanel
          peopleId={context.payload.id}
          size={CANVAS_SIZE}
          side={side}
          sourceLine={AFRIK_DOSSIER_CITATION}
          {...PANEL_COPY.voices}
        />
      );
    }

    case "record":
      return record ? <RecordPanel>{record}</RecordPanel> : null;
  }
}
