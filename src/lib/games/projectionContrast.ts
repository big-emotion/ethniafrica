import {
  getAdmin0NameFr,
  getAdmin0Rings,
  getWorldCompareNameFr,
  getWorldCompareRings,
  ringCentroid,
} from "@/lib/atlas/overlays";
import {
  projectEqualAreaAbout,
  type EqualAreaPoint,
} from "@/lib/atlas/equalAreaProjection";
import { mercatorInflation, ringArea } from "@/lib/games/sphericalArea";
import { MINIMUM_AREA_RATIO } from "@/lib/games/rounds/mercatorRound";
import type { CountryId } from "@/types/afrik";
import type { Ring } from "@/lib/atlas/overlays";

/**
 * The counter-fact the Jouer hub opens on (REQ-114/REQ-120).
 *
 * The hub used to state a bargain — "you bring nothing, you leave with a
 * result" — which advertised the score, the one thing the games charter §7
 * says is the pretext rather than the product. It also made Jouer the only
 * one of the three axis scenes built from copy instead of corpus: Explorer
 * draws the real continent, Comprendre lists real questions bound to real
 * module availability, and Jouer had a slogan.
 *
 * So the scene now states something the reader already believes and shows it
 * false, which is what the axis actually does to them. Every figure below is
 * measured off the committed admin-0 outlines at read time; nothing here is
 * a number an editor could type.
 */

/**
 * Which two shapes the scene argues with.
 *
 * Asymmetric on purpose: the inflated shape is a `WORLD_COMPARE` key (`EUW`
 * is an aggregate and has no country code), the understated one an ISO 3166-1
 * alpha-3 from the African asset. The pair is an editorial choice — the
 * strongest available example — while its *direction* is measured, so the
 * page cannot end up asserting the opposite of what the geometry holds.
 */
export interface ContrastPair {
  inflatedId: string;
  understatedId: CountryId;
  /**
   * Short forms for the legend, where the asset's own name would wrap to
   * three lines at 430px.
   */
  inflatedLabelFr: string;
  understatedLabelFr: string;
  /**
   * The same names carrying their French article, for the sentences.
   *
   * Stored rather than derived: "le Groenland" and "la RD Congo" take
   * different articles, and no rule recovers which from the asset's name.
   * Lowercase, because the scene's CSS raises the first letter where a
   * sentence starts — a stored capital would be wrong mid-sentence.
   */
  inflatedArticledFr: string;
  understatedArticledFr: string;
}

export interface ContrastShape {
  nameFr: string;
  /** The short form the legend labels this shape with. */
  labelFr: string;
  /** The same name with its article, lowercase, for use in a sentence. */
  articledFr: string;
  trueAreaKm2: number;
  /** Area as Mercator draws it — the reader's mistaken impression, measured. */
  drawnAreaKm2: number;
  inflation: number;
  /** Silhouette in equal-area kilometres, both shapes on one shared scale. */
  outline: EqualAreaPoint[][];
}

export interface ProjectionContrast {
  /** Drawn larger than it is. What the map tells the reader. */
  inflated: ContrastShape;
  /** Drawn smaller than it is, and really the larger of the two. */
  understated: ContrastShape;
  /** How much larger the understated shape really is, in percent. */
  trueAdvantagePercent: number;
}

/**
 * Greenland against the DR Congo: the canonical Mercator lie, and the one
 * whose correction lands on this atlas's own subject. Europe and the United
 * States are also in the asset and would state the same thing less sharply.
 */
// @req REQ-120
export const MERCATOR_CONTRAST_PAIR: ContrastPair = {
  inflatedId: "GRL",
  understatedId: "COD",
  inflatedLabelFr: "Groenland",
  understatedLabelFr: "RD Congo",
  inflatedArticledFr: "le Groenland",
  understatedArticledFr: "la RD Congo",
};

/** The mainland: the ring carrying the most points, islands set aside. */
function largestRing(rings: Ring[]): Ring {
  return rings.reduce((largest, ring) =>
    ring.length > largest.length ? ring : largest
  );
}

function measure(
  rings: Ring[],
  nameFr: string,
  labelFr: string,
  articledFr: string
): ContrastShape {
  const mainland = largestRing(rings);
  const trueAreaKm2 = rings.reduce((total, ring) => total + ringArea(ring), 0);
  // Inflation is read on the mainland alone, as the mercator round reads it:
  // a distant island would drag the centroid to a latitude the country is
  // not mostly at.
  const inflation = mercatorInflation(mainland);
  // Every ring is projected about the *mainland's* centre, never its own, or
  // the islands would each be recentred onto the mainland and the country
  // would lose its real arrangement.
  const centre = ringCentroid(mainland);

  return {
    nameFr,
    labelFr,
    articledFr,
    trueAreaKm2,
    drawnAreaKm2: trueAreaKm2 * inflation,
    inflation,
    outline: rings.map((ring) => projectEqualAreaAbout(ring, centre)),
  };
}

/**
 * Measures the pair, or returns null when it no longer makes the point.
 *
 * Null is not a defensive habit here. The scene asserts that the map reverses
 * an order, so if a regenerated asset ever stopped reversing it, printing the
 * sentence anyway would make the hub state something false about its own
 * data. The caller renders no claim rather than a stale one.
 */
// @req REQ-114 @req REQ-120
export function buildProjectionContrast(
  pair: ContrastPair = MERCATOR_CONTRAST_PAIR
): ProjectionContrast | null {
  const inflatedRings = getWorldCompareRings(pair.inflatedId);
  const inflatedName = getWorldCompareNameFr(pair.inflatedId);
  const understatedRings = getAdmin0Rings(pair.understatedId);
  const understatedName = getAdmin0NameFr(pair.understatedId);

  if (!inflatedRings?.length || !inflatedName) return null;
  if (!understatedRings?.length || !understatedName) return null;

  const inflated = measure(
    inflatedRings,
    inflatedName,
    pair.inflatedLabelFr,
    pair.inflatedArticledFr
  );
  const understated = measure(
    understatedRings,
    understatedName,
    pair.understatedLabelFr,
    pair.understatedArticledFr
  );

  // The map has to get the order backwards, and the real gap has to clear
  // the threshold the mercator round uses to refuse a coin-toss question.
  const reversedByTheMap =
    inflated.drawnAreaKm2 > understated.drawnAreaKm2 &&
    understated.trueAreaKm2 > inflated.trueAreaKm2;
  const gapIsReadable =
    understated.trueAreaKm2 / inflated.trueAreaKm2 >= MINIMUM_AREA_RATIO;

  if (!reversedByTheMap || !gapIsReadable) return null;

  return {
    inflated,
    understated,
    trueAdvantagePercent:
      (understated.trueAreaKm2 / inflated.trueAreaKm2 - 1) * 100,
  };
}

/** One shape, placed and ready to stroke. */
export interface PlacedSilhouette {
  labelFr: string;
  pathD: string;
}

export interface ContrastSilhouettes {
  viewBox: string;
  inflated: PlacedSilhouette;
  understated: PlacedSilhouette;
}

/**
 * Gap between the two shapes, as a share of the wider one.
 *
 * A share rather than a fixed distance because the coordinate system is
 * kilometres: 200 km of white space would read as generous between two
 * countries and as nothing between two continents.
 */
const SILHOUETTE_GAP_RATIO = 0.18;

function boundsOf(outline: EqualAreaPoint[][]) {
  const points = outline.flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Lays the two silhouettes out side by side for the scene's SVG.
 *
 * The one thing this may never do is scale either shape to fit: the drawing
 * *is* the argument, so both are placed at the single kilometre scale the
 * equal-area projection already put them on, and the viewBox is grown around
 * them instead. That is why there is no per-shape scale factor anywhere below
 * — its absence is the guarantee, and `projectionContrast.test.ts` measures
 * the emitted paths to hold it.
 *
 * Coordinates are kilometres throughout, y flipped because SVG counts down
 * and the projection counts north.
 */
// @req REQ-114 @req REQ-120
export function layoutContrastSilhouettes(
  contrast: ProjectionContrast
): ContrastSilhouettes {
  const left = boundsOf(contrast.inflated.outline);
  const right = boundsOf(contrast.understated.outline);

  const leftWidth = left.maxX - left.minX;
  const rightWidth = right.maxX - right.minX;
  const leftHeight = left.maxY - left.minY;
  const rightHeight = right.maxY - right.minY;

  const gap = Math.max(leftWidth, rightWidth) * SILHOUETTE_GAP_RATIO;
  const tallest = Math.max(leftHeight, rightHeight);

  // Each shape is shifted, never resized: translation preserves area, so the
  // ratio the reader sees stays the ratio the sphere measures.
  const place = (
    shape: ContrastShape,
    bounds: ReturnType<typeof boundsOf>,
    offsetX: number
  ): PlacedSilhouette => {
    const height = bounds.maxY - bounds.minY;
    // Bottom-aligned on the shared baseline, so neither shape appears to
    // float above the other for reasons the data does not support.
    const offsetY = tallest - height;

    const pathD = shape.outline
      .map((ring) => {
        const commands = ring.map((point, index) => {
          const x = point.x - bounds.minX + offsetX;
          // Flip y: north is up on screen, down in SVG coordinates.
          const y = bounds.maxY - point.y + offsetY;
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        });
        return `${commands.join(" ")}Z`;
      })
      .join(" ");

    return { labelFr: shape.labelFr, pathD };
  };

  return {
    viewBox: `0 0 ${(leftWidth + gap + rightWidth).toFixed(1)} ${tallest.toFixed(1)}`,
    inflated: place(contrast.inflated, left, 0),
    understated: place(contrast.understated, right, leftWidth + gap),
  };
}
