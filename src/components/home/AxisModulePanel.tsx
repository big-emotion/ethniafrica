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
} from "@/lib/hubs/moduleRegistry";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import type { AxisGraphLayer } from "@/lib/home/axisGraphLayer";
import {
  BASE_TILT_X,
  LAYOUT_BY_AXIS,
  MODULE_CARD_HEIGHT,
  MODULE_CARD_WIDTH,
  entranceProgress,
  layoutNodes,
  nearestEdge,
  panelHeightFor,
  projectNode,
  type PanelBox,
  type ProjectedNode,
  type Tilt,
} from "@/lib/home/axisGraphGeometry";
import type { Language } from "@/types/shared";

/**
 * Below this the panel stops being a scene and becomes a list: the modules
 * stack as full-width rows, with no canvas and no transforms. It is the
 * same 860px the three axis cards already fold at, and it keeps a second
 * WebGL context off every phone rather than only the smallest ones.
 */
const GRAPH_MIN_WIDTH = 860;

/** How far the pointer can swing the scene, in radians. */
const PARALLAX_X = 0.16;
const PARALLAX_Y = 0.3;

/** Per-frame approach to the target tilt, as HomeGlobe eases its rotation. */
const TILT_EASE = 0.09;
const TILT_SETTLED = 0.0006;

/** Pointer slack, in pixels, for lighting up an edge. */
const EDGE_TOLERANCE = 12;

function useGraphEnabled(reducedMotion: boolean): boolean {
  const [wideEnough, setWideEnough] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${GRAPH_MIN_WIDTH}px)`);
    const onChange = () => setWideEnough(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return wideEnough && !reducedMotion;
}

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
  const layout = graphEnabled ? LAYOUT_BY_AXIS[mode] : "column";

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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

  const nodes = useMemo(
    () => layoutNodes(layout, modules.length),
    [layout, modules.length]
  );

  const sceneHeight = panelHeightFor(layout, modules.length);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    requestFrameRef.current?.();
  }, [activeIndex]);

  // The panel opened under the reader's click; the keyboard has to follow
  // it there, or Tab carries on from the card into the page footer.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

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

      const projected = nodes.map((node, index) => {
        const settled = projectNode(node, tilt, box);
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

      <ul className="axis-panel-modules" role="list">
        {modules.map((module, index) => {
          const href = getModuleHref(module, language);
          const live = module.available && href !== null;
          const shared = {
            className: "axis-module-face min-h-11",
            onMouseEnter: () => setActiveIndex(index),
            onFocus: () => setActiveIndex(index),
            onBlur: () => setActiveIndex(null),
          };

          return (
            <li
              key={module.id}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              data-testid={`axis-module-${module.id}`}
              data-active={activeIndex === index ? "true" : undefined}
              className="axis-module"
              style={
                graphEnabled ? undefined : { animationDelay: `${index * 60}ms` }
              }
            >
              {live ? (
                <Link
                  href={href}
                  data-testid={`axis-module-link-${module.id}`}
                  {...shared}
                >
                  {module.name}
                </Link>
              ) : (
                <div
                  data-testid={`axis-module-unavailable-${module.id}`}
                  className="axis-module-face axis-module-pending"
                >
                  <span>{module.name}</span>
                  <span className="axis-module-chip">
                    {t.hubs.unavailableLabel}
                  </span>
                </div>
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

        .axis-module-face {
          display: flex;
          /* The geometry reserves exactly this much room per card, so a
             label wrapping to two lines must not quietly claim more. */
          min-height: ${MODULE_CARD_HEIGHT}px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 14px 18px;
          border: 1px solid var(--accent);
          border-radius: var(--afh-radius-md);
          background: var(--afh-surface);
          color: var(--afh-text);
          font-size: 15px;
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
          font-size: 11px;
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
          font-size: 13px;
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
