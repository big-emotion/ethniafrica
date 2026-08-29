# Games rollout plan — from eleven approximate games to three finished ones

> **Partly superseded, 2026-08-29.** The hub was cut again, from three games to
> two surfaces: the quiz and `mercator` (games charter §1). Every phase below
> that names `appellations` or `pays-davant` describes work on a retired game
> and is now history rather than a plan — kept because it records the defects
> those games carried, which is what a rebuild would have to answer for. The
> phases about `mercator` and about the engine still stand.

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

**Then.** Add a near-pool selector beside `selectDistractors` in `options.ts`
rather than changing it — four retired generators still import it and will
want it back unchanged when they return. For countries the near pool is
geographic proximity; `GameCountryFixture` does not carry a region, so use
the admin-0 centroid already available through `getAdmin0Rings` and take the
nearest drawable neighbours.

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

**Test first.** A session of eight rounds is ordered by ascending difficulty
band, and rounds 1–2 come from the top population decile of the scoped pool.

**Then.** Add `difficultyBand` to `GameRound`, derived from
`GamePeopleFixture.totalPopulation` (or country area for `mercator`). Order
the session in the handler. Record in the code comment that population is a
**proxy for familiarity** and is meant to be replaced by an empirical p-value
once one exists — otherwise the next reader will take it for a claim about
importance.

---

## Phase 6 — Scoping, and the charter corrections

**Test first.** `/fr/jouer/appellations?pays=GHA` draws only peoples present
in Ghana; `?famille=FLG_...` only that family's; neither filter yields fewer
rounds than it can honestly fill.

**Then.** Reuse `QuizSegmentPicker` rather than building a second picker. Apply
the two charter corrections from the top of this document to
`games-charter.md` §2 and §10 in the same commit, so the contract and the code
stop disagreeing.

---

## Phase 7 — The reveal earns the session

**Test first.** The reveal renders the source tier through `ConfidenceChip`
and links to the subject's fiche.

**Then.** Carry the source tier on `GameReveal` and render it. A round resting
on an `unverified` source is played _and_ visibly marked, exactly as a fiche
is.

---

## Order and stopping points

**Phases 0–4 make the three games honest.** That is a shippable release on its
own, and the natural place to stop and look at the result before committing to
more.

**Phases 5–7 make them worth replaying.** Scoping (6) is what multiplies three
games into hundreds of sessions, so it is the one to keep if the budget for
this second half shrinks.

Nothing in phases 0–4 requires a new Supabase query, a migration, or a corpus
edit. Everything they need is already loaded by `GamePeopleFixture` and
`GameCountryFixture`.
