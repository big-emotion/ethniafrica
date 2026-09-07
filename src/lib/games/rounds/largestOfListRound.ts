import type { GameOption, ListRound } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { frenchNumber } from "@/lib/games/format";
import { MINIMUM_AREA_RATIO } from "@/lib/games/rounds/mercatorRound";
import {
  isAfricanTerritory,
  territoryFootprint,
  type ComparedTerritory,
  type TerritoryFootprint,
} from "@/lib/games/territory";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";
import { getCountryRoute } from "@/lib/routing";
import {
  LARGEST_OF_LIST_ROUND_EN,
  largestOfListRevealEn,
} from "@/lib/games/rounds/largestOfListRound.en";

/**
 * « Lequel de ces pays couvre la plus grande surface ? », asked of four
 * (REQ-120).
 *
 * The pair round teaches a shortcut. Over a session of two-way choices a
 * reader learns « pick the one that is not northern » and answers every round
 * without once using the rule the page exists to teach — and half the time a
 * shrug is worth a point. Four options, three of them drawn at least as large
 * as the answer, cannot be won that way: every candidate is a trap the flat
 * map set, so ruling one out means ranking the exaggeration, which *is* the
 * rule.
 *
 * The candidates are not distractors in the corpus sense (games charter §3):
 * there is no near pool of names here, only a near pool of *drawn* sizes. The
 * plausibility rule that replaces it is stated in `qualifies` below, and it is
 * stricter — a distractor must be one the flat map actively misranks, not
 * merely one of comparable size.
 */

const GAME = getGameBySlug("mercator");

/** The same provenance the pair round records: the committed outlines. */
// @req REQ-120
export const LARGEST_OF_LIST_PROVENANCE_PATH = "lib/atlas/assets/africaAdmin0";

/**
 * Four, and it is a layout number as much as a design one.
 *
 * Three leaves a base rate of a third, which is close enough to the pair's
 * half that the round buys little. Five stops fitting above the fold at 430 px
 * once the stem takes two lines, and charter §9.1 says it is the stage that
 * gives way and never the options.
 */
// @req REQ-120
export const LIST_OPTION_COUNT = 4;

// @req REQ-120
export const LIST_PROMPT_FR =
  "Lequel de ces pays couvre la plus grande surface ?";

const frenchFactor = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Whether this candidate is a trap rather than padding.
 *
 * Two conditions, and both are load-bearing. It has to be truly smaller than
 * the answer by more than the outlines can misstate — otherwise the answer key
 * is a coin toss dressed as a fact, the same reason `MINIMUM_AREA_RATIO`
 * exists for the pair. And the flat map has to draw it at least as large as
 * the answer — otherwise a reader looking at a Mercator map rules it out
 * correctly and for the right reason, which makes it a candidate that does no
 * work.
 */
function qualifies(
  answer: TerritoryFootprint,
  candidate: TerritoryFootprint
): boolean {
  const trulySmaller =
    answer.trueAreaKm2 / candidate.trueAreaKm2 >= MINIMUM_AREA_RATIO;

  return trulySmaller && candidate.drawnAreaKm2 >= answer.drawnAreaKm2;
}

/**
 * The same rule, asked of two territories rather than two measurements, so a
 * caller can *select* candidates by exactly the criterion the builder will
 * then hold them to.
 *
 * One predicate rather than two: a handler that gathered candidates by its own
 * approximation and handed them here would get a null it could not explain,
 * and the round would silently vanish from the pool.
 */
// @req REQ-120
export function isMercatorTrapFor(
  answer: ComparedTerritory,
  candidate: ComparedTerritory
): boolean {
  const answerFootprint = territoryFootprint(answer);
  const candidateFootprint = territoryFootprint(candidate);
  if (!answerFootprint || !candidateFootprint) return false;

  return qualifies(answerFootprint, candidateFootprint);
}

/** « Pays : 2 344 858 km², que la projection agrandit 1,0 fois. » */
function areaSentence(
  territory: ComparedTerritory,
  footprint: TerritoryFootprint
): string {
  return `${territory.nameFr} : ${frenchNumber.format(Math.round(footprint.trueAreaKm2))} km², que la projection de Mercator agrandit ${frenchFactor.format(footprint.inflation)} fois.`;
}

/**
 * Where the answer sits, derived from its own id rather than shuffled.
 *
 * Charter §6: placement is deterministic, so a round is reproducible in a test
 * and the answer is not always in the same slot. Summing the id's characters
 * is the same trick `options.ts` uses for the quiz, and it spreads across the
 * four slots because country codes are three letters of unrelated frequency.
 */
function slotFor(subjectId: string): number {
  let sum = 0;
  for (let i = 0; i < subjectId.length; i++) sum += subjectId.charCodeAt(i);
  return sum % LIST_OPTION_COUNT;
}

const optionOf = (territory: ComparedTerritory): GameOption => ({
  labelFr: territory.nameFr,
  labelEn: territory.nameEn ?? territory.nameFr,
});

/**
 * The round, or null when the candidates cannot make an honest one.
 *
 * `answer` is the territory that truly covers the most ground; `candidates`
 * are the three the flat map sets against it. Returning null rather than
 * padding is FR65/FR66, and here it is load-bearing rather than defensive: a
 * padded candidate is one a reader eliminates by eye, which turns a four-way
 * round back into the three-way it was not supposed to be.
 */
// @req REQ-120
export function buildLargestOfListRound(
  answer: ComparedTerritory,
  candidates: ComparedTerritory[]
): ListRound | null {
  if (candidates.length !== LIST_OPTION_COUNT - 1) return null;

  const answerFootprint = territoryFootprint(answer);
  if (!answerFootprint) return null;

  const measured = candidates.map((candidate) => ({
    territory: candidate,
    footprint: territoryFootprint(candidate),
  }));
  if (measured.some((entry) => !entry.footprint)) return null;
  if (measured.some((entry) => !qualifies(answerFootprint, entry.footprint))) {
    return null;
  }

  const correctIndex = slotFor(answer.id);
  const ordered = [...measured.map((entry) => entry.territory)];
  ordered.splice(correctIndex, 0, answer);

  const footprintOf = new Map(
    measured.map((entry) => [entry.territory.id, entry.footprint])
  );
  footprintOf.set(answer.id, answerFootprint);

  const leadsTo = ordered.find(isAfricanTerritory) ?? null;

  return {
    kind: "list",
    template: "largest-of-list",
    gameId: GAME.id,
    subjectId: answer.id,
    comparedIds: ordered.map((territory) => territory.id),
    promptFr: LIST_PROMPT_FR,
    promptEn: LARGEST_OF_LIST_ROUND_EN.prompt,
    options: ordered.map(optionOf),
    correctIndex,
    reveal: {
      textFr: ordered
        .map((territory) =>
          areaSentence(territory, footprintOf.get(territory.id))
        )
        .join(" "),
      textEn: largestOfListRevealEn(
        ordered.map((territory) => ({
          nameEn: territory.nameEn ?? territory.nameFr,
          trueAreaKm2: footprintOf.get(territory.id).trueAreaKm2,
          inflation: footprintOf.get(territory.id).inflation,
        }))
      ),
      fieldPath: LARGEST_OF_LIST_PROVENANCE_PATH,
      // Measured off the committed outlines, never read from a fiche — the
      // corpus holds no area column. Same reasoning as the pair round.
      sources: [],
      confidence: null,
      ficheHref: leadsTo
        ? getCountryRoute("fr", leadsTo.id)
        : getAxisHubRoute("fr", "atlas"),
      ficheHrefEn: leadsTo
        ? getCountryRoute("en", leadsTo.id)
        : getAxisHubRoute("en", "atlas"),
    },
  };
}
