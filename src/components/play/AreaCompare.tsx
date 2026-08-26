"use client";

import type { AreaCompareRound, GameAreaShape } from "@/lib/games/gameKinds";
import { cn } from "@/lib/utils";

export interface AreaCompareProps {
  round: AreaCompareRound;
  onAnswer: (index: 0 | 1) => void;
  disabled?: boolean;
  className?: string;
}

/** Side of the square user-space both shapes are normalised into. */
// @req REQ-120
export const AREA_COMPARE_VIEWBOX_SIZE = 100;

/**
 * `projectLonLat` is bound to AFRICA_GEO_BOUNDS, which would push any shape
 * outside them off the canvas and, worse, would size each round against the
 * whole continent instead of against the other shape. This normaliser fits
 * the two shapes of one round to their own combined bounding box, at a single
 * uniform scale, which is the only way the comparison means anything.
 *
 * The mapping is plate-carrée and therefore not equal-area: the drawing is the
 * naive comparison the reader is asked to make, and `areaKm2` — surfaced in
 * the reveal — remains the authority on who is actually bigger.
 */
function toViewBoxPaths(shapes: readonly GameAreaShape[]): string[] {
  const points = shapes.flatMap((shape) => shape.rings.flat());
  const lons = points.map((point) => point.lon);
  const lats = points.map((point) => point.lat);
  const lonMin = Math.min(...lons);
  const lonMax = Math.max(...lons);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);

  const lonSpan = lonMax - lonMin;
  const latSpan = latMax - latMin;
  // A single-point or single-meridian ring has no span to scale against.
  const scale = AREA_COMPARE_VIEWBOX_SIZE / Math.max(lonSpan, latSpan, 1e-9);
  const offsetX = (AREA_COMPARE_VIEWBOX_SIZE - lonSpan * scale) / 2;
  const offsetY = (AREA_COMPARE_VIEWBOX_SIZE - latSpan * scale) / 2;

  const round2 = (value: number) => Number(value.toFixed(2));

  return shapes.map((shape) =>
    shape.rings
      .map((ring) =>
        ring
          .map((point, index) => {
            const x = round2((point.lon - lonMin) * scale + offsetX);
            // Latitude grows north, SVG y grows down.
            const y = round2((latMax - point.lat) * scale + offsetY);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
          .concat(" Z")
      )
      .join(" ")
  );
}

const STROKE_STYLES = ["solid", "dashed"] as const;

function strokeDashArray(index: number): string | undefined {
  return STROKE_STYLES[index] === "dashed" ? "4 3" : undefined;
}

function strokeColor(index: number): string {
  return index === 0 ? "var(--accent)" : "var(--afh-text)";
}

/**
 * Two outlines laid over one another at one scale (REQ-120). Plain SVG on
 * purpose — the globe belongs to the Night tier and to `GlobeTap`; mounting a
 * second renderer here would cost a WebGL context to draw two polygons.
 *
 * The overlay itself is decoration for assistive tech: each shape is answered
 * through its own button, which repeats the outline at the shared scale so the
 * drawing and the control are visibly the same object.
 */
// @req REQ-120
export const AreaCompare = ({
  round,
  onAnswer,
  disabled = false,
  className,
}: AreaCompareProps) => {
  const paths = toViewBoxPaths(round.shapes);
  const viewBox = `0 0 ${AREA_COMPARE_VIEWBOX_SIZE} ${AREA_COMPARE_VIEWBOX_SIZE}`;

  return (
    <section
      data-testid="area-compare"
      aria-labelledby={`area-compare-prompt-${round.subjectId}`}
      className={cn("flex flex-col gap-4", className)}
    >
      <h2
        id={`area-compare-prompt-${round.subjectId}`}
        className="font-afh-display text-afh-h3 font-bold text-afh-text"
      >
        {round.promptFr}
      </h2>
      <p className="text-afh-body text-afh-text-soft">{round.questionFr}</p>

      <svg
        data-testid="area-compare-stage"
        viewBox={viewBox}
        aria-hidden="true"
        className="w-full rounded-afh-lg border border-afh-border bg-afh-surface"
      >
        {paths.map((d, index) => (
          <path
            key={round.shapes[index].labelFr}
            d={d}
            data-shape-index={index}
            data-stroke-style={STROKE_STYLES[index]}
            fill={index === 0 ? "var(--accent-tint)" : "none"}
            fillOpacity={index === 0 ? 0.7 : 1}
            stroke={strokeColor(index)}
            strokeDasharray={strokeDashArray(index)}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex flex-col gap-3 md:flex-row">
        {round.shapes.map((shape, index) => (
          <button
            key={shape.labelFr}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(index as 0 | 1)}
            className="flex min-h-11 w-full items-center gap-3 rounded-afh-lg border border-afh-border bg-afh-surface p-3 text-left transition-colors duration-afh-base disabled:cursor-not-allowed disabled:opacity-50 md:flex-1"
          >
            <svg
              viewBox={viewBox}
              aria-hidden="true"
              className="h-10 w-10 shrink-0"
            >
              <path
                d={paths[index]}
                fill={index === 0 ? "var(--accent-tint)" : "none"}
                stroke={strokeColor(index)}
                strokeDasharray={strokeDashArray(index)}
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span className="flex flex-col">
              <span className="text-afh-body font-medium text-afh-text">
                {shape.labelFr}
              </span>
              {shape.captionFr ? (
                <span className="text-afh-small text-afh-text-soft">
                  {shape.captionFr}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default AreaCompare;
