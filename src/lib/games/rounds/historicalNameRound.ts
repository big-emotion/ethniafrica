import type { CountryId } from "@/types/afrik";
import {
  getAdmin0Rings,
  ringCentroid,
  type LonLat,
  type Ring,
} from "@/lib/atlas/overlays";
import type { GameCountryFixture } from "@/lib/games/corpus";
import type { GlobeTapRound } from "@/lib/games/gameKinds";
import {
  assembleOptions,
  correctOptionIndex,
  selectDistractors,
} from "@/lib/games/options";
import { getCountryRoute } from "@/lib/routing";

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

/** A country's position, taken from the largest ring of its committed outline. */
function centroidOf(rings: Ring[]): LonLat {
  return ringCentroid(
    rings.reduce((widest, ring) =>
      ring.length > widest.length ? ring : widest
    )
  );
}

/**
 * Squared degrees, with longitude narrowed by latitude. Good enough to rank
 * neighbours and cheaper than a great-circle distance — nothing here needs a
 * distance in kilometres, only an order.
 */
function proximity(a: LonLat, b: LonLat): number {
  const meanLatRad = (((a.lat + b.lat) / 2) * Math.PI) / 180;
  const dLon = (a.lon - b.lon) * Math.cos(meanLatRad);
  const dLat = a.lat - b.lat;
  return dLon * dLon + dLat * dLat;
}

/**
 * Orders the pool from the subject outwards, so `selectDistractors` — which
 * takes the first three it is given — offers neighbours instead of whatever
 * the corpus listed first.
 *
 * The sort lives here rather than inside `selectDistractors`: that helper
 * receives flattened values and could not know a candidate's geography, and
 * it is shared with the quiz templates, which must keep their current
 * behaviour until their questions are regenerated.
 */
function nearestFirst(
  subject: LonLat,
  pool: { id: CountryId; center: LonLat }[]
): CountryId[] {
  return [...pool]
    .sort((a, b) => proximity(subject, a.center) - proximity(subject, b.center))
    .map((entry) => entry.id);
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
  const subjectRings = getAdmin0Rings(country.id);
  if (!subjectRings) return null;

  const drawablePool = otherCountries.flatMap((candidate) => {
    const rings = getAdmin0Rings(candidate.id);
    return rings ? [{ id: candidate.id, center: centroidOf(rings) }] : [];
  });

  const distractors = selectDistractors(
    country.id,
    nearestFirst(centroidOf(subjectRings), drawablePool)
  );
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
      sources: country.sources,
      confidence: country.confidence,
      ficheHref: getCountryRoute("fr", country.id),
    },
  };
}
