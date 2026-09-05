import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import {
  distanceFr,
  frenchNumber,
  inflationFr,
  millionsKm2Fr,
  ratioFr,
} from "@/lib/games/format";
import { LANDMARKS, LANDMARK_PROVENANCE_PATH } from "@/lib/games/landmarks";
import { greatCircleKm } from "@/lib/games/sphericalArea";
import {
  africaAreaKm2,
  shapeAreaKm2,
  shapeInflation,
} from "@/lib/games/shapeMeasure";
import { MERCATOR_PROVENANCE_PATH } from "@/lib/games/rounds/mercatorRound";

/**
 * The scale facts « La taille qu'on vous a cachée » states between its rounds
 * (REQ-120, games charter §1).
 *
 * **Every figure here is measured, never typed.** That is the one rule of this
 * module, and it is the reason it exists as code rather than as a bank of
 * strings: a number copied off a web page drifts away from the outlines the
 * globe draws, and the reader ends up shown one figure over a picture of
 * another. The brief that prompted this file offered « Kinshasa–Goma égale
 * Paris–Moscou »; measured, it is 1 580 against 2 490 km. A bank of typed
 * sentences would have shipped that.
 *
 * These are deliberately **not** added to `DID_YOU_KNOW_FACTS`. That bank's
 * own rule is that every fact in it is onomastic — about a name, who gave it
 * and what it hid — precisely so the band cannot drift into trivia. A
 * comparison of surfaces is trivia *there*. On this page it is the thesis, so
 * it lives with the game that argues it and travels no further.
 */
export interface ScaleFact {
  id: string;
  /** The claim, as one sentence the reader can carry away. */
  headlineFr: string;
  /** What the projection did to their intuition, in two or three sentences. */
  bodyFr: string;
  /** Where the figures were measured — worded for the reader by `revealProvenance`. */
  fieldPath: string;
}

/** The two assets every fact rests on. Asserted against by the bank's test. */
// @req REQ-120
export const SCALE_FACT_PROVENANCE_PATHS = [
  MERCATOR_PROVENANCE_PATH,
  LANDMARK_PROVENANCE_PATH,
] as const;

const worldArea = (id: string): number => shapeAreaKm2(WORLD_COMPARE[id].rings);
const worldInflation = (id: string): number =>
  shapeInflation(WORLD_COMPARE[id].rings);
const africanArea = (id: string): number =>
  shapeAreaKm2(AFRICA_ADMIN0[id].rings);
const africanInflation = (id: string): number =>
  shapeInflation(AFRICA_ADMIN0[id].rings);

const distanceKm = (fromId: string, toId: string): number =>
  greatCircleKm(LANDMARKS[fromId], LANDMARKS[toId]);

/**
 * Every figure the facts state, in either language. Areas in km², distances
 * in km, inflations as Mercator's factor over the true area.
 */
export interface ScaleFigures {
  africa: number;
  greenland: number;
  congo: number;
  westernEurope: number;
  usa: number;
  china: number;
  india: number;
  fourTogether: number;
  remainder: number;
  inflation: {
    greenland: number;
    usa: number;
    china: number;
    india: number;
    westernEurope: number;
    tunisia: number;
  };
  width: number;
  height: number;
  parisBeijing: number;
  parisNewYork: number;
  kinshasaGoma: number;
  parisWarsaw: number;
  cairoCapeTown: number;
}

/**
 * The measurements, taken once and worded twice: `scaleFacts.en.ts` states
 * the same facts in English, and two banks each measuring their own figures
 * could drift apart on a rounding without either test noticing.
 */
// @req REQ-120
export function measureScaleFigures(): ScaleFigures {
  const africa = africaAreaKm2();
  const westernEurope = worldArea("EUW");
  const usa = worldArea("USA");
  const china = worldArea("CHN");
  const india = worldArea("IND");
  const fourTogether = china + india + usa + westernEurope;

  return {
    africa,
    greenland: worldArea("GRL"),
    congo: africanArea("COD"),
    westernEurope,
    usa,
    china,
    india,
    fourTogether,
    remainder: africa - fourTogether,
    inflation: {
      greenland: worldInflation("GRL"),
      usa: worldInflation("USA"),
      china: worldInflation("CHN"),
      india: worldInflation("IND"),
      westernEurope: worldInflation("EUW"),
      tunisia: africanInflation("TUN"),
    },
    width: distanceKm("ALMADIES", "RAS_HAFUN"),
    height: distanceKm("BLANC", "AGULHAS"),
    parisBeijing: distanceKm("PARIS", "PEKIN"),
    parisNewYork: distanceKm("PARIS", "NEW_YORK"),
    kinshasaGoma: distanceKm("KINSHASA", "GOMA"),
    parisWarsaw: distanceKm("PARIS", "VARSOVIE"),
    cairoCapeTown: distanceKm("LE_CAIRE", "LE_CAP"),
  };
}

/**
 * The bank, measured once per process.
 *
 * The assets are static and the arithmetic runs over some twenty thousand
 * points, so recomputing it per request would be waste with no upside. It is
 * not memoised for correctness: calling `buildScaleFacts` twice must and does
 * yield the same sentences.
 */
let bank: ScaleFact[] | null = null;

// @req REQ-120
export function buildScaleFacts(): ScaleFact[] {
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

  bank = [
    {
      id: "afrique-groenland",
      headlineFr: `L'Afrique est ${ratioFr(africa / greenland)} fois plus grande que le Groenland.`,
      bodyFr: `L'Afrique couvre ${millionsKm2Fr(africa)}, le Groenland ${millionsKm2Fr(greenland)}. Sur la carte de Mercator apprise à l'école, le Groenland est dessiné ${inflationFr(inflation.greenland)} fois plus grand qu'il n'est : c'est pourquoi les deux vous semblaient comparables. Deux quatorze différents, et c'est ce qui rend l'illusion si complète.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "afrique-etats-unis",
      headlineFr: `Les États-Unis tiennent ${ratioFr(africa / usa)} fois dans l'Afrique.`,
      bodyFr: `${millionsKm2Fr(usa)} pour les États-Unis contigus, ${millionsKm2Fr(africa)} pour l'Afrique. Mercator dessine les États-Unis ${inflationFr(inflation.usa)} fois trop grands, et l'Afrique presque à sa taille exacte — l'écart que vous croyez voir est déjà corrigé de moitié avant que vous ayez compté.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "afrique-chine",
      headlineFr: `La Chine tient ${ratioFr(africa / china)} fois dans l'Afrique.`,
      bodyFr: `La Chine couvre ${millionsKm2Fr(china)} et Mercator l'agrandit ${inflationFr(inflation.china)} fois. L'Afrique, à cheval sur l'équateur, n'y gagne presque rien : la projection ne la rétrécit pas, elle grossit tout ce qui l'entoure.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "afrique-inde",
      headlineFr: `L'Inde tient ${ratioFr(africa / india)} fois dans l'Afrique.`,
      bodyFr: `${millionsKm2Fr(india)} contre ${millionsKm2Fr(africa)}. L'Inde est l'un des rares grands pays que Mercator traite presque honnêtement — ${inflationFr(inflation.india)} fois seulement — parce qu'elle est basse en latitude, comme l'Afrique.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "quatre-ensemble",
      headlineFr: `La Chine, l'Inde, les États-Unis et l'Europe de l'Ouest tiennent ensemble dans l'Afrique, et il reste ${millionsKm2Fr(remainder)}.`,
      bodyFr: `À eux quatre ils font ${millionsKm2Fr(fourTogether)}. L'Afrique en fait ${millionsKm2Fr(africa)} : dans ce qui reste, on poserait encore ${frenchNumber.format(Math.round(remainder / congo))} fois la République démocratique du Congo.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "congo-europe",
      headlineFr: `La République démocratique du Congo dépasse l'Europe de l'Ouest de ${frenchNumber.format(Math.round((congo - westernEurope) / 1000) * 1000)} km².`,
      bodyFr: `${frenchNumber.format(Math.round(congo))} km² contre ${frenchNumber.format(Math.round(westernEurope))} km². Sur une carte plate l'Europe de l'Ouest est dessinée ${inflationFr(inflation.westernEurope)} fois trop grande et le Congo à sa taille exacte — la comparaison que vous avez en tête a été faussée deux fois, pas une.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "tunisie-groenland",
      headlineFr: `Le pays africain le plus déformé par Mercator est agrandi ${inflationFr(inflation.tunisia)} fois. Le Groenland, ${inflationFr(inflation.greenland)}.`,
      bodyFr: `C'est la Tunisie, le pays le plus au nord du continent, et c'est le maximum que la projection inflige à l'Afrique. Partout ailleurs sur le continent elle fait moins. La déformation n'est pas répartie sur la carte : elle est concentrée au-dessus de l'Afrique, et c'est de là que vient l'impression.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "largeur-afrique",
      headlineFr: `D'une pointe à l'autre, l'Afrique mesure ${distanceFr(width)}.`,
      bodyFr: `De la pointe des Almadies, au Sénégal, au cap Hafun, en Somalie. Paris–Pékin fait ${distanceFr(parisBeijing)} : à peine ${distanceFr(parisBeijing - width)} de plus. Traverser l'Afrique d'ouest en est, c'est traverser l'Eurasie.`,
      fieldPath: LANDMARK_PROVENANCE_PATH,
    },
    {
      id: "hauteur-afrique",
      headlineFr: `L'Afrique est plus haute que large : ${distanceFr(height)} du nord au sud.`,
      bodyFr: `Du cap Blanc, en Tunisie, au cap des Aiguilles, en Afrique du Sud. C'est ${distanceFr(height - width)} de plus que sa largeur, et ${distanceFr(height - parisNewYork)} de plus qu'une traversée de l'Atlantique nord. Sur une carte de Mercator cette hauteur ne se voit pas : près de l'équateur un centimètre de carte vaut bien plus de kilomètres qu'un centimètre tracé près du cercle polaire.`,
      fieldPath: LANDMARK_PROVENANCE_PATH,
    },
    {
      id: "caire-le-cap",
      headlineFr: `Du Caire au Cap il y a ${distanceFr(cairoCapeTown)} : plus loin que de Paris à New York.`,
      bodyFr: `La traversée de l'Atlantique nord n'en fait que ${distanceFr(parisNewYork)}. Rester en Afrique et aller d'un bout à l'autre, c'est faire davantage de route que de franchir l'Atlantique — et personne ne décrit la traversée de l'Atlantique comme un déplacement intérieur.`,
      fieldPath: LANDMARK_PROVENANCE_PATH,
    },
    {
      id: "kinshasa-goma",
      headlineFr: `Kinshasa–Goma fait ${distanceFr(kinshasaGoma)}, sans quitter un seul pays.`,
      bodyFr: `Paris–Varsovie en fait ${distanceFr(parisWarsaw)}, et l'on traverse quatre pays pour les parcourir. La République démocratique du Congo est plus large que l'Europe centrale, et les deux villes ont la même monnaie, le même drapeau et le même gouvernement.`,
      fieldPath: LANDMARK_PROVENANCE_PATH,
    },
  ];

  return bank;
}

/**
 * Draw `count` distinct facts, deterministically.
 *
 * The seed comes from the page for the same reason a round's does: a clock
 * read during render is impure and desynchronises the server tree from the
 * client one.
 *
 * A rotation rather than a shuffle. A stride would spread the draw across the
 * bank, but only while the stride and the bank size stay coprime — add a
 * twelfth fact to a stride of three and the draw silently starts repeating
 * one fact instead of showing three. A rotation cannot develop that fault,
 * and with a bank this small nobody sees the ordering twice anyway.
 */
// @req REQ-120
export function pickScaleFacts(count: number, seed: number): ScaleFact[] {
  const facts = buildScaleFacts();
  const start = Math.abs(Math.trunc(seed)) % facts.length;
  const rotated = [...facts.slice(start), ...facts.slice(0, start)];

  return rotated.slice(0, Math.min(count, facts.length));
}
