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
| Home modules | ocre   | teal    | terre    | `src/lib/hubs/moduleRegistry.ts`       |
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
< 760 px). Both are driven by `src/lib/hubs/moduleRegistry.ts` — the menu is
generated from it, never hand-listed.

- A module with **no resolvable route** renders as **Bientôt** and is not
  focusable. The menu never offers a route that does not resolve.

  This used to read "a module whose `page` is `null`", and that was the same
  sentence for as long as `page` was the only way to address a module. REQ-120
  gave Jouer eleven games addressed by `gameSlug`, each carrying `page: null`
  on purpose so `PageType` stays a closed union — and the rule as written made
  eleven playable games render as **Bientôt** on the home. Resolution is
  `getModuleHref` (`src/lib/hubs/moduleHref.ts`), read by both surfaces, and
  the charter asks about its result rather than about one of its inputs.

- The panel shows each module's real route. A module absent from the menu is a
  module absent from the corpus.

- **Reachable and mature are two separate questions.** A module is _listed_
  because it exists. It is _clickable_ because what sits behind the click is
  worth the reader's trip. `availability` (`src/lib/hubs/moduleRegistry.ts`)
  answers the first question and only that one: a `data` module waits on its
  table, a `static` module waits on nothing. `editorialReadiness` answers the
  second, and it is **declared, not measured** — no row count distinguishes six
  sourced events from an account of African migrations, and the page renders
  either way.

  A module declared `draft` renders exactly as an empty one does: the inert
  row, the **Bientôt** chip, no anchor, no focus stop. The reader is told the
  same thing in both cases because it _is_ the same thing — there is nothing
  worth reading here yet, and the charter owes no account of which internal
  state produced that.

  This is not the environment switch this section threw out. A flag asked
  _did the code ship_, and answered differently on two machines, so a finished
  quiz existed for nobody. `editorialReadiness` asks _is the corpus behind
  this module worth a reader's trip_, and answers identically for everyone:
  the route stays built, the URL stays reachable, the module keeps its row,
  and the editor who fills it flips one word in one file. What it withholds is
  the invitation, never the module.

  Two entries carry `draft` today. _Premiers repères de migrations_ holds six
  events — a handful of pins, not the beginning of an answer to « d'où
  viennent-ils ». _Regards : colonisation et résistances_ is `static`, so no
  row count could ever have spoken for it: its readiness was never measurable,
  only declarable, and that is precisely the gap this field closes.

- **A page states one availability, not one per surface.** A hub row and the
  scene beside it are two assertions about the same module, and when they
  disagree the page is simply wrong. `/fr/comprendre` shipped that way: a
  question spine linking to _Noms & appellations_ directly above the row
  marking that module **Bientôt**. A scene therefore takes `HubModule[]` —
  the resolved availability the rows read — never a hand-kept list of routes.
- **Shelves nest, they never hide.** An axis holding more modules than a scene
  can place files them onto shelves (`ModuleGroupId`), and the panel opens on
  the shelves rather than on every module at once. A shelf carries its count,
  so nothing is asserted absent; the hub route still lists every module, each
  on its own row under a heading. A shelf holding one module stands in for
  that module — a click that offers no choice is not a level.
- Escape steps back one level before it closes, then closes and returns focus
  to the trigger. Arrow keys move between axes.

Build both on the shadcn primitives already in the repo — `navigation-menu`
for the panel, `drawer` for the mobile tray. No competing component library
(`docs/component-inventory.md`).

---

## 4. Saying what the corpus does not have

An empty field is information about the state of the corpus. Erasing it makes
that information disappear.

The family fiche is the worked example, and it is also the cautionary one.

This section used to read: "all 24 `FLG_*.json` declare `generalInfo.branches = []`
and `distribution.distributionByCountry = {}`". **That was never true of the
corpus.** All 24 fiches declare between 2 and 13 branches and between 1 and 12
countries; it was the _database_ that held neither, because the loader had not
been run since those fields were written. For as long as that lasted, the fiche
told its reader "le corpus ne renseigne pas ce champ" about data the corpus
does renseigne — which, on a surface whose whole argument is provenance, is a
worse failure than showing nothing at all.

The rule survives the correction, and is sharpened by it: an interface may only
call a field **missing** when it has checked the source of truth, not the
projection of it. `dataset/source/afrik/` is that source; Supabase is a
projection, and a projection can be stale.

So the fiche shows a real gap explicitly, _then_ derives what is derivable and
marks it as derived. It does not hide the section, it does not invent an area,
and it does not report a sync lag as an editorial silence.

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
