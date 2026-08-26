"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";

import { AtlasFactsPanel } from "@/components/atlas/AtlasFactsPanel";
import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { poseForTarget, type CameraPose } from "@/lib/atlas/camera";
import {
  basemapTransform,
  placeTargetOnBasemap,
  placeTargetOnSphere,
  type StagePlacement,
} from "@/lib/atlas/markerPlacement";
import type { AtlasOverlay, Ring } from "@/lib/atlas/overlays";
import {
  biasForPanel,
  resolvePanelAnchor,
  type PanelAnchor,
} from "@/lib/atlas/panelBias";
import { BASEMAP_VIEWBOX, projectLonLat } from "@/lib/atlas/projection";
import {
  FOOTPRINT_DASH_ARRAY,
  FOOTPRINT_STROKE_WIDTH_SVG,
  FOOTPRINT_STROKE_WIDTH_SVG_FOCUSED,
  footprintFillOpacity,
  footprintStrokeOpacity,
} from "@/lib/atlas/footprintStyle";
import { buildAtlasTargets, type AtlasTarget } from "@/lib/atlas/targets";
import type { CountryId } from "@/types/afrik";
import { useGlobeCamera } from "@/hooks/use-globe-camera";
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
 *
 * REQ-117 parity: the camera reaches this path too. A sphere rotation means
 * nothing on a flat map, so the pose arrives as the equivalent pan and scale —
 * which is what lets the fallback honour the panel bias rather than parking
 * the chosen subject underneath the panel.
 */
function AtlasGlobeFallback({
  overlay,
  reducedMotion,
  pose,
  focus,
}: {
  overlay: Exclude<AtlasOverlay, { kind: "people-field-missing" }>;
  reducedMotion: boolean;
  pose: CameraPose;
  focus: AtlasTarget | null;
}) {
  const figureTransform = basemapTransform(pose, focus?.center ?? null);

  if (overlay.kind === "people-field") {
    return (
      <AfricaBasemap figureTransform={figureTransform}>
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
              opacity={focus && focus.countryId !== area.countryId ? 0.4 : 1}
            />
          );
        })}
      </AfricaBasemap>
    );
  }

  // The family footprint is a choropleth: each country carries its own weight,
  // so each gets its own fill and its own stroke. Drawing the rings as one flat
  // list — as this path used to — can only ever produce a single tint, which
  // says "the family is here" and never "this is where it is concentrated".
  if (overlay.kind === "family-footprint") {
    const focusedCountryId = focus?.countryId ?? null;

    return (
      <AfricaBasemap figureTransform={figureTransform}>
        {overlay.countries.map((country) => {
          const isFocused = focusedCountryId === country.countryId;
          const dimmed = focusedCountryId !== null && !isFocused;

          return (
            <g key={country.countryId} data-country={country.countryId}>
              {country.rings.map((ring, index) => (
                <polygon
                  key={index}
                  points={ringToSvgPoints(ring)}
                  fill="var(--accent)"
                  fillOpacity={footprintFillOpacity({
                    weight: country.weight,
                    dimmed,
                  })}
                  stroke={isFocused ? "var(--accent-tint)" : "var(--accent)"}
                  strokeOpacity={footprintStrokeOpacity(dimmed)}
                  strokeWidth={
                    isFocused
                      ? FOOTPRINT_STROKE_WIDTH_SVG_FOCUSED
                      : FOOTPRINT_STROKE_WIDTH_SVG
                  }
                  // The boundary of an aggregate of presences, not a border.
                  strokeDasharray={FOOTPRINT_DASH_ARRAY}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          );
        })}
      </AfricaBasemap>
    );
  }

  return (
    <AfricaBasemap figureTransform={figureTransform}>
      {overlay.rings.map((ring, index) => (
        <TraceInPolygon
          key={`country-${index}`}
          points={ringToSvgPoints(ring)}
          reducedMotion={reducedMotion}
          fill="var(--accent)"
          fillOpacity={overlay.fillOpacity}
          stroke="var(--accent)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </AfricaBasemap>
  );
}

/** What a fiche puts in the panel when one of its targets is chosen. */
export interface AtlasTargetFacts {
  title: string;
  description?: string;
  body?: ReactNode;
}

/**
 * REQ-117 draws the line here: this story owns the container and the geometry,
 * each fiche owns what goes inside. Absent a resolver, a target still names
 * itself in French rather than showing an ISO code.
 */
function defaultTargetFacts(target: AtlasTarget): AtlasTargetFacts {
  return { title: target.nameFr };
}

const MARKER_DIAMETER_PX = 22;

/**
 * A target on the far side of the sphere still projects onto the disc, so it
 * is dimmed rather than removed: hiding it would make it unreachable by
 * keyboard, and under reduced motion — where the globe never drifts round —
 * unreachable would mean permanently unreachable.
 */
function AtlasTargetMarker({
  target,
  placement,
  chosen,
  label,
  onChoose,
}: {
  target: AtlasTarget;
  placement: StagePlacement;
  chosen: boolean;
  label: string;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      data-atlas-target={target.countryId}
      data-atlas-target-chosen={chosen ? "true" : undefined}
      aria-pressed={chosen}
      onClick={onChoose}
      className="absolute rounded-full border transition-opacity focus-visible:outline-none focus-visible:ring-2"
      style={{
        left: `${placement.leftPercent}%`,
        top: `${placement.topPercent}%`,
        width: MARKER_DIAMETER_PX,
        height: MARKER_DIAMETER_PX,
        marginLeft: -MARKER_DIAMETER_PX / 2,
        marginTop: -MARKER_DIAMETER_PX / 2,
        backgroundColor: chosen ? "var(--accent)" : "var(--afh-night-surface)",
        borderColor: "var(--accent)",
        opacity: placement.facingReader ? 1 : 0.35,
      }}
    >
      <span className="sr-only">{label}</span>
    </button>
  );
}

export interface AtlasGlobeProps {
  overlay: AtlasOverlay | null;
  /** Shown by the REQ-119 missing placeholder; must name what is absent, not just say "missing". */
  missingMessage: string;
  /** The facts the panel opens with for a chosen target. */
  targetFacts?: (target: AtlasTarget) => AtlasTargetFacts;
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
 * Which anchoring the panel takes. It starts as the bottom sheet because the
 * project is mobile-first and the server cannot measure a viewport — the wider
 * side panel is an upgrade applied once the client knows its own width.
 */
function usePanelAnchor(): PanelAnchor {
  const [anchor, setAnchor] = useState<PanelAnchor>("bottom");

  useEffect(() => {
    const read = () => setAnchor(resolvePanelAnchor(window.innerWidth));
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);

  return anchor;
}

/**
 * The single public globe component every fiche mounts (ADR-0007): renders
 * whatever overlays.ts hands it, gated on a client-side WebGL capability
 * probe (SSR-safe — the initial render is always the fallback), and renders
 * the REQ-119 declared-missing placeholder instead of an empty globe when
 * the overlay did not resolve.
 *
 * It is also the one place the camera lives (ARCH-015). Choosing a target
 * flies the camera to it and opens the facts panel; the bias the camera flies
 * with is derived from the very fractions the panel sizes itself by, which is
 * what keeps the subject out from under it at every breakpoint.
 */
// @req REQ-116
// @req REQ-117
export function AtlasGlobe({
  overlay,
  missingMessage,
  targetFacts = defaultTargetFacts,
  className,
}: AtlasGlobeProps) {
  const [webglSupported, setWebglSupported] = useState(false);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [chosenCountryId, setChosenCountryId] = useState<CountryId | null>(
    null
  );
  const reducedMotion = usePrefersReducedMotion();
  const anchor = usePanelAnchor();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  const targets = useMemo(() => buildAtlasTargets(overlay), [overlay]);
  // Resolving the choice against the current targets is also what retires it:
  // an id the overlay no longer offers simply finds nothing, so a stale choice
  // cannot outlive the overlay that made it choosable.
  const chosen =
    targets.find((target) => target.countryId === chosenCountryId) ?? null;

  const destination = useMemo(
    () => (chosen ? poseForTarget(chosen, biasForPanel(anchor)) : null),
    [chosen, anchor]
  );
  const pose = useGlobeCamera(destination, reducedMotion);

  if (!overlay || overlay.kind === "people-field-missing") {
    return (
      <div className={cn(className)} style={NIGHT_STAGE_STYLE}>
        <AtlasGlobeMissing message={missingMessage} />
      </div>
    );
  }

  const facts = chosen ? targetFacts(chosen) : null;
  const place = (target: AtlasTarget): StagePlacement =>
    webglSupported
      ? placeTargetOnSphere(target, pose)
      : placeTargetOnBasemap(target, pose, chosen?.center ?? null);

  return (
    <div
      ref={setStage}
      data-atlas-stage=""
      className={cn(className)}
      style={NIGHT_STAGE_STYLE}
    >
      {webglSupported ? (
        <LazyAtlasGlobeCanvas overlay={overlay} pose={pose} />
      ) : (
        <AtlasGlobeFallback
          overlay={overlay}
          reducedMotion={reducedMotion}
          pose={pose}
          focus={chosen}
        />
      )}

      {targets.map((target) => (
        <AtlasTargetMarker
          key={target.countryId}
          target={target}
          placement={place(target)}
          chosen={target.countryId === chosenCountryId}
          label={targetFacts(target).title}
          onChoose={() => setChosenCountryId(target.countryId)}
        />
      ))}

      {facts && (
        <AtlasFactsPanel
          open
          anchor={anchor}
          container={stage}
          title={facts.title}
          description={facts.description}
          onClose={() => setChosenCountryId(null)}
        >
          {facts.body}
        </AtlasFactsPanel>
      )}
    </div>
  );
}

export default AtlasGlobe;
