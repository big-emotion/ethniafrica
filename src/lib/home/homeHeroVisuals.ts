/** A project illustration suitable for the homepage's opening visual. */
export interface HomeHeroImage {
  id: string;
  src: string;
  alt: string;
  credit: string;
  position: string;
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
export const HOME_HERO_IMAGES = [
  {
    id: "al-idrisi-1154",
    src: "/images/home/al-idrisi-1154.jpg",
    alt: "Mappemonde d'al-Idrisi de 1154, orientée avec le sud en haut et l'Afrique dans sa moitié supérieure.",
    credit:
      "Al-Idrisi, mappemonde de la Tabula Rogeriana, 1154 — Wikimedia Commons, domaine public",
    position: "center",
  },
  {
    id: "guinea-ogilby-1670",
    src: "/images/home/guinea-ogilby-1670.jpg",
    alt: "Carte de la côte ouest-africaine publiée par John Ogilby en 1670, ornée d'un cartouche illustré.",
    credit: "John Ogilby, Guinea, 1670 — Wikimedia Commons, domaine public",
    position: "center",
  },
  {
    id: "tifinagh-algeria",
    src: "/images/home/tifinagh-algeria.jpg",
    alt: "Inscriptions tifinagh gravées dans la roche en Algérie.",
    credit:
      "Inscriptions tifinagh, Algérie — Patrick Gruban, Wikimedia Commons, CC BY-SA 2.0",
    position: "center",
  },
] as const satisfies readonly HomeHeroImage[];

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
