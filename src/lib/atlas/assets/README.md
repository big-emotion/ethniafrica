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

## Far continents (`worldLandmassPath.ts`)

`worldLandmassPath.ts` is every landmass Natural Earth does **not** assign to
Africa, dissolved into one silhouette. The globe texture paints it under the
African one at a low-opacity ink (`--afh-globe-land-far`) so the sphere reads
as a planet rather than a continent floating in an empty ocean, while the
difference in treatment keeps saying which continent this atlas documents.

Unlike `africaLandmassPath.ts`, it carries no SVG twin and no viewBox of its
own: it is emitted already projected into globe-texture pixels
(`GLOBE_TEXTURE_SIZE`, 2048x1024 equirectangular), because painting the world
texture is the only thing it is for. `globeTexture.test.ts` asserts every
committed coordinate stays inside those bounds, so a regeneration under
different bounds fails instead of painting the world off the sphere.

```bash
# 1. Same source data as step 1 above (Natural Earth 1:50m admin-0 countries).
# 2. Everything except Africa, dissolved, with the islands too small to read
#    at globe scale dropped. -simplify 3% is far coarser than Africa's 45%:
#    this outline is decor at a tenth of the size, and the whole world at
#    Africa's fidelity cost 20 KB gzipped instead of 8.7 KB.
npx mapshaper -i /tmp/ne_50m_admin_0_countries.geojson \
  -filter 'CONTINENT!="Africa"' \
  -dissolve \
  -clean \
  -filter-islands min-area=25000km2 \
  -simplify 3% visvalingam keep-shapes \
  -o format=geojson precision=0.1 /tmp/world-nonafrica.geojson

# 3. Project to globe-texture pixels.
node src/lib/atlas/assets/generate-world-basemap.mjs \
  /tmp/world-nonafrica.geojson \
  src/lib/atlas/assets/worldLandmassPath.ts
```

Committed size: ~20 KB raw / ~8.7 KB gzipped, in the globe's lazy chunk
rather than the initial bundle (`AtlasGlobeCanvas` is a `ssr: false` dynamic import).

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

Coverage is the 58 countries present in that file. The original 51 came from
the reviewed mockups; the seven island territories the corpus cites and they
omitted — Comoros, Mauritius, Seychelles, Cape Verde, São Tomé and Príncipe,
Réunion, Mayotte — were added from the same Natural Earth 1:50m dataset:

```bash
curl -o /tmp/ne_50m_admin_0_countries.geojson \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
# Filter to the wanted ADM0_A3 codes, round coordinates to 2 decimals, drop
# islets under 0.0004 sq deg, merge into the mockup source, then regenerate.
```

Réunion and Mayotte have no feature of their own: Natural Earth carries them
inside France's MultiPolygon as overseas departments, so their rings were
selected by bounding box. Both sit alone in open ocean, so nothing else of
France's geometry falls inside one.

**Keys are Natural Earth's, not always ISO 3166-1.** The file holds South Sudan
as `SDS` and Western Sahara as `SAH`, where the corpus writes `SSD` and `ESH`;
`getAdmin0Rings` bridges the two. Somaliland is present as `SOL` and has no ISO
code at all — it is deliberately **not** aliased onto `SOM`, which would make
the atlas assert a sovereignty claim no source in the corpus supports.

`overlays.ts` treats an unresolvable country as the missing state
(atlas-charter §4), never as a silently dropped shape: `buildPeopleFieldOverlay`
carries every entry it cannot draw in `undrawn`, and
`checkCountryCodesResolve` in `scripts/validateAfrikData.ts` fails the build on
a code that is neither drawable nor a declared off-map presence.

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

## Comparison countries (`worldAdmin0.ts`)

`worldAdmin0.ts` holds the sixteen countries outside Africa the Mercator game
may put on a button, keyed by ISO 3166-1 alpha-3 like `africaAdmin0.ts` and
carrying the same `Admin0Country` shape.

**Why a second world asset.** `worldCompare.ts` above holds the six shapes
Africa is measured _whole_ against — five of them larger than every African
country but the largest, which makes for a comparison with no tension in it.
The rounds that teach are the near-ties across latitudes: mainland France
against Madagascar, Norway against Côte d'Ivoire, Sweden against Cameroon.
Those need countries at a size an African country can match, and the two sets
are **disjoint by construction** so no country is ever measured twice —
`src/lib/games/__tests__/territory.test.ts` asserts it.

### Reproduction steps

```bash
# 1. Fetch the source data (same dataset as every asset above).
curl -o /tmp/ne_50m_admin_0_countries.geojson \
  https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson

# 2. Keep the sixteen countries, tagged by ADM0_A3 — *not* ISO_A3, which
#    Natural Earth sets to -99 for France and Norway. NAME_FR is the asset's
#    French label; NAME_EN the English one.
npx mapshaper -i /tmp/ne_50m_admin_0_countries.geojson \
  -filter 'ADM0_A3=="FRA"||ADM0_A3=="DEU"||ADM0_A3=="ESP"||ADM0_A3=="ITA"||ADM0_A3=="POL"||ADM0_A3=="SWE"||ADM0_A3=="NOR"||ADM0_A3=="FIN"||ADM0_A3=="ISL"||ADM0_A3=="KAZ"||ADM0_A3=="MNG"||ADM0_A3=="TUR"||ADM0_A3=="IRN"||ADM0_A3=="MEX"||ADM0_A3=="ARG"||ADM0_A3=="AUS"' \
  -each 'id=ADM0_A3, name=NAME_EN, fr=NAME_FR' \
  -filter-fields id,name,fr \
  -simplify 12% visvalingam keep-shapes \
  -o format=geojson precision=0.01 /tmp/world-simplified.geojson

# 3. Apply the mainland rule and emit the committed constant.
node src/lib/atlas/assets/generate-world-admin0.mjs \
  /tmp/world-simplified.geojson \
  src/lib/atlas/assets/worldAdmin0.ts
```

### The mainland rule

`generate-world-admin0.mjs` keeps only the polygons whose centroid sits within
`MAINLAND_RADIUS_DEGREES` (12°) of the largest one. Natural Earth's France
carries Guyane, Mayotte, la Réunion and the Antilles in the same feature; a
reader told « France » and shown four shapes over three oceans is being shown
something the option does not name, and the outlying polygons cost more payload
than the mainland they surround. Twelve degrees keeps Corsica with France,
Sicily and Sardinia with Italy, and drops the overseas departments and
Svalbard.

Where the rule changes what the name means, the name changes with it —
`NAME_OVERRIDE_FR` renames `FRA` to « France métropolitaine », because its
overseas departments are 89 000 km² against a 552 000 km² mainland and
« France » unqualified would be 14 % short of the figure a reader looks up.

### Which countries, and which are missing on purpose

The list is an editorial choice, not a filter: a country earns a place by being
one a French-speaking reader can picture, and by measuring within 3 % of its
published area once simplified. Four candidates were cut for failing the
second test, and the reason is the same in every case — an area carried by
islands that no uniform simplification holds:

| id  | measured | published | why it is not here                        |
| --- | -------- | --------- | ----------------------------------------- |
| GBR | −4.7%    | 244 376   | area carried by a chain of small islands  |
| JPN | −3.8%    | 377 975   | Okinawa falls outside the mainland radius |
| CAN | −18.2%   | 9 984 670 | the Arctic archipelago is most of it      |
| CHL | −8.4%    | 756 102   | 4 000 km of fjords and islands            |

`SAU` (−10.4%) and `UKR` are also absent: Natural Earth disagrees with the
published figure over the Rub' al-Khali border and over Crimea respectively,
and a game that prints an area should not settle a boundary dispute in passing.
`RUS` is absent because a single centroid latitude is meaningless for a country
spanning eleven time zones, which is what `mercatorInflation` reads.

### Size budget

- Committed size: ~24 KB raw / ~9 KB gzipped, for 16 countries.
- It reaches the browser only on `/[lang]/jeux/[jeu]`. `src/lib/atlas/worldOutlines.ts`
  exists for that reason alone: the lookup naturally belongs in `overlays.ts`,
  and putting it there measured 17 KB gzipped added to the client chunk the
  home shares with four atlas hubs, for outlines none of them draws.
- `-simplify 12%` holds a mean absolute area error of **0.4 %** across the
  sixteen, worst case Norway at −2.1 % — measured against the unsimplified
  source geometry, not against published figures, so the number isolates what
  the simplification costs. The African asset, for comparison, measures a mean
  of 2.8 % with Gambia at +36 %: it is simplified uniformly, and a uniform
  percentage destroys a country shaped like a river.
