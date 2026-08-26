import type { CountryId } from "@/types/afrik";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import type {
  GameMigrationFixture,
  GamePeopleFixture,
} from "@/lib/games/corpus";
import type { GlobeTapRound } from "@/lib/games/gameKinds";
import {
  assembleOptions,
  correctOptionIndex,
  selectDistractors,
} from "@/lib/games/options";

const GAME_ID = "migrations";

/** `peoples[].role` is free text at MVP; the corpus writes "destination". */
const DESTINATION_ROLE = "destination";

/**
 * « Le fil des migrations » (REQ-120): a movement is named, the reader taps
 * where it led.
 *
 * The destination is read from the people the event declares as arriving, not
 * from `migration.geometry`. The geometry is a bare LineString or Polygon of
 * [lon, lat] pairs with no country attribution, so testing its last vertex
 * against a border would attribute the arrival by guesswork and present the
 * guess as corpus fact — exactly what FR65/FR66 forbid.
 */
// @req REQ-120
export function buildMigrationRound(
  migration: GameMigrationFixture,
  peopleById: Map<string, GamePeopleFixture>,
  countryPool: CountryId[]
): GlobeTapRound | null {
  const arrivalCountryId = findDrawableArrival(migration, peopleById);
  if (!arrivalCountryId) return null;

  const drawablePool = countryPool.filter((candidate) =>
    getAdmin0Rings(candidate)
  );

  const distractors = selectDistractors(arrivalCountryId, drawablePool);
  if (!distractors) return null;

  const choices: CountryId[] = assembleOptions(
    arrivalCountryId,
    distractors,
    correctOptionIndex(migration.id, GAME_ID)
  );

  return {
    kind: "globeTap",
    gameId: GAME_ID,
    subjectId: migration.id,
    promptFr: `${migration.name} : où ce mouvement a-t-il mené ?`,
    choices,
    correctCountryId: arrivalCountryId,
    reveal: {
      textFr: migration.summary,
      fieldPath: "migration_events.summary",
    },
  };
}

/**
 * First country of a declared destination people that the admin-0 asset can
 * draw. Several events name more than one arriving people, so the search walks
 * them in corpus order instead of failing on the first unmappable one.
 */
function findDrawableArrival(
  migration: GameMigrationFixture,
  peopleById: Map<string, GamePeopleFixture>
): CountryId | null {
  for (const involved of migration.peoples) {
    if (involved.role?.trim().toLowerCase() !== DESTINATION_ROLE) continue;
    const people = peopleById.get(involved.id);
    if (!people) continue;
    const drawable = people.currentCountries.find((countryId) =>
      getAdmin0Rings(countryId)
    );
    if (drawable) return drawable;
  }
  return null;
}
