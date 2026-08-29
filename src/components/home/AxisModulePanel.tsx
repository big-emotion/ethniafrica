"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { AxisGraphCanvas } from "@/components/home/AxisGraphCanvas";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { getModuleHref } from "@/lib/hubs/moduleHref";
import { getTranslation } from "@/lib/translations";
import { cn } from "@/lib/utils";
import {
  ACCENT_BY_ACCESS_MODE,
  type AccessMode,
  type ModuleGroupId,
} from "@/lib/hubs/moduleRegistry";
import { getGroupedModules, type ModuleShelf } from "@/lib/hubs/moduleGroups";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getFacetByPage } from "@/lib/hubs/facets";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { AxisGraphLayer } from "@/lib/home/axisGraphLayer";
import {
  BASE_TILT_X,
  LAYOUT_BY_AXIS,
  MODULE_CARD_HEIGHT,
  MODULE_CARD_LINE_HEIGHT,
  MODULE_CARD_PADDING_Y,
  MODULE_CARD_WIDTH,
  SCENE_MIN_WIDTH,
  entranceProgress,
  nearestEdge,
  panelHeightFor,
  projectNode,
  ringFitsPanel,
  sceneBox,
  sceneNodes,
  type PanelBox,
  type ProjectedNode,
  type Tilt,
} from "@/lib/home/axisGraphGeometry";
import type { Language } from "@/types/shared";

/** How far the pointer can swing the scene, in radians. */
const PARALLAX_X = 0.16;
const PARALLAX_Y = 0.3;

/** Per-frame approach to the target tilt, as HomeGlobe eases its rotation. */
const TILT_EASE = 0.09;
const TILT_SETTLED = 0.0006;

/** Pointer slack, in pixels, for lighting up an edge. */
const EDGE_TOLERANCE = 12;

/**
 * Below SCENE_MIN_WIDTH the panel stops being a scene and becomes a list:
 * the modules stack as full-width rows, with no canvas and no transforms.
 * It is the width the three axis cards fold at too, and it keeps a second
 * WebGL context off every phone rather than only the smallest ones.
 */
function useGraphEnabled(reducedMotion: boolean): boolean {
  const [wideEnough, setWideEnough] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${SCENE_MIN_WIDTH}px)`);
    const onChange = () => setWideEnough(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return wideEnough && !reducedMotion;
}

/**
 * What one node of the scene stands for: a game the reader can open, or a
 * shelf of games they have to open first.
 */
type PanelNode =
  | { kind: "module"; id: string; module: HubModule }
  | { kind: "shelf"; id: ModuleGroupId; shelf: ModuleShelf };

export interface AxisModulePanelProps {
  language: Language;
  mode: AccessMode;
  modules: HubModule[];
  /** Id of the axis card's heading — the panel's accessible name. */
  labelledBy: string;
  onClose: () => void;
}

/**
 * The modules of one access mode, deployed on the home page itself
 * (REQ-114). The reader used to spend a page load on an axis hub that only
 * listed these; now the axis card opens in place and the next click lands
 * on the module.
 *
 * The panel owns the render loop rather than the WebGL layer, because the
 * module cards sit on the very points the layer connects. One loop
 * projects each node once, writes that position onto the card, and hands
 * the same array to the layer — so a link can never miss the card it runs
 * to.
 */
// @req REQ-114
// @req REQ-106
export function AxisModulePanel({
  language,
  mode,
  modules,
  labelledBy,
  onClose,
}: AxisModulePanelProps) {
  const t = getTranslation(language);
  const reducedMotion = usePrefersReducedMotion();
  const graphEnabled = useGraphEnabled(reducedMotion);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [openShelf, setOpenShelf] = useState<ModuleGroupId | null>(null);

  const shelves = useMemo(() => getGroupedModules(modules), [modules]);
  const open = openShelf
    ? (shelves.find((shelf) => shelf.group.id === openShelf) ?? null)
    : null;

  /**
   * The nodes this level puts on the scene. Jouer holds eleven games,
   * which is past what the layout can place and past what a reader takes
   * in, so the first level is its shelves — except a shelf holding one
   * game, which stands in for that game rather than costing a click that
   * offers no choice. Every other axis has no shelves and only one level.
   */
  const panelNodes = useMemo<PanelNode[]>(() => {
    if (open) {
      return open.modules.map((entry) => ({
        kind: "module",
        id: entry.id,
        module: entry,
      }));
    }
    if (shelves.length > 0) {
      return shelves.map((shelf) =>
        shelf.singleton
          ? {
              kind: "module" as const,
              id: shelf.modules[0].id,
              module: shelf.modules[0],
            }
          : { kind: "shelf" as const, id: shelf.group.id, shelf }
      );
    }
    // An axis with no shelves puts every destination it holds on the scene,
    // one node each. The facets of Explorer's hub used to be folded into a
    // node of their own alongside it, which cost the diagram its whole
    // claim: a scene of peers around one centre had one node touching that
    // centre and the rest a card's width away. They are the destinations a
    // reader came for, so they are drawn as destinations; the hub itself is
    // the axis card at the origin, and the header still names it.
    return modules.map((entry) => ({
      kind: "module" as const,
      id: entry.id,
      module: entry,
    }));
  }, [modules, open, shelves]);

  const panelRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const layerRef = useRef<AxisGraphLayer | null>(null);
  const boxRef = useRef<PanelBox>({ width: 0, height: 0 });
  const tiltRef = useRef<Tilt>({ x: BASE_TILT_X, y: 0 });
  const tiltTargetRef = useRef<Tilt>({ x: BASE_TILT_X, y: 0 });
  const projectedRef = useRef<ProjectedNode[]>([]);
  const activeIndexRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const requestFrameRef = useRef<(() => void) | null>(null);

  /**
   * The panel's own width, not the window's. Where two module cards land in
   * the same column depends on it, so the geometry has to be told — sizing
   * a scene against the widest panel the grid allows is how Comprendre's
   * two middle cards measured clear while overlapping by 31px. Zero until
   * the first measurement, which the geometry reads as the widest panel.
   */
  const [panelWidth, setPanelWidth] = useState(0);

  /**
   * The shape the panel can actually draw at this size, which is not always
   * the one the axis is filed under. A ring is a circle or it is nothing —
   * it says its modules are peers of one centre, and the only way a reader
   * reads that is that they all stand the same distance from it. So a panel
   * too narrow to hold the circle falls to the column it already falls to on
   * a phone, rather than to an ellipse whose nearest module prints over the
   * card it came out of.
   */
  const layout = !graphEnabled
    ? "column"
    : LAYOUT_BY_AXIS[mode] === "ring" &&
        !ringFitsPanel(panelNodes.length, panelWidth)
      ? "column"
      : LAYOUT_BY_AXIS[mode];

  const nodes = useMemo(
    // openShelf is in the deps so two levels of equal size still hand the
    // render loop a fresh array, which is what replays their arrival.

    () => sceneNodes(layout, panelNodes.length, panelWidth),
    [layout, panelNodes.length, openShelf, panelWidth]
  );

  const sceneHeight = panelHeightFor(layout, panelNodes.length, panelWidth);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    requestFrameRef.current?.();
  }, [activeIndex]);

  // The panel opened under the reader's click; the keyboard has to follow
  // it there, or Tab carries on from the card into the page footer. It
  // follows each level too: the reader's attention is on what just changed.
  useEffect(() => {
    panelRef.current?.focus();
  }, [openShelf]);

  /**
   * Escape walks back up a level before it closes anything. AccessAxes
   * listens on the document for the same key and would otherwise take the
   * whole panel down for one wrong turn, so this runs in the capture phase
   * and consumes the event when there is a level to leave — which does not
   * depend on where the focus happens to sit.
   */
  useEffect(() => {
    if (!openShelf) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpenShelf(null);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [openShelf]);

  useEffect(() => {
    if (!graphEnabled) return;

    const panel = panelRef.current;
    if (!panel) return;

    startedAtRef.current = performance.now();

    const measure = () => {
      boxRef.current = {
        width: panel.clientWidth,
        height: panel.clientHeight,
      };
      // The render loop reads the box off the ref every frame; the layout
      // needs it in React, because a narrower panel is a different scene
      // and not only a smaller one.
      setPanelWidth(panel.clientWidth);
    };

    const drawFrame = () => {
      frameRef.current = null;
      const box = boxRef.current;
      if (box.width === 0 || box.height === 0) return;

      const elapsed = performance.now() - startedAtRef.current;
      const tilt = tiltRef.current;
      const target = tiltTargetRef.current;
      tilt.x += (target.x - tilt.x) * TILT_EASE;
      tilt.y += (target.y - tilt.y) * TILT_EASE;

      const entrance = nodes.map((_, index) =>
        entranceProgress(layout, index, elapsed)
      );

      // Not the panel's box: the ring is drawn in a square of its own, so
      // that its modules come out equidistant instead of stretched to
      // whatever proportion the panel happens to have.
      const scene = sceneBox(layout, nodes.length, box);

      const projected = nodes.map((node, index) => {
        const settled = projectNode(node, tilt, scene);
        const arrived = entrance[index];
        // Every module leaves from under the opened card and travels out
        // to its node, so the panel opens from its own centre.
        return {
          x: settled.x * arrived,
          y: settled.y * arrived,
          depth: settled.depth,
          scale: 1 + (settled.scale - 1) * arrived,
        };
      });
      projectedRef.current = projected;

      projected.forEach((node, index) => {
        const card = cardRefs.current[index];
        if (!card) return;
        card.style.transform = `translate3d(${node.x.toFixed(2)}px, ${node.y.toFixed(2)}px, 0) scale(${node.scale.toFixed(3)})`;
        card.style.opacity = entrance[index].toFixed(3);
        card.style.zIndex = String(10 + Math.round(node.depth * 10));
      });

      layerRef.current?.draw({
        nodes: projected,
        entrance,
        activeEdge: activeIndexRef.current,
      });

      const stillArriving = entrance.some((value) => value < 1);
      const stillTurning =
        Math.abs(target.x - tilt.x) > TILT_SETTLED ||
        Math.abs(target.y - tilt.y) > TILT_SETTLED;
      if (stillArriving || stillTurning) requestFrame();
    };

    const requestFrame = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(drawFrame);
    };
    requestFrameRef.current = requestFrame;

    measure();
    requestFrame();

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            measure();
            requestFrame();
          });
    observer?.observe(panel);

    return () => {
      observer?.disconnect();
      requestFrameRef.current = null;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [graphEnabled, layout, nodes]);

  const handleLayerReady = useCallback((layer: AxisGraphLayer | null) => {
    layerRef.current = layer;
    requestFrameRef.current?.();
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!graphEnabled) return;
    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;

    tiltTargetRef.current = {
      x: BASE_TILT_X + (offsetY / (rect.height / 2)) * PARALLAX_X,
      y: (offsetX / (rect.width / 2)) * PARALLAX_Y,
    };

    const overEdge = nearestEdge(
      { x: offsetX, y: offsetY },
      projectedRef.current,
      { x: 0, y: 0 },
      EDGE_TOLERANCE
    );
    if (overEdge !== null && overEdge !== activeIndexRef.current) {
      setActiveIndex(overEdge);
    }
    requestFrameRef.current?.();
  };

  const handlePointerLeave = () => {
    tiltTargetRef.current = { x: BASE_TILT_X, y: 0 };
    setActiveIndex(null);
    requestFrameRef.current?.();
  };

  /**
   * A module's own face. It is the leaf of both levels — a game reached
   * through its shelf, and a lone game promoted in place of one.
   */
  const renderModuleFace = (
    entry: HubModule,
    handlers: {
      onMouseEnter: () => void;
      onFocus: () => void;
      onBlur: () => void;
    }
  ) => {
    const href = getModuleHref(entry, language);
    if (!entry.available || href === null) {
      return (
        <div
          data-testid={`axis-module-unavailable-${entry.id}`}
          className="axis-module-face axis-module-pending"
        >
          <span>{entry.name}</span>
          <span className="axis-module-chip">{t.hubs.unavailableLabel}</span>
        </div>
      );
    }
    return (
      <Link
        href={href}
        data-testid={`axis-module-link-${entry.id}`}
        className="axis-module-face min-h-11"
        {...handlers}
      >
        {entry.name}
      </Link>
    );
  };

  return (
    <section
      ref={panelRef}
      id={`axis-panel-${mode}`}
      data-testid={`axis-panel-${mode}`}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      data-layout={layout}
      style={sceneHeight > 0 ? { minHeight: sceneHeight } : undefined}
      className={cn("axis-panel", ACCENT_BY_ACCESS_MODE[mode])}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {graphEnabled ? (
        <AxisGraphCanvas onLayerReady={handleLayerReady} />
      ) : null}

      {open ? (
        <p className="axis-panel-trail" data-testid="axis-panel-trail">
          <button
            type="button"
            data-testid="axis-panel-back"
            className="axis-panel-back min-h-11"
            onClick={() => setOpenShelf(null)}
          >
            <span aria-hidden="true">&larr;</span> Toutes les familles
          </button>
          <span className="axis-panel-trail-here">{open.group.label}</span>
        </p>
      ) : null}

      <ul className="axis-panel-modules" role="list">
        {panelNodes.map((node, index) => {
          const shared = {
            onMouseEnter: () => setActiveIndex(index),
            onFocus: () => setActiveIndex(index),
            onBlur: () => setActiveIndex(null),
          };

          return (
            <li
              key={node.id}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              data-testid={
                node.kind === "shelf"
                  ? `axis-shelf-${node.id}`
                  : `axis-module-${node.id}`
              }
              data-active={activeIndex === index ? "true" : undefined}
              className="axis-module"
              style={
                graphEnabled ? undefined : { animationDelay: `${index * 60}ms` }
              }
            >
              {node.kind === "shelf" ? (
                <button
                  type="button"
                  data-testid={`axis-shelf-open-${node.id}`}
                  className="axis-module-face axis-shelf-face min-h-11"
                  onClick={() => setOpenShelf(node.id)}
                  {...shared}
                >
                  <span>{node.shelf.group.label}</span>
                  {/* The count and the chevron say the click opens rather
                      than navigates, before the reader spends it. */}
                  <span className="axis-module-chip">
                    {node.shelf.modules.length} jeux
                  </span>
                  <span className="axis-shelf-chevron" aria-hidden="true">
                    &rsaquo;
                  </span>
                </button>
              ) : (
                renderModuleFace(node.module, shared)
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        data-testid={`axis-panel-close-${mode}`}
        className="axis-panel-close min-h-11"
        onClick={onClose}
      >
        Fermer
      </button>

      <style>{`
        .axis-panel {
          position: relative;
          width: 100%;
          outline: none;
        }
        .axis-panel[data-layout="column"] {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 14px;
        }
        /* The height comes from panelHeightFor, inline: the vertical radius
           is a fraction of the panel's half-height, so a scene needs room
           in proportion to how tightly its modules stack. Three hand-tuned
           values here is how the pair layout kept the 420px it was given
           for two modules while rendering eleven. */

        .axis-graph {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .axis-panel-modules {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .axis-panel[data-layout="column"] .axis-panel-modules {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* In the scene every card hangs off the panel centre and is moved
           onto its node by the render loop, so the DOM and the WebGL links
           read the same coordinates. */
        .axis-panel:not([data-layout="column"]) .axis-module {
          position: absolute;
          left: 50%;
          top: 50%;
          margin: ${-MODULE_CARD_HEIGHT / 2}px 0 0 ${-MODULE_CARD_WIDTH / 2}px;
          width: ${MODULE_CARD_WIDTH}px;
          will-change: transform, opacity;
        }
        /* The scene reserves exactly this much room per node, so a card in
           it must not quietly claim more. The numbers the reservation is
           computed from — line height, number of lines, vertical padding —
           come from the same module, so the box and the card cannot
           describe different cards; « Regards : colonisation et
           résistances » takes all three lines, and two was what the card
           used to be given. A column reserves nothing: those rows are
           ordinary flow, and a phone should not spend 91px on a label that
           fits on one line. */
        .axis-panel:not([data-layout="column"]) .axis-module-face {
          min-height: ${MODULE_CARD_HEIGHT}px;
        }


        .axis-module-face {
          display: flex;
          line-height: ${MODULE_CARD_LINE_HEIGHT};
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: ${MODULE_CARD_PADDING_Y}px 18px;
          border: 1px solid var(--accent);
          border-radius: var(--afh-radius-md);
          background: var(--afh-surface);
          color: var(--afh-text);
          font-size: var(--home-text-module-face);
          font-weight: 600;
          text-align: center;
          text-decoration: none;
          transition: background-color var(--afh-duration-fast) var(--afh-ease-out),
            border-color var(--afh-duration-fast) var(--afh-ease-out);
        }
        .axis-module[data-active="true"] .axis-module-face {
          background: var(--accent-tint);
        }
        .axis-module-face:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        /* A shelf reads as a control, not a destination: it carries the
           axis colour as a fill rather than an outline, so the reader can
           tell before spending the click that it opens rather than
           navigates. The count and the chevron say the same thing twice. */
        .axis-shelf-face {
          background: var(--accent-tint);
          border-color: var(--accent);
          font-weight: 700;
          cursor: pointer;
          justify-content: center;
        }
        .axis-shelf-chevron {
          font-size: var(--home-text-shelf-chevron);
          line-height: 1;
          color: var(--accent-ink);
          transition: transform var(--afh-duration-base) var(--afh-ease-out);
        }
        .axis-shelf-face:hover .axis-shelf-chevron {
          transform: translateX(3px);
        }

        /* The trail sits above the scene rather than in it: it says which
           shelf the reader is standing in, and offers the way back that
           Escape also takes. */
        .axis-panel-trail {
          position: absolute;
          left: 0;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          font-size: var(--home-text-panel-trail);
        }
        .axis-panel[data-layout="column"] .axis-panel-trail {
          position: static;
          margin-bottom: 4px;
        }
        .axis-panel-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid var(--afh-border);
          border-radius: 999px;
          background: transparent;
          color: var(--afh-text);
          font-size: var(--home-text-panel-back);
          font-weight: 600;
          cursor: pointer;
        }
        .axis-panel-back:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .axis-panel-trail-here {
          font-weight: 700;
          color: var(--accent-ink);
        }

        /* Pending, not disabled — the same rule the axis cards follow: the
           entry stays visible and readable, only the promise is withdrawn. */
        .axis-module-pending {
          border-color: var(--afh-border);
          color: var(--afh-fg-muted);
          font-weight: 500;
        }
        .axis-module-chip {
          flex: none;
          border-radius: 999px;
          border: 1px solid var(--afh-border);
          padding: 2px 9px;
          font-size: var(--home-text-module-chip);
          font-weight: 600;
        }

        .axis-panel-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 18px auto 0;
          padding: 8px 18px;
          border: 1px solid var(--afh-border);
          border-radius: 999px;
          background: transparent;
          color: var(--afh-text);
          font-size: var(--home-text-panel-close);
          font-weight: 600;
          cursor: pointer;
        }
        .axis-panel:not([data-layout="column"]) .axis-panel-close {
          position: absolute;
          right: 0;
          top: 0;
          margin: 0;
          z-index: 40;
        }
        .axis-panel-close:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        @keyframes axis-module-row-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: none; }
        }
        .axis-panel[data-layout="column"] .axis-module {
          animation: axis-module-row-in var(--afh-duration-slow)
            var(--afh-ease-out) both;
        }
      `}</style>
    </section>
  );
}

export default AxisModulePanel;
