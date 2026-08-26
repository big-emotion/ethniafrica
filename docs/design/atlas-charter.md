# Atlas charter — what the design system asserts

The rules a component has to obey to belong to the V2 atlas surface. Each one
exists because breaking it makes the interface claim something the corpus
cannot support.

Reference rendering: `docs/design/mockups/` (see `README.md` for the four
published artifacts). Engine decision: `docs/adr/0007-atlas-globe-engine.md`.

---

## 1. Cartographic grammar

Three entities, three ways of existing in space, therefore **three encodings
that are never interchanged**. The shape of the mark states what the data is
allowed to claim.

| Entity              | Encoding                                                                   | Why this one                                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Country**         | Closed outline, stroked as it draws, 22 % fill                             | An administrative border is published, dated and citable. The closing trace asserts it; the draw-in says it was surveyed, not assumed.                                                      |
| **People**          | Radial field, no edge anywhere. Radius ∝ √population, opacity 0 at the rim | No source states where a people's presence stops. A closed line would assert an inside and an outside that nobody can cite. Area follows population because the eye reads area, not radius. |
| **Language family** | Derived choropleth, dashed boundary, tint by member count                  | The fiche declares no distribution (§4). The area is reconstructed from member peoples, and the dash says so.                                                                               |

**The hard rule.** A people never receives a closed line. Not as a
simplification, not "just for the hover state", not in the non-WebGL fallback.
If a future feature needs a people-shaped polygon, it needs a source first.

**Where the surfaces come from.** Country and family outlines are Natural Earth
admin-0 110 m — public, versioned, checkable. A people's field is _computed_
from `content.demography.distributionByCountry`; nobody draws the blob by hand,
which is exactly what makes it citable. A family's footprint is the union of
`currentCountries` over the peoples carrying that `languageFamilyId`.

---

## 2. Accent scope

A component never names an accent. It reads `var(--accent)` and
`var(--accent-tint)`; a page-level wrapper carries `.afh-accent-*`. A route
changes accent by changing one class, and no component learns which accent it
was rendered under.

**Three surfaces carry three different mappings, all deliberate:**

| Surface      | People | Country | Family   | Source of truth                        |
| ------------ | ------ | ------- | -------- | -------------------------------------- |
| Home modules | ocre   | teal    | terre    | `src/lib/accessModeHubs.ts`            |
| Directory    | terre  | ocre    | teal     | `DirectoryHero.DIRECTORY_ACCENT_CLASS` |
| **Fiche**    | ocre   | teal    | **perv** | `FicheSequence.ACCENT_CLASS_BY_ENTITY` |

A fiche family is **pervenche, never terre**. Inside a fiche, `IdentityPanel`
reserves terre for the imposed-exonym marker; painting the page terre would make
that marker read as the page accent and it would stop being a marker. A
directory has no such marker, so it is free to take terre back.

Only terre needs a dark `--accent-foreground` — its mid tone fails AA under
white.

---

## 3. The three entry points

The header carries **three intentions, not ten modules**: _Explorer_ when you
know what you are looking for, _Comprendre_ when you want to know where what
you are reading comes from, _Jouer_ when you want the corpus to answer.

The modules live behind the click, in a panel (desktop) or a drawer (mobile
< 760 px). Both are driven by `src/lib/accessModeHubs.ts` — the menu is
generated from it, never hand-listed.

- A module whose `page` is `null` renders as **Bientôt** and is not focusable.
  The menu never offers a route that does not resolve.
- The panel shows each module's real route. A module absent from the menu is a
  module absent from the corpus; there is no third state.
- Escape closes and returns focus to the trigger. Arrow keys move between axes.

Build both on the shadcn primitives already in the repo — `navigation-menu`
for the panel, `drawer` for the mobile tray. No competing component library
(`docs/component-inventory.md`).

---

## 4. Saying what the corpus does not have

An empty field is information about the state of the corpus. Erasing it makes
that information disappear.

The family fiche is the worked example: all 24 `FLG_*.json` declare
`generalInfo.branches = []` and `distribution.distributionByCountry = {}`. The
fiche shows both gaps explicitly, _then_ derives what is derivable and marks it
as derived. It does not hide the section, and it does not invent an area.

Any value shown on a fiche is one of three things, and the interface says
which: **declared** by the fiche, **derived** from other fiches, or **missing**.

---

## 5. The information panel

One component, two anchorings: a bottom sheet under 760 px, a side panel above.
Same facts either way.

The globe yields the share of the viewport the panel occupies, so the subject
stays visible — a fly-to that lands the country under the sheet has done
nothing. Below 760 px the sheet caps at 54 % height and the globe shifts up;
above, it takes the right and the globe shifts left.

---

## 6. Motion

Durations and easings come from `src/styles/tokens/motion.css`. The spring
`cubic-bezier(.22, 1, .36, 1)` is reserved for things arriving on screen —
panel, card, drawer; flat curves carry state changes.

Under `prefers-reduced-motion: reduce`, every duration collapses and transforms
are neutralised — only opacity survives. On the atlas this means the camera
**jumps** to its destination instead of flying there, and the overlay paints at
full strength in one step. Nothing is ever made unreachable by reduced motion.
