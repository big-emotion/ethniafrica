"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";

import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import type { AtlasOverlay, Ring } from "@/lib/atlas/overlays";
import { BASEMAP_VIEWBOX, projectLonLat } from "@/lib/atlas/projection";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const LazyAtlasGlobeCanvas = dynamic(
  () =>
    import("@/components/atlas/AtlasGlobeCanvas").then(
      (mod) => mod.AtlasGlobeCanvas
    ),
  { ssr: false }
);

function canCreateWebglContext(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

/**
 * REQ-119: a fiche whose overlay resolves to nothing declared (a people
 * missing distributionByCountry, or a country/family absent from the
 * committed admin-0 asset) renders this explicit placeholder — never a
 * silently empty globe.
 */
function AtlasGlobeMissing({ message }: { message: string }) {
  return (
    <div
      className="relative flex h-full w-full items-center justify-center"
      role="status"
    >
      <AfricaBasemap style={{ opacity: 0.25 }} />
      <p
        className="absolute px-6 text-center text-sm"
        style={{ color: "var(--afh-night-ink-2)" }}
      >
        {message}
      </p>
    </div>
  );
}

function ringToSvgPoints(ring: Ring): string {
  return ring
    .map(({ lon, lat }) => {
      const { x, y } = projectLonLat(lon, lat, BASEMAP_VIEWBOX);
      return `${x},${y}`;
    })
    .join(" ");
}

const COUNTRY_TRACE_IN_DURATION_MS = 900;

/**
 * The country outline's SVG counterpart to AtlasGlobeCanvas's shader-driven
 * reveal: pathLength normalises the dash units to 0..1 regardless of the
 * ring's real length, so the outline strokes itself in from a full
 * dashoffset to zero over one CSS transition. Under reduced motion the
 * offset starts at (and stays at) zero — the outline is complete on first
 * paint, never mid-draw.
 */
function TraceInPolygon({
  points,
  reducedMotion,
  ...rest
}: {
  points: string;
  reducedMotion: boolean;
} & SVGProps<SVGPolygonElement>) {
  const [revealed, setRevealed] = useState(reducedMotion);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }
    setRevealed(false);
    frameRef.current = requestAnimationFrame(() => setRevealed(true));
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reducedMotion]);

  return (
    <polygon
      {...rest}
      points={points}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={revealed ? 0 : 1}
      style={
        reducedMotion
          ? undefined
          : {
              transition: `stroke-dashoffset ${COUNTRY_TRACE_IN_DURATION_MS}ms linear`,
            }
      }
    />
  );
}

/**
 * The non-WebGL fallback: same three encodings as AtlasGlobeCanvas, drawn as
 * flat SVG on the committed AfricaBasemap instead of a rotating sphere —
 * atlas-charter §1's rules (a people never gets a closed line) hold exactly
 * as much here as in the WebGL path, because both read the same overlay
 * descriptor and neither can reach into the other's geometry.
 */
function AtlasGlobeFallback({
  overlay,
  reducedMotion,
}: {
  overlay: Exclude<AtlasOverlay, { kind: "people-field-missing" }>;
  reducedMotion: boolean;
}) {
  if (overlay.kind === "people-field") {
    return (
      <AfricaBasemap>
        <defs>
          <radialGradient id="atlas-people-field-gradient">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </radialGradient>
        </defs>
        {overlay.areas.map((area) => {
          const { x, y } = projectLonLat(
            area.center.lon,
            area.center.lat,
            BASEMAP_VIEWBOX
          );
          const radius = 6 + 34 * Math.sqrt(Math.max(area.populationShare, 0));
          return (
            <circle
              key={area.countryId}
              cx={x}
              cy={y}
              r={radius}
              fill="url(#atlas-people-field-gradient)"
              stroke="none"
            />
          );
        })}
      </AfricaBasemap>
    );
  }

  const isCountry = overlay.kind === "country-outline";
  const fillOpacity = isCountry ? overlay.fillOpacity : overlay.tint * 0.35;

  return (
    <AfricaBasemap>
      {overlay.rings.map((ring, index) =>
        isCountry ? (
          <TraceInPolygon
            key={`country-${index}`}
            points={ringToSvgPoints(ring)}
            reducedMotion={reducedMotion}
            fill="var(--accent)"
            fillOpacity={fillOpacity}
            stroke="var(--accent)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <polygon
            key={`family-${index}`}
            points={ringToSvgPoints(ring)}
            fill="var(--accent)"
            fillOpacity={fillOpacity}
            stroke="var(--accent)"
            strokeWidth={1.5}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        )
      )}
    </AfricaBasemap>
  );
}

export interface AtlasGlobeProps {
  overlay: AtlasOverlay | null;
  /** Shown by the REQ-119 missing placeholder; must name what is absent, not just say "missing". */
  missingMessage: string;
  className?: string;
}

/**
 * DEC-022: the globe stage is the one Night surface in the app — every other
 * surface stays on the warm/light palette, but this stage always paints
 * --afh-night-ground behind the globe regardless of the fiche's own
 * per-entity accent (people ocre / country teal / family perv), which keeps
 * governing everything FicheSequence renders around it.
 */
const NIGHT_STAGE_STYLE: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: `${BASEMAP_VIEWBOX.width} / ${BASEMAP_VIEWBOX.height}`,
  backgroundColor: "var(--afh-night-ground)",
  borderRadius: "var(--afh-radius-xl)",
  overflow: "hidden",
};

/**
 * The single public globe component every fiche mounts (ADR-0007): renders
 * whatever overlays.ts hands it, gated on a client-side WebGL capability
 * probe (SSR-safe — the initial render is always the fallback), and renders
 * the REQ-119 declared-missing placeholder instead of an empty globe when
 * the overlay did not resolve.
 */
// @req REQ-116
export function AtlasGlobe({
  overlay,
  missingMessage,
  className,
}: AtlasGlobeProps) {
  const [webglSupported, setWebglSupported] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  if (!overlay || overlay.kind === "people-field-missing") {
    return (
      <div className={cn(className)} style={NIGHT_STAGE_STYLE}>
        <AtlasGlobeMissing message={missingMessage} />
      </div>
    );
  }

  return (
    <div className={cn(className)} style={NIGHT_STAGE_STYLE}>
      {webglSupported ? (
        <LazyAtlasGlobeCanvas overlay={overlay} />
      ) : (
        <AtlasGlobeFallback overlay={overlay} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}

export default AtlasGlobe;
