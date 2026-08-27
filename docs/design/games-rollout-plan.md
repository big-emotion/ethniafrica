# Games rollout plan — from eleven approximate games to three finished ones

The implementation plan for `docs/design/games-charter.md`. Read the charter
first: it says what the surface owes, this says in what order the debt is paid.

Every phase is **test-first** (a failing test, then the change that makes it
pass) and lands as one commit. A phase is done when `make check` is green.

---

## What the code actually needs

The charter was written while looking at eleven games. Eight of them are being
retired, and the defects do not distribute evenly across the three that stay.
Grepped, not assumed:

| Kept game                                          | Kind       | Its real defect                                                                                                                                                                                                                       |
| -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **« Eux, ou les autres ? »** (`appellations`)      | `binary`   | `promptFr: GAME.promptFr` — the standing prompt, so the round never names its people. The charter's stimulus defect, and this is the only kept game that has it.                                                                      |
| **« Le pays d'avant »** (`pays-davant`)            | `globeTap` | `selectDistractors` hands it the first three drawable countries in corpus order. Its stem is already fine — it carries the former name. Also inherits the far-side marker defect.                                                     |
| **« La taille qu'on vous a cachée »** (`mercator`) | `binary`   | `mercatorMisleads()` is exported, tested, and **never called by the handler**. `games.ts:109` pairs adjacent countries, so most rounds are honest comparisons where the projection lies about nothing. The game misses its own point. |

Two corrections to the charter follow from this, and are applied to it in
phase 6:

- **§2 overstates the stimulus rule.** A stimulus situates a subject whose
  attribute is being asked. When the subject _is_ the answer — `pays-davant`
  asks which country carries a former name — naming it would be the answer.
  The rule is: **a round must name its subject unless the subject is what is
  being guessed.**
- **§10 puts the scope cut last.** It belongs first: retiring eight games
  removes eight generators and one whole interaction kind from every phase
  that follows.

The defect the charter lists third — `AreaCompare`'s unbounded `<svg>` — is
never fixed. Both games that mount it are retired, so it is deleted rather
than repaired.

---

## Status

**Phases 0–4 are shipped** — PR #439, branch `worktree-jeux-refonte-conception`.
The three games are honest: the hub is cut to three, `appellations` names its
people, `pays-davant` draws neighbours, `mercator` only asks where the
projection lies, and the globe keeps its controls at phone width.

**Phases 5–8 are open.** Nothing below is started. Three things the code
corrected while phases 0–4 were built are folded into them:

- **The scope cut killed two engine paths, not one.** None of the three kept
  games is `quad`, so `QuadChoice` went with `areaCompare`, along with three
  `loadGameCorpus` branches and their four unreachable Supabase reads.
- **`GameStimulus` is optional, and stays optional.** A round names its subject
  _unless the subject is what is being guessed_. Do not thread one through
  `pays-davant`.
- **Charter §9 rule 5 is withdrawn.** A far-side globe marker stays rendered
  and dimmed: removing it takes the country off the keyboard path, and under
  `prefers-reduced-motion` that means unreachable for good.

---

## Phase 0 — Cut the hub to three games

Pure deletion. Nothing else gets easier until this lands.

**Test first.** `src/lib/games/__tests__/gameRegistry.test.ts` asserts
`GAME_DEFINITIONS` holds exactly the three kept ids, and that `GAME_SLUGS`
no longer resolves a retired slug.

**Then.** Remove the eight entries from `GAME_DEFINITIONS`; delete the eight
round generators and their test files; delete `AreaCompare.tsx`, its test and
its story; remove `"areaCompare"` from `GameKind` and `AreaCompareRound` from
the `GameRound` union; drop the retired branches of the `switch` in
`src/api/v2/handlers/games.ts`.

**Watch for.** `GameKind` is a closed union — removing a member makes every
non-exhaustive `switch` on it fail to compile only if the compiler is
strict, and this repo runs `strictNullChecks: false`. A missing case returns
`undefined` silently. Grep for `areaCompare` and check each hit by hand; the
tests are the only real gate here.

**Done when.** `/fr/jouer` lists three games, a retired slug 404s, and no
`areaCompare` remains in `src/`.

---

## Phase 1 — `appellations` names its people

The founding defect, now scoped to one generator.

**Test first.** In `appellationsRound.test.ts`: the returned round exposes the
subject people's name, its language family and its countries. In
`BinaryChoice.test.tsx`: the rendered output contains the people's name, and
the standing prompt is no longer the only heading.

**Then.** Add an optional stimulus to `GameRoundBase`:

```ts
interface GameStimulus {
  familyFr: string | null;
  countriesFr: string[];
  subjectName: AutonymExonymName;
  scaleFr?: string;
}
```

Optional, deliberately: `pays-davant` must not carry one, and `mercator` does
not need one. Fill it in `buildAppellationsRound` from
`GamePeopleFixture.languageFamilyNameFr`, `.currentCountries` and `.name` —
all three already loaded, no query changes. Render it through one shared
`RoundStimulus` component above the stem.

**KISS note.** Do not rename the registry's `promptFr` to `standingPromptFr`
yet, and do not thread a stimulus through the two games that do not want one.
The rename is cosmetic and can ride along with phase 5 if it still seems
worth it then.

**Done when.** A round reads « Famille nigéro-congolaise · Ouganda — Les Toro »
above « Lequel de ces deux noms ce peuple se donne-t-il à lui-même ? ».

---

## Phase 2 — `pays-davant` draws plausible distractors

**Test first.** In `historicalNameRound.test.ts`: given a subject and a pool,
every distractor shares a region or a colonial naming actor with the subject;
and given a pool that cannot supply three, the builder returns `null` rather
than reaching further.

**Then.** Sort the pool before the call rather than changing `selectDistractors`
— it receives flattened values and cannot know a candidate's geography, and it
is shared with the quiz templates, whose questions are persisted and must not
move until phase 8. The helper takes the first three it is given, so the pool's
order _is_ the proximity rule. `GameCountryFixture` carries no region, so rank
by the admin-0 centroid via `getAdmin0Rings` + `ringCentroid`.

**Watch for.** Nearest-neighbour on centroids makes the answer guessable in
the other direction if the correct country is always the odd one out
geographically. Assert in the test that the subject is not systematically the
outlier.

**Done when.** A round about Haute-Volta offers three West African neighbours,
not the first three countries of the corpus.

---

## Phase 3 — `mercator` keeps its promise

The highest-value change in the plan: the game already contains the logic it
needs and simply never calls it.

**Test first.** In a handler test: every `mercator` round built from a fixture
country list satisfies `mercatorMisleads(a, b)`. This test fails today.

**Then.** In `src/api/v2/handlers/games.ts:109`, filter candidate pairs
through `mercatorMisleads` before building. `pairs()` currently walks adjacent
items, which cannot express "pair a northern country with an equatorial one" —
build the candidate set from the misleading pairs instead, then take the
session's worth.

**Watch for.** If too few misleading pairs exist to fill eight rounds, the
session shortens rather than padding with honest pairs — the registry already
documents two games capped by the corpus and saying so on screen.

**Done when.** Every round is one where the flat map lies, and the reveal's
inflation factor has something to explain.

---

## Phase 4 — A target you cannot see is not rendered

Affects `pays-davant`, the only kept game on the globe.

**Test first.** In `AtlasGlobe.test.tsx`: a target whose placement has
`facingReader: false` is absent from the DOM, not merely faded.

**Then.** `AtlasGlobe.tsx:452` — stop rendering the button instead of setting
`opacity: 0.35`. Add the missing control legend next to _Recentrer_ saying
what dragging does; the "it spins and I can't stop it" report was an entry
animation with no affordance, not autorotation, and a label fixes it.

**Done when.** No answerable marker floats beside the globe.

---

## Phase 5 — Difficulty is ordered, not drawn

Right now a session is whatever the corpus rotation happened to yield: round 1
can be a people of forty thousand and round 8 a people of ten million.

**Test first.** In a handler test: a session of eight rounds is ordered by
ascending difficulty band, and rounds 1–2 come from the top population decile
of the scoped pool. Add a second test that a pool too small to fill three bands
still returns a session rather than nothing.

**Then.** Add `difficultyBand: "facile" | "moyen" | "difficile"` to
`GameRoundBase` — beside `stimulus`, and required, unlike it. Derive it from:

| Game           | Signal                                                         |
| -------------- | -------------------------------------------------------------- |
| `appellations` | `GamePeopleFixture.totalPopulation`, decile of the scoped pool |
| `pays-davant`  | country area from `getAdmin0Rings` + `ringArea`                |
| `mercator`     | the inflation factor already computed in `footprintOf`         |

Order the session in `assembleRounds`, after generation, before the
`roundsPerSession` cut — the cut currently takes the first N, which would
silently drop the hard band.

**Watch for.** Population is a **proxy for familiarity**, not a claim about
importance. Say so in the comment where the band is derived, or the next
reader will take the atlas to be ranking peoples. It is meant to be replaced by
an empirical p-value — the share of players answering correctly — as soon as
there is one to use.

**Done when.** Eight rounds open on peoples a French-speaking reader is likely
to have heard of and end on ones they are not.

---

## Phase 6 — Scoping by country and by language family

The change that multiplies three games into hundreds of sessions without a
single new mechanic — and the one to keep if the budget for this second half
shrinks.

**Test first.** `/fr/jouer/appellations?pays=GHA` draws only peoples whose
`currentCountries` include GHA; `?famille=FLG_…` only that family's; an unknown
value falls back to the whole corpus rather than to an empty session.

**Then.** Three seams:

1. `GameRoundsData` gains the scope it was built with, so the page can name it.
2. `assembleRounds` filters `corpus.peoples` before generating.
3. The page reads the query and reuses
   `src/components/quiz/QuizSegmentPicker.tsx` — do not write a second picker.

**Watch for.** The `PEOPLE_POOL_SIZE = 150` cap in `gamesService.ts` is applied
by the _query_, ordered by id. Filtering after that means a country run draws
from the first 150 peoples alphabetically, not from that country's peoples.
The filter has to reach the query, or the cap has to move.

**A free win.** Inside a country run every distractor is automatically
plausible, which is the §3 near-pool rule obtained for nothing.

**Also in this commit.** Apply the two charter corrections named at the top of
this document to `games-charter.md` §2 and §10, so the contract and the code
stop disagreeing.

---

## Phase 7 — The reveal earns the session

The answer screen is where the site keeps its promise. A round that says only
« Correct » has taught nothing.

**Test first.** `GameAnswerReveal.test.tsx`: the reveal renders the source tier
through `ConfidenceChip`, and links to the subject's fiche. A round whose
source the corpus does not record renders no chip rather than a default one.

**Then.** `GameReveal` gains `sourceTier` and the subject's fiche href. The
service must load it: the tier lives in `sources`, joined through the fiche,
and this is **the one phase in 0–7 that adds a query**. Budget for it.

**Watch for.** A claim resting only on an `unverified` source is played _and_
visibly marked — that is the Source Tier doctrine, not a defect to hide. Do not
filter those rounds out.

**Done when.** A wrong answer opens onto the fiche of what was just missed.

---

## Phase 8 — The quiz: code, then data

Requested explicitly. Independent of 0–7 and free to slip.

The quiz shares `selectDistractors` with the games and has the same defect. But
**changing code alone improves nothing a player sees**: the templates T1–T5 in
`src/lib/quiz/questionTemplates.ts` have no production consumer — they feed
`scripts/generateQuizQuestions.ts`, which writes into the `quiz_questions`
table (migration `036_quiz_engine.sql`), and that table is what
`quizService.ts` reads.

**Code half.** `scripts/lib/quizGeneration.ts` sorts each pool
(`familyNamePool`, `autonymPool`, `countryNamePool`, `languagePool`,
`isoCodePool`) by nearness to the subject before handing it to a template.
Same principle as phase 2: `selectDistractors` stays untouched, the pool's
order carries the rule. The five T1–T5 tests pin the current order and have to
be reworked.

**Data half — the real cost.** Re-run `scripts/generateQuizQuestions.ts`, then
roll the new question set out **recette first, production second** — the two
Supabase projects are distinct and both label themselves "production"
(`docs/runbooks/afrik-data-sync.md`). Before touching production: count
`quiz_questions` rows before and after on recette, and play one full
`/fr/quiz` session.

**Watch for.** Regenerating replaces questions a player may be mid-session on,
and `quiz_attempts` rows reference question ids. Check what the schema does
with a replaced id before running it against a live database.

---

## Order and stopping points

**Phases 0–4 make the three games honest.** That is a shippable release on its
own, and the natural place to stop and look at the result before committing to
more.

**Phases 5–7 make them worth replaying.** Scoping (6) is what multiplies three
games into hundreds of sessions, so it is the one to keep if the budget for
this second half shrinks. Of the three, only phase 7 adds a Supabase query.

**Phase 8 stands alone.** It is the only one with a data half, the only one
that touches both Supabase projects, and it improves nothing a player sees
until the questions are regenerated. It can slip without blocking anything.

Nothing in phases 0–4 required a new Supabase query, a migration, or a corpus
edit — everything they needed was already loaded by `GamePeopleFixture` and
`GameCountryFixture`. That held.

Suggested PRs: 0–4 (shipped, #439), 5–7, then 8.
