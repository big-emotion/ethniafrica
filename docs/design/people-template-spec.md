# People fiche — surface contract

What `/fr/atlas/peuples/[slug]` renders today, what it must render instead, and
the gates that hold each rule. It is the second half of
`country-template-brief.md`: the country fiche settled the template, this file
carries it onto the surface that has the audience.

Everything numbered here was measured on **production,
`/fr/atlas/peuples/PPL_HUTU_BURUNDI`, at 430 px, 2026-09-12, 20 s after
`networkidle`**. Corpus counts come from `dataset/source/afrik/`, never from the
database projection (atlas charter §4).

Accent: **ocre**, set once by `FicheSequence.ACCENT_CLASS_BY_ENTITY`. No
component below names a colour.

---

## 1. What the page is for

A reader arrives at a people fiche wanting to know **where this people lives and
how many of them there are**, and leaves having learnt why the name they knew it
by is not the name it uses for itself.

## 2. The relevé — thirteen chapters, seventeen screens

| #   | Chapter                                     |        Top |    Height |
| --- | ------------------------------------------- | ---------: | --------: |
| 1   | Le nom porté, les noms subis                |      1 094 |     1 037 |
| 2   | Pourquoi la carte ne trace pas de frontière |      2 131 |       511 |
| 3   | Origines & formation                        |      2 642 | **2 145** |
| 4   | Langue                                      |      4 787 |       741 |
| 5   | Rôle historique                             |      5 528 |     1 188 |
| 6   | Noms & appellations                         |      6 716 |     1 261 |
| 7   | Noms portés                                 |      7 977 |       186 |
| 8   | Culture & spiritualité                      |      8 163 |     1 436 |
| 9   | Peuples voisins & organisation              |      9 598 | **1 744** |
| 10  | Répartition géographique                    | **11 343** |       961 |
| 11  | Fragmentation coloniale                     |     12 304 |       642 |
| 12  | Poursuivre                                  |     12 946 |       504 |
| 13  | Sources                                     |     13 450 |       707 |

Document height **15 487 px**, seventeen screens. Every gap between two
consecutive chapters measures **0 px**, the same failure the country fiche shows
and the same dead token behind it.

Three defects follow, and they are the specification.

### 2.1 The answer to the page's own question is on screen thirteen

`Répartition géographique` is where the reader learns where this people lives.
It starts at 11 343 px. On the country fiche the equivalent block started at
1 817 px and that was already the finding. Here it is six times deeper.

### 2.2 The one chart on the page renders nothing

`PeopleCountriesSection` draws each country's share as a bar of
`width: ${row.percentage}%`. Measured on the rendered page, **every bar is
`width: 0%`**, and the share column prints an em-dash beside it. What looks like
a bar in a screenshot is the empty track.

It is not this fiche's accident. Across the corpus:

|                                                        |         |
| ------------------------------------------------------ | ------: |
| People fiches carrying `distributionByCountry`         |     776 |
| …whose rows declare a `percentage`                     |  **29** |
| Rows total                                             |   1 581 |
| …carrying a `percentage`                               |  **37** |
| Fiches where every row declares a numeric `population` | **773** |

So the share is absent on 96 % of the corpus and **derivable on 99.6 % of it**,
one division away from data the fiche already prints. Atlas charter §4 governs
this exactly: declared where declared, derived where derivable and labelled
derived, missing only where neither.

### 2.3 The name subject is split across three chapters

`Le nom porté, les noms subis` (1 037 px), `Noms & appellations` (1 261 px) and
`Noms portés` (186 px) total **2 484 px** and answer one question with three
headings. Read the chapter titles alone, in order, and the fiche offers a menu
rather than an argument — the failure the art-director method's step 4 names.

---

## 3. The closed-state rule

> **A closed tile already teaches. Opening it teaches more.**

A collapsed tile whose label is only its own title is a door, not a summary. The
reader must open every one to discover which holds what, which is slower than
the scroll it replaced — and on a fiche of seventeen screens, slower by a lot.
A tile that states its count, its range or its first item lets the reader skip it
on the evidence rather than on faith.

Three obligations follow, and they are not negotiable per chapter:

1. **The closed state carries a datum**, not a category. `3 entités politiques ·
XVIe – aujourd'hui`, never `Histoire`. A count, a span, a name, a share.
2. **Opening adds, it never repeats.** If the open state's first line restates
   the closed label, the tile has no open state and must not collapse.
3. **A chapter never collapses; only its contents may.** The reading rail reads
   the rendered document and publishes an anchor per chapter (atlas charter §7).
   A collapsed chapter is an anchor pointing at content the reader cannot see,
   and in-page search finds nothing in it.

**Gate.** `src/components/people/__tests__/peopleFicheCharter.test.tsx` — a
file matching `*[Cc]harter*.test.*` is picked up by
`npm run test:charter-contracts` automatically. It asserts, for every node
carrying `data-disclosure`:

- the summary contains a non-empty `[data-closed-fact]` child;
- that fact's text is not a substring of the chapter title;
- the node is not itself a `[data-fiche-section]`.

---

## 4. The target template — nine chapters

> Où il vit · comment il se nomme · ce qu'il parle · d'où il vient · ce qu'il
> porte · comment il vit · où aller ensuite

### 4.0 `En bref` — counted, constrained width, above everything

The shape is the country fiche's `fiche-brief`: a bordered panel, left accent
rule, not full-bleed. Five counters, each stating its scope in its own label.

| Counter                | Source                                                 | Hutu (Burundi) |
| ---------------------- | ------------------------------------------------------ | -------------- |
| Personnes              | `content.demography.totalPopulation` + `referenceYear` | 12,2 M (2025)  |
| Pays                   | `distributionByCountry.length`                         | 5              |
| Langue principale      | `content.languages.mainLanguage`                       | Kirundi        |
| Famille                | `languageFamilyId`, resolved to its name               | Bantou         |
| Noms portés référencés | REQ-133 `peopleTitle` list length                      | —              |

Then one fact from `didYouKnowFacts.ts`, filtered on
`entities[].kind === "people"`, with its tier chip. The bank holds facts bound
to a people id, already sourced and tiered, and today they appear on the home
and nowhere else — including on the fiche they are about.

**A counter states a floor, never a census.** « 5 pays référencés », never
« 5 pays ». A coverage figure read as a truth figure is the one promise this
atlas cannot break.

### 4.1 `Où vit ce peuple` — first, and its chart filled

Today's `Répartition géographique`, moved from screen thirteen to screen one,
with its two satellites folded in.

**Closed/open contract**

| Element                                       | Closed state teaches                                   | Opening adds                                         |
| --------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Country row                                   | ISO3, country name, **derived share**, absolute figure | the corpus's note on that presence, and the link out |
| `Pourquoi la carte ne trace pas de frontière` | `Aucune frontière fermée · 5 pays`                     | the cartographic argument in full                    |
| `Fragmentation coloniale`                     | `Frontière traversée · 5 pays`                         | the fragmentation reading (FR85)                     |

The share is **derived** from `population ÷ Σ population` and carries the
derived marker beside the column head, once, not per row. Where a row declares a
`percentage`, the declared value wins and no marker is shown for it.

**The denominator is the sum of the rows, never `totalPopulation`.** The corpus
declares its demography twice and the two declarations disagree. On this very
fiche `totalPopulation` is 10 500 000 while the five rows sum to 18 065 000 — a
ratio of 1.72, which would put Burundi alone at **116 %**. Measured across the
corpus:

|                                                       |        |
| ----------------------------------------------------- | -----: |
| People fiches declaring both a total and numeric rows |    774 |
| …where the two disagree by more than 10 %             | **33** |

The worst are `PPL_LUNDA_NDEMBU` (4.57), `PPL_NDAU_ZIM` (3.00) and
`PPL_HUTU_BURUNDI` (1.72) — the third being the fiche a client opened in front of
us. Summing the rows makes the chart internally consistent whatever the totals
say; it does not make the corpus right. Where the two disagree beyond 10 %, the
chapter **states the disagreement** in the reader's terms rather than choosing a
winner silently, and the arbitration is editorial work owed to
`/afrik-curator`, tracked in `docs/editorial/demography-cleanup/`.

Where a people lives in one country only, the fragmentation tile is **absent,
not empty** — it is inapplicability, not a corpus gap, and atlas charter §7's
rule applies rather than §4's.

### 4.2 `Le nom et ses appellations` — chapters 1, 6 and their two blocks merged

One chapter, four tiles, in this order and no other: **auto-appellation ·
exonymes · d'où viennent ces noms · pourquoi ils posent problème**.

| Tile             | Closed state teaches                                | Opening adds                     |
| ---------------- | --------------------------------------------------- | -------------------------------- |
| Auto-appellation | the autonym itself, with its `lang` attribute       | the gloss and its source         |
| Exonymes         | the count and the first two, `Bahutu · Wahutu · +1` | the full list with who used each |
| Origine des noms | the actor, `Terme d'origine interne`                | the paragraph                    |
| Ce qu'ils posent | the era, `Fixé par l'administration, années 1920`   | the paragraph                    |

The autonym never collapses out of sight: `afh/no-bare-people-name` already
requires it to render through `<AutonymExonymHeading>`, and a closed tile hiding
it would defeat the rule by a different route. It is the closed-state fact.

### 4.3 `Langue` — unchanged in substance, tiled in form

Main language, ISO codes, dialects, vehicular role. The dialect list is the only
part that collapses; its closed fact is the count.

### 4.4 `Histoire` — chapters 3 and 5 merged onto one spine

`Origines & formation` (2 145 px) and `Rôle historique` (1 188 px) are 3 333 px
of chronology in two chapters. One dated spine, stations in order, prose behind
each station.

Closed fact per station: the years, or the era label where the corpus dates
nothing. An undated station stays visible and undated — REQ-148's
`chronology-symmetry` exists to make that asymmetry legible, and hiding it would
disarm the gate visually while leaving it green.

### 4.5 `Noms portés` — A–Z index, gloss only when it varies

The country fiche's decision applies unchanged, with one correction it earned:
an **A–Z index whose letter anchors the scroll** beats grouping by naming system
for the reader who arrives with a name in mind, which is the observed gesture.

The measured defect is separate and survives either choice: on the country fiche
23 rows carried **two distinct glosses**. So the gloss renders **only where it
distinguishes a row from its neighbour**. A predicate that never varies is not
information.

No pagination. A paginated chapter cannot be deep-linked, and every anchor the
rail publishes for it is a lie past page one.

### 4.6 `Culture & société` — chapters 8 and 9 merged

`Culture & spiritualité` (1 436 px) and `Peuples voisins & organisation`
(1 744 px) become one four-tile grid on the country fiche's model: **rites ·
symboles & arts · organisation · relations**.

All four tiles take the page accent, ocre. They do not rotate through the
palette: a colour that changes with position carries no meaning (brand charter
§5.2). They are told apart by their content.

Closed fact per tile: the first two keywords. Opening gives the prose.

### 4.7 `Poursuivre` — unchanged

Five action links, form A of `actions-charter.md`, no container. Atlas charter §7
forbids cards here in terms and
`src/components/fiche/__tests__/ficheOnwardCharter.test.tsx` holds it.

### 4.8 `Sources` — detached, unchanged

`as="footer"`, `id="sources"` passed explicitly and never re-derived — citation
chips across the app point at it. It gains the section gap and a rule above it,
and nothing else.

**One editorial finding, out of scope here and owed to `/afrik-curator`.** This
fiche's reader-facing source note names « Wikipedia FR, recensement ».
`sources[].notes` is published verbatim and CLAUDE.md is explicit that Wikipedia
is not a source: a primary source discovered through it is cited at its own tier,
by its own URL.

---

## 5. Tokens this surface consumes

No literal, no shadcn variable outside `ui/`, no primitive read by a component.

| Role               | Token                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| Page ground        | `--afh-bg`, `--afh-bg-warm`                                                |
| Chapter ground     | `--afh-surface`                                                            |
| Rules and edges    | `--afh-border`                                                             |
| Ink                | `--afh-text`, `--afh-text-soft`, `--afh-text-muted`                        |
| Accent             | `--accent`, `--accent-tint`, `--accent-ink` — resolved by the page wrapper |
| Chapter separation | `--afh-section-gap` (24 / 32 / 48)                                         |
| Radius             | the single value `actions-charter.md` §6 settled                           |
| Motion             | `motion.css`; the spring is for things arriving, flat curves for state     |

**`--afh-section-gap` is declared, documented in Storybook and consumed by zero
components.** Wiring it on `afh-parchment-section` serves the country, people and
family fiches at once. Brand charter §7 carries the argument and the numbers the
home needs before it moves.

A new token is warranted for one role only: the closed-state fact needs a
label ink distinct from `--afh-text-muted`, because it is read, not skimmed.
Prefer `--afh-text-soft` first and add nothing if it holds.

---

## 6. Gates

| Rule                            | Held by                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Closed tile carries a fact      | `peopleFicheCharter.test.tsx`, §3 above                                                         |
| Chapter order and presence      | `data-fiche-section` parity assertion, already in that suite                                    |
| No foreign accent on the page   | existing `.afh-accent-*` scope assertion                                                        |
| Colours are tokens              | `src/styles/__tests__/colorTokens.test.ts`                                                      |
| Autonym renders with its exonym | `afh/no-bare-people-name`                                                                       |
| `Poursuivre` stays links        | `ficheOnwardCharter.test.tsx`                                                                   |
| Section gap is one value        | a Playwright assertion measuring rendered gaps between consecutive `[data-fiche-section]` nodes |

The last one cannot be a unit test. Measured gaps are only visible on the
rendered page, and that is the class of defect that produced this document.

---

## 7. What this contract does not decide

- **Wording beyond the three labels it names.** Content design;
  `actions-charter.md` §7 draws the line.
- **The globe band.** Above the parchment, untouched.
- **Filling the corpus.** Deriving the share is a rendering decision. Sourcing
  the 37 declared percentages up to 1 581 is editorial work and belongs to
  `/afrik-curator`.
- **The family, language and name fiches.** They inherit the same spine, and
  each needs its own relevé before it is written down.
