import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import type { EstimateRound } from "@/lib/games/gameKinds";
import { getGameBySlug } from "@/lib/games/gameRegistry";
import { inflationFr, millionsKm2Fr, ratioFr } from "@/lib/games/format";
import {
  africaAreaKm2,
  shapeAreaKm2,
  shapeInflation,
} from "@/lib/games/shapeMeasure";
import { getAxisHubRoute } from "@/lib/hubs/axisRoutes";

/**
 * « De combien vous êtes-vous trompé ? » — how many times a familiar
 * non-African shape fits inside Africa (REQ-120, games charter §1).
 *
 * This round exists because the binary one cannot reach the lesson. Measured
 * across the fifty-eight African outlines, Mercator's inflation runs from
 * 1.00 to 1.46: inside Africa the projection barely lies, so a « which of
 * these two is bigger » round can only ever offer near-ties, and it does —
 * the pairs it serves differ by 2 % to 25 %. The lie is between Africa and
 * the north, where Greenland is drawn at fourteen times itself.
 *
 * A binary choice still could not carry that. The reader does not believe
 * Greenland outranks Africa; they believe the gap is small. That is a
 * magnitude error, and right-or-wrong has no way to record one. A slider
 * does: the answer is a number, the reader commits to it, and the reveal can
 * state the distance between what they thought and what is.
 *
 * The comparison shapes are the six committed in `worldCompare` — an asset
 * built for the retired « Vraie taille » and unread by any game since.
 */

const GAME = getGameBySlug("mercator");

/** The provenance this round records: the non-African outlines it measured. */
// @req REQ-120
export const WORLD_COMPARE_PROVENANCE_PATH = "lib/atlas/assets/worldCompare";

/**
 * The track. One to twenty in half-steps, which is thirty-nine positions —
 * enough that landing on the answer is a judgement rather than a shrug, few
 * enough that a thumb can cross it in one drag at 430 px.
 */
const SLIDER_MIN = 1;
const SLIDER_MAX = 20;
const SLIDER_STEP = 0.5;

/**
 * How far off still counts, as a share of the answer. Twenty percent is
 * generous on purpose: the round is not a quiz on figures, it is a check on
 * an intuition, and a reader who says « about ten » to an answer of fourteen
 * has understood the thing this page teaches. What it will not accept is the
 * ends of the track, which is what an unconsidered answer looks like.
 */
const TOLERANCE_RATIO = 0.2;

/**
 * The article and the agreement each shape needs, written out.
 *
 * French will not let a stem be assembled from a bare name: « Combien de fois
 * Chine tient dans l'Afrique » is not a sentence, and the verb agrees with a
 * plural « les États-Unis ». Interpolating `nameFr` alone would produce one
 * ungrammatical stem in six, which is the sort of defect that survives review
 * because five of the six read fine.
 */
interface EstimateSubject {
  subjectFr: string;
  /** « tient-il » / « tient-elle » / « tiennent-ils ». */
  fitsFr: string;
}

const SUBJECT_BY_SHAPE: Record<string, EstimateSubject> = {
  BRA: { subjectFr: "le Brésil", fitsFr: "tient-il" },
  CHN: { subjectFr: "la Chine", fitsFr: "tient-elle" },
  EUW: { subjectFr: "l'Europe de l'Ouest", fitsFr: "tient-elle" },
  GRL: { subjectFr: "le Groenland", fitsFr: "tient-il" },
  IND: { subjectFr: "l'Inde", fitsFr: "tient-elle" },
  USA: { subjectFr: "les États-Unis contigus", fitsFr: "tiennent-ils" },
};

/**
 * Which comparisons the game makes, in the order it makes them: the two
 * shapes a French reader is most likely to hold a wrong picture of come
 * first, and Greenland — the one the whole page is about — last.
 *
 * Declared rather than derived from `worldCompare`, because this is an
 * editorial choice about what is worth asking, not an inventory of an asset.
 */
// @req REQ-120
export const ESTIMATE_SHAPE_IDS = [
  "USA",
  "CHN",
  "BRA",
  "IND",
  "EUW",
  "GRL",
] as const;

// @req REQ-120
export function buildScaleEstimateRound(shapeId: string): EstimateRound | null {
  const shape = WORLD_COMPARE[shapeId];
  const subject = SUBJECT_BY_SHAPE[shapeId];
  if (!shape || !subject) return null;

  const shapeArea = shapeAreaKm2(shape.rings);
  if (shapeArea <= 0) return null;

  const africa = africaAreaKm2();
  const ratio = africa / shapeArea;

  // FR65/FR66: a round the track cannot express is not generated. Padding the
  // slider to reach an outlier would make every other round harder to read.
  if (ratio < SLIDER_MIN || ratio > SLIDER_MAX) return null;

  const inflation = shapeInflation(shape.rings);

  return {
    kind: "estimate",
    gameId: GAME.id,
    subjectId: shapeId,
    promptFr: `Combien de fois ${subject.subjectFr} ${subject.fitsFr} dans l'Afrique ?`,
    subjectFr: subject.subjectFr,
    unitFr: "fois",
    min: SLIDER_MIN,
    max: SLIDER_MAX,
    step: SLIDER_STEP,
    correctValue: ratio,
    toleranceRatio: TOLERANCE_RATIO,
    reveal: {
      textFr: `${ratioFr(ratio)} fois. ${shape.nameFr} couvre ${millionsKm2Fr(shapeArea)}, l'Afrique ${millionsKm2Fr(africa)}. Sur une carte plate la projection l'agrandit ${inflationFr(inflation)} fois — c'est de là que vient l'écart avec votre estimation.`,
      fieldPath: WORLD_COMPARE_PROVENANCE_PATH,
      // Measured off the committed outlines, like every Mercator round. No
      // fiche is credited because none was read: the corpus holds no area
      // column, and it holds nothing at all about Greenland.
      sources: [],
      confidence: null,
      // Charter §7 asks a reveal to lead somewhere. A non-African shape has no
      // fiche to lead to, so the way in is the atlas itself — which is also
      // the honest destination, the round being about the continent rather
      // than about the shape it is measured against.
      ficheHref: getAxisHubRoute("fr", "atlas"),
    },
  };
}

/** Every comparison the game can make, in declared order. */
// @req REQ-120
export function buildScaleEstimateRounds(): EstimateRound[] {
  return ESTIMATE_SHAPE_IDS.map((shapeId) =>
    buildScaleEstimateRound(shapeId)
  ).filter((round): round is EstimateRound => round !== null);
}
