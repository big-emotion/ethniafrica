import type { GameFamilyFixture, GamePeopleFixture } from "@/lib/games/corpus";
import type { GameOption, QuadRound } from "@/lib/games/gameKinds";
import {
  assembleOptions,
  correctOptionIndex,
  selectDistractors,
} from "@/lib/games/options";

const GAME_ID = "familles";

/**
 * « Range-le dans sa famille » (REQ-120): which linguistic family a people
 * belongs to. The 24 families of the corpus are the whole option space, so
 * every wrong answer is a family that really exists.
 */
// @req REQ-120
export function buildFamilyRound(
  people: GamePeopleFixture,
  families: GameFamilyFixture[]
): QuadRound | null {
  const familyNameFr = people.languageFamilyNameFr;
  if (!familyNameFr) return null;

  // selectDistractors excludes anything equal to the correct answer, so a
  // family sharing the people's name is filtered by value rather than by id —
  // which also covers the fiches whose languageFamilyId is null.
  const distractors = selectDistractors(
    familyNameFr,
    families.map((family) => family.nameFr)
  );
  if (!distractors) return null;

  const correctIndex = correctOptionIndex(people.id, GAME_ID);
  const options = assembleOptions(familyNameFr, distractors, correctIndex).map(
    (labelFr): GameOption => ({ labelFr })
  );

  return {
    kind: "quad",
    gameId: GAME_ID,
    subjectId: people.id,
    promptFr: `À quelle famille linguistique les ${people.nameMain} appartiennent-ils ?`,
    options: options as [GameOption, GameOption, GameOption, GameOption],
    correctIndex,
    reveal: {
      // Two verbatim corpus values joined by a sentence; neither is rewritten.
      textFr: `Les ${people.nameMain} appartiennent à la famille linguistique ${familyNameFr}.`,
      fieldPath: "afrik_peoples.language_family_id",
    },
  };
}
