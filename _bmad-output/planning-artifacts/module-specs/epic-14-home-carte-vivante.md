# Epic 14 — Home Page « Carte vivante »

Pillar: entry surface for all three access modes (Explorer · Comprendre · Jouer) — Status: Draft — PRD addendum (FR block FR91–FR95)

## Module Goal

Replace the current flat `/fr` landing with the home experience the product owner validated on 2026-07-29 from the live prototype artifact: a night-toned hero where the African continent appears as a field of softly twinkling ochre dots, the triptych eyebrow "Explorer · Comprendre · Jouer", the Fraunces-900 headline «&nbsp;Le continent raconté comme une <i>carte vivante</i>&nbsp;», and pill CTAs leading into the site's three access modes. This pulls the hero + entry-points part of the Phase 2 information-architecture redesign forward; the rest of Phase 2 (full nav redesign, hub inner pages, site-wide visual refresh with a designer) stays out of scope.

## Reproduction Authority (read this first)

The product owner validated the prototype **visually, as-is**. A pixel-faithful reproduction is the acceptance bar. Authority order when sources disagree:

1. **`assets/reference-prototype.html`** — the exact validated artifact (self-contained HTML/CSS/JS, fonts embedded). Extract colors, spacing, font sizes, easing and canvas constants **from this file**, not from memory. The home page reproduces its `header.top` visual language, `.hero` block and `#heroCv` canvas behaviour.
2. **Screenshots** (rendered ground truth):
   - [`assets/home-hero-mobile-390.png`](assets/home-hero-mobile-390.png) — 390 px viewport (primary target)
   - [`assets/home-hero-tablet-720.png`](assets/home-hero-tablet-720.png) — 720 px
   - [`assets/home-hero-desktop-1440.png`](assets/home-hero-desktop-1440.png) — 1440 px
   - [`assets/prototype-full-mobile-390.png`](assets/prototype-full-mobile-390.png) — full prototype for context (the module sections belong to epics 7–13, not to this epic)
3. This document — tokens, scope adaptations and acceptance criteria.

What is **kept verbatim** from the prototype: the night palette, typography treatment, hero composition and copy, dotted-continent canvas (geometry, density, colors, twinkle), pill styling, focus rings, reduced-motion behaviour.
What is **adapted** (prototype was a demo hub):

- The module-anchor tab bar is dropped. On the home route, the **existing top navigation keeps its links but wears the prototype header skin**: sticky top, background `color-mix(in srgb, var(--afh-night-ground) 88%, transparent)`, `backdrop-filter: blur(10px)`, 1px `--afh-night-line` bottom border, brand in Fraunces 900 17px + uppercase tagline 11.5px letter-spacing .14em. Navigation IA/links are unchanged in this epic.
- The five demo pills become the three access-mode hub CTAs (FR92).
- The lede copy is adapted (the demo lede described the 5-module prototype — see Copy below).
- The «&nbsp;données illustratives&nbsp;» chip is dropped (nothing illustrative remains on the real home).

## Fit & Dependencies

- **Epic 1 (done)** owns the design-token sheet (`src/styles/tokens/color.css`). The night palette lands there as a new scoped group (below) — one addition, no renames.
- **Epic 2** conventions apply (mobile-first 430/720/800, axe + Lighthouse CI gates, Storybook react-vite).
- Fonts: the app already loads Fraunces + Nunito Sans via `next/font/google` (`src/app/layout.tsx`). The headline italic requires the **real Fraunces italic axis** (add the italic style to the font config; do not ship faux-oblique — compare against the screenshots).
- Brand string: the hero brand comes from the rebrand-readiness single source of truth — `src/lib/brand.ts` (Epic 0, Story 0.12; env-driven, current default "Atlas des Peuples d'Afrique"). Never hardcode "EthniAfrica"/"Africa History" in components.
- Independent of epics 7–13. Hub CTAs are config-driven, so modules plug in as they ship.

## Design Tokens (validated values)

Add as a scoped group in the Epic 1-owned sheet (proposed prefix `--afh-night-*`), consumed only by the home surface until Phase 2 decides on site-wide adoption:

| Token                   | Value     | Prototype var | Role                                 |
| ----------------------- | --------- | ------------- | ------------------------------------ |
| `--afh-night-ground`    | `#120E0A` | `--ground`    | page background                      |
| `--afh-night-surface`   | `#1D1710` | `--surface`   | cards, pills                         |
| `--afh-night-surface-2` | `#271E14` | `--surface2`  | raised surfaces                      |
| `--afh-night-line`      | `#3A2E1F` | `--line`      | borders, rules                       |
| `--afh-night-ink`       | `#F1E7D8` | `--ink`       | primary text                         |
| `--afh-night-ink-2`     | `#C9B99F` | `--ink-2`     | secondary text                       |
| `--afh-night-ink-3`     | `#8F7F66` | `--ink-3`     | muted text                           |
| `--afh-night-ocre`      | `#C9821F` | `--ocre`      | continent dots, accents              |
| `--afh-night-ocre-soft` | `#E8B96A` | `--ocre-soft` | eyebrow, italic accent, active pill  |
| `--afh-night-teal`      | `#33A390` | `--teal`      | categorical (validated CVD-safe set) |
| `--afh-night-terre`     | `#C4573F` | `--terre`     | categorical                          |
| `--afh-night-perv`      | `#7A8CE8` | `--perv`      | categorical                          |

Radius 14px (`--radius`); pills are full-round (999px). The 4-color categorical set passed the dataviz palette validator on the night surface (lightness band, chroma, CVD ΔE, contrast) — do not substitute hues.

## Typography (from the reference CSS)

- **Display**: Fraunces, weight 900. H1: `clamp(34px, 9vw, 58px)`, line-height 1.04, `text-wrap: balance`; the words «&nbsp;carte vivante&nbsp;» in italic, color `--afh-night-ocre-soft`.
- **Eyebrow**: 11.5px, weight 800, uppercase, letter-spacing .18em, color `--afh-night-ocre-soft` — content `EXPLORER · COMPRENDRE · JOUER`.
- **Body/lede**: Nunito Sans 15.5px, color `--afh-night-ink-2`, max-width 34em.
- **Pills**: Nunito Sans 13px weight 700; padding 9px 14px; min-height 40px (prototype value); background `--afh-night-surface-2`, 1px `--afh-night-line` border. **Deliberate deviation**: the real home extends each pill's interactive hit area to ≥ 44px (transparent hit-area extension, no visual change) per WCAG 2.5.8.
- Focus: `:focus-visible` 2px `--afh-night-ocre-soft` outline, offset 2px, border-radius 6px.

## Hero Geometry, Spacing & Copy (from the reference)

- Hero inner container: max-width 820px, centered, padding `64px 20px 56px`; hero block has a 1px `--afh-night-line` bottom border.
- H1 margins `10px 0 14px`; the headline carries a **hard line break after «&nbsp;raconté&nbsp;»** («&nbsp;Le continent raconté&nbsp;/ comme une carte vivante&nbsp;») — keep it.
- CTA pill row: flex-wrap, gap 8px, margin-top 22px.
- Body base: 16px / line-height 1.55, antialiased.
- **Copy (exact strings)** — eyebrow: `EXPLORER · COMPRENDRE · JOUER` (verbatim). H1: «&nbsp;Le continent raconté comme une _carte vivante_&nbsp;» (verbatim, italic accent on «&nbsp;carte vivante&nbsp;»). Lede (adapted for the home — the prototype lede described the demo): «&nbsp;Peuples, langues, noms et migrations&nbsp;: l'histoire africaine racontée depuis son propre regard — chaque affirmation adossée à une source vérifiable.&nbsp;» (product owner may fine-tune the wording; the verifiable-source clause stays).
- Any visual value not listed in this document: **read it from `assets/reference-prototype.html`** (authority #1) — never improvise.

## The Dotted-Continent Canvas (hero signature)

Reproduce exactly from `reference-prototype.html` (`AFRICA`/`MADA` polygons + `africaDots()` + the hero IIFE):

- **Geometry**: 41-point normalized mainland polygon + 6-point Madagascar polygon (copy the coordinate arrays verbatim — they are the validated silhouette).
- **Sampling**: grid step 0.016 in unit space, ray-cast point-in-polygon; each dot gets a random phase φ.
- **Projection into the hero box**: `sc = max(w, 1.15h)`, `ox = w − 0.92·sc`, `oy = 0.5·h − 0.42·sc` — the continent bleeds off the right edge behind the text at every breakpoint (verify against all three screenshots).
- **Dots**: radius 1.6px, `rgba(201,130,31, α)` with `α = 0.45 × (0.38 + 0.3·sin(1.1t + φ))`; the twinkle clock is **per-frame** (`t += 0.016` each rAF frame — frame-count, not wall-clock); devicePixelRatio capped at 2.
- **Reduced motion**: single static frame with `α = 0.45 × 0.55` — no twinkle, no rAF loop.
- **Perf/a11y**: `aria-hidden="true"` decorative canvas, absolutely positioned behind the hero content, zero layout shift, animation paused when offscreen (IntersectionObserver) and started after first paint — the h1 stays the LCP element.

## Functional Requirements

**FR91** — The `/fr` home page must open with the «&nbsp;carte vivante&nbsp;» hero — dotted-continent canvas, triptych eyebrow, Fraunces-900 headline with italic ochre accent, lede, CTA pills — visually identical to the reference prototype across the project breakpoints (430 / 720 / ≥ 800 px); the rendered ground truth is the screenshot set (390 / 720 / 1440 px).

- Given the home page at 390/430 px, When compared with `home-hero-mobile-390.png`, Then composition, colors, type hierarchy and dot field match (allowing only dot-phase randomness).
- Given the brand source of truth changes the product name, When the home renders, Then the hero brand reflects it without a code change to the hero component.

**FR92** — The hero must be followed by three access-mode hubs — Explorer, Comprendre, Jouer — as large CTA cards, driven by a config that lists each hub's live surfaces; a hub with zero live surfaces must not render.

- Given today's live surfaces (countries, families, peoples, search under Explorer; doctrine and about under Comprendre; none under Jouer), When the home renders, Then Explorer and Comprendre hubs appear and Jouer does not.
- Given Epic 9 or 10 ships its route, When its surface is added to the hub config, Then Jouer appears with no further home changes.

**FR93** — The home must keep the performance posture: Lighthouse mobile ≥ 85 on the home route, LCP ≤ 2.5 s on 4G with the h1 as LCP element, CLS ≤ 0.1, and the canvas must never block first paint.

- Given the Lighthouse CI run on the home route, When the page includes the animated canvas, Then scores stay above the gates and the LCP element is the headline text node.

**FR94** — The home must respect `prefers-reduced-motion` (static dot field, no autonomous animation) and be fully keyboard-operable with the prototype's visible focus ring; axe-core reports zero serious/critical violations at 430/720/800.

- Given `prefers-reduced-motion: reduce`, When the hero renders, Then no requestAnimationFrame loop runs and dots render at constant opacity.

**FR95** — The home must replace the current landing without breaking routing or SEO: `/` keeps redirecting to `/fr`, canonical and OG/meta tags describe the home, and no existing public URL changes.

- Given the deployed home, When crawling `/` and `/fr`, Then the redirect chain, canonical URL and metadata are valid and unchanged elsewhere.

## Test Plan (TDD) & Stories

Placement per project conventions; every story names its failing test first. Stories in dependency order:

### Story 14.1: Night token group + Fraunces italic axis

As a developer, I want the validated night palette in the token sheet and the true Fraunces italic loaded, So that home components consume tokens, not literals.
Test first: `src/lib/__tests__/nightTokens.test.ts` asserts the 12 `--afh-night-*` custom properties exist with the exact hex values above (parse `color.css`). Technical notes: extend `src/styles/tokens/color.css` (Epic 1 sheet, additive only); add italic style to the Fraunces `next/font` config in `src/app/layout.tsx`.

### Story 14.2: `DottedContinent` canvas component

As a visitor, I want the continent to shimmer gently behind the headline, So that the home feels like a living map.
Test first: `src/lib/__tests__/continentDots.test.ts` — extract the polygon + sampling into `src/lib/continentDots.ts`; assert dot count is stable for step 0.016, all sampled dots fall inside a polygon, and a known outside point is excluded. Component test `src/components/home/__tests__/DottedContinent.test.tsx` asserts `aria-hidden`, no rAF under reduced motion. Technical notes: `src/components/home/DottedContinent.tsx`; constants copied verbatim from `assets/reference-prototype.html`.

### Story 14.3: `HomeHero` section

As a visitor, I want the validated hero composition, So that the first screen states the product's thesis.
Test first: `src/components/home/__tests__/HomeHero.test.tsx` — eyebrow text, headline with `<em>` accent, lede copy, pill roles/labels, brand read from the rebrand source of truth. Storybook stories at 430/720/800 + axe. Technical notes: copy strings exactly from the prototype hero.

### Story 14.4: Access-mode hub config + `HubCard`

As a visitor, I want three clear doors — Explorer, Comprendre, Jouer — So that I never face a flat page list.
Test first: `src/lib/__tests__/accessModeHubs.test.ts` — hub visibility rule (zero live surfaces → hidden), surface lists resolve to existing localized routes from `src/lib/routing.ts`. Technical notes: `src/lib/accessModeHubs.ts` config + `src/components/home/HubCard.tsx`; card styling derives from the prototype's pill/surface tokens.

### Story 14.5: Route integration + perf/SEO gates

As a maintainer, I want the new home live on `/fr` with gates green, So that the swap is safe.
Test first: `src/app/[lang]/__tests__/home.test.tsx` — asserts `/fr` renders `HomeHero` + hubs, and canonical/OG metadata. Add the home route to the Lighthouse CI and axe CI route lists. Technical notes: `src/app/[lang]/page.tsx` swap; keep `/`→`/fr` redirect.

### Story 14.6: Visual-parity pass against the reference

As the product owner, I want proof the build matches what I validated, So that "reproduce exactly" is verified, not assumed.
Test first: `e2e/home-visual.spec.ts` — Playwright visual check at 390/720/1440 against the three hero screenshots (freeze the canvas via reduced-motion emulation to neutralize dot-phase randomness); manual side-by-side sign-off recorded in the PR. Technical notes: delete `.playwright-mcp/` artifacts after the run.

## Out of Scope

- Full navigation/IA redesign, hub inner pages, restyling of existing pages (rest of Phase 2, with the designer).
- Light theme for the home — the night world is the validated identity; site-wide theming is a Phase 2 decision.
- Any module surface (epics 7–13 own their pages).

## Open Questions

1. Theme seam: the night home links into current light inner pages — accept the contrast until Phase 2, or fast-follow a soft transition (e.g. shared header tint)?
2. Hub card content: short descriptions per hub — product-owner copy or reuse the vision brief's mode descriptions?
3. Should the home later host a live teaser (e.g. "fiche of the day") — Growth item, not specced here.
