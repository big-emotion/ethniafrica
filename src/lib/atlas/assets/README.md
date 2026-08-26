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

## True-size comparison shapes (`worldCompare.ts`)

`worldCompare.ts` holds the six **non-African** silhouettes the "true size of
Africa" game holds up against the continent: Greenland, the contiguous United
States, China, India, Brazil, and a dissolved Western-Europe union. It is the
same Natural Earth 1:50m admin-0 dataset and the same public-domain terms as
everything above — see "Source data & license".

`EUW` is a synthetic id (no ISO code covers it) for one dissolved multi-ring
shape made of France, Germany, Spain, Portugal, Italy, the United Kingdom,
Ireland, Belgium, the Netherlands, Luxembourg, Switzerland and Austria.

### Two editorial decisions baked into the geometry

- **Both `USA` and `EUW` are bbox-clipped**, because the game compares _one
  contiguous silhouette_ at a time and scattered territories thousands of
  kilometres away read as noise. `USA` is clipped to the contiguous 48 (Alaska
  and Hawaii dropped); `EUW` is clipped to the European mainland and its near
  islands, which drops the French overseas departments, the Canaries, the
  Azores, Madeira and the Caribbean Netherlands. Both boxes were chosen to cut
  open ocean only — no land boundary is truncated — so the areas below stay
  honest.
- **Rings under 8 points are dropped** by the generator. Natural Earth 1:50m
  gives Greenland dozens of pinprick islands; at the ~300px the game renders
  at they are invisible, so they are payload weight and nothing else. What
  survives is 5 rings for `EUW` (mainland, Great Britain, Ireland, Sicily,
  Sardinia — Corsica falls below the threshold), 2 each for `GRL`, `BRA` and
  `CHN`, and a single ring for `IND` and `USA`. Rings are ordered largest
  landmass first.

### Reproduction steps

```bash
# 1. Fetch the source data (same file as the basemap above).
curl -o /tmp/ne50.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson

mkdir -p /tmp/wc

# 2. One simplified GeoJSON per shape. `-simplify 10%` — see "Size budget"
#    below for why it is far more aggressive than the basemap's 45%.
for C in GRL CHN IND BRA; do
  npx mapshaper -i /tmp/ne50.geojson -filter "ADM0_A3=='$C'" \
    -dissolve -clean -simplify 10% visvalingam keep-shapes \
    -o format=geojson precision=0.01 /tmp/wc/$C.geojson
done

npx mapshaper -i /tmp/ne50.geojson -filter "ADM0_A3=='USA'" \
  -clip bbox=-125.5,23.5,-66,49.5 \
  -dissolve -clean -simplify 10% visvalingam keep-shapes \
  -o format=geojson precision=0.01 /tmp/wc/USA.geojson

npx mapshaper -i /tmp/ne50.geojson \
  -filter "['FRA','DEU','ESP','PRT','ITA','GBR','IRL','BEL','NLD','LUX','CHE','AUT'].indexOf(ADM0_A3) > -1" \
  -clip bbox=-11,34.5,19.2,61.2 \
  -dissolve -clean -simplify 10% visvalingam keep-shapes \
  -o format=geojson precision=0.01 /tmp/wc/EUW.geojson

# 3. Emit the committed constant, then format it.
node scripts/atlas/generate-world-compare.mjs \
  /tmp/wc \
  src/lib/atlas/assets/worldCompare.ts
npx prettier --write src/lib/atlas/assets/worldCompare.ts
```

The generator has zero npm dependencies (Node `fs` only, like
`generate-admin0.mjs`), reads `<dir>/<id>.geojson` for each of the six fixed
ids, and holds the `name` / `nameFr` labels itself — mapshaper's `-dissolve`
throws the Natural Earth attributes away, so they cannot come from the data.
Steps 2 and 3 are idempotent: re-running them produces byte-identical output.

### Size budget

- Committed size: ~33 KB raw / ~8.4 KB gzipped — inside the 40 KB gzipped
  budget that protects the Lighthouse ≥ 85 mobile gate (FR78), which this
  asset shares with the basemap and `africaAdmin0.ts`.
- `-simplify 10%` (against the basemap's 45%) is deliberate. These six shapes
  are compared **by eye at ~300px wide**; coastline detail finer than that
  cannot be seen and cannot change the answer, so it is pure cost. 10% was the
  point where every shape's spherical-excess area still lands within ~4% of
  its published figure:

  | id  | rings | points | computed km² | published km² | delta |
  | --- | ----- | ------ | ------------ | ------------- | ----- |
  | GRL | 2     | 211    | 2 147 082    | 2 166 086     | −0.9% |
  | USA | 1     | 237    | 7 932 232    | 8 080 464     | −1.8% |
  | CHN | 2     | 267    | 9 380 902    | 9 596 960     | −2.3% |
  | IND | 1     | 149    | 3 148 369    | 3 287 263     | −4.2% |
  | BRA | 2     | 187    | 8 490 073    | 8 515 767     | −0.3% |
  | EUW | 5     | 266    | 2 266 035    | ~2 310 000    | −1.9% |

  Simplification always eats area, so every delta is negative by construction.
  `USA` is compared against the contiguous-48 figure and `EUW` against the sum
  of its twelve members' mainland areas. If a re-run pushes any shape past
  ~20%, the simplification has destroyed it — back the percentage off.
