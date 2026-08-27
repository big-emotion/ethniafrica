# Games charter — what a round is allowed to ask

The rules a game of the _Jouer_ hub has to obey. Each one exists because
breaking it makes the round ask a question the reader cannot answer, or answer
a question that teaches nothing.

Companion to `docs/design/atlas-charter.md`, which governs the cartographic
surface a game borrows. Engine and registry: `src/lib/games/`.

---

## 0. The diagnosis this charter answers

Eleven games shipped under REQ-120. They are four interactions (`binary`,
`quad`, `globeTap`, `areaCompare`) applied to eleven corpus slices — an
efficient engine carrying a design that was never made. Four defects, each
located in code rather than inferred from a screenshot:

| Defect                                                                                                                                                                                                                                           | Where                                                                              | Consequence                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A round has no subject line.** `GameRoundBase` carries `subjectId` but no field that names the subject. Every renderer prints `round.promptFr`, which is the _standing_ prompt copied from the registry and identical across all eight rounds. | `src/lib/games/gameKinds.ts`, `src/components/play/BinaryChoice.tsx:39`            | « Lequel de ces deux noms le peuple se donne-t-il à lui-même ? — Toro / Abatooro » never says _which_ people. The reader is asked to identify a name without being told whose.         |
| **Distractors are the first three entries of the pool.** `selectDistractors` iterates the pool in corpus order and breaks at three. No similarity criterion of any kind.                                                                         | `src/lib/games/options.ts:31`                                                      | The Baganda link offers _Aari, Abé, Abidji, Banyoro_ — three alphabetical accidents against one real answer. The item is guessable without knowledge and teaches nothing when guessed. |
| **`AreaCompare` draws an unbounded square.** The stage `<svg>` has `w-full` and a 1:1 `viewBox` with no height constraint, so on a desktop viewport it renders as tall as the page is wide.                                                      | `src/components/play/AreaCompare.tsx:110`                                          | Both answer buttons are pushed below the fold. The reader sees a shape and no way to answer it.                                                                                        |
| **A marker on the far side of the sphere stays clickable.** `StagePlacement.facingReader` is documented as "must not be clickable"; the renderer only fades it to `opacity: 0.35`.                                                               | `src/lib/atlas/markerPlacement.ts:29` vs `src/components/atlas/AtlasGlobe.tsx:452` | Ghost targets float in the black beside the globe, answerable and unexplained.                                                                                                         |

One correction to the brief that prompted this charter: **there is no
autorotation.** The globe animates once on mount (`scheduleReveal`, bounded
duration, honours `prefers-reduced-motion`) and is otherwise driven by drag.
What reads as "it spins and I can't stop it" is an entry animation with no
visible affordance for stopping it or for what dragging does. That is still a
defect — it is a legibility defect, not a WCAG 2.2.2 violation, and it is fixed
with a control and a label, not with a pause button.

**The engine is sound. What is missing is the design.** Everything the
following rules require is already loaded: `GamePeopleFixture` carries
`totalPopulation`, `languageFamilyNameFr` and `currentCountries`. No new query
is needed to obey this charter.

---

## 1. The scope cut

Eleven approximate games are worth less than three finished ones. **Three ship;
eight are retired** until the loop below is proven.

### Kept

| Game                                               | Why it survives                                                                                                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **« Eux, ou les autres ? »** (`appellations`)      | The site's thesis in one round: the name a people gives itself against the name it was given, with the documented origin of the exonym as the reveal. This is the game the atlas exists to make.                  |
| **« Le pays d'avant »** (`pays-davant`)            | Toponymy and its colonial actors. `nameOriginActor` is set on all 54 country fiches and `etymology` on most — the corpus can say _who_ named a country and _why_, which is the decolonial argument made playable. |
| **« La taille qu'on vous a cachée »** (`mercator`) | One idea, cleanly: Mercator inflates the north and shrinks Africa. Cheap to finish and it carries a real claim.                                                                                                   |

### Retired

`vraie-taille` and `repartition` are **removed as a category**, not deferred:
comparing two silhouettes by eye is a perception test, and perception tests
carry no onomastic content. `mercator` keeps the surface argument without the
shape-guessing, which is the whole reason it is the exception.

`plus-ou-moins`, `royaumes`, `migrations`, `liens`, `familles`, `frontieres`
are deferred. Each may return, but only rebuilt against this charter — and
`familles` is the strongest candidate to return first, because a language
family has a naturally plausible distractor pool (the other families) and
already supplies the context every other game needs.

---

## 2. Item doctrine — three parts, always in this order

A round is **never** a bare question. It is:

```
STIMULUS   Famille linguistique → pays → peuple.
           Who we are talking about, before anything is asked.

STEM       The question itself, about this subject.

OPTIONS    2 to 4, every one read verbatim from the corpus.
```

Worked example, `appellations`:

> **Famille nigéro-congolaise · Ouganda**
> **Les Toro** — environ 1 200 000 personnes
>
> Lequel de ces deux noms ce peuple se donne-t-il à lui-même ?
>
> `Toro` `Abatooro`

The stimulus is not decoration and it is not a hint. It is the difference
between _recalling_ a fact and _reasoning_ about one: a reader who knows that
Bantu autonyms carry an `Aba-` class prefix can now answer, and has learned
something transferable. Without the stimulus the same item is a coin flip.

**This requires a type change.** `GameRoundBase` must carry the subject as
renderable data, not only as `subjectId`:

```ts
interface GameStimulus {
  familyFr: string | null; // languageFamilyNameFr
  countriesFr: string[]; // currentCountries, resolved
  subjectName: AutonymExonymName;
  scaleFr?: string; // "environ 1 200 000 personnes"
}
```

`promptFr` on a round then means _the stem of this round_, and the registry's
`promptFr` is renamed to `standingPromptFr` — the page subtitle it already is.

---

## 3. Distractor plausibility — the near-pool rule

A distractor drawn at random from 924 peoples is not a distractor; it is
padding. **Distractors are drawn from the subject's near pool**, in this order
of preference:

1. Same language family, then
2. Same country, then
3. Same order of magnitude of population (within one decimal order).

If the near pool cannot supply the required number, **the round is not
generated**. `selectDistractors` already returns `null` rather than padding —
that discipline is right, and it extends to plausibility, not just to count.

The test is simple and belongs in the suite: _could a knowledgeable reader rule
out this distractor without knowing the answer?_ If yes, it is not doing its
job.

---

## 4. Difficulty calibration

Difficulty is a property of the item, declared and ordered, not an accident of
the draw. The proxy is **demographic notoriety**: a people of ten million is
more likely to be recognised than a people of forty thousand.

A session of 8 rounds is ordered by ascending difficulty band:

| Rounds | Band      | Selection rule                                                 |
| ------ | --------- | -------------------------------------------------------------- |
| 1–2    | Facile    | Subject in the top population decile of the scoped pool        |
| 3–6    | Moyen     | Middle deciles                                                 |
| 7–8    | Difficile | Lower deciles, or a near pool of three same-family distractors |

This is a **proxy, and it is stated as one**: population approximates
familiarity for a French-speaking audience and diaspora, imperfectly. It is
recorded here so that a later empirical p-value (share of players answering
correctly) can replace it without anyone having to rediscover why population
was ever used.

The existing `baselineDifficulty` field on `QuizQuestionCandidate` is the seam;
`GameRound` needs the same.

---

## 5. Scoping — the country run and the family run

A session is drawn from a **scoped pool**, chosen before play:

- **All Africa** — the default.
- **One country** — its peoples only. « Les peuples du Ghana. »
- **One language family** — its peoples only. « Les peuples nigéro-congolais. »

Two axes over 54 countries and 24 families turn three games into hundreds of
distinct sessions without a single new mechanic. `QuizSegmentPicker` already
exists for the quiz surface and is the component to reuse rather than rebuild.

Scoping also _improves_ the items it feeds: inside a country run, every
distractor is automatically a plausible one.

---

## 6. Generation by template

Rounds are generated from the corpus by parameterised templates — a mould, not
a random draw. A template declares:

```
subject selection   which fiches can fill this slot (required fields, difficulty band)
stem                the sentence, with the subject interpolated
correct answer      the field path it is read from
distractor pool     the near-pool rule of §3
reveal              the verbatim corpus text and its field path
```

Two consequences follow, and both are already respected by the eleven
generators — they are recorded here so a new template does not lose them:

- **A round that cannot be filled is not generated.** Returning `null` beats
  inventing an option (FR65/FR66).
- **Placement is deterministic, never random.** `correctOptionIndex` derives
  the slot from the entity id, so the answer is not always on the left and a
  round is reproducible in a test.

---

## 7. The reveal is the product

The answer screen is where the site keeps its promise. A round that says only
« Correct » has taught nothing; the score is the pretext, the reveal is the
lesson.

The reveal shows, in this order:

1. **Right or wrong**, plainly.
2. **The verbatim corpus text** — `GameReveal.textFr`, never paraphrased.
3. **The source and its tier**, through `ConfidenceChip`. A game round rests on
   the same provenance doctrine as a fiche: a claim sourced only at
   `unverified` is played _and_ visibly marked.
4. **A way in** — a link to the fiche of the people or country just played.

A wrong answer is the most valuable moment in the session. It is the one time
the reader is actively curious about a fact. The interface should treat it as
an opening, not as a penalty.

---

## 8. Register

The audience knows nothing about the subject, and that is the point of the
site. Every stem must be answerable by a reader with no prerequisites.

> ✗ « Expansion orientale à travers le corridor savanicole vers les Grands
> Lacs : où ce mouvement a-t-il mené ? »
>
> ✓ « Ce peuple s'est déplacé vers l'est, en suivant la savane, jusqu'aux
> Grands Lacs. Dans quel pays d'aujourd'hui est-il arrivé ? »

Rules: no term the fiche itself does not gloss; no period label without a
century in plain words; a proper noun on first mention gets one clause of
apposition. Technical vocabulary belongs in the reveal, where it can be
explained, never in the stem, where it blocks.

---

## 9. Interface rules

Mobile-first, per the project breakpoints (mobile 430px · tablet `md` 720px ·
desktop `xl` 800px).

1. **Stimulus, stem and every option fit above the fold at 430px.** If a stage
   cannot fit, the stage shrinks — the options are never what gets pushed off.
   Any illustrative `<svg>` carries a bounded `max-height`, never `w-full` on a
   square `viewBox`.
2. **An option looks answerable.** One visual treatment for "tappable", used
   nowhere else on the surface, at least 44px per WCAG 2.5.8.
3. **A map has a referent.** No geometry is shown without a basemap and a
   locator inset. Two normalised outlines on white are shapes, not a map, and
   the reader cannot situate them.
4. **A globe states its controls.** What dragging does, and a visible
   _Recentrer_. Motion honours `prefers-reduced-motion`, which
   `AtlasGlobeCanvas` already does.
5. **An unanswerable target is not rendered.** `facingReader === false` means
   removed from the DOM, not faded — a control that cannot be used must not
   look like one.
6. **One accent per surface**, per the atlas charter. Games do not introduce a
   palette of their own.

---

## 10. What this charter costs

Ordered by dependency, not by size:

1. `GameStimulus` on `GameRoundBase`; registry `promptFr` → `standingPromptFr`.
2. Every renderer prints the stimulus above the stem.
3. Near-pool distractor selection in `options.ts`.
4. Difficulty band on `GameRound`; session ordered by band.
5. Scope picker on `/fr/jouer/<jeu>`, pool filtered by country or family.
6. Reveal gains source tier and a link to the fiche.
7. Eight games retired from `GAME_DEFINITIONS`; the `areaCompare` kind is
   deleted with them.

Steps 1–3 are the ones that make the current rounds honest. Steps 4–6 are what
make them worth replaying. Step 7 is what makes the hub legible.
