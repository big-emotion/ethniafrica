import type { GamePeopleFixture } from "@/lib/games/corpus";
import { frenchNumber } from "@/lib/games/format";
import type { BinaryRound, GameStimulus } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { correctOptionIndex, isSameOptionValue } from "@/lib/games/options";
import { getPeopleRoute } from "@/lib/routing";

/**
 * « Eux, ou les autres ? » — the name a people gives itself against a name it
 * was given (REQ-120).
 *
 * Both options are read verbatim from the fiche and so is the reveal: the
 * point of the game is that the exonym has a documented origin, and a
 * composed sentence would put the site's voice where the corpus should be.
 */

const GAME = getGameBySlug("appellations");

const hasText = (value: string | null): boolean =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Composed rather than quoted, unlike everything else this generator emits.
 * That is allowed because it states no claim the corpus does not already
 * hold: it rounds a figure and says so with « environ ». The reveal, which
 * *is* a claim, stays verbatim.
 */
function scaleSentence(totalPopulation: number | null): string | undefined {
  if (typeof totalPopulation !== "number" || !Number.isFinite(totalPopulation))
    return undefined;
  return `environ ${frenchNumber.format(totalPopulation)} personnes`;
}

/**
 * Situates the people before the question is asked (charter §2). Without it
 * the round offers two names and never says whose they are, which leaves the
 * reader nothing to reason from.
 */
function buildStimulus(
  people: GamePeopleFixture,
  countryNamesFr: Record<string, string>
): GameStimulus {
  return {
    familyFr: people.languageFamilyNameFr,
    // An id the corpus cannot name is dropped: "CMR" on screen is worse than
    // one country fewer.
    countriesFr: people.currentCountries.flatMap((id) =>
      countryNamesFr[id] ? [countryNamesFr[id]] : []
    ),
    subjectName: people.name,
    scaleFr: scaleSentence(people.totalPopulation),
  };
}

// @req REQ-120
export function buildAppellationsRound(
  people: GamePeopleFixture,
  countryNamesFr: Record<string, string>
): BinaryRound | null {
  const selfAppellation = people.selfAppellation;
  const exonym = people.exonyms[0];

  if (!hasText(selfAppellation) || !hasText(exonym)) return null;
  if (isSameOptionValue(selfAppellation, exonym)) return null;
  if (!hasText(people.originOfExonyms)) return null;

  // Two options, so the four-slot helper is folded down to a side. Without
  // this every round would answer left and the game would be a reflex test.
  const correctIndex = (correctOptionIndex(people.id, GAME.id) % 2) as 0 | 1;

  const options: [{ labelFr: string }, { labelFr: string }] = [
    { labelFr: correctIndex === 0 ? selfAppellation : exonym },
    { labelFr: correctIndex === 0 ? exonym : selfAppellation },
  ];

  return {
    kind: "binary",
    gameId: GAME.id,
    subjectId: people.id,
    stimulus: buildStimulus(people, countryNamesFr),
    promptFr: GAME.promptFr,
    options,
    correctIndex,
    reveal: {
      textFr: people.originOfExonyms,
      fieldPath: "content.appellations.originOfExonyms",
      sources: people.sources,
      confidence: people.confidence,
      ficheHref: getPeopleRoute("fr", people.id),
    },
  };
}
