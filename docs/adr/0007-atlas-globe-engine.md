# ADR-0007: One textured-sphere globe for the whole atlas

- **Status**: Accepted, amended 2026-08-26 and 2026-08-30 — see "What actually shipped"
- **Date**: 2026-08-25
- **Reference**: `docs/design/atlas-charter.md`, `docs/design/mockups/`

> **What actually shipped is the alternative this ADR rejected.** The decision
> below reads "adopt three.js r169"; `three` never became a dependency and
> `AtlasGlobeCanvas.tsx` is hand-written WebGL 1 with GLSL shader strings. The
> record is kept as written — an ADR is a dated decision, not a description of
> the tree — and corrected in "What actually shipped" at the end. Read that
> section before citing this one.

## Context

`HomeGlobe.tsx` (ETNI-1214) renders the home hero as a **point cloud**: raw
WebGL, one `gl_Point` per continent dot, morphing between sphere and flat.
It ships in three files — `HomeGlobe`, `HomeGlobeFallback`, `HomeGlobeStage` —
and carries no third-party dependency.

The V2 design work extends the globe to the three entity fiches (country,
people, language family). Each fiche needs something the point cloud cannot
express: a **closed administrative outline** that draws itself, a **borderless
presence field**, and a **dashed derived footprint**. All three are surface
treatments — they need a filled, textured surface to sit on, not a scatter of
points.

Two options were weighed:

1. Extend the in-house point-cloud engine. No new dependency, but the three
   overlays would have to be re-expressed as dot density, and the validated
   mockups would have to be redesigned around that constraint.
2. Adopt three.js and render a textured sphere, as the four validated mockups
   already do.

The mockups are the reference: they were reviewed and accepted as the target
rendering. Redesigning them to fit the engine would invert the relationship
between design and implementation.

## Decision

**Adopt three.js r169 and render the atlas as a textured sphere.**

`three` becomes a runtime dependency. The atlas renders a morphable
sphere⇄Mercator geometry carrying an equirectangular canvas texture, lit by a
Lambert term with a rim adjustment — the pipeline the mockups establish.

**One component serves every surface.** There is exactly one globe in the
codebase. It takes an overlay as a parameter; it is not subclassed, wrapped, or
duplicated per entity:

```
src/lib/atlas/overlays.ts     the four overlays, one file
src/components/atlas/AtlasGlobe.tsx   the only globe component
```

`AtlasGlobe` owns the WebGL path **and** its non-WebGL fallback. A missing
context is a branch inside the component, not a second component: the fallback
renders the same overlay descriptor as flat SVG, so no fact can exist only in
the 3D path.

**`HomeGlobe` is superseded.** The home hero becomes `AtlasGlobe` with the
`continent` overlay. `HomeGlobe`, `HomeGlobeFallback` and `HomeGlobeStage` are
removed once the home renders through `AtlasGlobe` — the two engines must never
ship side by side.

## Consequences

**Positive**

- The shipped rendering matches the reviewed mockups, so design review stays
  meaningful instead of being relitigated at implementation time.
- Four surfaces, one component, one overlay module. Adding a fifth entity is a
  new overlay function, not a new globe.
- The three cartographic encodings (`docs/design/atlas-charter.md`) become
  expressible: an outline can stroke, a field can feather, a footprint can
  tint — none of which a point cloud does honestly.
- `src/lib/atlas/projection.ts` survives unchanged. Its `AFRICA_GEO_BOUNDS`,
  `BASEMAP_VIEWBOX` and `lonLatToSphere` are the same primitives the mockups
  reimplemented, and the overlays consume them.

**Negative**

- A real dependency. Tree-shaken to what the atlas uses (`WebGLRenderer`,
  `PerspectiveCamera`, `Scene`, `Mesh`, `BufferGeometry`, `ShaderMaterial`,
  `CanvasTexture`), the added weight is on the order of 120–150 KB gzip. It
  must be code-split behind the atlas route chunk, never in the shared bundle.
  (The ~1.3 MB figure visible in the mockups is the full unminified library
  inlined for a self-contained artifact, not a shipping estimate.)
- Work already merged for ETNI-1214 is discarded. That is the cost of aligning
  on the mockups, and it is paid once — the point cloud has no second consumer.
- The overlay texture is redrawn on the CPU during a reveal. It is throttled to
  ~30 Hz for the duration of the animation and never repainted at rest; a
  per-frame upload of a 2048×1024 canvas would cost more than the rest of the
  page.

## Alternatives rejected

**Keep both engines** — point cloud on the home, three.js on the fiches.
Rejected: two rendering paradigms for one visual object, each needing its own
fallback, its own tests, and its own reviewers.

**Raw WebGL, textured** — reimplement the textured pipeline without three.js.
Rejected: it re-derives geometry, camera and material handling for the sole
benefit of avoiding a dependency, and lands the same maintenance burden inside
the repo instead of outside it.

## What actually shipped

The rejected alternative. `three` is absent from `package.json`; the atlas
runs on hand-written WebGL 1:

| This ADR decided                | The tree carries                                             |
| ------------------------------- | ------------------------------------------------------------ |
| `three` as a runtime dependency | no dependency — `getContext("webgl")` and GLSL strings       |
| three.js scene graph and camera | `src/lib/atlas/sphereLayer.ts`, `camera.ts`, `sphereMesh.ts` |
| `WebGLRenderer`, `Mesh`         | `src/components/atlas/AtlasGlobeCanvas.tsx`                  |

Everything the decision was _for_ held: one component for every surface, one
overlay parameter, one fallback, the morphable sphere⇄Mercator geometry and
the equirectangular texture. Only the means changed, and the cost the
rejection predicted — geometry, camera and material handling re-derived
in-repo — is exactly what those four files are.

This section records the divergence rather than rewriting the decision: the
choice above was made on 2026-08-25 with the information of that day, and a
reader tracing why the atlas looks like the mockups needs both halves.

### One globe, from 2026-08-30 (ETNI-1360)

The clause "there is exactly one globe in the codebase" was a decision, not a
description, for five days short of a year. `HomeGlobe.tsx` went on drawing the
same continent on its own 639 lines of WebGL 1 beside `AtlasGlobeCanvas.tsx`'s
719, each with its own GLSL, its own fallback and its own tests.

It is now true. `HomeGlobe`, `HomeGlobeFallback` and `HomeGlobeStage` are
deleted; the home's module and the Mercator game stand on
`ContinentGlobeStage`, which mounts `AtlasGlobe` with the continent overlay.
`src/components/__tests__/oneGlobeRenderer.test.ts` holds the clause to its
word, and is written so that `AxisGraphScene.tsx` — a second WebGL consumer on
the home, deliberately out of scope — does not trip it.

Three things had to be carried across rather than assumed:

- **The projection can be pinned from outside.** The Mercator game holds the
  map flat while a question stands and closes it into a sphere on the reveal;
  that is the demonstration the page exists for. `AtlasGlobe`'s morph was
  internal state with no way in, so `pinnedProjection` was added.
- **The canvas says when it gives up.** Every bail-out in `AtlasGlobeCanvas`
  was a bare `return` leaving a transparent canvas, and `createProgram` never
  asked whether the program had linked — so the failure REQ-112 AC2 is written
  for could not be detected, let alone recovered from. Both are fixed.
- **The first frame paints nothing.** A stage that has already probed hands the
  answer down as `probedWebglSupport`, so no reader is shown a flat map that
  then vanishes. A fiche, which has not probed, keeps its server-rendered
  figure exactly as before.

`three` is still not a dependency, and DEC-021's premise stays retired.
