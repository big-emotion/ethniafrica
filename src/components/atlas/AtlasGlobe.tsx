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
  IDLE_POSE,
  MIN_ZOOM,
  READER_MAX_ZOOM,
  SPHERE_MORPH,
  ZOOM_STEP,
  poseForTarget,
  type CameraPose,
} from "@/lib/atlas/camera";
import {
  basemapTransform,
  nearestFacingTarget,
  placeTargetOnBasemap,
  placeTargetOnSphere,
  spaceOutMarks,
  STAGE_ASPECT,
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
  NO_BIAS,
  biasForPanel,
  resolvePanelAnchor,
  type PanelAnchor,
} from "@/lib/atlas/panelBias";
import { BASEMAP_VIEWBOX, projectLonLat } from "@/lib/atlas/projection";
import {
  buildAtlasTargets,
  enclosingFrame,
  type AtlasTarget,
} from "@/lib/atlas/targets";
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

// `pointer-events-auto` because the row they sit in is transparent to the
// pointer: it is pinned `inset-x-0` across the bottom of the stage, so solid it
// swallowed every tap in that band, and the stage is now how a reader selects a
// country. Carried on the shared class so a button added to the toolbar later
// cannot forget it and land dead.
const TOOLBAR_BUTTON_CLASS =
  "pointer-events-auto rounded-full border px-3 py-1 text-afh-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current";

/**
 * The zoom pair says its business with a glyph, so it is centred in a pill the
 * width of the shortest lettered one rather than being padded to fit a word.
 */
const ZOOM_BUTTON_CLASS = `${TOOLBAR_BUTTON_CLASS} flex min-w-9 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40`;

/**
 * The controls carry the stage's own ground rather than sitting on whatever
 * happens to be behind them. Night ink over the parchment basemap is barely
 * visible — « Recentrer » already disappeared whenever the map reached the
 * bottom of the stage — and a zoom control makes that the normal case rather
 * than the edge one: coming closer is precisely what fills the stage with
 * parchment. Mixed rather than opaque, at the strength HomeGlobe's own pill
 * uses, so the control reads as a control without punching a hole in the map.
 */
const TOOLBAR_BUTTON_STYLE: CSSProperties = {
  color: "var(--afh-night-ink-2)",
  backgroundColor:
    "color-mix(in srgb, var(--afh-night-ground) 88%, transparent)",
};

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
 * The basemap fits the band it stands in.
 *
 * AfricaBasemap defaults to `h-auto w-full` plus its own aspect ratio, so its
 * height follows the stage's *width*. The stage is a fixed band — 520px on a
 * laptop — with `overflow: hidden`, so at 1512px wide the map wanted 1433px of
 * height and the reader saw its top third: the Mediterranean and the Sahara,
 * and none of the continent below them.
 *
 * Fixing the band instead of the figure was the wrong way round — space.css
 * records why the band is fixed, and an aspect-ratio stage grew taller the
 * wider the viewport got. So the figure is constrained: with both dimensions
 * set, the SVG's own `preserveAspectRatio` centres the whole map inside the
 * band and leaves the night ground on either side. placeTargetOnBasemap walks
 * the same letterbox, so the markers stay over the shapes they name.
 */
const FALLBACK_BASEMAP_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
};

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
      <AfricaBasemap style={{ ...FALLBACK_BASEMAP_STYLE, opacity: 0.25 }} />
      <p
        className="absolute px-6 text-center text-afh-small"
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
      <AfricaBasemap
        figureTransform={figureTransform}
        style={FALLBACK_BASEMAP_STYLE}
      >
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
      <AfricaBasemap
        figureTransform={figureTransform}
        style={FALLBACK_BASEMAP_STYLE}
      >
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
      <AfricaBasemap
        figureTransform={figureTransform}
        style={FALLBACK_BASEMAP_STYLE}
      >
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
    <AfricaBasemap
      figureTransform={figureTransform}
      style={FALLBACK_BASEMAP_STYLE}
    >
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
  /**
   * Shown beside the title, never instead of it. The mockup flies the
   * country's flag here; it is decoration over a name the panel already
   * states, so it carries no accessible text of its own.
   */
  icon?: ReactNode;
  /**
   * The one-line figure this country carries in the picker, before it is
   * chosen — the fiche's own measure of it, since the overlay has none that
   * is true. A people field's `populationShare` is normalised over the
   * largest drawn country, so it sizes halos and is not a share of anything;
   * the fiche reads the real figure from its demography instead.
   */
  subtitle?: string;
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

/**
 * How wide a choice mark draws, and therefore how far apart two of them have
 * to sit. Small on purpose: it says "this country opens", never how much the
 * corpus holds there — that claim belongs to the radial field, and a mark
 * large enough to be mistaken for one would make the scene assert a count it
 * has not measured.
 */
const CHOICE_MARK_DIAMETER_PX = 7;

/** The dark ring that separates the dot from the tan of a landmass under it. */
const CHOICE_MARK_RING_PX = 1.5;

/**
 * How far apart two marks have to sit: the whole drawn width, ring included.
 * Measured on the dot alone, two neighbours were spaced so their rings still
 * overlapped, which is the smudge the separation exists to prevent.
 */
const CHOICE_MARK_SEPARATION_PX =
  CHOICE_MARK_DIAMETER_PX + 2 * CHOICE_MARK_RING_PX;

/**
 * A country the reader may open, on a scene that pins no marker of its own.
 *
 * Inert by construction — a span, `aria-hidden`, transparent to the pointer.
 * The stage resolves a tap to the nearest country within a generous radius, so
 * a mark that took clicks for itself would steal them from the country beside
 * it while being far too small to hit reliably. The keyboard path is the
 * picker list, which names all fifty-four; this only has to be seen.
 */
function AtlasChoiceMark({
  countryId,
  placement,
  chosen,
}: {
  countryId: CountryId;
  placement: StagePlacement;
  chosen: boolean;
}) {
  return (
    <span
      data-atlas-choice={countryId}
      data-atlas-choice-chosen={chosen ? "true" : undefined}
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full"
      style={{
        left: `${placement.leftPercent}%`,
        top: `${placement.topPercent}%`,
        width: CHOICE_MARK_DIAMETER_PX,
        height: CHOICE_MARK_DIAMETER_PX,
        marginLeft: -CHOICE_MARK_DIAMETER_PX / 2,
        marginTop: -CHOICE_MARK_DIAMETER_PX / 2,
        backgroundColor: chosen ? "var(--accent)" : "var(--afh-night-ink-2)",
        // Reads over the tan of a landmass and over the dark of the ocean
        // alike, which a flat dot at one opacity does not.
        boxShadow: chosen
          ? "0 0 0 3px color-mix(in srgb, var(--accent) 35%, transparent)"
          : `0 0 0 ${CHOICE_MARK_RING_PX}px var(--afh-night-ground)`,
        opacity: chosen ? 1 : 0.75,
      }}
    />
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
   * The country the reading *around* the globe is already narrowed to.
   *
   * A hub filtered to `?pays=BEN` is showing Benin in its list, and a map that
   * went on showing the whole continent beside it would be a second,
   * contradictory answer to the same question. So the globe opens on that
   * country: it is highlighted, and the panel states what the current selection
   * has there.
   *
   * It seeds the choice rather than owning it — the reader may then aim
   * anywhere else on the map, and only a *change* of reading re-seeds. Omitted
   * entirely (not `null`) by a caller whose surroundings say nothing about a
   * country, which is every fiche: `null` would mean "the reading names no
   * country", and passing it would clear a choice the reader had just made.
   */
  readingCountryId?: CountryId | null;
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

/**
 * The width of the stage in clip units: the surface is drawn across -1..1, so
 * a drag of the full stage is a pan of two. Dividing a pixel delta by the
 * measured stage and multiplying by this is what makes the map travel exactly
 * as far as the finger, at any stage size.
 */
const CLIP_SPAN = 2;

/** One arrow press on a flat map, matched to the turn's own step. */
const KEY_STEP_CLIP = 0.12;

/**
 * How far a pointer may wander and still count as a tap rather than a drag.
 * A finger never holds perfectly still, so zero would make the globe
 * unselectable by touch — which is the mobile-first case, not the edge one.
 */
const TAP_TRAVEL_TOLERANCE_PX = 6;

/**
 * The canvas is aria-hidden, so this sentence is the whole of what a screen
 * reader is told the surface does — which is why it has to name the gesture the
 * surface actually has. A flat map cannot be turned, and announcing a turn there
 * sent a reader dragging for a rotation that was never going to happen.
 */
function globeSurfaceLabel(turns: boolean): string {
  return turns
    ? "Globe de l'atlas. Glissez ou utilisez les flèches pour tourner."
    : "Carte de l'atlas. Glissez ou utilisez les flèches pour déplacer.";
}

/**
 * The one sentence the stage always shows, so it is where the offer is
 * stated. A mark is inert and silent: a reader who does not already know that
 * the dots are countries has nothing on screen that says so, and the whole
 * scene reads as decoration. It is said only where marks exist — a country
 * fiche traces one outline and marks nothing, and promising a point there
 * sends the reader hunting for a target the scene never drew.
 */
function globeLegendSentence(turns: boolean, marksCountries: boolean): string {
  const gesture = turns ? "Glissez pour tourner" : "Glissez pour déplacer";
  const offer = marksCountries
    ? " ; appuyez sur un point pour ouvrir le pays."
    : ".";
  return `Afrique à sa surface réelle. ${gesture}${offer}`;
}

const NIGHT_STAGE_STYLE: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "var(--afh-globe-stage-height)",
  backgroundColor: "var(--afh-night-ground)",
  overflow: "hidden",
};

interface StageSize {
  widthPx: number;
  /** What the shader divides the horizontal axis by. */
  aspect: number;
}

/**
 * Which anchoring the panel takes. It starts as the bottom sheet because the
 * project is mobile-first and the server cannot measure a viewport — the wider
 * side panel is an upgrade applied once the client knows its own width.
 */
/**
 * The stage's live width and width-to-height ratio.
 *
 * The stage is full-width over a fixed height — 1512x520 on a laptop — so this
 * is a runtime fact, and markerPlacement's committed fall-back (the basemap's
 * own 800/758) is nowhere near it. Placing markers on the fall-back put them
 * roughly three times too far from the centre: PPL_AARI's single pastille
 * landed beside the sphere, over the void, naming ground the reader could not
 * see under it.
 *
 * The width comes back alongside because separation between choice marks is a
 * distance in CSS pixels while a placement is a percentage, and one measure of
 * the stage is what keeps the two conversions from drifting apart.
 *
 * Null until the first measurement, which is what keeps the server render and
 * the first client render agreeing on the fall-back.
 */
function useStageSize(stage: HTMLElement | null): StageSize | null {
  const [size, setSize] = useState<StageSize | null>(null);

  useEffect(() => {
    if (!stage) return;

    const measure = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (width > 0 && height > 0)
        setSize({ widthPx: width, aspect: width / height });
    };
    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stage]);

  return size;
}

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
  readingCountryId,
  targetPicker = "markers",
  pickerTargets,
  legend,
}: AtlasGlobeProps) {
  const [webglSupported, setWebglSupported] = useState(false);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [chosenCountryId, setChosenCountryId] = useState<CountryId | null>(
    readingCountryId ?? null
  );

  // Re-seeding on a *change* of reading, adjusted during render rather than in
  // an effect: an effect would paint the old choice first and correct it in a
  // second commit, which on arrival at `?pays=BEN` is one frame of the whole
  // continent before Benin lights up.
  //
  // Only a change re-seeds, which is what leaves the reader's own aim alone —
  // a hub republishes its reading on every pagination step, and re-seeding on
  // each of those would snap the map off whichever country they just chose.
  // `undefined` opts out entirely; see `readingCountryId`.
  const [seededReading, setSeededReading] = useState(readingCountryId);
  if (readingCountryId !== undefined && readingCountryId !== seededReading) {
    setSeededReading(readingCountryId);
    setChosenCountryId(readingCountryId);
  }
  const reducedMotion = usePrefersReducedMotion();
  const anchor = usePanelAnchor();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebglSupported(canCreateWebglContext());
  }, []);

  const measuredStage = useStageSize(stage);
  const stageAspect = measuredStage?.aspect ?? null;

  const targets = useMemo(() => buildAtlasTargets(overlay), [overlay]);
  /**
   * The line each option in the list carries beside its country.
   *
   * What a country weighs is not one quantity across the three encodings, so
   * there is no single place to read it from. A family footprint counts member
   * peoples and the overlay carries that; reading the same count on a people
   * fiche, which has no members, printed "0 peuple" under every presence
   * country the fiche declared — a number the corpus never claimed, denying
   * the very presence the halo was drawing.
   *
   * A people's figure does not come from the overlay either: `populationShare`
   * there is normalised over the largest drawn country, so it is a weight for
   * sizing halos and not a share of anything. The fiche reads the real figure
   * from its demography and hands it over with the rest of the country's
   * facts, which is the one place it is true.
   */
  const subtitleByCountry = useMemo(() => {
    if (overlay?.kind === "family-footprint") {
      return Object.fromEntries(
        overlay.countries.map((country) => [
          country.countryId,
          // "1 peuples" is the kind of detail that makes a page read as
          // machine output.
          `${country.memberCount} peuple${country.memberCount > 1 ? "s" : ""}`,
        ])
      );
    }
    return Object.fromEntries(
      Object.entries(facts ?? {})
        .filter(([, entry]) => Boolean(entry?.subtitle))
        .map(([countryId, entry]) => [countryId, entry!.subtitle!])
    );
  }, [overlay, facts]);
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

  /**
   * Where this globe sits with nothing chosen, and where « Recentrer » puts it
   * back: the frame holding the whole entity — the family's footprint, the
   * people's field, the country's own outline. Built from `targets` rather
   * than the drawn overlay, so leaving a chosen country on a country fiche
   * returns to the fiche's own subject and not to the last one visited.
   *
   * No panel bias: at rest nothing is open, so the globe keeps the whole
   * stage. The bias only applies to the pose a choice flies to, which is the
   * pose that has a panel beside it.
   *
   * The continent scene keeps IDLE_POSE. It is a geographic frame rather than
   * an entity, and it is already framed on its whole subject — enclosing its
   * fifty-one countries would move a hub that is right as it stands.
   *
   * The frame gives the turn but not the dolly: at rest the globe is whole.
   * The sphere is fit to the stage's height, and the stage is a band roughly
   * three times wider than it is tall, so the framing dolly — up to 1.62x for
   * a country the size of South Africa — made the sphere taller than the band
   * and hung a third of it off the top and the bottom. Nothing in the band's
   * height can answer that: the crop is a ratio, and a taller band scales the
   * sphere with it. So the opening pose faces the subject undollied, and
   * coming closer is the reader's own move — the zoom controls, a drag, or
   * choosing the country from the picker, which still flies in on it.
   */
  const restPose = useMemo(() => {
    if (!cameraFollowsChoice) return IDLE_POSE;
    const frame = enclosingFrame(targets);
    if (!frame) return IDLE_POSE;
    return { ...poseForTarget(frame, NO_BIAS), zoom: MIN_ZOOM };
  }, [cameraFollowsChoice, targets]);

  const camera = useGlobeCamera(
    destination,
    restPose,
    reducedMotion || !cameraFollowsChoice
  );

  const [flat, setFlat] = useState(false);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  /**
   * Pixels the pointer covered since it went down. A tap that selects a
   * country and a drag that turns the globe start identically, and the only
   * thing that separates them is whether the pointer went anywhere — read at
   * pointer-up, because that is when both are over.
   */
  const travelled = useRef(0);
  /** The stage as it was when the drag began — see handlePointerDown. */
  const stageSize = useRef({ width: 0, height: 0 });

  /**
   * Whether a drag has a sphere to turn.
   *
   * Two surfaces answer no: the SVG basemap, which has no rotation to apply at
   * all, and the WebGL surface at FLAT_MORPH, whose shader has mixed its own
   * rotation away. On both, a turn moved a number nothing read — the continent
   * scene told the reader « Glissez pour tourner » and nothing happened — so
   * the drag pans the map instead, which is also the only way to reach a
   * country the dolly has pushed off-stage.
   */
  const surfaceTurns = webglSupported && !flat;

  /**
   * Whether either direction has anywhere left to go. Compared with a
   * tolerance because the zoom a press lands on is a float: at the ceiling
   * `clampZoom` returns the bound exactly, but a press away from it can leave
   * the pose a rounding error short, and a control that stays live at its own
   * limit is a control that lies about the limit.
   */
  const zoomBoundTolerance = 1e-6;
  const atMinZoom = camera.pose.zoom <= MIN_ZOOM + zoomBoundTolerance;
  const atMaxZoom = camera.pose.zoom >= READER_MAX_ZOOM - zoomBoundTolerance;

  const pose: CameraPose = {
    ...camera.pose,
    morph: flat ? FLAT_MORPH : SPHERE_MORPH,
  };

  const recentre = () => {
    setFlat(false);
    setChosenCountryId(null);
    // Clearing the choice is not enough on its own: a reader who only turned
    // the globe has changed no state the camera watches, so the camera is
    // told directly to come back.
    camera.recentre();
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
    travelled.current = 0;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    // Measured once per drag rather than per move: a pan converts pixels into
    // clip units, and reading layout on every frame of a drag is the classic
    // way to make one stutter.
    const rect = event.currentTarget.getBoundingClientRect();
    stageSize.current = { width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - lastPointer.current.x;
    const dy = event.clientY - lastPointer.current.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    travelled.current += Math.hypot(dx, dy);
    // Under a finger the surface has to keep up with the finger, so a drag
    // moves the map itself rather than a target it eases toward.
    if (surfaceTurns) {
      camera.turnBy(
        dx * DRAG_RADIANS_PER_PIXEL,
        dy * DRAG_PITCH_RADIANS_PER_PIXEL
      );
      return;
    }
    const { width, height } = stageSize.current;
    // Clip y points up while a pointer's y points down, so the vertical drag
    // is negated: dragging down has to bring the ground above into view.
    camera.panBy(
      (dx * CLIP_SPAN) / Math.max(width, 1),
      (-dy * CLIP_SPAN) / Math.max(height, 1)
    );
  };

  const stopDragging = () => {
    dragging.current = false;
  };

  /** One arrow press, routed to whichever motion the current surface has. */
  const steer = (towardsX: number, towardsY: number) => {
    if (surfaceTurns) {
      // Up sends the surface up, which is a decrease in pitch — the same
      // convention the drag follows.
      camera.turnBy(towardsX * KEY_STEP_RADIANS, -towardsY * KEY_STEP_RADIANS);
      return;
    }
    // Same reading as the turn: the arrow moves the surface, not the frame.
    // ArrowRight turns the globe rightwards, so on the flat map it has to send
    // the map rightwards too, or the two surfaces answer the same key
    // differently.
    camera.panBy(towardsX * KEY_STEP_CLIP, towardsY * KEY_STEP_CLIP);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
        steer(-1, 0);
        break;
      case "ArrowRight":
        steer(1, 0);
        break;
      case "ArrowUp":
        steer(0, 1);
        break;
      case "ArrowDown":
        steer(0, -1);
        break;
      // "=" is what an unshifted "+" reports on most layouts, and the numeric
      // keypad reports "Add"/"Subtract" on none of them — both spellings are
      // taken so the key the reader pressed is the key that answers.
      case "+":
      case "=":
        camera.zoomBy(ZOOM_STEP);
        break;
      case "-":
      case "_":
        camera.zoomBy(1 / ZOOM_STEP);
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

  // The continent scene used to be held off the sphere because the canvas
  // drew only its frame, so climbing to it traded the one signal the scene
  // carries for a bare outline. AtlasGlobeCanvas now draws the continent's
  // radial field alongside that frame, so the hub and the facets get the same
  // globe as the three fiches rather than a flat map that claims to turn.
  const stageIsSphere = webglSupported;

  // A fiche asks for a list because its targets are its presence countries,
  // and it has them whether there are seventeen or one. 394 of the corpus's
  // 789 people fiches declare exactly one country, and those used to fall back
  // to a bare 22px pastille — the only thing naming the country under it.
  //
  // Counted over the choosable set, not the drawn one: a country fiche draws
  // one country and offers all of them.
  const offersList = targetPicker === "list" && choosableTargets.length > 0;

  const chosenFacts = chosen ? factsFor(chosen, facts, targetFacts) : null;
  const place = (target: AtlasTarget): StagePlacement =>
    stageIsSphere
      ? placeTargetOnSphere(target, pose, stageAspect ?? undefined)
      : placeTargetOnBasemap(
          target,
          pose,
          cameraFocus?.center ?? null,
          stageAspect ?? undefined
        );

  /**
   * The continent scene draws a radial field for its best-documented countries
   * and offers all fifty-four, so on that scene alone the stage itself is a
   * target: a tap picks the country it lands nearest. The fiche globes are left
   * alone — there every choosable country already carries its own marker, and a
   * stray tap on one would select a country the reader did not point at.
   */
  const stageSelectsCountry = drawnOverlay.kind === "continent-field";

  const pinsAMarkerPerTarget = targetPicker === "markers" || !offersList;

  /**
   * The choosable countries the scene does not already pin a marker on.
   *
   * The complaint this answers: the continent drew twelve radial fields and
   * offered fifty-four countries to a tap, and nothing on screen said so — so
   * the twelve read as the whole choosable set. The two layers say different
   * things and both are needed: a field says how much the corpus documents
   * there, a mark says the country opens.
   *
   * Subtracting the pinned targets is what keeps the Explorer hub honest. It
   * pins a labelled 22px button on the twelve it ranks, and a 7px dot in the
   * middle of one would read as a reticle while saying nothing the button does
   * not. The facet globes pin nothing, so there all fifty-four are marked.
   *
   * Placed and thinned in the same pass, after the camera has moved, so the
   * marks answer to the stage the reader is actually looking at — zooming into
   * West Africa separates the ones that were crowded and earns back the ones a
   * wider view had to drop.
   *
   * Ranked by corpus size first, because that is the order collisions are
   * resolved in and the picker hands its targets in French alphabetical order.
   * Left as they arrive, Gambia — which sits inside Senegal — kept the mark
   * and Senegal lost it, while `buildContinentOverlay` resolved the very same
   * collision the other way for the field.
   */
  const choiceMarks = !stageSelectsCountry
    ? []
    : spaceOutMarks(
        choosableTargets
          .filter(
            (target) =>
              !pinsAMarkerPerTarget ||
              !targets.some((pinned) => pinned.countryId === target.countryId)
          )
          .slice()
          .sort(
            (first, second) =>
              (second.documentedPeopleCount ?? 0) -
              (first.documentedPeopleCount ?? 0)
          )
          .map((target) => ({
            countryId: target.countryId,
            placement: place(target),
          })),
        // Unmeasured, nothing is thinned: a guessed stage width would drop
        // countries on arithmetic rather than on crowding, and the first
        // measurement is one frame away.
        measuredStage
          ? (CHOICE_MARK_SEPARATION_PX / measuredStage.widthPx) * 100
          : 0,
        stageAspect ?? STAGE_ASPECT
      );

  /**
   * Whether anything on the stage is a country the reader can open. Read from
   * what was actually placed rather than from the overlay kind, so a scene
   * whose marks were all thinned out by crowding does not promise a point
   * that is not there.
   */
  const marksCountries =
    choiceMarks.length > 0 || (pinsAMarkerPerTarget && targets.length > 0);

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const wasDrag = travelled.current > TAP_TRAVEL_TOLERANCE_PX;
    stopDragging();
    if (!stageSelectsCountry || wasDrag) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const countryId = nearestFacingTarget(
      choosableTargets.map((target) => ({
        countryId: target.countryId,
        placement: place(target),
      })),
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100,
      rect.width / rect.height
    );

    // A tap that lands near nothing dismisses, rather than opening whichever
    // country happened to be least far — the stage is mostly ocean.
    if (countryId) chooseTarget(countryId as CountryId);
    else setChosenCountryId(null);
  };

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
        aria-label={globeSurfaceLabel(surfaceTurns)}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
          className="pointer-events-none absolute inset-x-0 bottom-12 px-3 text-afh-caption"
          style={{ color: "var(--afh-night-ink-2)" }}
        >
          {fallbackNote}
        </p>
      )}

      {pinsAMarkerPerTarget &&
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

      {choiceMarks.map((mark) => (
        <AtlasChoiceMark
          key={mark.countryId}
          countryId={mark.countryId}
          placement={mark.placement}
          chosen={mark.countryId === chosenCountryId}
        />
      ))}

      {/* One top-anchored column, so the picker and the legend cannot collide
          at any width. Pinned to the same edge they did: the picker wraps to
          two lines at 430px, and every fixed offset that cleared it on a
          desktop ran under it on a phone. Transparent to the pointer, like
          the toolbar band below — the picker takes the pointer back for
          itself.

          The legend stays visible at every width. It was `hidden` below
          760px, which left a phone reader with a globe that moves under the
          finger and no statement of what dragging does — "it spins and I
          cannot stop it". A fiche that writes its own legend places it
          itself, so only the default one is stacked here. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 p-3">
        {offersList && (
          <div className="pointer-events-auto relative z-[7]">
            <AtlasTargetPicker
              targets={choosableTargets}
              subtitleByCountry={subtitleByCountry}
              chosenCountryId={chosenCountryId}
              onChoose={chooseTarget}
              areaNoun={areaNoun}
            />
          </div>
        )}

        {!legend && (
          <p
            data-atlas-legend=""
            className="w-full text-afh-caption"
            style={{ color: "var(--afh-night-ink-2)" }}
          >
            {globeLegendSentence(surfaceTurns, marksCountries)}
          </p>
        )}
      </div>

      {legend}

      {/* The mockup lays these out at every width — centred, wrapping. They
          used to be hidden below 760px, which left a phone with no way to
          flatten the map, recentre it, or leave a chosen country, on a
          mobile-first project. */}
      <div
        data-atlas-toolbar=""
        // Transparent to the pointer, because it is a full-width strip pinned
        // across the bottom of the stage: solid, it swallowed every tap in
        // that band, and the stage is now how a reader selects a country. The
        // buttons take the pointer back for themselves.
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-2 p-3"
      >
        {/* The button clears the choice, so the choice is what earns it —
            not the shape of the picker. Gated on the picker, a fiche offering
            pastilles had no way back to the whole area but "Recentrer", which
            also undoes the reader's own turn. */}
        {(offersList || chosenCountryId !== null) && (
          <button
            type="button"
            aria-pressed={chosenCountryId === null}
            onClick={() => setChosenCountryId(null)}
            className={TOOLBAR_BUTTON_CLASS}
            style={TOOLBAR_BUTTON_STYLE}
          >
            {wholeAreaLabel}
          </button>
        )}
        <button
          type="button"
          aria-pressed={flat}
          onClick={() => setFlat((current) => !current)}
          className={TOOLBAR_BUTTON_CLASS}
          style={TOOLBAR_BUTTON_STYLE}
        >
          {flat ? "Revenir au globe" : "Ce que la carte plate en fait"}
        </button>
        {/* Held together in their own row so the two directions never wrap
            apart on a phone: a lone « + » with its « − » on the line below
            reads as two unrelated controls. The glyphs are hidden from the
            accessibility tree — a screen reader is told what the press does,
            not which sign is printed on it. */}
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Dézoomer"
            title="Dézoomer"
            disabled={atMinZoom}
            onClick={() => camera.zoomBy(1 / ZOOM_STEP)}
            className={ZOOM_BUTTON_CLASS}
            style={TOOLBAR_BUTTON_STYLE}
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            type="button"
            aria-label="Zoomer"
            title="Zoomer"
            disabled={atMaxZoom}
            onClick={() => camera.zoomBy(ZOOM_STEP)}
            className={ZOOM_BUTTON_CLASS}
            style={TOOLBAR_BUTTON_STYLE}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <button
          type="button"
          onClick={recentre}
          className={TOOLBAR_BUTTON_CLASS}
          style={TOOLBAR_BUTTON_STYLE}
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
          icon={chosenFacts.icon}
          onClose={() => setChosenCountryId(null)}
        >
          {chosenFacts.body}
        </AtlasFactsPanel>
      )}
    </div>
  );
}

export default AtlasGlobe;
