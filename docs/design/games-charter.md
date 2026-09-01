# Games charter — what a round is allowed to ask

The rules a game of the _Jouer_ hub has to obey. Each one exists because
breaking it makes the round ask a question the reader cannot answer, or answer
a question that teaches nothing.

Companion to `docs/design/atlas-charter.md`, which governs the cartographic
surface a game borrows. Engine and registry: `src/lib/games/`.

---

## 0. The diagnosis this charter answers

REQ-120's original scope shipped 11 games. They are four interactions
(`binary`, `quad`, `globeTap`, `areaCompare`) applied to 11 corpus slices — an
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

11 approximate games were worth less than three finished ones. **Three ship;
eight are retired** until the loop below is proven.

### Kept

| Surface                                            | Why it survives                                                                                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **« Le quiz des parcours »** (`quiz`)              | The hub's one full loop: a bank of items, a scope, a ladder and a score card. It reads its own table and is the surface every rule below was written for.         |
| **« La taille qu'on vous a cachée »** (`mercator`) | One idea, cleanly: Mercator inflates the north and shrinks Africa. Cheap to finish, it carries a real claim, and the home already owns the figure that proves it. |

**The second cut, 2026-08-29.** Three became two. « Eux, ou les autres ? »
(`appellations`) and « Le pays d'avant » (`pays-davant`) are retired: their
subject — the name a people gives itself, and who named a country — is
already the quiz's subject, drawn from a far larger bank, so the hub was
offering the same lesson three times with three engines. What went with them
is recorded rather than left to be rediscovered: the `globeTap` primitive
(`pays-davant` was its only producer), `GameStimulus` and `RoundStimulus`
(`appellations` was the only round that named a subject), the `peoples` corpus
slice, and the scope picker — `mercator` plays over the whole continent's
outlines and has nothing to narrow to.

**What `mercator` now owes.** The page is named after a projection, so it
shows the projection: the home's globe stage, the flat Mercator map and the
slider that closes it back into a sphere while Tissot's indicatrices hold
their real area.

~~It stands **above** the rounds, never beside a live one — a manipulable
globe next to « lequel est le plus grand ? » would let the reader answer by
eye, which is precisely the shape-guessing retired below.~~ **Amended,
2026-08-29 — see §11.** The rule was right about the danger and wrong about
the remedy. Standing the globe above the rounds cost the page its game: the
stage floor is 560 px on a phone and 720 px on a desktop, so the rounds began
below the fold and, at 1200 px and up, nothing of the game was visible at
all — a straight breach of §9.1, which says the stage gives way and the
options never do. The globe is now **bound to the round** and held at the
flat map while a question stands. A globe beside a live round only hands over
the answer when it tells the truth; the flat map is the lie the round is asked
against, so reading it gives the wrong answer.

### Retired

`vraie-taille` and `repartition` are **removed as a category**, not deferred:
comparing two silhouettes by eye is a perception test, and perception tests
carry no onomastic content. `mercator` keeps the surface argument without the
shape-guessing, which is the whole reason it is the exception.

`plus-ou-moins`, `royaumes`, `migrations`, `liens`, `familles`, `frontieres`
are deferred, and `appellations` and `pays-davant` join them. Each may return,
but only rebuilt against this charter — and only with an answer to the
question that retired the last two: **what does this teach that the quiz does
not already ask?** `familles` remains the strongest candidate, because a
language family has a naturally plausible distractor pool (the other families)
and already supplies the context every other game needs.

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

**The rule has one exception, and it is not a loophole.** A round must name its
subject **unless the subject is what is being guessed**. « Le pays d'avant »
(`pays-davant`, retired in the second scope cut — see §1) asked which country
carried a former name: naming that country above the question would have
handed over the answer, so its rounds carried no stimulus and were right not
to. « La taille qu'on vous a cachée » names both its countries in its own
options and needs none either. Written as first drafted, this section asked
every kept game for a subject line and would have broken two of them —
`GameStimulus` is therefore optional on `GameRoundBase`, deliberately, and a
generator that omits it is obeying this rule rather than skipping it.

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

`promptFr` on a round then means _the stem of this round_.

The rename of the registry's `promptFr` to `standingPromptFr` that this section
first asked for **is withdrawn**. It renames a field shared across every game
the registry declares, touches every consumer, and changes nothing a reader
sees — the round's stem and the registry's standing question were already
distinct values, only similarly named. It is cosmetic, and cosmetic churn in a
shared registry is how an unrelated game breaks.

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

Two axes over 54 countries and 24 families would turn a scope-friendly game
into hundreds of distinct sessions without a single new mechanic — moot for
the hub's one surviving game, `mercator`, which plays over the whole continent
and has nothing to narrow to (§1).

Scoping also _improves_ the items it feeds: inside a country run, every
distractor is automatically a plausible one.

### Amended, 2026-09-01 — the quiz crosses two axes on purpose

Two sentences above are now history and are kept rather than deleted, because
what replaced them is the argument.

**`QuizSegmentPicker` no longer exists.** The component to reuse is
`QuizScopePicker`, and its shape changed with it: the three `<select>`s are
gone and the surface is a board of cards — the two whole-corpus runs, the nine
themes, the 54 countries, the 23 families — each one a link to its own track.

**And the quiz does cross two axes, deliberately.** A country card deploys the
themes that country can fill, so « les croyances des peuples du Ghana » is one
tap away. What makes that affordable is not a new mechanic but the shape of the
answer: the crossing is 486 addressable pairs the picker already holds, and a
pair the corpus cannot fill is **not offered** rather than offered and refused.
No greying, no count — the same discipline §6 states for a round that cannot be
filled.

**And the threshold's worked example has expired.** « Khoïsan — one people,
four questions », the case `isPlayableScope` was written against, holds eleven
today. No family, country or theme is unplayable on its own any more: all 54,
all 23 and all 9 fill a session. The dead ends live only in the crossings —
123 of the 486 — which is why the picker stopped printing a count beside every
option. It warned where nothing was at risk and said nothing where the risk was
real.

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

Two consequences follow, and both are already respected by `mercator`'s round
generator, the one that survived both scope cuts — they are recorded here so a
new template does not lose them:

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
5. ~~**An unanswerable target is not rendered.**~~ **Withdrawn.** This rule
   said a `facingReader === false` marker should leave the DOM rather than
   fade. `AtlasGlobe.tsx` already explains why that is wrong, and it is
   right: removing the marker takes the country off the keyboard path, and
   under `prefers-reduced-motion` — where the globe never drifts round on its
   own — off the keyboard path means unreachable for good. A far-side marker
   stays rendered and dimmed. What actually failed here was that the globe's
   legend and toolbar were `hidden` below 760px, so a phone reader was given
   no statement of what dragging does and no way back to centre.
6. **One accent per surface**, per the atlas charter. Games do not introduce a
   palette of their own.

---

## 10. What this charter costs

Ordered by dependency, not by size:

1. `GameStimulus` on `GameRoundBase`, optional — see §2 for why a round whose
   subject is the answer carries none. The `standingPromptFr` rename this step
   also asked for is withdrawn.
2. Every renderer prints the stimulus above the stem.
3. Near-pool distractor selection in `options.ts`.
4. Difficulty band on `GameRound`; session ordered by band.
5. Scope picker on `/fr/jeux/<jeu>`, pool filtered by country or family.
6. Reveal gains source tier and a link to the fiche.
7. Eight games retired from `GAME_DEFINITIONS`; the `areaCompare` kind is
   deleted with them.

Steps 1–3 are the ones that make the current rounds honest. Steps 4–6 are what
make them worth replaying. Step 7 is what makes the hub legible.

**The implementation order above is wrong, and `docs/design/games-rollout-plan.md`
supersedes it.** Step 7 belongs first: retiring eight games removes eight
generators and one interaction kind from every step that follows. Reading the
code also narrowed the work — of the three kept games, only `appellations`
lacks a subject line and only `pays-davant` draws distractors from a pool — and
turned up a defect this charter missed: `mercatorMisleads()` was never called by
the handler, so the one game whose whole point is the projection's lie mostly
served rounds where nothing lies. **Fixed** — `handlers/games.ts` now skips any
pair the projection does not actually mislead about, and the hub's scene reads
the same `MINIMUM_AREA_RATIO` so it cannot advertise a gap the game refuses to
ask about.

---

## 11. The scale amendment (2026-08-29)

What `mercator` was asked to be, and why one interaction could not carry it.

### What the code actually served

Measured, not inferred, against the committed admin-0 outlines:

| Measurement                                                 | Value                               |
| ----------------------------------------------------------- | ----------------------------------- |
| Mercator inflation across the 58 African outlines           | **1.00 to 1.46** (highest: Tunisia) |
| African pairs where the projection inverts the true ranking | 25                                  |
| …of those, surviving `MINIMUM_AREA_RATIO` (1.02)            | 16                                  |
| …of those, reachable by the handler's greedy pairing        | **7**, against 8 asked for          |
| Distinct sessions a reader could ever be served             | **1** — the seed is the slug        |

Two filters were fighting. `mercatorMisleads` selects pairs whose _drawn_ order
flips, which only happens between countries of near-identical true area; the
minimum ratio then rejects near-identical areas. What survived were seven
comparisons differing by 2 % to 25 % — « Tchad ou Afrique du Sud ? » at 2,4 %
is the coin flip this charter's own kill test forbids.

**The lie is not inside Africa.** A continent astride the equator is drawn
near true scale; what Mercator inflates is everything above it. Greenland is
drawn at **14,3 times** itself, Western Europe at 2,0, the contiguous United
States at 1,7. Those shapes were already committed, in `worldCompare` — an
asset built for the retired « Vraie taille » and read by no game since.

### The estimate round, and why binary could not do it

A two-way choice records right or wrong, and the misperception here is neither.
No reader believes Greenland outranks Africa; they believe the gap is small.
That is a **magnitude** error, and only a round that asks for a number can
register how far off it is. Hence `estimate`: one track, one committed value,
and a reveal that states the distance between the two.

`GameDefinition.kind` becomes `kinds`. The registry test exists to catch a
renderer shipping unexercised, and a game serving two primitives could not say
so through a single value.

### Assembly: two rules that both hold

§4 wants ascending difficulty; a session of eight identical gestures is worse
than a mixed one. Sorting globally would block the kinds, interleaving globally
would scramble the bands. **The bands are the outer order and the alternation
happens inside each one.**

Difficulty for an estimate round is the size of the _ratio_, not of the shape:
landing inside a fifth of « fourteen times » is harder than inside a fifth of
« three times », and ranking by area would have made Western Europe the hardest
round for a French reader, which it plainly is not.

### The scale facts

A bank of measured statements — areas and great-circle distances — stated on
every other reveal and laid out whole on the score card. **Every figure is
computed from the committed assets, never typed.** The brief that prompted this
work offered « Kinshasa–Goma égale Paris–Moscou »; measured, it is 1 580 against
2 490 km. A bank of typed sentences would have shipped that.

They are **not** added to `DID_YOU_KNOW_FACTS`, whose own rule is that every
fact in it is onomastic — about a name, who gave it, what it hid — precisely so
the band cannot drift into trivia. A comparison of surfaces is trivia _there_
and the thesis _here_, so it lives with the game that argues it.

They are also not offered as a mode. A chooser between « questions » and
« faits » would hand the facts to whoever picked that tab and to nobody else,
and would spend the vertical space the page is shortest of.

### What this amendment concedes

`mercator` was already the charter's one exception: a surface argument with no
onomastic content, admitted because it carries a real claim. **This widens that
exception** — from area to distance, and from choosing to estimating. Nothing
here teaches a name. The exception is stated rather than smuggled, and it stays
confined to this one page: no other game may reach for it without answering the
question that retired eight of them — what does this teach that the quiz does
not already ask?

### What was rejected

- **A distance quiz.** « Kinshasa–Goma ou Paris–Varsovie, laquelle est la plus
  longue ? » fails the kill test. A French reader knows Paris–Varsovie and can
  only guess Kinshasa–Goma: that is recall, not reasoning. The area round can
  be reasoned about — « Mercator inflates the north, so the northern one is
  smaller than it looks ». Distances stay facts, never questions.
- **Shrinking the globe to obey §9.1.** It would have satisfied the rule by
  degrading the one thing the page is named after. Putting the round first in
  the document obeys it without touching the globe.
