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

**An encoding is owned by the entity it describes.** The three rows above bind
a mark's shape to what the _data_ claims, and an encoding borrowed by a scene
that describes something else stops being readable. The radial field is the
_people_ encoding: it earns its feathered edge on a people fiche, where the
quantity is a declared distribution and `PeopleFieldLegend` names it.

So **the continent scene draws no radial field.** It carried one — twelve
halos ranking the best-documented countries — and the quantity behind the glow
was fiches counted in the corpus, which no legend on the hub ever named. A
reader met twelve luminous zones over an unlabelled continent with no way to
learn they meant "well documented" rather than "densely populated" or "where
these peoples live", and read the map as asserting the one thing it was not
saying. The count now reaches the reader as a sentence in the panel, where it
can say what it counts. The hub locates; the fiche measures. Contract:
`src/components/atlas/__tests__/continentFieldCharter.test.tsx`, asserted in
both renderers — the SVG path draws no `<circle>`, the WebGL path issues no
`GL_POINTS` — because the two have drifted apart before.

**A mark is not an encoding.** A mark pinned on the stage claims one thing —
"this country opens" — and that is the whole of what it may say. It never
states how much the corpus holds there.

So **every mark on one scene has one shape**. The continent stage used to pin a
bordered 22 px button on the twelve countries the field ranked and a 7 px dot on
the other forty-two, which made the twelve read as a different _kind_ of thing
rather than as the same offer, better documented. The corpus declares no such
hierarchy — all fifty-four open the same fiche the same way — and a reader has
no way to learn that the two shapes meant "ranked" rather than "different".

And **a scene that opens no country marks none.** The converse of the rule
above, and it had to be written because the same code drew both. The continent
scene belongs to the Explorer hub, where a mark's promise is the whole offer —
but `ContinentGlobeStage` reused it to stand under the two surfaces that argue
about projection, the home's featured module and `/jouer/mercator`, and
inherited the offer with it: twelve pinned countries, a tap anywhere on the
sphere selecting the nearest, and a legend promising « appuyez sur un point
pour ouvrir le pays ». Neither surface is browsing the corpus, so the promise
was false on the home and worse on `/jouer/mercator`, where a tap mid-question
opened a country panel over a standing round. Withdrawing the marks is not
enough on its own: the stage-wide tap is the third way in, and it is the one
nobody sees until a reader lands on a fiche they never aimed at. Contract:
`src/components/atlas/__tests__/atlasMarksCharter.test.tsx`.

And a scene that marks countries **says so in its legend**. A mark is inert and
silent; without the sentence, a reader who does not already know the dots are
countries reads the whole scene as decoration. Said only where marks exist: a
country fiche traces one outline and marks nothing, and promising a point there
sends the reader hunting for a target the scene never drew. Contract:
`src/components/atlas/__tests__/atlasMarksCharter.test.tsx`.

**Where the surfaces come from.** Country and family outlines are Natural Earth
admin-0 110 m — public, versioned, checkable. A people's field is _computed_
from `content.demography.distributionByCountry` — on a people fiche, the one
scene that draws it; nobody draws the blob by hand, which is exactly what makes
it citable. A family's footprint is the union of
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
| Home modules | teal   | ocre    | terre    | `src/lib/hubs/moduleRegistry.ts`       |
| Facet        | terre  | ocre    | teal     | `lib/hubs/directoryAccent.ts`          |
| **Fiche**    | ocre   | teal    | **perv** | `FicheSequence.ACCENT_CLASS_BY_ENTITY` |

The Home-modules row is **positional, not an entity mapping**: `accentForModule`
walks `ACCENT_CYCLE` by declaration index, so a module's hue is where it sits in
`MODULE_DEFINITIONS`. Explorer leading with Pays is what puts ocre on Country
there — and incidentally what makes the first two rows agree on Country. Reorder
the registry and this row moves with it; it is a record of the walk, not a
promise to an entity.

A fiche family is **pervenche, never terre**. Inside a fiche, `IdentityPanel`
reserves terre for the imposed-exonym marker; painting the page terre would make
that marker read as the page accent and it would stop being a marker. A listing
has no such marker, so it is free to take terre back.

The middle row was called _Directory_ while peoples, countries and families were
three directory pages. They are now three **facets** of one hub, and the scale
is read by `FacetHubShell`, which scopes it to the facet's whole subtree. The
constant keeps the word `DIRECTORY_` on purpose: renaming it would suggest the
listing scale and the fiche scale had merged, and the row above is the whole
reason they must not.

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

- The menu **names destinations; it never prints their addresses**. A module
  absent from the menu is a module absent from the corpus.

  This used to read "the panel shows each destination's real route", and the
  panel duly printed `/fr/comprendre/regards/colonisation-et-resistances` in
  monospace under its label. That is the router's path scheme rendered as
  editorial content — the atlas publishing its own plumbing to a reader who
  came for peoples and languages. The address lives in the link's `href`,
  where the browser's status bar, the crawler and the screen reader all agree
  to look for it; a URL long enough to wrap over two lines was never the thing
  that told a reader where a click lands.

- **A facet is not a destination.** Peoples, countries and families are three
  states of one page — the Explorer hub — not three pages beside it. The menu
  says so: the axis leads with its own hub, and the facets are offered beneath
  it under their short names. They were once told apart by printing an address
  under the hub and none under the facets; now that no entry carries one, the
  distinction rests where it belonged all along — the hub leads the group, the
  facets sit inside it.

  Which entries are facets is read off `src/lib/hubs/facets.ts` through
  `getFacetByPage`, never restated in the menu. `moduleRegistry` still declares
  the four Explorer modules separately, and deliberately: the axis hub renders
  them as four unconditional server-side links, which is the way in when there
  is no WebGL and no JavaScript.

- **The axis label opens the panel; it does not navigate.** So the hub needs an
  entry of its own inside the panel — without one, `/fr/explorer` is reachable
  from no navigation surface on any viewport, which is what it was.

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

---

## 7. Reading a fiche

Past the globe, a fiche is one uninterrupted parchment — a dozen chapters on a
people, more on a family. Two questions follow a reader down it, and neither
had an answer: _where in this document am I_, and _how do I get back to the
chapter I just passed_. The reading rail answers both.

**A fiche declares its own chapters.** The rail is not given a list. Each
chapter announces itself with `data-fiche-section`, carrying its title, and the
rail reads the rendered document. This is the only rule that survives contact
with the corpus: `Fragmentation coloniale` exists only where a people straddles
a border, `Voix & récits` only once its fetch answers. A hand-written list per
entity type would restate every one of those gates and drift the first time one
changed. A chapter the corpus does not produce is not in the DOM, and therefore
not in the rail — no second gate to keep in sync.

**Every chapter is addressable.** `FicheSection` derives an anchor from the
chapter's title, so a reader can send someone the paragraph they are reading.
Anchors the app already publishes — `#sources`, which citation chips across the
app point at — are passed explicitly and never re-derived. A chapter with no
anchor is dropped from the rail rather than offered as a link that goes nowhere.

**The rail states position, it does not narrate scrolling.** It names the
chapter being read, counts it against the total (`02 / 11`), and draws how much
of the fiche is behind the reader. Between two chapters it holds the last one
it saw: the reader is still in the fiche, and a blank readout would say
otherwise. Choosing a chapter moves focus to it, not merely the viewport — a
keyboard reader must arrive somewhere they can read from.

**It heads the parchment, it does not float over the map.** The rail is pinned
from where the chapters start, so the globe keeps the screen to itself while it
is the subject. It takes the parchment's measure, not the viewport's, and the
ground on either side of it is the ground the document is printed on.
