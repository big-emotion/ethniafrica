"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { RELATION_TYPE_LABELS } from "@/components/relations/RelationTypeBadge";
import type {
  RelationBadgeType,
  RelationListItem,
} from "@/lib/relationsDataTransformer";
import type { PeopleId } from "@/types/afrik";

export interface EgoNetworkGraphCenter {
  id: PeopleId;
  nameMain: string;
  /** ISO 639-3 code for `nameMain`; sets a matching `lang` attribute (AutonymExonymHeading precedent). */
  nameMainIso639_3?: string;
}

export interface EgoNetworkGraphProps {
  /** The people the network is centered on. */
  center: EgoNetworkGraphCenter;
  /** Sourced + derived relations, pre-merged, pre-sorted — same shape/order as `RelationsList` (11.8). Capped at 24; the rest surfaces as a non-interactive overflow affordance (module spec §UX & Components). */
  edges: RelationListItem[];
  /** ISO 639-3 codes for neighbor autonyms, keyed by people id, when known — optional, degrades gracefully without it (AutonymExonymHeading precedent). */
  neighborLangById?: Partial<Record<PeopleId, string>>;
  /** Enter on a focused edge: the relation id for sourced edges, `null` for derived links (basis-only explanation, never sourced individually — FR73). */
  onEdgeActivate: (relationId: string | null) => void;
  /** Enter on a focused neighbor node: navigate to that people's own links page. */
  onNodeActivate: (peopleId: PeopleId) => void;
  className?: string;
}

const MAX_NEIGHBORS = 24;
const VIEWBOX = 300;
const CENTER_POINT = VIEWBOX / 2;
const RADIUS = 110;
const HIT_AREA = 44;

const RELATION_STROKE_CLASSES: Record<RelationBadgeType, string> = {
  linguistic: "stroke-afh-relation-linguistic",
  migratory: "stroke-afh-relation-migratory",
  commercial: "stroke-afh-relation-commercial",
  religious: "stroke-afh-relation-religious",
};

function neighborPosition(index: number, total: number) {
  const angle = -Math.PI / 2 + (index * (2 * Math.PI)) / total;
  return {
    x: CENTER_POINT + RADIUS * Math.cos(angle),
    y: CENTER_POINT + RADIUS * Math.sin(angle),
  };
}

function edgeAnnouncement(item: RelationListItem): string {
  const parts = [
    `Lien ${RELATION_TYPE_LABELS[item.type]} avec ${item.neighbor.nameMain}`,
  ];
  if (item.period?.label) parts.push(item.period.label);
  if (item.derived) {
    parts.push(
      "lien dérivé de la hiérarchie AFRIK, non sourcé individuellement"
    );
  } else if (item.confidence?.sourceCount != null) {
    parts.push(`${item.confidence.sourceCount} sources`);
  }
  const callToAction = item.derived
    ? "Entrée pour en savoir plus sur ce lien dérivé."
    : "Entrée pour ouvrir le détail.";
  return `${parts.join(", ")}. ${callToAction}`;
}

function nodeAnnouncement(item: RelationListItem): string {
  return `Nœud ${item.neighbor.nameMain}. Entrée pour naviguer vers cette fiche.`;
}

type FocusStop =
  | { kind: "center"; key: string }
  | { kind: "edge"; key: string; item: RelationListItem }
  | { kind: "node"; key: string; item: RelationListItem }
  | { kind: "overflow"; key: string; count: number };

function announcementFor(
  stop: FocusStop,
  center: EgoNetworkGraphCenter
): string {
  switch (stop.kind) {
    case "center":
      return `Centre : ${center.nameMain}.`;
    case "edge":
      return edgeAnnouncement(stop.item);
    case "node":
      return nodeAnnouncement(stop.item);
    case "overflow":
      return `+${stop.count} autres liens, voir la liste complète.`;
    default:
      return "";
  }
}

/**
 * Ego-network graph (Epic 11, FR75-FR76, UX-DR39) — deterministic radial SVG
 * layout centered on one people, grouped by relation type, zero new npm
 * dependencies. Pure presentational (props in, callbacks out — UX-DR48):
 * `RelationsList` (11.8/11.9) is the text-first equivalent and always
 * carries every data point this graph shows.
 *
 * Keyboard model (module spec §Accessibility, Surface 2): the graph is one
 * tab stop via roving tabindex. Focus enters on the center node. Arrow
 * Right/Left cycle the edge/node stops in list order (wrapping). Enter opens
 * the relation detail on an edge stop, or navigates on a node stop. Home
 * returns focus to the center node. Escape exits the graph (no trap, NFR19).
 */
// @req REQ-097
export function EgoNetworkGraph({
  center,
  edges,
  neighborLangById,
  onEdgeActivate,
  onNodeActivate,
  className,
}: EgoNetworkGraphProps) {
  const visibleEdges = edges.slice(0, MAX_NEIGHBORS);
  const overflowCount = Math.max(0, edges.length - MAX_NEIGHBORS);

  const stops = React.useMemo<FocusStop[]>(() => {
    const result: FocusStop[] = [{ kind: "center", key: "center" }];
    visibleEdges.forEach((item, index) => {
      result.push({ kind: "edge", key: `edge-${index}`, item });
      result.push({ kind: "node", key: `node-${index}`, item });
    });
    if (overflowCount > 0) {
      result.push({
        kind: "overflow",
        key: "overflow",
        count: overflowCount,
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleEdges.length, overflowCount]);

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [liveMessage, setLiveMessage] = React.useState(
    () =>
      `Graphe de relations centré sur ${center.nameMain} : ${visibleEdges.length} liens. Flèches pour parcourir les liens, Échap pour quitter.`
  );
  const stopRefs = React.useRef<Map<string, SVGElement>>(new Map());

  function registerRef(key: string) {
    return (element: SVGElement | null) => {
      if (element) stopRefs.current.set(key, element);
      else stopRefs.current.delete(key);
    };
  }

  function moveTo(index: number) {
    const stop = stops[index];
    if (!stop) return;
    setActiveIndex(index);
    setLiveMessage(announcementFor(stop, center));
    stopRefs.current.get(stop.key)?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveTo((activeIndex + 1) % stops.length);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveTo((activeIndex - 1 + stops.length) % stops.length);
        break;
      case "Home":
        event.preventDefault();
        moveTo(0);
        break;
      case "Escape":
        event.preventDefault();
        (document.activeElement as (HTMLElement | SVGElement) | null)?.blur?.();
        break;
      case "Enter": {
        event.preventDefault();
        const stop = stops[activeIndex];
        if (stop?.kind === "edge") {
          onEdgeActivate(stop.item.derived ? null : stop.item.id);
        } else if (stop?.kind === "node") {
          onNodeActivate(stop.item.neighbor.id);
        }
        break;
      }
      default:
        break;
    }
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        role="application"
        aria-roledescription="graphe de relations"
        aria-label={`Graphe de relations centré sur ${center.nameMain}`}
        onKeyDown={handleKeyDown}
        className="h-auto w-full"
        style={{
          opacity: 1,
          transition: "opacity var(--afh-duration-fade) var(--afh-ease-in-out)",
        }}
      >
        {visibleEdges.map((item, index) => {
          const { x, y } = neighborPosition(index, visibleEdges.length);
          return (
            <line
              key={`line-${item.id}`}
              x1={CENTER_POINT}
              y1={CENTER_POINT}
              x2={x}
              y2={y}
              strokeWidth={2}
              className={RELATION_STROKE_CLASSES[item.type]}
              style={
                item.derived
                  ? { strokeDasharray: "var(--afh-relation-derived-dash)" }
                  : undefined
              }
            />
          );
        })}

        {(() => {
          const stop = stops[0];
          const isActive = activeIndex === 0;
          return (
            <g
              ref={registerRef("center")}
              role="button"
              aria-label={announcementFor(stop, center)}
              tabIndex={isActive ? 0 : -1}
              onFocus={() => setActiveIndex(0)}
              data-testid="center"
              data-active={isActive}
              transform={`translate(${CENTER_POINT}, ${CENTER_POINT})`}
            >
              <rect
                x={-HIT_AREA / 2}
                y={-HIT_AREA / 2}
                width={HIT_AREA}
                height={HIT_AREA}
                fill="transparent"
              />
              <circle
                r={20}
                className={cn(
                  "fill-afh-surface stroke-afh-border",
                  isActive && "stroke-afh-gold"
                )}
                strokeWidth={isActive ? 3 : 1.5}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                lang={center.nameMainIso639_3}
                className="fill-afh-text text-[10px] font-semibold"
              >
                {center.nameMain}
              </text>
            </g>
          );
        })()}

        {visibleEdges.map((item, index) => {
          const { x, y } = neighborPosition(index, visibleEdges.length);
          const midX = CENTER_POINT + (x - CENTER_POINT) * 0.55;
          const midY = CENTER_POINT + (y - CENTER_POINT) * 0.55;
          const edgeStopIndex = 1 + index * 2;
          const nodeStopIndex = edgeStopIndex + 1;
          const edgeStop = stops[edgeStopIndex];
          const nodeStop = stops[nodeStopIndex];
          const isEdgeActive = activeIndex === edgeStopIndex;
          const isNodeActive = activeIndex === nodeStopIndex;
          const lang = neighborLangById?.[item.neighbor.id];

          return (
            <React.Fragment key={item.id}>
              <g
                ref={registerRef(edgeStop.key)}
                role="button"
                aria-label={announcementFor(edgeStop, center)}
                tabIndex={isEdgeActive ? 0 : -1}
                onFocus={() => setActiveIndex(edgeStopIndex)}
                data-testid={edgeStop.key}
                data-active={isEdgeActive}
                transform={`translate(${midX}, ${midY})`}
              >
                <rect
                  x={-HIT_AREA / 2}
                  y={-HIT_AREA / 2}
                  width={HIT_AREA}
                  height={HIT_AREA}
                  fill="transparent"
                />
                <rect
                  x={-26}
                  y={-9}
                  width={52}
                  height={18}
                  rx={9}
                  className={cn(
                    "fill-afh-surface stroke-afh-border",
                    isEdgeActive && "stroke-afh-gold"
                  )}
                  strokeWidth={isEdgeActive ? 2.5 : 1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-afh-text text-[8px] font-medium"
                >
                  {RELATION_TYPE_LABELS[item.type]}
                </text>
              </g>

              <g
                ref={registerRef(nodeStop.key)}
                role="button"
                aria-label={announcementFor(nodeStop, center)}
                tabIndex={isNodeActive ? 0 : -1}
                onFocus={() => setActiveIndex(nodeStopIndex)}
                data-testid={nodeStop.key}
                data-active={isNodeActive}
                transform={`translate(${x}, ${y})`}
              >
                <rect
                  x={-HIT_AREA / 2}
                  y={-HIT_AREA / 2}
                  width={HIT_AREA}
                  height={HIT_AREA}
                  fill="transparent"
                />
                <circle
                  r={14}
                  className={cn(
                    "fill-afh-surface stroke-afh-border",
                    isNodeActive && "stroke-afh-gold"
                  )}
                  strokeWidth={isNodeActive ? 3 : 1.5}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  lang={lang}
                  className="fill-afh-text text-[8px] font-semibold"
                >
                  {item.neighbor.nameMain}
                </text>
              </g>
            </React.Fragment>
          );
        })}

        {overflowCount > 0 &&
          (() => {
            const stop = stops[stops.length - 1];
            const isActive = activeIndex === stops.length - 1;
            return (
              <g
                ref={registerRef("overflow")}
                role="button"
                aria-label={announcementFor(stop, center)}
                tabIndex={isActive ? 0 : -1}
                onFocus={() => setActiveIndex(stops.length - 1)}
                data-testid="overflow"
                data-active={isActive}
                transform={`translate(${CENTER_POINT}, ${VIEWBOX - 14})`}
              >
                <rect
                  x={-HIT_AREA / 2}
                  y={-HIT_AREA / 2}
                  width={HIT_AREA}
                  height={HIT_AREA}
                  fill="transparent"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={cn(
                    "fill-afh-text-soft text-[9px]",
                    isActive && "fill-afh-gold"
                  )}
                >
                  +{overflowCount} autres
                </text>
              </g>
            );
          })()}
      </svg>

      <p role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </p>
    </div>
  );
}

export default EgoNetworkGraph;
