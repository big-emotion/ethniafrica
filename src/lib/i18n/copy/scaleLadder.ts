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
 * Inflating the name figure was the wrong answer: the corpus stores no
 * attestation date at all — `attestations` links a name to a country and a
 * source, never to a year — so a larger number would be a claim the atlas
 * cannot query. Three different ages were also being folded into one: the age
 * of human presence, the age of polities, and the age of an attested name.
 * They are not the same assertion and a reader who separates them dismantles
 * the fused version in a sentence.
 *
 * The ladder keeps them separate and dates each one. It is more convincing
 * than a single figure precisely because each rung says what kind of thing it
 * measures, and the last rung is reached having earned it.
 *
 * **Provenance is per rung, not per ladder.** `anchoredInCorpus` is false for
 * two of the six, and the surface says so rather than letting a sourced
 * neighbour vouch for them. Same doctrine as the Source Tier policy: nothing
 * is forbidden, everything is labelled.
 */
export interface LadderRung {
  /** Stable id, used as the image route's parameter. */
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
   * Whether the corpus itself carries the anchor. False means the surface
   * shows it as an outside fact and never as something the atlas established.
   */
  anchoredInCorpus: boolean;
}

export interface ScaleLadderCopy {
  stepLabel: string;
  title: string;
  intro: string;
  rungs: LadderRung[];
  /** The sentence the whole ladder exists to make unavoidable. */
  reframe: string;
  downloadNote: string;
}

// @req REQ-132
// @req REQ-145
export const scaleLadder: Record<Language, ScaleLadderCopy> = {
  en: {
    stepLabel: "01 · The scale",
    title: "Six rungs, and the border is the youngest",
    intro:
      "Each rung says what it measures and where that is checked. The age of a human presence, the age of a polity and the age of a written name are three different claims, and folding them into one is how a true argument becomes an attackable one.",
    rungs: [
      {
        id: "border",
        magnitude: "140 years",
        subject: "The border",
        anchor:
          "The Berlin conference opens in 1884. Most African independences date from 1960.",
        provenance: "Established historical record, held outside the atlas.",
        anchoredInCorpus: false,
      },
      {
        id: "kongo",
        magnitude: "700 years",
        subject: "The Kongo kingdom",
        anchor:
          "Founded around 1350. Three country fiches document it, and two of those countries carry its name.",
        provenance: "Corpus: Angola, Congo, Democratic Republic of the Congo.",
        anchoredInCorpus: true,
      },
      {
        id: "mali",
        magnitude: "800 years",
        subject: "The Mali empire",
        anchor:
          "From the thirteenth century to the sixteenth. Five country fiches document it today.",
        provenance:
          "Corpus: Mali, Guinea, Guinea-Bissau, Gambia, Côte d’Ivoire.",
        anchoredInCorpus: true,
      },
      {
        id: "sanghana",
        magnitude: "1,000 years",
        subject: "A written name",
        anchor:
          "Al-Bakri writes the name Sanghana in the eleventh century, five hundred years before European cartography reaches the coast.",
        provenance: "Corpus: the Senegal fiche, and four people fiches.",
        anchoredInCorpus: true,
      },
      {
        id: "kemet",
        magnitude: "4,700 years",
        subject: "The Egyptian Old Kingdom",
        anchor:
          "It begins in 2686 before our era, and the atlas carries those bounds as machine-readable dates.",
        provenance: "Corpus: the Egypt fiche.",
        anchoredInCorpus: true,
      },
      {
        id: "sapiens",
        magnitude: "300,000 years",
        subject: "Homo sapiens",
        anchor:
          "The oldest known fossils of our own species were dated at Jebel Irhoud, in Morocco, and published in Nature in 2017.",
        provenance: "Peer-reviewed research, held outside the atlas.",
        anchoredInCorpus: false,
      },
    ],
    reframe: "On this scale, the border is the most recent thing there is.",
    downloadNote:
      "Every rung is available as a wallpaper, for a screen or for a feed. The sentence on the image is the sentence on this page, and it is sourced here.",
  },
  fr: {
    stepLabel: "01 · L’échelle",
    title: "Six barreaux, et la frontière est le plus jeune",
    intro:
      "Chaque barreau dit ce qu’il mesure et où cela se vérifie. L’âge d’une présence humaine, l’âge d’un État et l’âge d’un nom écrit sont trois affirmations différentes, et les fondre en une seule est ce qui rend attaquable un argument vrai.",
    rungs: [
      {
        id: "border",
        magnitude: "140 ans",
        subject: "La frontière",
        anchor:
          "La conférence de Berlin s’ouvre en 1884. La plupart des indépendances africaines datent de 1960.",
        provenance: "Fait historique établi, tenu hors de l’atlas.",
        anchoredInCorpus: false,
      },
      {
        id: "kongo",
        magnitude: "700 ans",
        subject: "Le royaume Kongo",
        anchor:
          "Fondé vers 1350. Trois fiches pays le documentent, et deux de ces pays portent son nom.",
        provenance: "Corpus : Angola, Congo, République démocratique du Congo.",
        anchoredInCorpus: true,
      },
      {
        id: "mali",
        magnitude: "800 ans",
        subject: "L’empire du Mali",
        anchor:
          "Du treizième au seizième siècle. Cinq fiches pays le documentent aujourd’hui.",
        provenance:
          "Corpus : Mali, Guinée, Guinée-Bissau, Gambie, Côte d’Ivoire.",
        anchoredInCorpus: true,
      },
      {
        id: "sanghana",
        magnitude: "1 000 ans",
        subject: "Un nom écrit",
        anchor:
          "Al-Bakri écrit le nom Sanghana au onzième siècle, cinq cents ans avant que la cartographie européenne atteigne la côte.",
        provenance: "Corpus : la fiche Sénégal, et quatre fiches peuple.",
        anchoredInCorpus: true,
      },
      {
        id: "kemet",
        magnitude: "4 700 ans",
        subject: "L’Ancien Empire égyptien",
        anchor:
          "Il commence en 2686 avant notre ère, et l’atlas en porte les bornes sous forme de dates lisibles par une machine.",
        provenance: "Corpus : la fiche Égypte.",
        anchoredInCorpus: true,
      },
      {
        id: "sapiens",
        magnitude: "300 000 ans",
        subject: "Homo sapiens",
        anchor:
          "Les plus anciens fossiles connus de notre propre espèce ont été datés à Jebel Irhoud, au Maroc, et publiés dans Nature en 2017.",
        provenance:
          "Recherche publiée et revue par les pairs, tenue hors de l’atlas.",
        anchoredInCorpus: false,
      },
    ],
    reframe: "Sur cette échelle, la frontière est ce qu’il y a de plus récent.",
    downloadNote:
      "Chaque barreau existe en fond d’écran, pour un écran ou pour un fil. La phrase portée par l’image est la phrase de cette page, et elle est sourcée ici.",
  },
};

export interface WallpaperLibraryCopy {
  eyebrow: string;
  /** What the badge on a rung the corpus does not carry says. */
  outsideCorpus: string;
  /** What the badge on a rung the corpus does carry says. */
  inCorpus: string;
  formats: Record<string, string>;
  /** Screen-reader name for a download link, given a rung and a format. */
  downloadLabel: (subject: string, format: string) => string;
}

/**
 * The library's chrome, kept beside the ladder it serves.
 *
 * Format names are reader words, not aspect ratios, except where the ratio is
 * the reason the format exists: a reader choosing between a feed post and a
 * story is choosing between two surfaces, and the numbers are what tells them
 * which is which.
 */
// @req REQ-132
// @req REQ-145
export const wallpaperLibrary: Record<Language, WallpaperLibraryCopy> = {
  en: {
    eyebrow: "The project",
    outsideCorpus: "Outside the corpus",
    inCorpus: "In the corpus",
    formats: {
      desktop: "Desktop",
      phone: "Phone",
      square: "Square",
      portrait: "Feed · 4:5",
      story: "Story · 9:16",
      share: "Share card",
    },
    downloadLabel: (subject, format) => `Download ${subject}, ${format}`,
  },
  fr: {
    eyebrow: "Le projet",
    outsideCorpus: "Hors corpus",
    inCorpus: "Dans le corpus",
    formats: {
      desktop: "Ordinateur",
      phone: "Téléphone",
      square: "Carré",
      portrait: "Fil · 4:5",
      story: "Story · 9:16",
      share: "Carte de partage",
    },
    downloadLabel: (subject, format) =>
      `Télécharger ${subject}, format ${format}`,
  },
};

/** The rung ids, in ladder order, for a route that takes one as a parameter. */
// @req REQ-132
export const LADDER_RUNG_IDS = scaleLadder.fr.rungs.map((rung) => rung.id);

// @req REQ-132
export const findRung = (
  language: Language,
  id: string
): LadderRung | undefined =>
  scaleLadder[language].rungs.find((rung) => rung.id === id);
