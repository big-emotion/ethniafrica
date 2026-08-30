# Brand charter — what the atlas is, before it is a page

The charters beside this one each govern one surface. `atlas-charter.md` says
what the map may assert, `typography-charter.md` what a size means,
`actions-charter.md` what shape a click takes, `games-charter.md` what the
Jouer hub owes. Each is excellent at its own scope, and none of them answers
the question a reader asks in the first two seconds: **what is this, and who is
speaking?**

That question has been answered four different ways in the codebase at once,
and this file exists to answer it once. It sits above the surface charters: a
rule here binds all of them, and where a surface charter is silent, this one
still applies.

Companion charters: [`atlas-charter.md`](./atlas-charter.md) ·
[`typography-charter.md`](./typography-charter.md) ·
[`actions-charter.md`](./actions-charter.md) ·
[`games-charter.md`](./games-charter.md).

---

## 1. One name, and it comes from one file

The product currently answers to four names, depending on where a reader looks:

| Where                                                                                                                                                                                      | What it says                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `PRODUCT_NAME` (`src/lib/brand.ts`) — masthead, tab titles                                                                                                                                 | **EthniAfrica**                        |
| `API_ATTRIBUTION` (`src/api/v2/utils/response.ts`), every OpenAPI example, `CitationBlock`'s default, the admin sign-in page, `/fr/signalements` titles, every `src/styles/**` file header | **Africa History — africahistory.org** |
| `CANONICAL_DOMAIN` (`src/lib/brand.ts`)                                                                                                                                                    | **ethniafrica.com**                    |
| The address the site is actually served from                                                                                                                                               | **africatlas.com**                     |

A reader who cites a fiche is handed one name; the tab above that fiche shows
another; the URL they copy is a third; the canonical link tells a crawler about
a fourth. On a project whose entire argument is provenance, the publisher of
record cannot be ambiguous — a citation that names a site nobody can reach is
not a citation.

**The rule.** The product name, its qualifier, its canonical domain and its
attribution string are read from `src/lib/brand.ts` and from nowhere else. No
component, no route, no API response and no stylesheet header states a name of
its own. `API_ATTRIBUTION` composes itself from `PRODUCT_NAME` and
`CANONICAL_DOMAIN`; a test asserts that no other spelling of the name survives
in `src/`.

**The value is a decision this charter does not get to make**, because the
domain in production disagrees with the constant, and picking one silently
would break either every existing citation or every existing link. It has to be
ruled on and recorded as a DEC on Confluence. What is not open is the shape:
one name, one file, one spelling.

---

## 2. The promise, and the one place it is currently broken

The atlas asserts three things, in this order, and every surface either serves
them or is decoration:

1. **It names peoples, languages, families and countries** — one record each.
2. **Every claim carries its provenance**, tiered and visible, including the
   weak ones. Nothing is forbidden; everything is labelled (see the Source Tier
   policy in `CLAUDE.md`).
3. **It is open.** The corpus is citable and reusable.

The third is contradicted on every page of the site. The footer prints
`© <year> EthniAfrica. Tous droits réservés.` while the API meta and every
citation the site emits declare **CC-BY-SA 4.0**. A reader is told the content
is share-alike by the citation block and all-rights-reserved by the footer four
hundred pixels below it.

**The rule.** The footer states the corpus licence, not a reservation of
rights. Where code and site chrome disagree about the licence, the licence the
citation apparatus emits is the true one, because that is the string a reader
carries away.

---

## 3. Voice

French, `vouvoiement`, present tense. Declarative and specific — the surface
states what the corpus holds and what it does not, and never advertises.

Three habits carry the decolonial posture, and they are visual as much as
editorial:

- **The autonym leads, the exonym glosses it.** Enforced in components by
  `afh/no-bare-people-name`; enforced typographically by the rule that the
  gloss sits one role below the name inside the same heading
  (`typography-charter.md` §3.2).
- **A colonial name is kept and explained, never quietly dropped.** It receives
  the imposed-exonym marker, which is why terre is reserved inside a fiche
  (`atlas-charter.md` §2).
- **An absence is stated, not hidden** (`atlas-charter.md` §4).

**A silence is not humility.** A hub that lists five modules and marks three
**Bientôt**, a facet that fronts a paginated table, a landing band that carries
135 px of copy in 760 px of ground — each of these is the interface telling a
reader the corpus is thinner than it is. 803 peoples and 54 countries is not a
thin corpus. Where a surface has to choose between advertising scarcity and
showing the work, it shows the work.

---

## 4. One token spine

Two colour systems are live in `src/` and which one paints a given element is
accidental:

- the **`--afh-*` layer** — hex, two-tiered (raw ramp → semantic alias),
  documented in `src/styles/tokens/color.css`;
- the **shadcn layer** — HSL triplets in `src/index.css` (`--foreground`,
  `--accent`, `--primary`…), inherited with the `ui/` primitives.

They are not aliased to each other, and they disagree. `--afh-text` is
`#2c2018`; shadcn's `--foreground` is `hsl(25 25% 15%)` = `#30251d`. Both paint
`h1`s in production: the home takes the first, every fiche and facet takes the
second. `--accent` holds the HSL triplet `42 88% 58%` while `--accent-ink`
holds the hex `#835514` — the same word naming two incompatible kinds of value,
which is how `afh-on-night` combined with `afh-accent-*` once produced an
invalid colour.

**The rule.** `--afh-*` is the spine. The shadcn variables are an
implementation detail of `src/components/ui/**` and each one is **an alias onto
an `--afh-*` token**, never an independent value. Nothing outside `ui/` reads a
shadcn variable. A component that needs an ink asks for `--afh-text`; a
component that needs the surface accent asks for `--accent-ink` or
`--accent-tint`, both of which are hex.

Three tiers, and a token belongs to exactly one:

| Tier          | Example                                       | Who may read it                             |
| ------------- | --------------------------------------------- | ------------------------------------------- |
| **primitive** | `--afh-color-terracotta`, `--afh-cat-teal`    | the semantic tier only                      |
| **semantic**  | `--afh-text`, `--afh-bg-warm`, `--accent-ink` | any component                               |
| **surface**   | `--country-*`, `--home-text-*`                | that surface only, with a ticket against it |

The surface tier is a holding pen, not a scale — `typography-charter.md` §6
already says so for type, and it holds for every axis.

---

## 5. Colour

### 5.1 The ground is parchment. That is the brand.

`--afh-bg` `#fbf7f2` and `--afh-bg-warm` `#f5ede0`, with `--afh-surface` white
for anything that has to lift off them. The warm paper is the single most
recognisable thing about the product and it is never traded for a neutral grey.

The night ground `--afh-night-*` is licensed by DEC-022 for **the atlas stage
only** — the globe band on a fiche. It is not a theme, it is a stage light. Any
other block that goes dark is out of scope and needs its own decision.

### 5.2 Four categorical accents, and a surface takes one

`--afh-cat-ocre` `#c9821f` · `--afh-cat-teal` `#33a390` ·
`--afh-cat-terre` `#c4573f` · `--afh-cat-perv` `#7a8ce8`, each with a `-tint`
and an `-ink`. The `-ink` exists because the base hexes are fills: accent text
on an accent tint measures 2.28:1 to 3.09:1 and fails AA.

`atlas-charter.md` §2 already governs _which_ accent a surface takes, and it
turns on the doctrine that **a component never names an accent** — it reads
`var(--accent)`, and a page-level `.afh-accent-*` wrapper resolves it.

That doctrine is not what the site does. Measured at 1440 px, `/fr`,
`/fr/explorer`, `/fr/explorer/peuples`, `/fr/comprendre`, `/fr/jouer`,
`/fr/about`, `/fr/mentions-legales` and both fiches sampled each carry
**three or four** `.afh-accent-*` wrappers simultaneously. There is no page
with a dominant accent, so nothing about a page's colour tells a reader where
they are.

Worse, the same hue teaches two contradictory lessons within one scroll of the
home: the masthead paints `Comprendre` teal, and forty lines down a `PAYS` chip
and the "Trois pays" section are teal too.

**The rule.** _A page has one accent._ The `.afh-accent-*` wrapper is set once,
at the page level, and it is the axis's or the entity's colour. A nested
wrapper is legitimate only where the nested block **is** an object of another
kind and says so — an entity chip, a fiche card in a listing. Three sibling
blocks of the same kind take the page accent and are told apart by their
content, never by rotating through the palette: a colour that changes with
position carries no meaning, and a reader who cannot learn it reads it as
decoration.

### 5.3 The gradient is brand, so it is a token and it has a scope

`--gradient-warm: linear-gradient(135deg, hsl(18 70% 52%), hsl(42 88% 58%))`
paints the masthead tagline on every page and, through `.page-title-gradient`,
the `h1` of all three axis hubs. Neither stop exists in the `--afh-*` palette.
The most visible colour in the product is outside the design system.

It also makes those three `h1`s `color: transparent`, so a hub title depends on
`background-clip: text` to be visible at all.

**The rule.** The warm gradient is a **brand mark treatment**, not a text
style. It is a token (`--afh-gradient-brand`) whose stops are `--afh-*`
primitives, and it is permitted on exactly two things: the masthead lockup, and
a brand mark on a share card. A page title takes `--afh-text`. Where a hub
title needs to carry its axis, it carries it in the eyebrow above it, in that
axis's `--accent-ink` — which is the device the whole site already uses, and
which the masthead's own coloured dots already taught the reader on the way in.

### 5.4 A primary action has one colour

Four were measured: the home's `Jouer` CTA and the facet's `Filtrer` take
`--afh-color-terracotta` `#b64e27`; the 404's `Rechercher une fiche` takes the
near-black ink; `/fr/comparer`'s `comparer` takes terracotta at reduced opacity
as its resting state.

**The rule.** A primary button takes `variant="accent"` and therefore the
surface's accent (`actions-charter.md` §4). `--afh-color-terracotta` is a
primitive of the classification palette and is not a button colour. A disabled
control is never the visual centre of a page: a page whose only action cannot
be taken needs a different first screen, not a greyed button.

---

## 6. Type

`typography-charter.md` owns the scale. Two things above it belong here.

**The display weight the charter names cannot be rendered.** It files every
heading role under "display 600", and `src/app/layout.tsx` loads Fraunces at
`300, 500, 700, 900`. A 600 request resolves to 700. Meanwhile production
paints display headings at four different weights — 600 (`section-heading.css`),
700 (`hero.css`), 800 (`people-tokens.css`), 900 (`HomeHero`, `AccessAxes`,
`fiche-parchment.css`, `country-tokens.css`) — of which 600 and 800 are not
loaded and silently round to 700 and 900.

**The rule.** Two display weights, both loaded, both meaning something:
**700** for every heading role, **900** for the page's own `h1` and for a key
figure. The charter's declared weight and the loaded set are asserted against
each other by a test, so the next weight added to one has to be added to the
other.

**A legal page does not outrank a fiche.** `Mentions légales` renders its `h1`
at 52 px — `--afh-text-hero`, the scale's top step — while `!Kung, un peuple
sans bord` renders at 40 px. The top of the scale belongs to the pages the
atlas exists for.

---

## 7. Rhythm

**Vertical rhythm is a brand property.** It is what makes six unrelated
sections read as one document, and it is the axis with the least governance in
the repo today.

`--afh-section-gap` (24 / 32 / 48 px) is declared in `space.css`, documented in
`Spacing.mdx` — and consumed by **zero** components. Every section therefore
sets its own gap, and the page's cadence is the accident of what each component
happened to choose.

The scale it would draw from cannot help either. `space.css` names seventeen
steps, eleven of them between 4 px and 24 px, at 2 px apart: `4, 6, 8, 10, 12,
14, 16, 18, 20, 24`. `actions-charter.md` §6 collapsed two radius tokens on the
grounds that **no reader can see two pixels** and a distinction nobody can
perceive is bookkeeping, not a sign. That argument applies unchanged here, and
the spacing scale is the place it was not applied.

**The rule.**

- **A ramp, not a ruler.** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. The odd
  steps (6, 10, 14, 18, 20) are deprecated in place the way the raw font sizes
  were: a register in `eslint.config.mjs`, one line per file, deleted as each
  is migrated, never added to.
- **Sections are separated by `--afh-section-gap` and by nothing else.** A
  band's own `padding-block` sets its internal breathing; the gap between two
  bands is the token. This is enforceable by a charter contract test that
  measures the rendered gaps between the top-level children of `main` on the
  home and the three hubs, and fails when a page shows more than two distinct
  values.

---

## 8. Composition

### 8.1 One alignment per block

Below 768 px `src/styles/mobile-text.css` centres text site-wide. The rule was
written for a band of one or two lines; it now lands on layouts built
left-aligned, and it is the single largest source of visual damage on a phone:

- every facet card sets its name left, its gloss centred and its metadata left
  — three alignments, twenty times down one listing;
- each home axis card puts its icon left, its title and copy centred and its
  action link left;
- the Comprendre hub's question spine draws its connector down the left margin
  beside centred questions, so the graphic attaches to nothing.

**The rule.** Alignment is a property of a block, not of a viewport. A block is
centred or it is ragged-right, and every element inside it — eyebrow, title,
prose, metadata, action — obeys that one choice. **Running prose of more than
two lines is never centred**: a centred paragraph gives the eye no return edge,
and this is a site made of paragraphs.

### 8.2 A band's height is earned by what is in it

`.home-hero` sets `min-height: min(100svh, 760px)`, centres its content, and
hides `.home-hero-figure` below 768 px. On a phone that is a 760 px band
carrying a 135 px block: **82 % empty parchment**, split above and below the
one question the product exists to answer. The height was earned by a
two-column composition that only exists from 768 px up.

`PageHero.tsx` records this exact failure being fixed — "a screen-tall band set
the title at the foot of a screen of empty parchment" — and fixes it in
`.afh-hero`, the band the home does not use.

**The rule.** No band measures itself against the viewport. A band's height is
its content plus its padding, floor included. Where a surface opts out of
`PageHero`, it states why in a comment and inherits this rule anyway — a
correction made to the shared unit is a correction to the doctrine, not to one
file.

### 8.3 The atlas leads

The site's strongest visual asset is the globe, and on the home it is the ninth
screen of ten. The first is empty.

**The rule.** On any surface that has a map, the map is above the fold or it is
not on the page. An atlas whose first screen on a phone contains no Africa
larger than its 40 px logo is not yet an atlas.

---

## 9. Imagery

The archival engravings are the best-judged thing on the site: an Al-Idrisi
mappemonde of 1154, Ogilby's _Guinea_ of 1670. They are sourced, dated,
credited and in the public domain, and they carry the atlas's argument about
naming better than any stock photograph would.

They are also **the whole of the iconography on the home page**, and that has a
cost the project of all projects should not pay: the imagery on the landing
page of an atlas of African peoples is two European maps of Africa and a
portrait of the German philologist who coined "Bantou". Every face is European,
every gaze is from outside.

The alternative is not hypothetical, and it already ships.
`/fr/comprendre/anecdotes` opens on a contemporary colour photograph of a
village in the Maloti mountains, credited "SkyPixels, Wikimedia Commons,
CC BY-SA 4.0" — sourced, credited, licensed under the same terms the corpus
itself carries, and about a place rather than about a European's view of one.
That page is the reference; the home is the outlier.

**The rule.** The colonial archive is _a_ register of imagery, never the only
one, and where it appears it is captioned as what it is — a document of how
Africa was seen, not a document of Africa. Any surface carrying more than one
image carries more than one register. A surface that shows a people shows that
people's own visual record where one is available and clearable, under the same
discipline the text already obeys: sourced, dated, credited, tiered. Where no
such record exists yet, the honest fallback is the corpus's own cartography,
which the atlas generates, owns and can cite.

---

## 10. What this charter does not cover

- **Which name wins** (§1) and **which licence line the footer prints** (§2).
  Both are decisions for the owner, recorded as DECs; this charter states only
  that each must have exactly one answer.
- **Wording.** Whether a label reads "Parcourir" or "Voir les 803 peuples" is
  content design. `actions-charter.md` §7 draws the same line.
- **Anything a surface charter already governs.** Where this file and a surface
  charter disagree, the surface charter is more specific and wins — and the
  disagreement is a bug in one of them, to be closed rather than lived with.
