# Country template brief — the fiche a reader can use in one minute

A design brief, not a charter. It proposes a new chapter order and a new
treatment for the country fiche, states what each proposal is licensed by, and
refuses three requests that the charters already settle. When it is accepted,
the rules that survive move into `atlas-charter.md` §7 and the rest of this file
is deleted.

Everything numbered here was measured on **production, `/fr/atlas/pays/BDI`, at
430 px, 2026-09-12, 20 s after `networkidle`** — the wait the globe needs
(`.claude/skills/afrik-art-director/references/capture.md`, trap 2). Corpus
counts were taken from `dataset/source/afrik/`, the source of truth, never from
the database projection (atlas charter §4).

---

## 1. What the page is for

A reader arrives at a country fiche wanting to know **which peoples live there
and in what proportion**, and leaves having learnt one thing about a name they
already knew.

That sentence is not a hypothesis. In a client demonstration of under a minute,
a Burundian visitor searched for Burundi, opened the country fiche, and went
straight to comparing the populations of its peoples. Nothing else on the page
was reached.

## 2. What the page does instead

| Measurement at 430 px                    | Value                              |
| ---------------------------------------- | ---------------------------------- |
| Document height                          | **9 334 px** (10 screens)          |
| Where `Peuples du pays` starts           | **1 817 px** (screen 2)            |
| Height of `Peuples du pays`              | 452 px                             |
| Height of `Noms attestés`                | **1 374 px**                       |
| Height of `Sources`                      | 1 062 px                           |
| Height of `Langues`                      | 113 px, reading `Donnée manquante` |
| Gap between any two consecutive chapters | **0 px**                           |

Three failures follow from that table, and they are the brief.

**The strongest asset is on screen two.** The peoples block is the one thing on
this page a reader was measured using, and the fiche spends 1 817 px — a globe
band, a chapô, and an etymology — before showing it. Brand charter §8.3 already
rules that the atlas leads; the same argument applies one level down.

**Every chapter abuts the next.** Not "tight": zero. `--afh-section-gap`
(24 / 32 / 48 px) is declared in `space.css`, documented in `Spacing.mdx`, and
consumed by **zero components** — brand charter §7 records this as the failure
it names, and the country fiche is where the reader pays for it. Ten chapters
run together as one 9 000 px column, which is why the page reads as a wall
rather than a document.

**Two chapters carry a quarter of the page and neither is the subject.**
`Noms attestés` and `Sources` together are 2 436 px, 26 % of the document. The
peoples block, the reason the page exists, is 452 px, 4.8 %.

---

## 3. Three refusals

### 3.1 `Poursuivre` does not become cards

Atlas charter §7 forbids it in terms, with the measurement behind it: cards
"would put four hundred pixels of chrome at the foot of a fifteen-thousand-pixel
document, competing with the one layer that must look auditable". The rule is
enforced by `src/components/fiche/__tests__/ficheOnwardCharter.test.tsx`.

The request behind it is legitimate and is answered elsewhere: what makes the
foot of the fiche feel unfinished is the missing gap above it (§2), not the
shape of the links.

### 3.2 "80–85 % visual" cannot mean images

The corpus holds **no image field**, on any of its ~890 fiches. Brand charter §9
states the residual gap in its own words: "No surface of the atlas shows the
people it documents — only the naming of them, and the cartography." Closing it
is a corpus feature with its own rights decision, not a template change.

So the ratio is kept and the word is redefined. **Visual here means data given a
form**: a 100 % stacked share bar, a counter, a dated timeline, a tile grid, an
outline on the globe. Every one of those is generated from a sourced field and
can be audited. A stock photograph of "Africa" would be the one thing on this
site that cites nothing.

### 3.3 A chapter never collapses; only its contents may

The reading rail reads the rendered document — each chapter announces itself
with `data-fiche-section` and derives a deep-link anchor from its title (atlas
charter §7). A chapter hidden behind a closed disclosure is still in the DOM, so
the rail offers a link to content the reader cannot see, and in-page search
finds nothing.

**The rule.** Disclosure operates **inside** one chapter, on repeated items of
the same kind — a name group, a kingdom, a historical period. A chapter heading,
its lede, and any count it states stay open. This is what the `Culture et
société` treatment must become; it is not what it is today (§4.6).

**And a closed tile already teaches. Opening it teaches more.** A tile whose
label is only its own title is a door, not a summary: the reader must open every
one to discover which holds what, which is slower than the scroll it replaced.
`3 entités politiques · XVIe – aujourd'hui`, never `Histoire`. The rule is
written once, with its three obligations and its gate, in
`people-template-spec.md` §3, and it binds both templates.

---

## 4. The proposed order, chapter by chapter

Read the titles alone, in order, and they should make an argument rather than a
menu (art-director method, step 4).

> Who lives here · what the country is called · what they speak · what happened ·
> what they are named · how they live · where to go next

### 4.1 `En bref` — a counted summary, above everything

Today `CountrySynthesisBrief` prints a chapô and a list of former names. It
carries no number, and the numbers are what the reader came for.

Five counters, each with the caveat that makes it honest. Every one is available
today:

| Counter             | Source                                                   | BDI           |
| ------------------- | -------------------------------------------------------- | ------------- |
| Population          | `content.demographics.totalPopulation` + `referenceYear` | 14.4 M (2025) |
| Peoples             | `content.demographics.peoples.length`                    | 3             |
| Languages           | **derived** from the peoples of the country (§4.3)       | 7             |
| Linguistic families | **derived** from those peoples' `languageFamilyId`       | 2             |
| Names referenced    | `attested` + `borneByPeoples` (REQ-133)                  | 23            |

**Every counter states its scope in the label, not in a footnote.** "23 noms
référencés dans l'atlas", never "23 noms". Atlas charter §4 governs a missing
field; this is the symmetric case — a present field whose number is a floor, and
a reader who takes a coverage figure for a census figure has been misled by the
one surface that sells provenance. Where the corpus can say the real figure is
far larger, it says so in the same line.

**One anecdote, and it already exists.** `didYouKnowFacts.ts` holds 112 facts
bound to a country id, covering **42 of 54 countries**, each with a source and a
tier. They are shown on the home and nowhere else — the fiche they concern
cannot see them. One fact per country fiche, in the brief, with its tier chip.

**Constrained width, as asked.** The block is not full-bleed: it is a bordered
panel with a left accent rule, which is the shape `fiche-brief` already has.

### 4.2 `Peuples du pays` — unchanged, and moved to first

Do not touch it. Measured and observed, it is the best block on the atlas: a
100 % stacked bar, three rows carrying swatch, autonym, exonym, region, family
and share, each one a link. The swatch is a legend for the bar, which is the one
licit reason a colour may vary by position (brand charter §5.2).

One correction, and it is site-wide damage rather than this block's: at 430 px
the third row's gloss ("Pygmée") computes `center` while the name and the share
sit at their own edges. That is `mobile-text.css` centring running prose, brand
charter §8.1.

### 4.3 `Langues` — derived, and marked as derived

`transformLanguages` reads `culture.mainLanguages` from the country fiche.
**13 of 54 countries do not declare it** — and they are the ones a visitor is
most likely to open: COD, NGA, KEN, ETH, ZAF, TZA, SEN, MLI, RWA, BDI, COG, COM,
MDG. All thirteen currently render `Donnée manquante`.

Every one of the thirteen has languages **derivable from the peoples that live
there**, through `content.languages.mainLanguage` on each people fiche:

| BDI | COD | NGA | KEN | ZAF | ETH |
| --- | --- | --- | --- | --- | --- |
| 7   | 60  | 67  | 33  | 30  | 82  |

Atlas charter §4 licenses exactly this and names the failure it prevents: a
fiche that reports a derivable value as missing "told its reader « le corpus ne
renseigne pas ce champ » about data the corpus does renseigne — which, on a
surface whose whole argument is provenance, is a worse failure than showing
nothing at all."

So: declared where declared, derived where derivable and **labelled derived**,
missing only where neither. The treatment is the peoples block's, one rung
quieter — languages do not carry shares, so they take a tile grid rather than a
bar.

### 4.4 `Le nom et son histoire` — `Étymologie du nom` + `Noms à travers l'histoire`

Two chapters answering one question: what this country has been called. Merged,
below the peoples.

The visual form is a **dated spine**: former names and administrations as
stations on one vertical line, each with its bounds, the present name last. The
corpus already holds the bounds — the brief prints "Afrique orientale allemande
(1885-1916) · Ruanda-Urundi (1916-1962) · Royaume du Burundi (1962-1966)" as a
middot-joined run of text today.

Partial by design: the spine shows the stations, and the prose of each opens on
demand (§3.3). This is the "visual that does not render all the data" the
request asks for, and the reason is the same one `REQ-148` gives for kingdoms.

### 4.5 `Histoire` — `Royaumes et formations politiques` + `Faits historiques majeurs`

`Faits historiques majeurs` is **1 341 px** at 430 px, the second tallest block
on the page, and it is six prose paragraphs keyed by era. The kingdoms above it
are already dated cards. One chapter, one chronological spine, the kingdoms and
the eras as stations on it.

This is also where the chronological-symmetry gate lands (REQ-148): a country
that dates its colonial administrations must date its precolonial polities. A
merged chapter makes an undated station visible beside a dated one, which is the
asymmetry the gate exists to catch.

### 4.6 `Noms du pays` — renamed, regrouped, and the subtitle deleted

**The label is wrong and a native French reader proved it.** "Noms attestés" was
read as "noms à tester" and reported as incomprehensible. The chapter answers
"which names does this country's population bear", so it says so.

**The subtitle goes.** `countryNote` reads "Deux registres distincts : ce qu'une
source atteste dans ce pays, et ce que portent les peuples qui y vivent." It is
set in the parchment's mono note face, which makes it read as machine output,
and it names a distinction before the reader has seen either list. The
distinction is real and is kept — as the two group labels, where the reader
meets it with the evidence in front of them.

**The flat list does not survive its own length.** Measured live:

| Country | Rows | Chapter height at 430 px | Distinct glosses |
| ------- | ---- | ------------------------ | ---------------- |
| BDI     | 23   | 1 374 px                 | **2**            |
| SEN     | 61   | 2 430 px                 | 14               |
| NGA     | 68   | 2 750 px                 | 12               |
| MLI     | 71   | 2 792 px                 | 13               |
| COD     | 82   | **3 711 px** (4 screens) | 15               |

On Burundi, 23 rows carry two distinct glosses: twelve rows say "Patronyme non
héréditaire" and eleven say "Patronyme non héréditaire · par Banyarwanda". **A
predicate that never varies is not information**; repeated down a column it is
noise wearing the costume of data.

The grouping axis is already in the gloss. Group by **naming system** — nom de
clan, patronyme non héréditaire, nom d'éloge (jamu), nisba, clan totémique — and
within a group, by the people. The system becomes a tile with its count; opening
it lists its names. Senegal's 61 rows become 4 tiles; Congo's 82 become 5.

**Pagination is not on this page.** `FacetPagination` belongs to the hub
listings (`/fr/atlas/pays`, `/fr/atlas/noms`), not to a fiche, and the fiche
must not acquire it: a paginated chapter cannot be deep-linked, and every anchor
the rail publishes for it would be a lie past page one. Grouping is the answer;
a group that still runs long gets a "voir les N restants" inside its own
disclosure.

### 4.7 `Culture et société` — the model, once it is actually a model

The block is four tinted tiles with an icon, a label and a keyword run. It is
liked, and the instinct is right: it is the one place on the fiche where a
reader gets a whole dimension in one glance.

**It does not reveal anything on click.** It is static. The behaviour the
request wants — a tile that opens its content — has to be built, and building it
once here is what makes it reusable for §4.4, §4.5 and §4.6.

Two conditions carry over from §3.3: the tile's label and count are always
visible, and the disclosure holds prose, never a chapter.

### 4.8 `Poursuivre` — unchanged (§3.1)

### 4.9 `Sources` — detached, not restyled

It is already `as="footer"` and already last. What makes it read as part of the
argument is the same zero gap everything else suffers. It takes the section gap
plus a rule above it, and nothing else changes: a bibliography that looks
auditable is the point of the surface.

---

## 5. The two rules that apply to every page, not just this one

### 5.1 Wire the section gap

`--afh-section-gap` is the token brand charter §7 already rules on, and
`afh-parchment-section` is where the country, people and family fiches would all
receive it at once. The measured cadence on the home (68 / 104) is not the
token's 24 / 32 / 48, and reconciling the two is the open decision that section
records — but the fiche's measured cadence is **0**, and no reading of that
number is deliberate.

A charter contract test measures the rendered gaps between consecutive
`[data-fiche-section]` nodes and fails when a fiche shows more than one distinct
value.

### 5.2 Contribution is an affordance, not a report link

Every chapter offers "Signaler cette section" and the rail carries "Signaler".
Both say the page might be **wrong**. Neither says the page can be **added to**,
which is the thing the atlas actually wants from a reader who knows something.

One control, present on every fiche, in the rail beside the existing one:
**"Compléter cette page"**. It is form C of `actions-charter.md` and it leads to
the existing contribution surface. Reporting an error and offering knowledge are
two intents and a reader who has the second is today handed the first.

---

## 6. What this brief does not decide

- **Wording of every label.** Content design; `actions-charter.md` §7 draws the
  line. `Noms du pays` is settled here only because the current label was
  measurably misread.
- **The people, family, language and name templates.** The order above is
  written for a country. Carrying it across is a second pass, and the peoples
  fiche is the one with the audience, so it goes next.
- **Anything about the globe band.** It is above the parchment and untouched.
