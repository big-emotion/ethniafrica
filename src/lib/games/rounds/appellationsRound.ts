import type { GamePeopleFixture } from "@/lib/games/corpus";
import type { BinaryRound } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { correctOptionIndex, isSameOptionValue } from "@/lib/games/options";

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

// @req REQ-120
export function buildAppellationsRound(
  people: GamePeopleFixture
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
    promptFr: GAME.promptFr,
    options,
    correctIndex,
    reveal: {
      textFr: people.originOfExonyms,
      fieldPath: "content.appellations.originOfExonyms",
    },
  };
}
