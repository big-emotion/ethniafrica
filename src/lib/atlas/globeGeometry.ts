/**
 * Pure GPU-buffer builders for AtlasGlobe's WebGL path — converts an
 * overlays.ts descriptor into typed arrays, with no WebGL or DOM API in
 * sight, so the geometry math is unit-testable without a real context.
 */
import { lonLatToSphere, type SpherePoint } from "@/lib/atlas/projection";
import {
  ringCentroid,
  type PeopleFieldArea,
  type Ring,
} from "@/lib/atlas/overlays";

function sphereDistance(a: SpherePoint, b: SpherePoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export interface LineLoopGeometry {
  /** 3 floats per vertex (xyz on the unit sphere). */
  positions: Float32Array;
  /** 1 float per vertex — cumulative distance around the ring, normalised 0..1. Feeds the country trace-in and the family dash. */
  arcFractions: Float32Array;
  vertexCount: number;
}

/**
 * A closed ring as a GL_LINE_LOOP: one vertex per ring point, plus its
 * arc-length fraction so the stroke can reveal itself (country) or dash
 * itself (family) purely in the fragment shader.
 */
export function buildRingLineLoop(ring: Ring): LineLoopGeometry {
  const spherePoints = ring.map((p) => lonLatToSphere(p.lon, p.lat));
  const cumulative: number[] = [0];
  for (let i = 1; i < spherePoints.length; i++) {
    cumulative.push(
      cumulative[i - 1] + sphereDistance(spherePoints[i - 1], spherePoints[i])
    );
  }
  const closingDistance = sphereDistance(
    spherePoints[spherePoints.length - 1],
    spherePoints[0]
  );
  const total = cumulative[cumulative.length - 1] + closingDistance || 1;

  const positions = new Float32Array(spherePoints.length * 3);
  const arcFractions = new Float32Array(spherePoints.length);
  spherePoints.forEach((point, i) => {
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
    arcFractions[i] = cumulative[i] / total;
  });

  return { positions, arcFractions, vertexCount: spherePoints.length };
}

export interface FanGeometry {
  /** 3 floats per vertex: centroid, then every ring point, then the first ring point again (closes the fan). */
  positions: Float32Array;
  vertexCount: number;
}

/**
 * Centroid-fan triangulation for a GL_TRIANGLE_FAN fill — a stylised
 * approximation, not a survey-grade tessellation, the same tradeoff the
 * committed basemap silhouette already makes (projection.ts).
 */
export function buildRingFan(ring: Ring): FanGeometry {
  const center = ringCentroid(ring);
  const fanPoints = [center, ...ring, ring[0]];
  const spherePoints = fanPoints.map((p) => lonLatToSphere(p.lon, p.lat));

  const positions = new Float32Array(spherePoints.length * 3);
  spherePoints.forEach((point, i) => {
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
  });

  return { positions, vertexCount: spherePoints.length };
}

export interface PointFieldGeometry {
  /** 3 floats per point (xyz on the unit sphere). */
  positions: Float32Array;
  /** 1 float per point — populationShare, 0..1. Never a boundary. */
  weights: Float32Array;
  vertexCount: number;
}

/** GL_POINTS for the people field — structurally incapable of drawing a line. */
export function buildPointField(areas: PeopleFieldArea[]): PointFieldGeometry {
  const positions = new Float32Array(areas.length * 3);
  const weights = new Float32Array(areas.length);
  areas.forEach((area, i) => {
    const point = lonLatToSphere(area.center.lon, area.center.lat);
    positions[i * 3] = point.x;
    positions[i * 3 + 1] = point.y;
    positions[i * 3 + 2] = point.z;
    weights[i] = area.populationShare;
  });
  return { positions, weights, vertexCount: areas.length };
}
