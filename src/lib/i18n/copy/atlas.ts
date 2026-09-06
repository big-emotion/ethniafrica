import type { Language } from "@/types/shared";

const en = {
  surface: {
    autoRotating: "Atlas globe. Interact with the globe to stop the rotation.",
    globe: "Atlas globe. Drag or use the arrow keys to rotate.",
    flatMap: "Atlas map. Drag or use the arrow keys to move.",
  },
  projectionNames: {
    globe: "Globe",
    flatMap: "Flat map",
    intermediate: "Intermediate projection",
  },
  projectionReadout: {
    globe:
      "Globe — each indicatrix returns to its true area. Africa covers 30.4 million km².",
    flatMap:
      "Flat map — Mercator inflates areas by sec²(latitude): ×4 at 60°, ×9 at 70°.",
    intermediate:
      "Folding in progress — watch the indicatrices return to the same size.",
  },
  gesture: {
    rotate: "Drag to rotate",
    move: "Drag to move",
    autoRotating: "Interact with the globe to stop the rotation.",
    rotateShort: "Drag to rotate.",
    moveShort: "Drag to move.",
  },
  legendStart: "Africa at its true area.",
  openCountry: "press a point to open the country.",
  flatMap: "Flat map",
  globe: "Globe",
  morphLabel: "Morph from flat map to globe",
  returnToGlobe: "Return to the globe",
  showFlatMap: "What the flat map does to it",
  indicatrices: "Indicatrices",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  recentreAfrica: "Recentre on Africa",
  recentre: "Recentre",
  wholeArea: "The whole footprint",
  areaNoun: "the footprint",
  close: "Close",
  chooseCountry: (areaNoun: string) => `Choose a country in ${areaNoun}`,
  countries: (areaNoun: string) => `Countries in ${areaNoun}`,
};

type AtlasCopy = typeof en;

const fr: AtlasCopy = {
  surface: {
    autoRotating:
      "Globe de l'atlas. Interagissez avec le globe pour arrêter la rotation.",
    globe: "Globe de l'atlas. Glissez ou utilisez les flèches pour tourner.",
    flatMap: "Carte de l'atlas. Glissez ou utilisez les flèches pour déplacer.",
  },
  projectionNames: {
    globe: "Globe",
    flatMap: "Carte plate",
    intermediate: "Projection intermédiaire",
  },
  projectionReadout: {
    globe:
      "Globe — chaque pastille retrouve sa surface réelle. L'Afrique fait 30,4 M km².",
    flatMap:
      "Carte plate — Mercator gonfle les surfaces de sec²(latitude) : ×4 à 60°, ×9 à 70°.",
    intermediate:
      "En cours de repli — regardez les pastilles reprendre la même taille.",
  },
  gesture: {
    rotate: "Glissez pour tourner",
    move: "Glissez pour déplacer",
    autoRotating: "Interagissez avec le globe pour arrêter la rotation.",
    rotateShort: "Glissez pour tourner.",
    moveShort: "Glissez pour déplacer.",
  },
  legendStart: "Afrique à sa surface réelle.",
  openCountry: "appuyez sur un point pour ouvrir le pays.",
  flatMap: "Carte plate",
  globe: "Globe",
  morphLabel: "Morphing de la carte plate vers le globe",
  returnToGlobe: "Revenir au globe",
  showFlatMap: "Ce que la carte plate en fait",
  indicatrices: "Pastilles",
  zoomOut: "Dézoomer",
  zoomIn: "Zoomer",
  recentreAfrica: "Recentrer sur l’Afrique",
  recentre: "Recentrer",
  wholeArea: "Toute l'empreinte",
  areaNoun: "l'empreinte",
  close: "Fermer",
  chooseCountry: (areaNoun: string) => `Choisir un pays de ${areaNoun}`,
  countries: (areaNoun: string) => `Pays de ${areaNoun}`,
};

// @req REQ-145
export const atlasCopy: Record<Language, AtlasCopy> = { en, fr };
