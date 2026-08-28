"use client";

/**
 * MigrationPathLayer — client-island SVG overlay drawing migration paths in
 * the AfricaBasemap coordinate space (Epic 12, Story 12.9, ETNI-522/1099).
 * Renders as a sibling overlay positioned over `AfricaBasemap`, sharing its
 * viewBox/projection so paths line up with the land silhouette beneath.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import { BASEMAP_VIEWBOX, projectLonLat } from "@/lib/atlas/projection";
import { formatYearFr } from "@/lib/atlas/formatYearFr";
import type { MigrationGeometry, MigrationTimeRange } from "@/types/migrations";

export interface MigrationPathLayerEvent {
  id: string;
  nameMain: string;
  geometry: MigrationGeometry;
  timeRange: MigrationTimeRange;
}

export interface MigrationPathLayerProps {
  events: MigrationPathLayerEvent[];
  /** Current scrubber year — events whose range contains it render active. */
  year: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  return reduced;
}

function isActiveAt(timeRange: MigrationTimeRange, year: number): boolean {
  return year >= timeRange.startYear && year <= timeRange.endYear;
}

function projectRing(coordinates: Array<[number, number]>) {
  return coordinates.map(([lon, lat]) =>
    projectLonLat(lon, lat, BASEMAP_VIEWBOX)
  );
}

function ringToD(points: Array<{ x: number; y: number }>, close: boolean) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const segments = [
    `M ${first.x} ${first.y}`,
    ...rest.map((p) => `L ${p.x} ${p.y}`),
  ];
  if (close) segments.push("Z");
  return segments.join(" ");
}

function geometryToPathD(geometry: MigrationGeometry): string {
  switch (geometry.type) {
    case "LineString":
      return ringToD(projectRing(geometry.coordinates), false);
    case "MultiLineString":
      return geometry.coordinates
        .map((line) => ringToD(projectRing(line), false))
        .join(" ");
    case "Polygon":
      return geometry.coordinates
        .map((ring) => ringToD(projectRing(ring), true))
        .join(" ");
    default:
      return "";
  }
}

function geometryFirstPoint(
  geometry: MigrationGeometry
): { x: number; y: number } | null {
  switch (geometry.type) {
    case "LineString":
      return geometry.coordinates[0]
        ? projectLonLat(
            geometry.coordinates[0][0],
            geometry.coordinates[0][1],
            BASEMAP_VIEWBOX
          )
        : null;
    case "MultiLineString":
    case "Polygon": {
      const firstRing = geometry.coordinates[0];
      const firstPoint = firstRing?.[0];
      return firstPoint
        ? projectLonLat(firstPoint[0], firstPoint[1], BASEMAP_VIEWBOX)
        : null;
    }
    default:
      return null;
  }
}

// @req FR78 @req FR79 @req UX-DR10
// @req REQ-101
export function MigrationPathLayer({
  events,
  year,
  selectedId = null,
  onSelect,
  className,
}: MigrationPathLayerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const activeCount = events.filter((event) =>
    isActiveAt(event.timeRange, year)
  ).length;
  const announcement = `${activeCount} migrations actives vers ${formatYearFr(year)}`;

  function activate(id: string) {
    onSelect?.(id);
  }

  return (
    <div
      data-motion={reducedMotion ? "instant" : "smooth"}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <svg
        viewBox={`0 0 ${BASEMAP_VIEWBOX.width} ${BASEMAP_VIEWBOX.height}`}
        aria-hidden="true"
        className="pointer-events-auto h-full w-full"
      >
        {events.map((event) => {
          const active = isActiveAt(event.timeRange, year);
          const selected = event.id === selectedId;
          const d = geometryToPathD(event.geometry);
          const labelPoint = selected
            ? geometryFirstPoint(event.geometry)
            : null;

          return (
            <g key={event.id}>
              <path
                data-testid={`migration-path-${event.id}`}
                data-active={active ? "true" : "false"}
                data-selected={selected ? "true" : "false"}
                d={d}
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeWidth={selected ? 4 : active ? 2.5 : 1.5}
                className={cn(
                  "cursor-pointer stroke-afh-atlas-path-inactive opacity-60",
                  reducedMotion ? "transition-none" : "transition-opacity",
                  active && "stroke-afh-atlas-path-active opacity-100",
                  selected && "stroke-afh-atlas-path-selected"
                )}
                onClick={() => activate(event.id)}
              />
              {labelPoint && (
                <text
                  data-testid={`migration-label-${event.id}`}
                  x={labelPoint.x}
                  y={labelPoint.y - 6}
                  className="pointer-events-none fill-afh-atlas-path-selected text-afh-eyebrow font-semibold"
                >
                  {event.nameMain}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="migration-active-announcement"
      >
        {announcement}
      </p>
    </div>
  );
}

export default MigrationPathLayer;
