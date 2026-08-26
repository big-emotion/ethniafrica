import type {
  GamePeopleFixture,
  GameRelationFixture,
} from "@/lib/games/corpus";
import { RELATION_TYPE_LABEL_FR } from "@/lib/games/corpus";
import type { GameOption, QuadRound } from "@/lib/games/gameKinds";
import {
  assembleOptions,
  correctOptionIndex,
  selectDistractors,
} from "@/lib/games/options";

const GAME_ID = "liens";

/**
 * « Les liens invisibles » (REQ-120): one people and the kind of link are
 * named, the reader answers with the people at the other end.
 *
 * The module plan proposed the `relation_type` values themselves as the four
 * options. That enum holds three values — migratory, commercial, religious —
 * so a fourth option could only be invented, which FR65/FR66 forbid. The
 * answerable axis is therefore the second people, and its distractors are
 * other real peoples read verbatim from the pool.
 */
// @req REQ-120
export function buildRelationRound(
  relation: GameRelationFixture,
  peopleById: Map<string, GamePeopleFixture>,
  peoplePool: GamePeopleFixture[]
): QuadRound | null {
  const linkedFrom = peopleById.get(relation.peopleIdA);
  const linkedTo = peopleById.get(relation.peopleIdB);
  if (!linkedFrom || !linkedTo) return null;

  const candidates = peoplePool.filter(
    (candidate) =>
      candidate.id !== linkedFrom.id && candidate.id !== linkedTo.id
  );
  const distractors = selectDistractors(
    linkedTo.nameMain,
    candidates.map((candidate) => candidate.nameMain)
  );
  if (!distractors) return null;

  // Options travel as labels through assembleOptions, but GameOption also
  // carries the autonym pair so the caller can render AutonymExonymHeading.
  const peopleByLabel = new Map<string, GamePeopleFixture>();
  for (const candidate of [linkedTo, ...candidates]) {
    if (!peopleByLabel.has(candidate.nameMain)) {
      peopleByLabel.set(candidate.nameMain, candidate);
    }
  }

  const correctIndex = correctOptionIndex(relation.id, GAME_ID);
  const options = assembleOptions(
    linkedTo.nameMain,
    distractors,
    correctIndex
  ).map(
    (labelFr): GameOption => ({
      labelFr,
      name: peopleByLabel.get(labelFr)?.name,
    })
  );

  const linkLabelFr = RELATION_TYPE_LABEL_FR[relation.relationType];
  const periodFr = relation.periodLabel ? ` (${relation.periodLabel})` : "";

  return {
    kind: "quad",
    gameId: GAME_ID,
    subjectId: relation.id,
    promptFr: `Un lien ${linkLabelFr}${periodFr} relie les ${linkedFrom.nameMain} à quel autre peuple ?`,
    options: options as [GameOption, GameOption, GameOption, GameOption],
    correctIndex,
    reveal: {
      textFr: relation.description,
      fieldPath: "afrik_people_relations.description",
    },
  };
}
