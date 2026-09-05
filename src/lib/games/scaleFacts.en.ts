import {
  distanceEn,
  englishNumber,
  inflationEn,
  millionsKm2En,
  ratioEn,
} from "@/lib/games/format.en";
import { LANDMARK_PROVENANCE_PATH } from "@/lib/games/landmarks";
import { MERCATOR_PROVENANCE_PATH } from "@/lib/games/rounds/mercatorRound";
import { measureScaleFigures } from "@/lib/games/scaleFacts";
import type { TranslationKind } from "@/lib/i18n/translationSidecarRules";

/**
 * The scale facts in English — the sidecar of `scaleFacts.ts`, keyed by the
 * French fact's id (REQ-145).
 *
 * The one rule of the French bank holds here: every figure is measured,
 * never typed. Both banks read `measureScaleFigures()`, so an English fact
 * cannot state a number the French one does not, and `scaleFactsEn.test.ts`
 * holds the two to the same figures in the same order.
 *
 * What does change is the far end of each comparison: Pékin is Beijing, Le
 * Caire is Cairo, and « la République démocratique du Congo » keeps its
 * full English name because the fact is about a country, not a shape.
 *
 * Agent-authored under DEC-048, hence `machine` on every fact.
 */
export interface ScaleFactEn {
  headlineEn: string;
  bodyEn: string;
  /** The same provenance path as the French fact; `revealProvenanceEn` words it. */
  fieldPath: string;
  provenance: Extract<TranslationKind, "machine">;
}

let bank: Record<string, ScaleFactEn> | null = null;

// @req REQ-145
export function buildScaleFactsEn(): Record<string, ScaleFactEn> {
  if (bank) return bank;

  const {
    africa,
    greenland,
    congo,
    westernEurope,
    usa,
    china,
    india,
    fourTogether,
    remainder,
    inflation,
    width,
    height,
    parisBeijing,
    parisNewYork,
    kinshasaGoma,
    parisWarsaw,
    cairoCapeTown,
  } = measureScaleFigures();

  const measured = (
    headlineEn: string,
    bodyEn: string,
    fieldPath: string
  ): ScaleFactEn => ({ headlineEn, bodyEn, fieldPath, provenance: "machine" });

  bank = {
    "afrique-groenland": measured(
      `Africa is ${ratioEn(africa / greenland)} times larger than Greenland.`,
      `Africa covers ${millionsKm2En(africa)}, Greenland ${millionsKm2En(greenland)}. On the Mercator map learnt at school, Greenland is drawn ${inflationEn(inflation.greenland)} times larger than it is: that is why the two seemed comparable to you. Two different fourteens, and that is what makes the illusion so complete.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "afrique-etats-unis": measured(
      `The United States fits ${ratioEn(africa / usa)} times into Africa.`,
      `${millionsKm2En(usa)} for the contiguous United States, ${millionsKm2En(africa)} for Africa. Mercator draws the United States ${inflationEn(inflation.usa)} times too large, and Africa almost at its exact size — the gap you believe you see is already half corrected before you have counted.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "afrique-chine": measured(
      `China fits ${ratioEn(africa / china)} times into Africa.`,
      `China covers ${millionsKm2En(china)} and Mercator enlarges it ${inflationEn(inflation.china)} times. Africa, astride the equator, gains almost nothing from it: the projection does not shrink Africa, it enlarges everything around it.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "afrique-inde": measured(
      `India fits ${ratioEn(africa / india)} times into Africa.`,
      `${millionsKm2En(india)} against ${millionsKm2En(africa)}. India is one of the few large countries Mercator treats almost honestly — only ${inflationEn(inflation.india)} times — because it lies at a low latitude, like Africa.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "quatre-ensemble": measured(
      `China, India, the United States and Western Europe fit together inside Africa, with ${millionsKm2En(remainder)} to spare.`,
      `Between the four of them they make ${millionsKm2En(fourTogether)}. Africa makes ${millionsKm2En(africa)}: in what is left, one could still lay down the Democratic Republic of the Congo ${englishNumber.format(Math.round(remainder / congo))} times.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "congo-europe": measured(
      `The Democratic Republic of the Congo exceeds Western Europe by ${englishNumber.format(Math.round((congo - westernEurope) / 1000) * 1000)} km².`,
      `${englishNumber.format(Math.round(congo))} km² against ${englishNumber.format(Math.round(westernEurope))} km². On a flat map Western Europe is drawn ${inflationEn(inflation.westernEurope)} times too large and the Congo at its exact size — the comparison you have in mind has been distorted twice, not once.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "tunisie-groenland": measured(
      `The African country Mercator distorts most is enlarged ${inflationEn(inflation.tunisia)} times. Greenland, ${inflationEn(inflation.greenland)}.`,
      `That country is Tunisia, the northernmost on the continent, and this is the most the projection inflicts on Africa. Everywhere else on the continent it does less. The distortion is not spread across the map: it is concentrated above Africa, and that is where the impression comes from.`,
      MERCATOR_PROVENANCE_PATH
    ),
    "largeur-afrique": measured(
      `From one tip to the other, Africa measures ${distanceEn(width)}.`,
      `From the Pointe des Almadies, in Senegal, to Cape Hafun, in Somalia. Paris–Beijing is ${distanceEn(parisBeijing)}: barely ${distanceEn(parisBeijing - width)} more. To cross Africa from west to east is to cross Eurasia.`,
      LANDMARK_PROVENANCE_PATH
    ),
    "hauteur-afrique": measured(
      `Africa is taller than it is wide: ${distanceEn(height)} from north to south.`,
      `From Cape Blanc, in Tunisia, to Cape Agulhas, in South Africa. That is ${distanceEn(height - width)} more than its width, and ${distanceEn(height - parisNewYork)} more than a crossing of the North Atlantic. On a Mercator map this height cannot be seen: near the equator one centimetre of map is worth far more kilometres than one centimetre drawn near the polar circle.`,
      LANDMARK_PROVENANCE_PATH
    ),
    "caire-le-cap": measured(
      `From Cairo to Cape Town is ${distanceEn(cairoCapeTown)}: further than from Paris to New York.`,
      `The crossing of the North Atlantic is only ${distanceEn(parisNewYork)}. To stay in Africa and go from one end to the other is to cover more ground than crossing the Atlantic — and nobody describes crossing the Atlantic as a domestic journey.`,
      LANDMARK_PROVENANCE_PATH
    ),
    "kinshasa-goma": measured(
      `Kinshasa–Goma is ${distanceEn(kinshasaGoma)}, without leaving a single country.`,
      `Paris–Warsaw is ${distanceEn(parisWarsaw)}, and one crosses four countries to travel it. The Democratic Republic of the Congo is wider than Central Europe, and the two cities have the same currency, the same flag and the same government.`,
      LANDMARK_PROVENANCE_PATH
    ),
  };

  return bank;
}
