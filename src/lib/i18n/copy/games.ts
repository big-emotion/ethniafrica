import type { Language } from "@/types/shared";

const en = {
  estimateCommit: "Confirm my estimate",
  estimateHint: "Drag, then confirm.",
  correctVerdict: "Correct",
  incorrectVerdict: "Not quite",
  provenanceLabel: "According to",
  openFiche: "Read the page",
  openAtlas: "Open the atlas",
  confidenceAriaSuffix: "for the subject of this round",
  yourEstimate: "Your estimate:",
  nextRound: "Next round",
  seeScore: "See the score",
  scoreHeading: "Game complete",
  scoreSeparator: "of",
  scoreCaption: "correct answers",
  playAgain: "Play again",
  factsHeading: "Everything the map concealed",
  factEyebrow: "What the map concealed",
  corpusLimited:
    "This game was shorter than expected: the outlines do not yet provide enough misleading comparisons for eight rounds.",
  emptyCorpus:
    "The atlas does not yet contain enough pages to compose a round of this game.",
  emptyCorpusHint:
    "This game will open when the corresponding pages have been published.",
  trueSizeHeading: "Africa's true size",
  unResolution:
    "On 4 September 2026, the United Nations General Assembly adopted by 164 votes to one, at Togo's initiative on behalf of the African Group and with the African Union's support, a resolution calling for this ‘symbolic minimisation’ of the continent to be corrected and for area-respecting projections such as Equal Earth to be preferred.",
  unSourceLabel: "UN News in French, 4 September 2026",
  continentGlobe: {
    missing: "The atlas does not yet record any people by country.",
    fallback: "Flat map of Africa: this browser cannot display the globe.",
    wholeArea: "The whole continent",
    areaNoun: "the continent",
  },
};

type GamesCopy = typeof en;

const fr: GamesCopy = {
  estimateCommit: "Valider mon estimation",
  estimateHint: "Faites glisser, puis validez.",
  correctVerdict: "Bonne réponse",
  incorrectVerdict: "Ce n'est pas ça",
  provenanceLabel: "D'après",
  openFiche: "Lire la page",
  openAtlas: "Ouvrir l'atlas",
  confidenceAriaSuffix: "pour le sujet de cette manche",
  yourEstimate: "Votre estimation :",
  nextRound: "Tour suivant",
  seeScore: "Voir le score",
  scoreHeading: "Partie terminée",
  scoreSeparator: "sur",
  scoreCaption: "réponses exactes",
  playAgain: "Rejouer",
  factsHeading: "Tout ce que la carte cachait",
  factEyebrow: "Ce que la carte cachait",
  corpusLimited:
    "Cette partie a été plus courte que prévu : les tracés ne fournissent pas encore assez de comparaisons trompeuses pour huit manches.",
  emptyCorpus:
    "L’atlas ne contient pas encore assez de pages pour composer un tour de ce jeu.",
  emptyCorpusHint:
    "Ce jeu s'ouvrira quand les pages correspondantes auront été publiées.",
  trueSizeHeading: "La taille réelle de l'Afrique",
  unResolution:
    "Le 4 septembre 2026, l'Assemblée générale des Nations unies a adopté par 164 voix contre une, portée par le Togo au nom du groupe africain et soutenue par l'Union africaine, une résolution appelant à corriger cette « minimisation symbolique » du continent et à préférer les projections qui respectent les surfaces, comme Equal Earth.",
  unSourceLabel: "ONU Info, 4 septembre 2026",
  continentGlobe: {
    missing: "L’atlas ne renseigne encore aucun peuple par pays.",
    fallback:
      "Carte de l'Afrique, à plat : ce navigateur ne peut pas afficher le globe.",
    wholeArea: "Tout le continent",
    areaNoun: "le continent",
  },
};

// @req REQ-145
export const gamesCopy: Record<Language, GamesCopy> = { en, fr };
