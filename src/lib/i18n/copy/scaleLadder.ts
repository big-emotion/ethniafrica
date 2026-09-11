import type { Language } from "@/types/shared";

/**
 * The scale ladder — six rungs, from the border to the species.
 *
 * **Why a ladder and not a number.** The project's shortest claim is that the
 * names are older than the borders, and the series states it as "the borders
 * are a hundred and forty years old, the names are a thousand". A reader
 * objected, rightly, that a thousand undersells a continent that carries
 * Kerma, Kush, pharaonic Egypt and the oldest known members of the species.
 *
 * Inflating the name figure was the wrong answer: the atlas stores no
 * attestation date at all — a name is linked to a country and a source, never
 * to a year — so a larger number would be a claim it cannot check. Three
 * different ages were also being folded into one: the age of a human
 * presence, the age of a state, and the age of a written name. A reader who
 * separates them dismantles the fused version in one sentence.
 *
 * **The image carries the argument; there is no caption set over a blank.**
 * Each rung is a cut through earth, and the band of pale fresh paper at the
 * top shrinks as the rung goes deeper: nine tenths of the frame on the
 * border, a thread of light on the species. Scrolling the six is descending
 * through them. The first version set the sentence in large type on an empty
 * ground, which made a poster rather than something anyone would put on their
 * phone.
 *
 * **Provenance is per rung, not per ladder.** `inAtlas` is false for two of
 * the six, and the surface says so rather than letting a sourced neighbour
 * vouch for them. Same doctrine as the source policy: nothing is forbidden,
 * everything is labelled.
 */
export interface LadderRung {
  /** Stable id, also the image's filename stem. */
  id: string;
  /** The order of magnitude, which is the headline. Never a false precision. */
  magnitude: string;
  /** What the rung dates, in three words or fewer. */
  subject: string;
  /** The dated, checkable sentence the magnitude rests on. */
  anchor: string;
  /** Where a reader verifies it. */
  provenance: string;
  /**
   * Whether the atlas itself carries the anchor. False means the surface
   * shows it as an outside fact, never as something the atlas established.
   */
  inAtlas: boolean;
}

export interface ScaleLadderCopy {
  stepLabel: string;
  title: string;
  intro: string;
  /** The one line that tells a visitor what to do with the page. */
  instruction: string;
  rungs: LadderRung[];
  /** The sentence the whole ladder exists to make unavoidable. */
  reframe: string;
}

// @req REQ-132
// @req REQ-145
export const scaleLadder: Record<Language, ScaleLadderCopy> = {
  en: {
    stepLabel: "01 · The scale",
    title: "Six images, and the border is the youngest",
    intro: "Six wallpapers for your phone. Each one carries a date.",
    instruction: "Scroll down. The further you go, the older it gets.",
    rungs: [
      {
        id: "border",
        magnitude: "140 years",
        subject: "The border",
        anchor:
          "The Berlin conference opens in 1884. Most African countries become independent in 1960.",
        provenance: "An established historical fact.",
        inAtlas: false,
      },
      {
        id: "kongo",
        magnitude: "700 years",
        subject: "The Kongo kingdom",
        anchor: "Founded around 1350. Two countries still carry its name.",
        provenance: "Angola, Congo, Democratic Republic of the Congo.",
        inAtlas: true,
      },
      {
        id: "mali",
        magnitude: "800 years",
        subject: "The Mali empire",
        anchor:
          "From the thirteenth century to the sixteenth. Five countries keep its trace.",
        provenance: "Mali, Guinea, Guinea-Bissau, Gambia, Côte d’Ivoire.",
        inAtlas: true,
      },
      {
        id: "sanghana",
        magnitude: "1,000 years",
        subject: "A written name",
        anchor:
          "Al-Bakri writes the name Sanghana in the eleventh century. Five hundred years before the first European maps.",
        provenance: "Senegal, and four peoples.",
        inAtlas: true,
      },
      {
        id: "kemet",
        magnitude: "4,700 years",
        subject: "Ancient Egypt",
        anchor: "The Old Kingdom begins in 2686 before our era.",
        provenance: "Egypt.",
        inAtlas: true,
      },
      {
        id: "sapiens",
        magnitude: "300,000 years",
        subject: "Homo sapiens",
        anchor:
          "The oldest bones of our species were found at Jebel Irhoud, in Morocco. Published in Nature in 2017.",
        provenance: "Published, peer-reviewed research.",
        inAtlas: false,
      },
    ],
    reframe: "On this scale, the border is the most recent thing there is.",
  },
  fr: {
    stepLabel: "01 · L’échelle",
    title: "Six images, et la frontière est la plus jeune",
    intro: "Six fonds d’écran pour votre téléphone. Chacun porte une date.",
    instruction: "Descendez. Plus on descend, plus c’est vieux.",
    rungs: [
      {
        id: "border",
        magnitude: "140 ans",
        subject: "La frontière",
        anchor:
          "La conférence de Berlin s’ouvre en 1884. La plupart des pays africains deviennent indépendants en 1960.",
        provenance: "Un fait historique établi.",
        inAtlas: false,
      },
      {
        id: "kongo",
        magnitude: "700 ans",
        subject: "Le royaume Kongo",
        anchor: "Fondé vers 1350. Deux pays portent encore son nom.",
        provenance: "Angola, Congo, République démocratique du Congo.",
        inAtlas: true,
      },
      {
        id: "mali",
        magnitude: "800 ans",
        subject: "L’empire du Mali",
        anchor:
          "Du treizième au seizième siècle. Cinq pays en gardent la trace.",
        provenance: "Mali, Guinée, Guinée-Bissau, Gambie, Côte d’Ivoire.",
        inAtlas: true,
      },
      {
        id: "sanghana",
        magnitude: "1 000 ans",
        subject: "Un nom écrit",
        anchor:
          "Al-Bakri écrit le nom Sanghana au onzième siècle. Cinq cents ans avant les premières cartes européennes.",
        provenance: "Le Sénégal, et quatre peuples.",
        inAtlas: true,
      },
      {
        id: "kemet",
        magnitude: "4 700 ans",
        subject: "L’Égypte ancienne",
        anchor: "L’Ancien Empire commence en 2686 avant notre ère.",
        provenance: "L’Égypte.",
        inAtlas: true,
      },
      {
        id: "sapiens",
        magnitude: "300 000 ans",
        subject: "Homo sapiens",
        anchor:
          "Les plus anciens ossements de notre espèce ont été trouvés à Jebel Irhoud, au Maroc. Publié dans Nature en 2017.",
        provenance: "Une recherche publiée et revue par les pairs.",
        inAtlas: false,
      },
    ],
    reframe: "Sur cette échelle, la frontière est ce qu’il y a de plus récent.",
  },
};

export interface WallpaperLibraryCopy {
  eyebrow: string;
  /** What the page is, as its h1. The ladder's sentence is the chapter's. */
  pageTitle: string;
  /** The badge on a rung the atlas does not itself carry. */
  outsideAtlas: string;
  /** The badge on a rung the atlas does carry. */
  inAtlas: string;
  download: string;
  /** Screen-reader name for a download link, given the rung's subject. */
  downloadLabel: (subject: string) => string;
  /** Alt text for a rung's image, given its subject. */
  imageAlt: (subject: string) => string;
}

// @req REQ-132
// @req REQ-145
export const wallpaperLibrary: Record<Language, WallpaperLibraryCopy> = {
  en: {
    eyebrow: "The project",
    pageTitle: "Wallpapers",
    outsideAtlas: "Outside the atlas",
    inAtlas: "In the atlas",
    download: "Download",
    downloadLabel: (subject) => `Download the wallpaper for ${subject}`,
    imageAlt: (subject) =>
      `A cut through earth for ${subject}: pale fresh paper above, older and darker layers below.`,
  },
  fr: {
    eyebrow: "Le projet",
    pageTitle: "Fonds d’écran",
    outsideAtlas: "Hors de l’atlas",
    inAtlas: "Dans l’atlas",
    download: "Télécharger",
    downloadLabel: (subject) => `Télécharger le fond d’écran de ${subject}`,
    imageAlt: (subject) =>
      `Une coupe de terre pour ${subject} : du papier clair et récent en haut, des couches plus anciennes et plus sombres en dessous.`,
  },
};

/**
 * Where a rung's image lives. One file per rung, cut to 1290 by 2796 — the
 * phone panel, because that is what the operator asked the library to serve
 * first. Wider canvases need their own masters, not a crop of this one.
 */
// @req REQ-132
export const rungImage = (id: string) => `/images/wallpapers/${id}-phone.jpg`;
