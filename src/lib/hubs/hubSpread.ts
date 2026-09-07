import {
  HOME_HERO_IMAGES,
  type HomeHeroImage,
} from "@/lib/home/homeHeroVisuals";

/**
 * Which side of the spread the text takes on this request.
 *
 * Named for what is painted first rather than for a side, because the DOM
 * order is fixed — text, then plate, in both draws (brand charter §8.6). Only
 * the painting swaps, so a reader on a keyboard meets the tiles first whatever
 * the die said.
 */
export type SpreadOrientation = "text-first" | "plate-first";

/**
 * How many tiles a text column needs before the spread may take a viewport
 * floor (brand charter §8.2, §8.6).
 *
 * The floor is licensed by a count, and the count is the condition. Measured
 * on 7 September 2026: atlas draws 6 tiles, dossiers 4 and **jeux 2** — so the
 * Jouer hub is the one axis this threshold withholds it from, which is the
 * whole reason the threshold is a number and not a `true`. A title, a sentence
 * and two 44px rows in a screen-tall band is the 135px-in-760px arithmetic
 * ETNI-1555 deleted the retired hubs over, reproduced on a third page.
 *
 * It is a floor, never a ceiling: an axis below it still lays out in two
 * columns, and simply stops at its content's height.
 */
// @req REQ-114
export const TILES_EARNING_A_FLOOR = 4;

export interface HubSpread {
  orientation: SpreadOrientation;
  plate: HomeHeroImage;
}

/**
 * Draw an axis hub's spread once per server request.
 *
 * The first roll takes the sides, evenly. The second takes the plate from the
 * home's own archive pool — the same four registers, already sourced, dated
 * and credited (brand charter §9), so a hub costs no new asset and inherits
 * the imagery doctrine rather than restating it.
 *
 * The globe is deliberately not in the draw. The home offers it half the time
 * because the home is about the continent; a hub is about its own tiles, and a
 * WebGL stage beside seven of them would be the loudest object on the page
 * arguing for a module none of them is.
 *
 * The random source is injectable so a contract test can assert a layout
 * rather than sample one, which is the same device `drawHomeHeroVisual` uses.
 */
// @req REQ-114
export function drawHubSpread(random: () => number = Math.random): HubSpread {
  const orientation: SpreadOrientation =
    random() < 0.5 ? "text-first" : "plate-first";

  const plateIndex = Math.min(
    HOME_HERO_IMAGES.length - 1,
    Math.floor(random() * HOME_HERO_IMAGES.length)
  );

  return { orientation, plate: HOME_HERO_IMAGES[plateIndex] };
}
