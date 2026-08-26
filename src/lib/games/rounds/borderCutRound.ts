import type { GamePeopleFixture } from "@/lib/games/corpus";
import type { GameOption, QuadRound } from "@/lib/games/gameKinds";

const GAME_ID = "frontieres";

/**
 * A measurement scale, not corpus values: these four buckets are the shape of
 * the question itself, so offering them fabricates nothing and FR65/FR66 is
 * satisfied even though only one of them is read from a fiche.
 */
const COUNT_BUCKETS_FR = ["1", "2", "3", "4 ou plus"] as const;

/**
 * « La ligne qui coupe » (REQ-120): how many present-day countries a people is
 * split across — the colonial border made visible as a number.
 *
 * The count comes from the top-level `currentCountries`, the field the
 * afrik_people_countries join table follows, not from the demography
 * distribution, which lists a different set of countries in several fiches.
 */
// @req REQ-120
export function buildBorderCutRound(
  people: GamePeopleFixture,
  countryNames: Record<string, string> = {}
): QuadRound | null {
  const countries = people.currentCountries;
  if (!countries || countries.length === 0) return null;

  // The fixture stores ISO codes. A reveal that says « NGA, NER, TCD » asks
  // the reader to decode the answer, so the caller may supply real names;
  // an unmapped code still prints, rather than vanishing from the count.
  const named = countries.map((id) => countryNames[id] ?? id);

  // Deviation from the other quad games: the buckets are an ordered scale, so
  // correctOptionIndex must not shuffle them. The answer's position is the
  // bucket it falls in, and the last bucket absorbs everything above three.
  const correctIndex = Math.min(countries.length, COUNT_BUCKETS_FR.length) - 1;
  const options = COUNT_BUCKETS_FR.map(
    (labelFr): GameOption => ({ labelFr })
  ) as [GameOption, GameOption, GameOption, GameOption];

  const spanFr =
    countries.length === 1
      ? `Les ${people.nameMain} vivent aujourd'hui dans un seul pays : ${named[0]}.`
      : `Les ${people.nameMain} sont aujourd'hui répartis entre ${countries.length} pays : ${named.join(", ")}.`;

  return {
    kind: "quad",
    gameId: GAME_ID,
    subjectId: people.id,
    promptFr: `Entre combien de pays les ${people.nameMain} sont-ils aujourd'hui répartis ?`,
    options,
    correctIndex,
    reveal: {
      textFr: spanFr,
      fieldPath: "currentCountries",
    },
  };
}
