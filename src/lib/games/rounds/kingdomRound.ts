import type { CountryId } from "@/types/afrik";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import type { GameCountryFixture } from "@/lib/games/corpus";
import type { GlobeTapRound } from "@/lib/games/gameKinds";
import {
  assembleOptions,
  correctOptionIndex,
  selectDistractors,
} from "@/lib/games/options";

const GAME_ID = "royaumes";

/**
 * « Royaumes perdus » (REQ-120): a historical kingdom is named, the reader taps
 * the present-day country it stood on.
 *
 * The 281 kingdoms of the corpus are spread unevenly over the 54 country
 * fiches, so the one played is picked deterministically from the country id
 * rather than at random: the same country always yields the same round, which
 * keeps the generator pure and its tests meaningful.
 */
// @req REQ-120
export function buildKingdomRound(
  country: GameCountryFixture,
  otherCountries: GameCountryFixture[]
): GlobeTapRound | null {
  const kingdoms = country.kingdoms;
  if (!kingdoms || kingdoms.length === 0) return null;

  const kingdom =
    kingdoms[correctOptionIndex(country.id, GAME_ID) % kingdoms.length];
  const historicalRoleFr = kingdom.historicalRole?.trim();
  // No reveal, no round: a tap the corpus cannot explain teaches nothing.
  if (!historicalRoleFr) return null;

  if (!getAdmin0Rings(country.id)) return null;
  const drawablePool = otherCountries
    .filter((candidate) => getAdmin0Rings(candidate.id))
    .map((candidate) => candidate.id);

  const distractors = selectDistractors(country.id, drawablePool);
  if (!distractors) return null;

  const choices: CountryId[] = assembleOptions(
    country.id,
    distractors,
    correctOptionIndex(country.id, GAME_ID)
  );

  const periodFr = kingdom.period?.trim() ? ` (${kingdom.period.trim()})` : "";

  return {
    kind: "globeTap",
    gameId: GAME_ID,
    subjectId: country.id,
    promptFr: `${kingdom.name}${periodFr} : sur quel pays d'aujourd'hui ce royaume s'étendait-il ?`,
    choices,
    correctCountryId: country.id,
    reveal: {
      textFr: historicalRoleFr,
      fieldPath: "content.kingdoms[].historicalRole",
    },
  };
}
