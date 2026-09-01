---
title: "Randomize the home hero and make the globe gently interactive"
type: "feature"
created: "2026-09-01"
status: "ready-for-dev"
context:
  - "{project-root}/CLAUDE.md"
  - "{project-root}/docs/design/brand-charter.md"
  - "{project-root}/docs/design/atlas-charter.md"
  - "{project-root}/docs/design/actions-charter.md"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The home hero gives the globe only a one-in-three chance, starts it static, hides the Africa recenter action, and describes dragging without acknowledging autonomous motion.

**Approach:** Draw image versus globe independently at 50/50 once per server request. Opt only the home globe into gentle rotation, stop it when the reader takes control, expose the existing recenter action, and synchronize the instruction with motion state.

## Boundaries & Constraints

**Always:** Keep the draw server-side and hydration-stable; make autoplay home-only; stop it on pointer or keyboard manipulation and never restart it after recentering; remain still and Africa-facing under `prefers-reduced-motion`; reuse the camera pose, motion tokens, button primitive, and French voice; work mobile-first at 320–430 px, then tablet and desktop.

**Ask First:** Any change to the shared default camera pose, projection semantics, cartographic encodings, image corpus, or non-home globe behavior.

**Never:** Persist assignments, promise an exact five/five split, use a request counter, animate the flat fallback, render React state per frame, remove manual controls, or add a new control shape.

## I/O & Edge-Case Matrix

| Scenario             | Input / State                       | Expected Output / Behavior                   | Error Handling                   |
| -------------------- | ----------------------------------- | -------------------------------------------- | -------------------------------- |
| Random globe         | First draw `< 0.5`                  | Globe plus globe-only data                   | N/A                              |
| Random image         | First draw `>= 0.5`                 | One curated image; no globe data             | Clamp RNG `1` to the last image  |
| Globe autoplay       | Home sphere, normal motion          | Gentle turn and stop-oriented guidance       | Stop if projection leaves sphere |
| Reader takes control | Pointer, supported key, or recenter | Stop permanently; manual controls still work | Pointer cancellation also stops  |
| Reduced motion       | OS reduced-motion preference        | No autoplay; Africa-facing start             | Manual controls remain available |
| Recenter             | Home globe away from Africa         | Restore Africa pose without autoplay         | N/A                              |

</frozen-after-approval>

## Code Map

- `src/lib/home/homeHeroVisuals.ts` -- Injectable request-time visual draw.
- `src/app/[lang]/page.tsx` and `src/components/home/HomeHero.tsx` -- Request draw, conditional data, and home presentation.
- `src/components/atlas/ContinentGlobeStage.tsx` -- Shared home/Mercator adapter; autoplay must be explicit.
- `src/components/atlas/AtlasGlobe.tsx` -- Interaction, guidance, controls, and `recentre()`.
- `src/hooks/use-globe-camera.ts` -- Camera yaw and frame scheduling; shared defaults remain still.
- Colocated home, camera, and atlas tests -- Unit and component contracts.
- `e2e/home-globe.spec.ts` -- Responsive browser contract.

## Tasks & Acceptance

**Execution:**

- [ ] `src/lib/home/__tests__/homeHeroVisuals.test.ts` then `src/lib/home/homeHeroVisuals.ts` -- test and implement the 50/50 boundary.
- [ ] `src/app/[lang]/__tests__/home.test.tsx`, `src/components/home/__tests__/HomeHero.test.tsx`, then their source files -- preserve one request draw and honor `?hero=globe` as a deterministic browser-test pin.
- [ ] `src/hooks/__tests__/use-globe-camera.test.ts` and atlas component tests, then `src/hooks/use-globe-camera.ts`, `src/components/atlas/AtlasGlobe.tsx`, and `src/components/atlas/ContinentGlobeStage.tsx` -- add home-only autoplay, permanent ownership transfer, reduced-motion handling, guidance, and recentering.
- [ ] Extend `e2e/home-globe.spec.ts` at 430, 720, and 1200 px using the deterministic globe render.

**Acceptance Criteria:**

- Given independent home requests, when the server draws the visual, then each request has a 50% globe and 50% image chance without shared state.
- Given a globe-rendering request, when the page becomes interactive, then the sphere rotates gently and displays guidance that interaction will stop the rotation.
- Given an autoplaying globe, when the reader uses pointer or keyboard, then autoplay stops immediately and manual interaction remains responsive.
- Given any home-globe pose, when the reader activates “Recentrer sur l’Afrique”, then the established Africa-facing pose is restored and autoplay remains stopped.
- Given reduced motion or a non-home globe consumer, when the globe mounts, then no new autonomous motion is introduced.
- Given 320 px through desktop, when controls render, then guidance and recenter remain readable, reachable, and clear of the projection control.

## Spec Change Log

## Design Notes

Autoplay is an explicit capability defaulting off, not a presentation mode. Mutate camera yaw and request canvas repainting without React renders per frame; one state transition may publish that autoplay stopped. Target roughly one revolution every three to five minutes.

While moving, show “Interagissez avec le globe pour arrêter la rotation.” Once stopped, retain the projection-aware manual wording. Recenter reuses `recentre()` and the shared button.

## Verification

**Commands:**

- `npx vitest run src/lib/home/__tests__/homeHeroVisuals.test.ts src/hooks/__tests__/use-globe-camera.test.ts src/components/atlas/__tests__/AtlasGlobe.test.tsx src/components/atlas/__tests__/projectionMorphBar.test.tsx 'src/app/[lang]/__tests__/home.test.tsx'` -- targeted behavior passes.
- `npm run typecheck` -- TypeScript passes.
- `npm run lint:req` -- new tests retain requirement traceability.
- `npm run lint` -- edited source passes lint.
- `npx playwright test e2e/home-globe.spec.ts` -- deterministic mobile/tablet/desktop globe interaction passes.

**Manual checks (if no CLI):**

- Render `/fr` at 430, 720, and 1440 px; verify gentle motion, stop, recentering, spacing, and reduced motion.
