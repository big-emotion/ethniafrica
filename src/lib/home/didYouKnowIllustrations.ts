/**
 * A picture for each anecdote, and the credit that makes it citable.
 *
 * This is deliberately not a field on `DidYouKnowFact`. The home band shows
 * no picture and never will — an illustration is something the reading
 * surface adds, the way `didYouKnowPresentation` adds labels and accents,
 * not something the fact carries. Keeping it here means the bank stays a
 * bank and the anecdote page owns its own dress.
 *
 * Every file is a document the anecdote is *about* — a map that makes the
 * mistake, the object that was traded, the person who did the naming. That
 * rule is what keeps the page from sliding into stock photography of a
 * continent, which would illustrate nothing and would sit badly under a
 * decolonial editorial posture.
 *
 * Provenance in full — file page, author, date, why this one — lives in
 * `public/images/anecdotes/CREDITS.md`. What is printed under the picture is
 * `credit`, because CC BY and CC BY-SA are only satisfied by an attribution
 * the reader can see, not by one filed in the repository.
 */

export interface DidYouKnowIllustration {
  /** Path under `public/`, so `next/image` can size and re-encode it. */
  src: string;
  /** What the picture shows. Never a restatement of the headline. */
  alt: string;
  /** The visible attribution line: work, author, source, licence. */
  credit: string;
}

// @req REQ-113
export const DID_YOU_KNOW_ILLUSTRATIONS: Record<
  string,
  DidYouKnowIllustration
> = {
  monrovia: {
    src: "/images/anecdotes/monrovia.jpg",
    alt: "Carte manuscrite du Liberia dressée vers 1870, annotée à l'encre pour y ajouter des noms de lieux.",
    credit:
      "Carte du Liberia, American Colonization Society, v. 1870 — Library of Congress via Wikimedia Commons, domaine public",
  },
  bantou: {
    src: "/images/anecdotes/bantou.jpg",
    alt: "Carte des zones bantoues de Guthrie : le domaine linguistique découpé en lettres et en chiffres.",
    credit:
      "Zones bantoues de Guthrie — Edricson, Wikimedia Commons, CC BY-SA 3.0",
  },
  "cote-ivoire": {
    src: "/images/anecdotes/cote-ivoire.jpg",
    alt: "Défense d'éléphant sculptée de personnages sur toute sa longueur.",
    credit:
      "Défense sculptée, XIXᵉ siècle, Brooklyn Museum (1992.136.14) — Wikimedia Commons, CC BY 3.0",
  },
  amazigh: {
    // The home already ships this file for the same argument; a second copy
    // would be the same picture at a second path.
    src: "/images/home/tifinagh-algeria.jpg",
    alt: "Inscriptions tifinagh gravées dans la roche, en Algérie.",
    credit:
      "Inscriptions tifinagh, Algérie — Patrick Gruban, Wikimedia Commons, CC BY-SA 2.0",
  },
  lingala: {
    src: "/images/anecdotes/lingala.jpg",
    alt: "Le vapeur à aubes « Livingstone » amarré à Baringa, sur le bassin du Congo, entre 1900 et 1915.",
    credit:
      "Le vapeur « Livingstone » à Baringa, Congo, v. 1900-1915 — Wikimedia Commons, domaine public",
  },
  "personne-relationnelle": {
    src: "/images/anecdotes/personne-relationnelle.jpg",
    alt: "Assemblée annuelle des hommes du village de Ribina, assis devant leurs cases, au Nigeria.",
    credit:
      "Assemblée du village de Ribina, Nigeria, 1970-1973 — Aart Rietveld, ASC Leiden via Wikimedia Commons, CC BY-SA 4.0",
  },
  afrique: {
    src: "/images/anecdotes/afrique.jpg",
    alt: "Ruines des thermes d'Antonin à Carthage, en Tunisie.",
    credit:
      "Thermes d'Antonin, Carthage — Institute for the Study of the Ancient World, Wikimedia Commons, CC BY 2.0",
  },
  "burkina-faso": {
    src: "/images/anecdotes/burkina-faso.jpg",
    alt: "Vue aérienne de Ouagadougou photographiée depuis un avion à l'hiver 1930-1931.",
    credit:
      "Ouagadougou vue d'avion, 1930-1931 — Walter Mittelholzer, Wikimedia Commons, domaine public",
  },
  cameroun: {
    src: "/images/anecdotes/cameroun.jpg",
    alt: "Pirogues alignées sur les eaux du Wouri, à Douala.",
    credit:
      "Pirogues sur le Wouri, Douala — Kondah, Wikimedia Commons, CC BY-SA 4.0",
  },
  "benin-dahomey": {
    src: "/images/anecdotes/benin-dahomey.jpg",
    alt: "Plaque de laiton coulée du royaume du Bénin, XVIᵉ siècle, conservée au British Museum.",
    credit:
      "Plaque de laiton de Benin City, XVIᵉ siècle, British Museum — Vassil, Wikimedia Commons, CC0",
  },
  "nigeria-flora-shaw": {
    src: "/images/anecdotes/nigeria-flora-shaw.jpg",
    alt: "Flora Shaw et Frederick Lugard photographiés ensemble en 1908.",
    credit:
      "Flora Shaw et Frederick Lugard, 1908 — Arnold Wright, Wikimedia Commons, domaine public",
  },
  "zimbabwe-grand-zimbabwe": {
    src: "/images/anecdotes/zimbabwe-grand-zimbabwe.jpg",
    alt: "Murailles extérieures en pierre sèche du Grand Zimbabwe.",
    credit: "Ruines du Grand Zimbabwe — Wikimedia Commons, CC BY-SA 4.0",
  },
  "prefixes-bantous": {
    src: "/images/anecdotes/prefixes-bantous.jpg",
    alt: "Village accroché aux montagnes du Maloti, au Lesotho.",
    credit:
      "Village des monts Maloti, Lesotho — SkyPixels, Wikimedia Commons, CC BY-SA 4.0",
  },
  "peul-dix-noms": {
    src: "/images/anecdotes/peul-dix-noms.jpg",
    alt: "Devant une gare de Dakar, un homme coiffé du chapeau de paille pointu peul.",
    credit:
      "Gare de Dakar, Sénégal, 1972 — Fred van der Kraaij, ASC Leiden via Wikimedia Commons, CC BY-SA 4.0",
  },
  "khoikhoi-hottentot": {
    src: "/images/anecdotes/khoikhoi-hottentot.jpg",
    alt: "Gravure française de 1797 intitulée « Hottentote », planche d'un recueil de costumes du monde.",
    credit:
      "« Hottentote », Jacques Grasset de Saint-Sauveur, v. 1797, LACMA — Wikimedia Commons, domaine public",
  },
  "pygmee-homere": {
    src: "/images/anecdotes/pygmee-homere.jpg",
    alt: "Vase grec à figures rouges modelé en forme de pygmée portant une grue abattue.",
    credit:
      "Vase attique, manière du peintre de Sotadès — ArchaiOptix, Wikimedia Commons, CC BY-SA 4.0",
  },
  "lac-lac": {
    src: "/images/anecdotes/lac-lac.jpg",
    alt: "Carte de l'Afrique dressée par Victor Levasseur vers 1847, encadrée de vignettes gravées.",
    credit:
      "Carte de l'Afrique, Victor Levasseur, v. 1847 — Wikimedia Commons, domaine public",
  },
  tombouctou: {
    src: "/images/anecdotes/tombouctou.jpg",
    alt: "La mosquée Djingareyber de Tombouctou, en banco, hérissée de poutres de soutien.",
    credit:
      "Mosquée Djingareyber, Tombouctou — Ondřej Havelka, Wikimedia Commons, CC BY-SA 4.0",
  },
  "fleuve-niger": {
    src: "/images/anecdotes/fleuve-niger.jpg",
    alt: "Piroguiers manœuvrant une pinasse chargée sur le fleuve Niger.",
    credit: "Piroguiers sur le Niger — PGskot, Wikimedia Commons, CC BY-SA 4.0",
  },
  ethiopie: {
    src: "/images/anecdotes/ethiopie.jpg",
    alt: "Page enluminée d'un évangile éthiopien sur parchemin, XIVᵉ-XVᵉ siècle.",
    credit:
      "Évangile enluminé, Éthiopie, XIVᵉ-XVᵉ s., Metropolitan Museum of Art — CC0",
  },
  guinee: {
    src: "/images/anecdotes/guinee.jpg",
    alt: "Carte murale de l'Afrique publiée par Boulton en 1794 d'après d'Anville.",
    credit:
      "Carte de l'Afrique, Boulton d'après d'Anville, 1794 — Wikimedia Commons, domaine public",
  },
  tanzanie: {
    src: "/images/anecdotes/tanzanie.jpg",
    alt: "Portrait de Julius Nyerere photographié en 1975.",
    credit:
      "Julius Nyerere, 1975 — Rob Mieremet / Anefo, Nationaal Archief via Wikimedia Commons, CC0",
  },
  mozambique: {
    src: "/images/anecdotes/mozambique.jpg",
    alt: "L'église São Sebastião, dans le fort du même nom, sur l'île de Mozambique.",
    credit:
      "Église São Sebastião, île de Mozambique — Erik Cleves Kristensen, Wikimedia Commons, CC BY 2.0",
  },
  "sierra-leone": {
    src: "/images/anecdotes/sierra-leone.jpg",
    alt: "Carte marine de la baie de Freetown gravée pour un guide nautique de 1884.",
    credit:
      "Baie de Freetown, Imray, 1884 — British Library via Wikimedia Commons, domaine public",
  },
};

// @req REQ-113
export function illustrationFor(
  factId: string
): DidYouKnowIllustration | undefined {
  return DID_YOU_KNOW_ILLUSTRATIONS[factId];
}
