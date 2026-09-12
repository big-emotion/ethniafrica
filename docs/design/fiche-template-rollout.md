# Fiche template rollout — the order, and why

How the template settled in `country-template-brief.md` and specified in
`people-template-spec.md` reaches all five fiche classes, in what order, and what
each phase costs. Test-first per phase, and nothing shared is built twice.

Measurements were taken on **production, 430 px, 2026-09-12**, and corpus counts
from `dataset/source/afrik/`.

---

## 1. The five surfaces, measured

| Fiche   | Example            |    Height | Chapters | Gaps between chapters              |
| ------- | ------------------ | --------: | -------: | ---------------------------------- |
| Peuple  | `PPL_HUTU_BURUNDI` | 15 487 px |       13 | one value: 0                       |
| Famille | `FLG_BANTU`        | 13 073 px |        9 | **five values: 0, 26, 27, 53, 65** |
| Pays    | `BDI`              |  9 334 px |       10 | one value: 0                       |
| Nom     | `PAT_ABABDA`       |  5 200 px |        8 | one value: 0                       |
| Langue  | `run` (kirundi)    |  3 472 px |        9 | one value: 0                       |

Two of these are not what they look like.

**The family fiche is the closest to the target already.** It opens on
`La famille en chiffres`, a counted brief, at 264 px. It has nine chapters, a
`Poursuivre` and a detached `Sources`. What it does not have is a rhythm: five
distinct gap values down one document, which is a different failure from the
other four and a worse one. An irregular cadence reads as accident; a uniform
zero at least reads as a decision.

**The language fiche is not short because it is tidy.** Seven of its nine
chapters average 122 px, and three of them — `Dialectes`, `Rôle véhiculaire`,
`Vitalité` — read `Donnée manquante`. Redesigning it buys nothing.

---

## 2. The finding that reorders the work

The same defect appears on three of the five surfaces, and it is not a layout
defect:

| Surface | What it reports missing          | What the corpus holds                      |
| ------- | -------------------------------- | ------------------------------------------ |
| Pays    | languages, on 13 of 54 countries | 7 to 82, on the peoples that live there    |
| Peuple  | every share bar, at `width: 0%`  | populations on 773 of 776 fiches           |
| Langue  | dialects and vehicular role      | derivable for 688 and 754 of 756 ISO codes |

Kirundi is the worked example. Its fiche says `Donnée manquante` three times,
while the seven people fiches that declare it carry **34 dialects and 7 vehicular
notes** between them.

**A fiche reads only its own record, and the value of this atlas is the relations
between records.** That is one service, not three redesigns — and it is why the
derivation layer is phase 1 rather than a detail inside each template ticket.

Atlas charter §4 already rules on it: declared where declared, derived where
derivable and **marked derived**, missing only where neither. What it did not say
is where the derivation lives, which is how the same gap got shipped three times.

---

## 3. The phases

Each phase is test-first: the failing test lands in the same change as the code
that satisfies it. Phases 0 and 1 are shared by all five surfaces and nothing
downstream starts before they land.

### Phase 0 — the shared spine · 3 tickets, small

| Ticket                   | Test first                                                                                                                                           | Then                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Wire `--afh-section-gap` | a Playwright charter contract that measures rendered gaps between consecutive `[data-fiche-section]` nodes and fails on more than one distinct value | consume the token on `afh-parchment-section`       |
| `FicheTile`              | `peopleFicheCharter.test.tsx` §3: a non-empty `[data-closed-fact]`, not a substring of the chapter title, never on a `[data-fiche-section]`          | one disclosure component, five surfaces            |
| `FicheBrief`             | every counter renders its scope in its own label; a counter with no value renders the gap notice, not a zero                                         | generalise `CountrySynthesisBrief` over the entity |

The gap ticket alone fixes the measured cadence on all five fiches at once. It is
the cheapest visible win in this document and it is already argued in brand
charter §7.

### Phase 1 — the derivation service · 1 ticket, medium

One module, one shape. Every answer carries its provenance so a component can
never render a derived value as a declared one:

```
{ value, provenance: "declared" | "derived" | "missing", from?: string }
```

Three derivations, three test suites written first, each against corpus fixtures:

1. **Languages of a country**, from the peoples that live there. Fixture: `BDI`,
   expects 7 and `derived`; a country that declares its own expects `declared`.
2. **Share of a people per country**, `population ÷ Σ population`. Fixture:
   `PPL_HUTU_BURUNDI`, expects 67.5 % for BDI. **The denominator is the sum of
   the rows, never `totalPopulation`** — on that fiche the declared total is
   10.5 M against 18.1 M of rows, and dividing by it puts Burundi at 116 %. A
   second fixture asserts the divergence is surfaced, not silently resolved.
3. **Dialects and vehicular role of a language**, from the peoples that speak it.
   Fixture: `run`, expects 34 dialects and `derived`.

### Phase 2 — pays · 4 tickets

The template is fully specified in `country-template-brief.md`. Order inside the
phase: `En bref` → reorder and the two merges → derived languages → names
regrouped behind the A–Z index.

Pays goes before peuple deliberately. It has nine chapters against thirteen and
less traffic, so the assembly is validated where a regression costs least. Flip
the two only if the audience argument outweighs that, and say so when you do.

### Phase 3 — peuple · 5 tickets

Specified in `people-template-spec.md`. The extra ticket over pays is the
distribution chart, which is the one place a reader sees phase 1 pay off.

### Phase 4 — famille · 2 tickets

Cheap, because the structure is already right. It needs the two name chapters
merged — `D'où vient le nom de la famille` (651 px) and `Appellations et
décolonisation` (1 504 px) answer one question in two places, the same defect the
people fiche shows in triplicate — and `Peuples rattachés` moved up to second,
directly under the brief, for the same reason the peoples block moved on the
country fiche.

Its accent stays **pervenche, never terre**: inside a fiche, terre is reserved
for the imposed-exonym marker, and painting the page terre would stop that marker
being a marker (atlas charter §2).

### Phase 5 — nom · 2 tickets

Already compact at 5 200 px over eight chapters with a uniform cadence. It needs
the brief, the tiles and the gap, and nothing structural.

One caveat that belongs to the roadmap rather than to this phase: **796 name
fiches exist and 379 carry an origin.** A template that leads with `Origine`
leads with an empty chapter one time in two, so the brief's counters and the
gap notice carry more weight here than anywhere else.

### Phase 6 — langue · 1 ticket

Not a redesign. Seven chapters averaging 122 px collapse into one
`Identité de la langue` block of four tiles, and phase 1 fills three of them.
The cheapest phase in the document, and the one with the largest ratio of
content gained to code written.

---

## 4. What is not in this plan

Three of the findings behind it are editorial, not design, and belong to
`/afrik-curator`:

- **The demography arbitration.** 33 of 774 people fiches declare a total that
  disagrees with their own rows by more than 10 %. Deriving from the rows makes
  the chart consistent; it does not make the corpus right.
- **The 1 544 undeclared shares.** 37 rows of 1 581 declare a percentage.
  Sourcing the rest is corpus work.
- **`Wikipedia FR, recensement` in a reader-facing source note** on
  `PPL_HUTU_BURUNDI`. `sources[].notes` is published verbatim, and Wikipedia is
  not a source: a primary source found through it is cited at its own tier, by
  its own URL.

And one thing no phase here touches: the globe band, which sits above the
parchment on every fiche and is out of scope throughout.
