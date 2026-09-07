/** A project illustration suitable for a hero or an axis hub's plate. */
export interface HomeHeroImage {
  id: string;
  src: string;
  alt: string;
  credit: string;
  position: string;
  /**
   * Where the file itself lives, so a reader can check the plate against its
   * own record. Optional only because a caption without it is still honest;
   * every plate in the pool carries one.
   */
  sourceUri?: string;
  /**
   * The licence's own address, present exactly when the licence asks for a
   * notice.
   *
   * Brand charter §9: **a licence is published, not named.** CC BY-SA §4(a)
   * asks for "a copy of, or the Uniform Resource Identifier for, this
   * License", and the caption was printing the initials — a notice a reader
   * cannot reach is not a notice. Absent on a public-domain plate, which owes
   * none and is credited anyway.
   */
  licenceUri?: string;
}

/**
 * The existing home illustrations large enough to occupy the hero stage.
 *
 * Wilhelm Bleek's portrait is intentionally excluded: at 340 px wide it is
 * kept at vignette size elsewhere in the site, while this stage can reach
 * 620 px. Full provenance for every image lives beside the files in
 * public/images/home/CREDITS.md.
 */
// @req REQ-115
export const HOME_HERO_IMAGES: readonly HomeHeroImage[] = [
  {
    id: "al-idrisi-1154",
    src: "/images/home/al-idrisi-1154.jpg",
    alt: "Mappemonde d'al-Idrisi de 1154, orientée avec le sud en haut et l'Afrique dans sa moitié supérieure.",
    credit:
      "Al-Idrisi, mappemonde de la Tabula Rogeriana, 1154 — Wikimedia Commons, domaine public",
    position: "center",
    sourceUri:
      "https://commons.wikimedia.org/wiki/File:Al-Idrisi%27s_world_map.JPG",
  },
  {
    id: "guinea-ogilby-1670",
    src: "/images/home/guinea-ogilby-1670.jpg",
    alt: "Carte de la côte ouest-africaine publiée par John Ogilby en 1670, ornée d'un cartouche illustré.",
    credit: "John Ogilby, Guinea, 1670 — Wikimedia Commons, domaine public",
    position: "center",
    sourceUri:
      "https://commons.wikimedia.org/wiki/File:1670_Ogilby_Map_of_West_Africa_(_Gold_Coast,_Slave_Coast,_Ivory_Coast_)_-_Geographicus_-_Guinea-ogilby-1670.jpg",
  },
  {
    id: "tifinagh-algeria",
    src: "/images/home/tifinagh-algeria.jpg",
    alt: "Inscriptions tifinagh gravées dans la roche en Algérie.",
    credit:
      "Inscriptions tifinagh, Algérie — Patrick Gruban, Wikimedia Commons, CC BY-SA 2.0",
    position: "center",
    sourceUri: "https://commons.wikimedia.org/wiki/File:Tifinagh_Algeria.jpg",
    licenceUri: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
];

export type HomeHeroVisual =
  { kind: "globe" } | { kind: "image"; image: HomeHeroImage };

/**
 * Draw the homepage visual once per server request.
 *
 * The lower half of the draw is the globe. The upper half draws an image from
 * the existing project stock, giving each branch a 50/50 chance. The random
 * source is injectable so the boundary and every image stay deterministic
 * under test.
 */
// @req REQ-115
export function drawHomeHeroVisual(
  random: () => number = Math.random
): HomeHeroVisual {
  if (random() < 0.5) return { kind: "globe" };

  const imageIndex = Math.min(
    HOME_HERO_IMAGES.length - 1,
    Math.floor(random() * HOME_HERO_IMAGES.length)
  );
  return { kind: "image", image: HOME_HERO_IMAGES[imageIndex] };
}
