#!/usr/bin/env node
// Converts a simplified non-Africa world GeoJSON (see README.md) into the
// committed worldLandmassPath.ts. Zero npm dependencies — Node `fs` only.
//
// The path is emitted straight in globe-texture pixels rather than in a
// viewBox of its own: unlike the African silhouette, which AfricaBasemap also
// renders as a standalone SVG, this outline exists only to be painted into
// the equirectangular world texture. Pre-projecting it here is what lets
// paintGlobeTexture fill it with no transform at all.
//
// GLOBE_TEXTURE_SIZE and the two projection formulas below are a plain-JS
// copy of src/lib/atlas/globeTexture.ts, for the same reason
// generate-basemap.mjs copies projection.ts: this script must run without a
// TypeScript toolchain. globeTexture.test.ts asserts the committed path stays
// inside the texture bounds it was projected for.
import { readFileSync, writeFileSync } from "node:fs";

const GLOBE_TEXTURE_SIZE = { width: 2048, height: 1024 };

const lonToTextureX = (lon) => ((lon + 180) / 360) * GLOBE_TEXTURE_SIZE.width;
const latToTextureY = (lat) => ((90 - lat) / 180) * GLOBE_TEXTURE_SIZE.height;

const round = (n) => Math.round(n * 10) / 10;

const [, , inPath, outTsPath] = process.argv;
if (!inPath || !outTsPath) {
  console.error(
    "usage: node generate-world-basemap.mjs <simplified.geojson> <out.ts>"
  );
  process.exit(1);
}

const geojson = JSON.parse(readFileSync(inPath, "utf8"));
const container =
  geojson.type === "FeatureCollection"
    ? geojson.features[0]
    : geojson.type === "GeometryCollection"
      ? geojson.geometries[0]
      : geojson;
const geometry = container.geometry ?? container;

if (geometry.type !== "MultiPolygon" && geometry.type !== "Polygon") {
  throw new Error(`Expected a dissolved (Multi)Polygon, got ${geometry.type}`);
}

const polygons =
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

const subpaths = polygons.flatMap((polygon) =>
  polygon.map((ring) => {
    const points = ring.map(
      ([lon, lat]) =>
        `${round(lonToTextureX(lon))},${round(latToTextureY(lat))}`
    );
    return `M${points.join("L")}Z`;
  })
);

const d = subpaths.join(" ");

const ts = `// GENERATED FILE — do not edit by hand.
// Produced by src/lib/atlas/assets/generate-world-basemap.mjs; see
// src/lib/atlas/assets/README.md for the source data, its license and the
// command that regenerates it.

/**
 * Every landmass Natural Earth does *not* assign to Africa, dissolved into a
 * single silhouette and expressed directly in globe-texture pixels
 * (2048 x 1024 equirectangular, lon -180..180 mapped to x, lat 90..-90 to y).
 */
// @req REQ-112
export const WORLD_LANDMASS_PATH =
  "${d}";
`;

writeFileSync(outTsPath, ts);
console.log(`${outTsPath}: ${subpaths.length} subpaths, ${d.length} chars`);
