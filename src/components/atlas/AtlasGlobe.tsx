"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SVGProps,
} from "react";

import { AtlasFactsPanel } from "@/components/atlas/AtlasFactsPanel";
import { AtlasTargetPicker } from "@/components/atlas/AtlasTargetPicker";
import { AfricaBasemap } from "@/components/system/AfricaBasemap";
import { orderedByWeight, peopleFieldIntensity } from "@/lib/atlas/peopleField";
import {
  FLAT_MORPH,
  SPHERE_MORPH,
  poseForTarget,
  type CameraPose,
} from "@/lib/atlas/camera";
import {
  basemapTransform,
  placeTargetOnBasemap,
  placeTargetOnSphere,
  type StagePlacement,
} from "@/lib/atlas/markerPlacement";
import {
  buildCountryOutlineOverlay,
  type AtlasOverlay,
  type LonLat,
  type Ring,
} from "@/lib/atlas/overlays";
import {
  FOOTPRINT_DASH_ARRAY,
  FOOTPRINT_STROKE_WIDTH_SVG,
  FOOTPRINT_STROKE_WIDTH_SVG_FOCUSED,
  footprintFillOpacity,
  footprintStrokeOpacity,
} from "@/lib/atlas/footprintStyle";
import {
  biasForPanel,
  resolvePanelAnchor,
  type PanelAnchor,
} from "@/lib/atlas/panelBias";
import { BASEMAP_VIEWBOX, projectLonLat } from "@/lib/atlas/projection";
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

const FIELD_GRADIENT_ID = "atlas-people-field-gradient";
const FIELD_MIN_RADIUS = 6;
const FIELD_RADIUS_RANGE = 34;

/**
 * Radius ∝ √weight, so the eye reads the blob's area rather than its diameter
 * (atlas-charter §1). A people fiche weighs population and the continent scene
 * weighs documented peoples, but a weight of 1 has to draw the same blob in
 * both — hence one formula, called from both, rather than two that drift.
 */
function fieldRadius(weight: number): number {
  return FIELD_MIN_RADIUS + FIELD_RADIUS_RANGE * Math.sqrt(Math.max(weight, 0));
}

function PeopleFieldDefs() {
  return (
    <defs>
      <radialGradient id={FIELD_GRADIENT_ID}>
        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.9} />
        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
      </radialGradient>
    </defs>
  );
}

/** One country's radial field, reduced to what the drawing needs: a centre and a 0..1 weight. */
interface FieldBlob {
  countryId: CountryId;
  center: LonLat;
  weight: number;
}

/**
 * Circles with no stroke, ever. This component is handed centres and weights
 * and nothing else — it has no ring to close even if a caller wanted one.
 */
function PeopleFieldCircles({
  blobs,
  chosenCountryId,
}: {
  blobs: FieldBlob[];
  chosenCountryId: CountryId | null;
}) {
  return (
    <>
      {/* Largest first, so the smallest presence paints last and survives
          under the big ones. PPL_BANTU declares 21 countries across three
          orders of magnitude; in fiche order a 400-million halo covers a
          200-thousand one and the map silently says that country has none. */}
      {orderedByWeight(blobs, (blob) => blob.weight).map((blob) => {
        const { x, y } = projectLonLat(
          blob.center.lon,
          blob.center.lat,
          BASEMAP_VIEWBOX
        );
        return (
          <circle
            key={blob.countryId}
            cx={x}
            cy={y}
            r={fieldRadius(blob.weight)}
            fill={`url(#${FIELD_GRADIENT_ID})`}
            stroke="none"
            // Read from peopleField.ts, the one place the dim floor lives, so
            // this path and the shader cannot disagree about it.
            opacity={peopleFieldIntensity(blob.countryId, chosenCountryId)}
          />
        );
      })}
    </>
  );
}

/**
 * The non-WebGL fallback: the same encodings as AtlasGlobeCanvas, drawn as
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
  cameraFocus,
  chosenCountryId,
}: {
  overlay: Exclude<AtlasOverlay, { kind: "people-field-missing" }>;
  reducedMotion: boolean;
  pose: CameraPose;
  /** What the camera is pointed at, which is not always what the reader chose — the continent scene never flies. */
  cameraFocus: LonLat | null;
  chosenCountryId: CountryId | null;
}) {
  const figureTransform = basemapTransform(pose, cameraFocus);

  if (overlay.kind === "people-field") {
    return (
      <AfricaBasemap figureTransform={figureTransform}>
        <PeopleFieldDefs />
        <PeopleFieldCircles
          blobs={overlay.areas.map((area) => ({
            countryId: area.countryId,
            center: area.center,
            weight: area.populationShare,
          }))}
          chosenCountryId={chosenCountryId}
        />
      </AfricaBasemap>
    );
  }

  /**
   * The continent scene: a geographic frame that locates, and radial fields
   * that measure. `fill="none"` on every ring is the invariant — a filled
   * country would encode the peoples counted inside it as a closed-border
   * area, which is exactly what atlas-charter §1 forbids for a people. The
   * areas carry no rings at all, so nothing here can outline one.
   */
  if (overlay.kind === "continent-field") {
    return (
      <AfricaBasemap figureTransform={figureTransform}>
        <PeopleFieldDefs />
        {overlay.frame.flatMap((country) =>
          country.rings.map((ring, index) => (
            <polygon
              key={`${country.countryId}-${index}`}
              points={ringToSvgPoints(ring)}
              fill="none"
              stroke="var(--afh-night-line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))
        )}
        <PeopleFieldCircles
          blobs={overlay.areas.map((area) => ({
            countryId: area.countryId,
            center: area.center,
            weight: area.documentedPeopleShare,
          }))}
          chosenCountryId={chosenCountryId}
        />
      </AfricaBasemap>
    );
  }

  // The family footprint is a choropleth: each country carries its own weight,
  // so each gets its own fill and its own stroke. Drawing the rings as one flat
  // list — as this path used to — can only ever produce a single tint, which
  // says "the family is here" and never "this is where it is concentrated".
  if (overlay.kind === "family-footprint") {
    return (
      <AfricaBasemap figureTransform={figureTransform}>
        {overlay.countries.map((country) => {
          const isFocused = chosenCountryId === country.countryId;
          const dimmed = chosenCountryId !== null && !isFocused;

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

  // A country-set (REQ-120) borrows the country outline's solid encoding —
  // the dash is the charter's mark of a *derived* boundary, and a round's
  // choices are not derived from anything. It skips the trace-in reveal all
  // the same: a reader answering a round needs every choice legible on the
  // first frame, not drawing itself in.
  const isTracedCountry = overlay.kind === "country-outline";

  return (
    <AfricaBasemap figureTransform={figureTransform}>
      {overlay.rings.map((ring, index) =>
        isTracedCountry ? (
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
        ) : (
          <polygon
            key={`ring-${index}`}
            points={ringToSvgPoints(ring)}
            fill="var(--accent)"
            fillOpacity={overlay.fillOpacity}
            stroke="var(--accent)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )
      )}
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

/**
 * A target the caller said nothing about still opens, named in French rather
 * than by its ISO code. A globe that refused to answer for a country it drew
 * would be worse than one that answers briefly.
 */
function factsFor(
  target: AtlasTarget,
  facts: Partial<Record<CountryId, AtlasTargetFacts>> | undefined,
  targetFacts: (target: AtlasTarget) => AtlasTargetFacts
): AtlasTargetFacts {
  return facts?.[target.countryId] ?? targetFacts(target);
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
  /**
   * The facts the panel opens with, resolved per target.
   *
   * For callers that are already client components (ExplorerContinent builds
   * a fiche link per country, so it has to be one).
   */
  targetFacts?: (target: AtlasTarget) => AtlasTargetFacts;
  /**
   * Called when the reader chooses a target. The globe keeps owning its own
   * chosen-target state and its facts panel; this only reports the choice
   * outward, so a game can score it without a second globe (REQ-120).
   */
  onTargetChosen?: (target: AtlasTarget) => void;
  /**
   * The same facts as data, keyed by country.
   *
   * A fiche route is a server component and this is a client one, so it
   * cannot hand over a resolver — a builder prop is unusable from there
   * without wrapping the globe in a client component whose only job is to
   * carry static facts across. Where both are given, this wins. A country in
   * neither still opens, named in French.
   */
  facts?: Partial<Record<CountryId, AtlasTargetFacts>>;
  /**
   * What the flat map is showing, for the non-WebGL path only. AfricaBasemap
   * is aria-hidden, so without this a reader on that path is told nothing at
   * all about what replaced the globe.
   */
  fallbackNote?: string;
  /**
   * What returning from a chosen country is called. A family has a footprint
   * and a people has an area — the mockups use different words because the
   * entities are different things, not because the button is.
   */
  wholeAreaLabel?: string;
  /**
   * What the target picker calls the area, written to follow "de" —
   * `l'empreinte` for a family, `présence` for a people. Same reason as
   * `wholeAreaLabel`: the entities differ, so the mockups word the control
   * differently.
   */
  areaNoun?: string;
  className?: string;
  /**
   * How a target is offered. "markers" pins a pastille on each one, which reads
   * well for the one or few targets a country or people fiche has. "list" is
   * for a family footprint of seventeen countries, where the pastilles overlap
   * into noise and the small ones stop being clickable.
   */
  targetPicker?: "markers" | "list";
  /**
   * What the reader may choose, when that is wider than what is drawn.
   *
   * A country fiche traces one country but offers the whole corpus: the mockup
   * keeps the choice inside the page rather than sending the reader to another
   * fiche, so the picker has to name countries this overlay says nothing
   * about. Absent, the choosable set is the drawn one, which is what the
   * people, family and continent overlays want.
   */
  pickerTargets?: AtlasTarget[];
  /** Replaces the default legend, for a fiche whose drawing needs a different sentence. */
  legend?: ReactNode;
}

/**
 * DEC-022: the globe stage is the one Night surface in the app — every other
 * surface stays on the warm/light palette, but this stage always paints
 * --afh-night-ground behind the globe regardless of the fiche's own
 * per-entity accent (people ocre / country teal / family perv), which keeps
 * governing everything FicheSequence renders around it.
 */
/** Matched to HomeGlobe, so the same drag travels the same distance on both. */
const DRAG_RADIANS_PER_PIXEL = 0.006;
const DRAG_PITCH_RADIANS_PER_PIXEL = 0.004;
const KEY_STEP_RADIANS = 0.12;
const PITCH_LIMIT_RADIANS = 1.1;

function clampPitch(pitch: number): number {
  return Math.min(PITCH_LIMIT_RADIANS, Math.max(-PITCH_LIMIT_RADIANS, pitch));
}

const GLOBE_SURFACE_LABEL =
  "Globe de l'atlas. Glissez ou utilisez les flèches pour tourner.";

const NIGHT_STAGE_STYLE: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "var(--afh-globe-stage-height)",
  backgroundColor: "var(--afh-night-ground)",
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
// @req REQ-120
export function AtlasGlobe({
  overlay,
  missingMessage,
  targetFacts = defaultTargetFacts,
  onTargetChosen,
  facts,
  fallbackNote,
  wholeAreaLabel = "Toute l'empreinte",
  areaNoun = "l'empreinte",
  className,
  targetPicker = "markers",
  pickerTargets,
  legend,
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
  // Read off the overlay rather than passed in: the counts and the targets have
  // to describe the same footprint, and deriving both from one source is what
  // guarantees it.
  const memberCountByCountry = useMemo(() => {
    if (overlay?.kind !== "family-footprint") return {};
    return Object.fromEntries(
      overlay.countries.map((country) => [
        country.countryId,
        country.memberCount,
      ])
    );
  }, [overlay]);
  // Resolving the choice against the current targets is also what retires it:
  // an id the overlay no longer offers simply finds nothing, so a stale choice
  // cannot outlive the overlay that made it choosable.
  // Wider than `targets` only where a caller says so. Both still retire a
  // stale choice the same way: an id nothing offers resolves to nothing.
  const choosableTargets = pickerTargets ?? targets;
  const chosen =
    choosableTargets.find((target) => target.countryId === chosenCountryId) ??
    null;

  /**
   * On a country fiche the closed line *is* the subject, so it follows the
   * choice. Leaving it on the fiche's own country would fly the reader to
   * Kenya while the map went on tracing South Africa, which reads as a bug
   * rather than as a choice.
   *
   * Only this overlay moves: a people field and a family footprint describe
   * their entity's whole extent, and choosing a country inside one of them
   * narrows the reading rather than replacing the subject.
   */
  const drawnOverlay = useMemo(() => {
    if (overlay?.kind !== "country-outline") return overlay;
    if (!chosenCountryId || chosenCountryId === overlay.countryId)
      return overlay;
    return buildCountryOutlineOverlay(chosenCountryId) ?? overlay;
  }, [overlay, chosenCountryId]);

  /**
   * The continent scene is already framed on its whole subject, so choosing a
   * country reveals facts without moving the map: every other marker stays
   * where the reader last saw it, and picking a second one stays one click
   * rather than a hunt. Holding the camera still is the same route reduced
   * motion takes — pose is IDLE_POSE and no frame loop ever starts.
   */
  const cameraFollowsChoice = overlay?.kind !== "continent-field";
  const cameraFocus = cameraFollowsChoice ? chosen : null;

  const destination = useMemo(
    () =>
      cameraFocus ? poseForTarget(cameraFocus, biasForPanel(anchor)) : null,
    [cameraFocus, anchor]
  );
  const flown = useGlobeCamera(
    destination,
    reducedMotion || !cameraFollowsChoice
  );

  // What the reader has done to the camera on top of wherever it flew.
  // Kept as a delta rather than an absolute pose so a later fly-to still
  // lands on its target: choosing a country is not undone by having
  // dragged the globe first.
  const [turn, setTurn] = useState({ yaw: 0, pitch: 0 });
  const [flat, setFlat] = useState(false);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const pose: CameraPose = {
    ...flown,
    yaw: flown.yaw + turn.yaw,
    pitch: clampPitch(flown.pitch + turn.pitch),
    morph: flat ? FLAT_MORPH : SPHERE_MORPH,
  };

  const turnBy = (dYaw: number, dPitch: number) =>
    setTurn((current) => ({
      yaw: current.yaw + dYaw,
      pitch: clampPitch(current.pitch + dPitch),
    }));

  const recentre = () => {
    setTurn({ yaw: 0, pitch: 0 });
    setFlat(false);
    setChosenCountryId(null);
  };

  // Both pickers land here so a caller watching for choices — a game round
  // waiting on a tap (REQ-120) — is notified whichever one the fiche mounted.
  const chooseTarget = (countryId: CountryId) => {
    setChosenCountryId(countryId);
    const target = choosableTargets.find(
      (candidate) => candidate.countryId === countryId
    );
    if (target) onTargetChosen?.(target);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    // Under a finger the surface has to keep up with the finger, so a drag
    // moves the globe itself rather than a target it eases toward.
    turnBy(dx * DRAG_RADIANS_PER_PIXEL, dy * DRAG_PITCH_RADIANS_PER_PIXEL);
  };

  const stopDragging = () => {
    dragging.current = false;
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
        turnBy(-KEY_STEP_RADIANS, 0);
        break;
      case "ArrowRight":
        turnBy(KEY_STEP_RADIANS, 0);
        break;
      // Same convention as the drag: up sends the surface up, which is a
      // decrease in pitch.
      case "ArrowUp":
        turnBy(0, -KEY_STEP_RADIANS);
        break;
      case "ArrowDown":
        turnBy(0, KEY_STEP_RADIANS);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  if (!drawnOverlay || drawnOverlay.kind === "people-field-missing") {
    return (
      <div className={cn(className)} style={NIGHT_STAGE_STYLE}>
        <AtlasGlobeMissing message={missingMessage} />
      </div>
    );
  }

  // The continent scene stays on the SVG stage even where WebGL is
  // available: the canvas does not draw its radial field, so climbing to it
  // would trade the one signal the scene carries for a bare frame. Raising
  // the sphere under the continent is step B of the plan, and it is gated
  // on marker legibility, TTFB and Lighthouse budgets not yet measured.
  const stageIsSphere =
    webglSupported && drawnOverlay.kind !== "continent-field";

  // A picker with one entry offers a choice that is not one, and the button
  // that returns from a choice has nothing to return to. 394 of the corpus's
  // 789 people fiches declare exactly one country; the markers stand in.
  const offersList = targetPicker === "list" && choosableTargets.length > 1;

  const chosenFacts = chosen ? factsFor(chosen, facts, targetFacts) : null;
  const place = (target: AtlasTarget): StagePlacement =>
    stageIsSphere
      ? placeTargetOnSphere(target, pose)
      : placeTargetOnBasemap(target, pose, cameraFocus?.center ?? null);

  return (
    <div
      ref={setStage}
      data-atlas-stage=""
      data-atlas-drawn-country={
        drawnOverlay.kind === "country-outline"
          ? drawnOverlay.countryId
          : undefined
      }
      className={cn(className)}
      style={NIGHT_STAGE_STYLE}
    >
      {/* The canvas below stays aria-hidden — it is paint. This element is
          what the reader actually operates, which is why the name, the role
          and every handler live here rather than on the canvas. */}
      <div
        data-atlas-surface=""
        role="application"
        aria-label={GLOBE_SURFACE_LABEL}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 cursor-grab touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current active:cursor-grabbing"
      />

      {stageIsSphere ? (
        <LazyAtlasGlobeCanvas
          overlay={drawnOverlay}
          pose={pose}
          focusedCountryId={chosenCountryId}
        />
      ) : (
        <AtlasGlobeFallback
          overlay={drawnOverlay}
          reducedMotion={reducedMotion}
          pose={pose}
          cameraFocus={cameraFocus?.center ?? null}
          chosenCountryId={chosenCountryId}
        />
      )}

      {/* AfricaBasemap is aria-hidden, so on the path without WebGL this
          sentence is the whole of what a screen reader learns about the map
          that replaced the globe. */}
      {!stageIsSphere && fallbackNote && (
        <p
          data-atlas-fallback-note=""
          className="pointer-events-none absolute inset-x-0 bottom-12 px-3 text-xs"
          style={{ color: "var(--afh-night-ink-2)" }}
        >
          {fallbackNote}
        </p>
      )}

      {(targetPicker === "markers" || !offersList) &&
        targets.map((target) => (
          <AtlasTargetMarker
            key={target.countryId}
            target={target}
            placement={place(target)}
            chosen={target.countryId === chosenCountryId}
            label={factsFor(target, facts, targetFacts).title}
            onChoose={() => chooseTarget(target.countryId)}
          />
        ))}

      {offersList && (
        <div className="absolute left-1/2 top-3 z-[7] -translate-x-1/2">
          <AtlasTargetPicker
            targets={choosableTargets}
            memberCountByCountry={memberCountByCountry}
            chosenCountryId={chosenCountryId}
            onChoose={chooseTarget}
            areaNoun={areaNoun}
          />
        </div>
      )}

      {/* Hidden below the panel breakpoint, as in the mockup: at that width
          the bottom sheet already owns the space these would sit in. */}
      {legend ?? (
        <p
          data-atlas-legend=""
          className="pointer-events-none absolute inset-x-0 top-0 hidden p-3 text-xs min-[760px]:block"
          style={{ color: "var(--afh-night-ink-2)" }}
        >
          Afrique à sa surface réelle. Glissez pour tourner.
        </p>
      )}

      <div
        data-atlas-toolbar=""
        className="absolute inset-x-0 bottom-0 hidden justify-center gap-2 p-3 min-[760px]:flex"
      >
        {offersList && drawnOverlay.kind !== "country-outline" && (
          <button
            type="button"
            aria-pressed={chosenCountryId === null}
            onClick={() => setChosenCountryId(null)}
            className="rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            style={{ color: "var(--afh-night-ink-2)" }}
          >
            {wholeAreaLabel}
          </button>
        )}
        <button
          type="button"
          aria-pressed={flat}
          onClick={() => setFlat((current) => !current)}
          className="rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          style={{ color: "var(--afh-night-ink-2)" }}
        >
          {flat ? "Revenir au globe" : "Ce que la carte plate en fait"}
        </button>
        <button
          type="button"
          onClick={recentre}
          className="rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          style={{ color: "var(--afh-night-ink-2)" }}
        >
          Recentrer
        </button>
      </div>

      {chosenFacts && (
        <AtlasFactsPanel
          open
          anchor={anchor}
          container={stage}
          title={chosenFacts.title}
          description={chosenFacts.description}
          onClose={() => setChosenCountryId(null)}
        >
          {chosenFacts.body}
        </AtlasFactsPanel>
      )}
    </div>
  );
}

export default AtlasGlobe;
