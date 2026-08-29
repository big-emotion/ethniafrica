import { AFRICA_ADMIN0 } from "@/lib/atlas/assets/africaAdmin0";
import { WORLD_COMPARE } from "@/lib/atlas/assets/worldCompare";
import type { Ring } from "@/lib/atlas/overlays";
import { frenchNumber } from "@/lib/games/format";
import { LANDMARKS, LANDMARK_PROVENANCE_PATH } from "@/lib/games/landmarks";
import {
  greatCircleKm,
  mercatorInflation,
  ringArea,
} from "@/lib/games/sphericalArea";
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

const toRings = (rawRings: readonly (readonly [number, number])[][]): Ring[] =>
  rawRings.map((ring) => ring.map(([lon, lat]) => ({ lon, lat })));

const areaOf = (rawRings: readonly (readonly [number, number])[][]): number =>
  toRings(rawRings).reduce((total, ring) => total + ringArea(ring), 0);

/**
 * Inflation is read on the mainland alone, as `mercatorRound` reads it: a
 * distant island would drag the centroid to a latitude the shape is not
 * mostly at, and the factor is a statement about where a shape sits.
 */
const inflationOf = (
  rawRings: readonly (readonly [number, number])[][]
): number =>
  mercatorInflation(
    toRings(rawRings).reduce((largest, ring) =>
      ring.length > largest.length ? ring : largest
    )
  );

const worldArea = (id: string): number => areaOf(WORLD_COMPARE[id].rings);
const worldInflation = (id: string): number =>
  inflationOf(WORLD_COMPARE[id].rings);
const africanArea = (id: string): number => areaOf(AFRICA_ADMIN0[id].rings);
const africanInflation = (id: string): number =>
  inflationOf(AFRICA_ADMIN0[id].rings);

const africaArea = (): number =>
  Object.values(AFRICA_ADMIN0).reduce(
    (total, country) => total + areaOf(country.rings),
    0
  );

const distanceKm = (fromId: string, toId: string): number =>
  greatCircleKm(LANDMARKS[fromId], LANDMARKS[toId]);

const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * A ratio the reader is meant to remember, not to reuse. Past ten the decimal
 * is noise — « quatorze fois » is the fact, « 14,0 fois » is a measurement —
 * and below ten it is the difference between 3,2 and 3,8.
 */
function ratioFr(ratio: number): string {
  return ratio >= 10
    ? frenchNumber.format(Math.round(ratio))
    : oneDecimal.format(ratio);
}

/**
 * An inflation factor keeps its decimal at every magnitude, unlike `ratioFr`.
 * It is a measurement of what the projection did, and the Greenland fact
 * turns on the difference between the two: Africa is fourteen times Greenland
 * and Greenland is drawn at 14,3 times itself. Rounded alike, the sentence
 * that sets them against each other reads as a tautology.
 */
function inflationFr(factor: number): string {
  return oneDecimal.format(factor);
}

/** « 30,1 millions de km² ». */
function millionsKm2Fr(areaKm2: number): string {
  return `${oneDecimal.format(areaKm2 / 1_000_000)} millions de km²`;
}

/** Stated to the nearest ten kilometres — see `landmarks` on why not finer. */
function distanceFr(km: number): string {
  return `${frenchNumber.format(Math.round(km / 10) * 10)} km`;
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

  const africa = africaArea();
  const greenland = worldArea("GRL");
  const congo = africanArea("COD");
  const westernEurope = worldArea("EUW");

  const fourTogether =
    worldArea("CHN") + worldArea("IND") + worldArea("USA") + westernEurope;
  const remainder = africa - fourTogether;

  const width = distanceKm("ALMADIES", "RAS_HAFUN");
  const height = distanceKm("BLANC", "AGULHAS");
  const parisBeijing = distanceKm("PARIS", "PEKIN");
  const parisNewYork = distanceKm("PARIS", "NEW_YORK");
  const kinshasaGoma = distanceKm("KINSHASA", "GOMA");
  const parisWarsaw = distanceKm("PARIS", "VARSOVIE");
  const cairoCapeTown = distanceKm("LE_CAIRE", "LE_CAP");

  bank = [
    {
      id: "afrique-groenland",
      headlineFr: `L'Afrique est ${ratioFr(africa / greenland)} fois plus grande que le Groenland.`,
      bodyFr: `L'Afrique couvre ${millionsKm2Fr(africa)}, le Groenland ${millionsKm2Fr(greenland)}. Sur la carte de Mercator apprise à l'école, le Groenland est dessiné ${inflationFr(worldInflation("GRL"))} fois plus grand qu'il n'est : c'est pourquoi les deux vous semblaient comparables. Deux quatorze différents, et c'est ce qui rend l'illusion si complète.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "afrique-etats-unis",
      headlineFr: `Les États-Unis tiennent ${ratioFr(africa / worldArea("USA"))} fois dans l'Afrique.`,
      bodyFr: `${millionsKm2Fr(worldArea("USA"))} pour les États-Unis contigus, ${millionsKm2Fr(africa)} pour l'Afrique. Mercator dessine les États-Unis ${inflationFr(worldInflation("USA"))} fois trop grands, et l'Afrique presque à sa taille exacte — l'écart que vous croyez voir est déjà corrigé de moitié avant que vous ayez compté.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "afrique-chine",
      headlineFr: `La Chine tient ${ratioFr(africa / worldArea("CHN"))} fois dans l'Afrique.`,
      bodyFr: `La Chine couvre ${millionsKm2Fr(worldArea("CHN"))} et Mercator l'agrandit ${inflationFr(worldInflation("CHN"))} fois. L'Afrique, à cheval sur l'équateur, n'y gagne presque rien : la projection ne la rétrécit pas, elle grossit tout ce qui l'entoure.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "afrique-inde",
      headlineFr: `L'Inde tient ${ratioFr(africa / worldArea("IND"))} fois dans l'Afrique.`,
      bodyFr: `${millionsKm2Fr(worldArea("IND"))} contre ${millionsKm2Fr(africa)}. L'Inde est l'un des rares grands pays que Mercator traite presque honnêtement — ${inflationFr(worldInflation("IND"))} fois seulement — parce qu'elle est basse en latitude, comme l'Afrique.`,
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
      bodyFr: `${frenchNumber.format(Math.round(congo))} km² contre ${frenchNumber.format(Math.round(westernEurope))} km². Sur une carte plate l'Europe de l'Ouest est dessinée ${inflationFr(worldInflation("EUW"))} fois trop grande et le Congo à sa taille exacte — la comparaison que vous avez en tête a été faussée deux fois, pas une.`,
      fieldPath: MERCATOR_PROVENANCE_PATH,
    },
    {
      id: "tunisie-groenland",
      headlineFr: `Le pays africain le plus déformé par Mercator est agrandi ${inflationFr(africanInflation("TUN"))} fois. Le Groenland, ${inflationFr(worldInflation("GRL"))}.`,
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
