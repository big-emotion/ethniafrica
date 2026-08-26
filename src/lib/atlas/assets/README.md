# Africa basemap asset

`africa-basemap.svg` is a static, zero-runtime-dependency silhouette of the
African continent (every polygon Natural Earth assigns `CONTINENT ==
"Africa"` — mainland plus islands such as Madagascar and Cape Verde),
generated once and committed as a build artifact. There is no GIS library at
request time (no d3-geo, no mapshaper in `package.json`).

`africaLandmassPath.ts` is a generated, bundler-safe companion: it exports
the same path's `d` string as a plain TypeScript constant. Both files are
written from the same run of `generate-basemap.mjs`, so they cannot drift
apart — `projection.test.ts` asserts they stay byte-identical.
`AfricaBasemap.tsx` imports the `.ts` constant (not the `.svg` file) because
it must bundle in Storybook's browser build as well as Next.js SSR, and a
Node `fs.readFileSync` at module scope only works server-side.

## Source data & license

- Dataset: Natural Earth, "Admin 0 – Countries", 1:50m Cultural Vectors.
- Source: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries/
- Convenience mirror used below (GeoJSON export of the same shapefile,
  maintained by a Natural Earth contributor):
  https://github.com/nvkelso/natural-earth-vector
- License: **Public domain.** Per Natural Earth's terms of use
  (https://www.naturalearthdata.com/about/terms-of-use/): "No permission is
  needed to use Natural Earth. Crediting the authors is unnecessary."

## Reproduction steps

```bash
# 1. Fetch the source data (Natural Earth 1:50m admin-0 countries, GeoJSON export).
curl -o /tmp/ne_50m_admin_0_countries.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson

# 2. Filter to Africa, dissolve every country border into one landmass, and
#    simplify the coastline. mapshaper is run ad hoc via npx — it is NOT a
#    package.json dependency.
npx mapshaper -i /tmp/ne_50m_admin_0_countries.geojson \
  -filter 'CONTINENT=="Africa"' \
  -dissolve \
  -clean \
  -simplify 45% visvalingam keep-shapes \
  -o format=geojson precision=0.01 /tmp/africa-simplified.geojson

# 3. Project the simplified GeoJSON to SVG path data (+ the .ts companion)
#    with the same pure equirectangular formula as src/lib/atlas/projection.ts.
node src/lib/atlas/assets/generate-basemap.mjs \
  /tmp/africa-simplified.geojson \
  src/lib/atlas/assets/africa-basemap.svg \
  src/lib/atlas/assets/africaLandmassPath.ts
```

`generate-basemap.mjs` has zero npm dependencies (Node `fs` only) and
intentionally duplicates `AFRICA_GEO_BOUNDS`/`projectLonLat` from
`../projection.ts` — it must run standalone, before the asset it produces
exists. If you change the geographic bounds or the projection formula,
update all three files together;
`src/lib/atlas/__tests__/projection.test.ts` asserts the SVG's `viewBox`
stays in sync with `BASEMAP_VIEWBOX` and that `africaLandmassPath.ts` stays
byte-identical to the SVG's path data.

## Size budget

- Committed size: ~12.7 KB raw / ~5.3 KB gzipped — well under the 40 KB
  gzipped budget that protects the Lighthouse ≥ 85 mobile gate (FR78).
- `-simplify 45%` was chosen empirically to keep a recognizable coastline
  with headroom under the budget. Re-run step 2 with a different percentage
  to trade detail for size.

## Per-country geometry (`africaAdmin0.ts`)

`africaAdmin0.ts` is the same Natural Earth admin-0 dataset above, kept
**per-country** instead of dissolved — REQ-116 needs individual country
outlines for the fiche globe (`src/lib/atlas/overlays.ts`), which the dissolved
continent silhouette can't provide. Its source is
`docs/design/mockups/parts/africa-admin0.json`, the same reviewed geometry the
`docs/design/mockups/pages/{pays,famille}.html` mockups render, kept in sync by
regenerating rather than hand-editing:

```bash
node src/lib/atlas/assets/generate-admin0.mjs \
  docs/design/mockups/parts/africa-admin0.json \
  src/lib/atlas/assets/africaAdmin0.ts
```

Coverage is the 51 countries present in that file — a handful of very small
African states are absent. `overlays.ts` treats an unresolvable country as the
missing state (atlas-charter §4), never as a silently dropped shape.
