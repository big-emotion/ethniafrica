import { BASEMAP_VIEWBOX } from "@/lib/atlas/projection";
import { AFRICA_LANDMASS_PATH } from "@/lib/atlas/assets/africaLandmassPath";
import { cn } from "@/lib/utils";

/**
 * How long a navigation may take before the wait is worth reporting.
 *
 * Below roughly a quarter of a second a reader reads the transition as
 * instant, and an indicator shown inside that window is a flash: it appears
 * and is taken away before it can be read, which is exactly the failure the
 * home hero shipped with when it painted its basemap during the globe's
 * chunk download. So the figure is rendered immediately — App Router needs it
 * in the tree to swap it in at all — but stays at zero opacity until this
 * threshold has passed. A fast fiche therefore shows nothing whatsoever.
 */
// @req REQ-104
export const LOADER_REVEAL_DELAY_MS = 300;

/** The rise takes a full breath: fast enough to read as alive, slow enough not to nag. */
const INK_CYCLE_MS = 1600;

export interface AfricaTraceLoaderProps {
  /**
   * What is being waited for, in the reader's words — "Chargement de la fiche
   * peuple", not "Chargement". A screen reader announces this and nothing
   * else, so a bare "loading" leaves its user with less than the sighted
   * reader gets from the surrounding page.
   */
  label: string;
  className?: string;
  /**
   * Render the figure as ornament rather than as the wait itself.
   *
   * `DidYouKnowLoader` already owns the live region that announces the wait,
   * and nesting a second one inside it makes a screen reader arbitrate
   * between two status messages for one navigation. Decorative drops the role
   * and the label so the continent stays what it is there — the only thing
   * still moving once the fact has finished unveiling.
   */
  decorative?: boolean;
}

/**
 * The wait state of the atlas: Africa's committed coastline, inked from south
 * to north in the accent of the surface it sits on (REQ-104).
 *
 * The figure is the same `AFRICA_LANDMASS_PATH` the basemap and the WebGL
 * fallback draw, so the wait belongs to the same cartographic grammar as the
 * page it precedes rather than being a spinner borrowed from a component kit.
 *
 * The rise is a CSS `clip-path: inset()` rather than an SVG `clipPath`
 * element, because the latter needs a document-unique id and this component
 * has no hook to mint one — it must stay renderable from a server component.
 */
// @req REQ-104
export function AfricaTraceLoader({
  label,
  className,
  decorative = false,
}: AfricaTraceLoaderProps) {
  return (
    <div
      className={cn("afh-atl", className)}
      role={decorative ? undefined : "status"}
      aria-hidden={decorative ? "true" : undefined}
    >
      <svg
        className="afh-atl-figure"
        aria-hidden="true"
        viewBox={`0 0 ${BASEMAP_VIEWBOX.width} ${BASEMAP_VIEWBOX.height}`}
      >
        <path className="afh-atl-coast" d={AFRICA_LANDMASS_PATH} />
        <path className="afh-atl-ink" d={AFRICA_LANDMASS_PATH} />
      </svg>
      {!decorative && <span className="sr-only">{label}</span>}
      <style>{`
        .afh-atl {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .afh-atl-figure {
          width: min(46%, 260px);
          height: auto;
          /* The "both" fill mode holds the figure at zero opacity through the
             delay above. Without it the reveal starts painted and the delay
             buys nothing. */
          animation: afh-atl-reveal var(--afh-duration-fade) var(--afh-ease-out)
            ${LOADER_REVEAL_DELAY_MS}ms both;
        }
        .afh-atl-coast {
          fill: none;
          stroke: var(--accent);
          stroke-width: 2;
          opacity: 0.35;
          vector-effect: non-scaling-stroke;
        }
        .afh-atl-ink {
          fill: var(--accent);
          opacity: 0.85;
          animation: afh-atl-ink ${INK_CYCLE_MS}ms var(--afh-ease-in-out)
            ${LOADER_REVEAL_DELAY_MS}ms infinite alternate both;
        }
        @keyframes afh-atl-reveal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes afh-atl-ink {
          from { clip-path: inset(100% 0 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        /* Charter §6: only opacity survives reduced motion. The reveal is an
           opacity fade and stays; the rise is a moving edge and does not, so
           the continent simply sits fully inked. The delay is not motion —
           it is a perception threshold — so it survives here too. */
        @media (prefers-reduced-motion: reduce) {
          .afh-atl-ink {
            animation: none;
            clip-path: none;
          }
        }
      `}</style>
    </div>
  );
}
