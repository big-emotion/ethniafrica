import type { GamePeopleFixture } from "@/lib/games/corpus";
import type { BinaryRound, GameOption } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";

/**
 * « Plus ou moins ? » — which of two peoples is the more numerous (REQ-120).
 *
 * The only game with no distractor pool: both options are real peoples, so
 * there is nothing to fabricate and FR65/FR66 hold by construction. The one
 * way it can lie is by asking a question the corpus cannot answer, which is
 * why a missing or tied population voids the round instead of rounding it.
 */

const GAME = getGameBySlug("plus-ou-moins");

const frenchNumber = new Intl.NumberFormat("fr-FR");

const isCountedPopulation = (population: number | null): boolean =>
  typeof population === "number" && population > 0;

const toOption = (people: GamePeopleFixture): GameOption => ({
  labelFr: people.nameMain,
  name: people.name,
});

// @req REQ-120
export function buildMagnitudeRound(
  a: GamePeopleFixture,
  b: GamePeopleFixture
): BinaryRound | null {
  if (!isCountedPopulation(a.totalPopulation)) return null;
  if (!isCountedPopulation(b.totalPopulation)) return null;
  if (a.totalPopulation === b.totalPopulation) return null;

  const correctIndex: 0 | 1 = a.totalPopulation > b.totalPopulation ? 0 : 1;

  return {
    kind: "binary",
    gameId: GAME.id,
    subjectId: a.id,
    promptFr: GAME.promptFr,
    options: [toOption(a), toOption(b)],
    correctIndex,
    // The one composed reveal in the module: it reports two stored numbers
    // from two different fiches, so there is no single corpus sentence to
    // quote. Every figure in it is verbatim; only the sentence is ours.
    reveal: {
      textFr: `${a.nameMain} : ${frenchNumber.format(a.totalPopulation)} personnes. ${b.nameMain} : ${frenchNumber.format(b.totalPopulation)} personnes.`,
      fieldPath: "content.demography.totalPopulation",
    },
  };
}
