import type { CountryId } from "@/types/afrik";
import { getAdmin0Rings } from "@/lib/atlas/overlays";
import type { GameCountryFixture } from "@/lib/games/corpus";
import type { GlobeTapRound } from "@/lib/games/gameKinds";
import {
  assembleOptions,
  correctOptionIndex,
  selectDistractors,
} from "@/lib/games/options";

const GAME_ID = "pays-davant";

/**
 * Ordered by how much of the country's own history the name carries: a
 * precolonial name is the point of the game, a colonial one still teaches it,
 * and the older layers are the fallback. `contemporary` is excluded — it is
 * the present name, so it would give the answer away.
 */
const FORMER_NAME_KEYS = [
  "precolonial",
  "colonization",
  "middleAges",
  "antiquity",
] as const;

function firstFormerName(country: GameCountryFixture): string | null {
  const names = country.historicalNames;
  if (!names) return null;
  for (const key of FORMER_NAME_KEYS) {
    const value = names[key]?.trim();
    if (value) return value;
  }
  return null;
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * The corpus often states the name origin twice, once as etymology and once as
 * the actor who gave the name, in near-identical wording. Printing both would
 * read as a stutter, so the actor is appended only when neither text contains
 * the other.
 */
function buildRevealText(country: GameCountryFixture): string | null {
  const etymology = country.etymology?.trim() ?? "";
  const actor = country.nameOriginActor?.trim() ?? "";
  if (!etymology) return actor || null;
  if (!actor) return etymology;

  const a = normalise(etymology);
  const b = normalise(actor);
  if (a.includes(b) || b.includes(a)) return etymology;
  return `${etymology} ${actor}`;
}

/**
 * « Le pays d'avant » (REQ-120): a former name is quoted, the reader taps the
 * country that carries it today.
 */
// @req REQ-120
export function buildHistoricalNameRound(
  country: GameCountryFixture,
  otherCountries: GameCountryFixture[]
): GlobeTapRound | null {
  const formerNameFr = firstFormerName(country);
  if (!formerNameFr) return null;

  const revealFr = buildRevealText(country);
  if (!revealFr) return null;

  // A target the reader cannot see is not a choice: the answer and all three
  // distractors must exist in the committed 51-country admin-0 asset.
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

  return {
    kind: "globeTap",
    gameId: GAME_ID,
    subjectId: country.id,
    promptFr: `« ${formerNameFr} » : quel pays porte aujourd'hui ce nom d'avant ?`,
    choices,
    correctCountryId: country.id,
    reveal: {
      textFr: revealFr,
      fieldPath: "afrik_countries.etymology",
    },
  };
}
