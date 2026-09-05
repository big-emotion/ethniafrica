/**
 * A picture for each anecdote, and the credit that makes it citable.
 *
 * This is deliberately not a field on `DidYouKnowFact`. An illustration is
 * something a reading surface adds, the way `didYouKnowPresentation` adds
 * labels and accents, not something the fact carries. Keeping it here means
 * the bank stays a bank while the anecdote page, home previews and loading
 * surfaces each own their own dress.
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

export interface DidYouKnowPicture {
  kind: "picture";
  /** Path under `public/`, so `next/image` can size and re-encode it. */
  src: string;
  /** What the picture shows. Never a restatement of the headline. */
  alt: string;
  /** The visible attribution line: work, author, source, licence. */
  credit: string;
  /**
   * The licence's own address, and the file's.
   *
   * §4(a) of CC BY-SA asks for "a copy of, or the Uniform Resource Identifier
   * for, this License", and the brand charter §9 turns that into a house
   * rule: a licence is published, not named. Naming « CC BY-SA 4.0 » in a
   * caption is not a notice the reader can reach. Absent for a public-domain
   * file, which asks for no attribution at all — and absent, still, on the
   * twenty-four pictures sourced before this rule was written down.
   */
  licenceUrl?: string;
  filePage?: string;
}

/**
 * The second register: a plate the atlas draws itself, for an anecdote no
 * free photograph documents.
 *
 * Sourcing across Wikimedia Commons, the Met, Cleveland and Openverse leaves
 * a remainder, and the honest answer for that remainder is not a landscape of
 * the continent — §9 of the brand charter forbids exactly that. The plate
 * shows the two names instead, which is what these anecdotes are about, and
 * carries no third party's terms because it is our own work.
 *
 * See `AnecdotePlate` for the reasoning in full.
 */
export interface DidYouKnowPlate {
  kind: "plate";
  /** The name imposed from outside — the one the anecdote questions. */
  given: string;
  /** The name the people uses for itself. */
  own: string;
  /** Who imposed the first, and when, in half a line. */
  givenBy: string;
  /** What the plate shows, for a reader who cannot see it. */
  alt: string;
}

export type DidYouKnowIllustration = DidYouKnowPicture | DidYouKnowPlate;

// @req REQ-113
export const DID_YOU_KNOW_ILLUSTRATIONS: Record<
  string,
  DidYouKnowIllustration
> = {
  monrovia: {
    kind: "picture",
    src: "/images/anecdotes/monrovia.jpg",
    alt: "Carte manuscrite du Liberia dressée vers 1870, annotée à l'encre pour y ajouter des noms de lieux.",
    credit:
      "Carte du Liberia, American Colonization Society, v. 1870 — Library of Congress via Wikimedia Commons, domaine public",
  },
  bantou: {
    kind: "picture",
    src: "/images/anecdotes/bantou.jpg",
    alt: "Carte des zones bantoues de Guthrie : le domaine linguistique découpé en lettres et en chiffres.",
    credit:
      "Zones bantoues de Guthrie — Edricson, Wikimedia Commons, CC BY-SA 3.0",
  },
  "cote-ivoire": {
    kind: "picture",
    src: "/images/anecdotes/cote-ivoire.jpg",
    alt: "Défense d'éléphant sculptée de personnages sur toute sa longueur.",
    credit:
      "Défense sculptée, XIXᵉ siècle, Brooklyn Museum (1992.136.14) — Wikimedia Commons, CC BY 3.0",
  },
  amazigh: {
    kind: "picture",
    // The home already ships this file for the same argument; a second copy
    // would be the same picture at a second path.
    src: "/images/home/tifinagh-algeria.jpg",
    alt: "Inscriptions tifinagh gravées dans la roche, en Algérie.",
    credit:
      "Inscriptions tifinagh, Algérie — Patrick Gruban, Wikimedia Commons, CC BY-SA 2.0",
  },
  lingala: {
    kind: "picture",
    src: "/images/anecdotes/lingala.jpg",
    alt: "Le vapeur à aubes « Livingstone » amarré à Baringa, sur le bassin du Congo, entre 1900 et 1915.",
    credit:
      "Le vapeur « Livingstone » à Baringa, Congo, v. 1900-1915 — Wikimedia Commons, domaine public",
  },
  "personne-relationnelle": {
    kind: "picture",
    src: "/images/anecdotes/personne-relationnelle.jpg",
    alt: "Assemblée annuelle des hommes du village de Ribina, assis devant leurs cases, au Nigeria.",
    credit:
      "Assemblée du village de Ribina, Nigeria, 1970-1973 — Aart Rietveld, ASC Leiden via Wikimedia Commons, CC BY-SA 4.0",
  },
  afrique: {
    kind: "picture",
    src: "/images/anecdotes/afrique.jpg",
    alt: "Ruines des thermes d'Antonin à Carthage, en Tunisie.",
    credit:
      "Thermes d'Antonin, Carthage — Institute for the Study of the Ancient World, Wikimedia Commons, CC BY 2.0",
  },
  "burkina-faso": {
    kind: "picture",
    src: "/images/anecdotes/burkina-faso.jpg",
    alt: "Vue aérienne de Ouagadougou photographiée depuis un avion à l'hiver 1930-1931.",
    credit:
      "Ouagadougou vue d'avion, 1930-1931 — Walter Mittelholzer, Wikimedia Commons, domaine public",
  },
  cameroun: {
    kind: "picture",
    src: "/images/anecdotes/cameroun.jpg",
    alt: "Pirogues alignées sur les eaux du Wouri, à Douala.",
    credit:
      "Pirogues sur le Wouri, Douala — Kondah, Wikimedia Commons, CC BY-SA 4.0",
  },
  "benin-dahomey": {
    kind: "picture",
    src: "/images/anecdotes/benin-dahomey.jpg",
    alt: "Plaque de laiton coulée du royaume du Bénin, XVIᵉ siècle, conservée au British Museum.",
    credit:
      "Plaque de laiton de Benin City, XVIᵉ siècle, British Museum — Vassil, Wikimedia Commons, CC0",
  },
  "nigeria-flora-shaw": {
    kind: "picture",
    src: "/images/anecdotes/nigeria-flora-shaw.jpg",
    alt: "Flora Shaw et Frederick Lugard photographiés ensemble en 1908.",
    credit:
      "Flora Shaw et Frederick Lugard, 1908 — Arnold Wright, Wikimedia Commons, domaine public",
  },
  "zimbabwe-grand-zimbabwe": {
    kind: "picture",
    src: "/images/anecdotes/zimbabwe-grand-zimbabwe.jpg",
    alt: "Murailles extérieures en pierre sèche du Grand Zimbabwe.",
    credit: "Ruines du Grand Zimbabwe — Wikimedia Commons, CC BY-SA 4.0",
  },
  "prefixes-bantous": {
    kind: "picture",
    src: "/images/anecdotes/prefixes-bantous.jpg",
    alt: "Village accroché aux montagnes du Maloti, au Lesotho.",
    credit:
      "Village des monts Maloti, Lesotho — SkyPixels, Wikimedia Commons, CC BY-SA 4.0",
  },
  "peul-dix-noms": {
    kind: "picture",
    src: "/images/anecdotes/peul-dix-noms.jpg",
    alt: "Devant une gare de Dakar, un homme coiffé du chapeau de paille pointu peul.",
    credit:
      "Gare de Dakar, Sénégal, 1972 — Fred van der Kraaij, ASC Leiden via Wikimedia Commons, CC BY-SA 4.0",
  },
  "khoikhoi-hottentot": {
    kind: "picture",
    src: "/images/anecdotes/khoikhoi-hottentot.jpg",
    alt: "Gravure française de 1797 intitulée « Hottentote », planche d'un recueil de costumes du monde.",
    credit:
      "« Hottentote », Jacques Grasset de Saint-Sauveur, v. 1797, LACMA — Wikimedia Commons, domaine public",
  },
  "pygmee-homere": {
    kind: "picture",
    src: "/images/anecdotes/pygmee-homere.jpg",
    alt: "Vase grec à figures rouges modelé en forme de pygmée portant une grue abattue.",
    credit:
      "Vase attique, manière du peintre de Sotadès — ArchaiOptix, Wikimedia Commons, CC BY-SA 4.0",
  },
  "lac-lac": {
    kind: "picture",
    src: "/images/anecdotes/lac-lac.jpg",
    alt: "Carte de l'Afrique dressée par Victor Levasseur vers 1847, encadrée de vignettes gravées.",
    credit:
      "Carte de l'Afrique, Victor Levasseur, v. 1847 — Wikimedia Commons, domaine public",
  },
  tombouctou: {
    kind: "picture",
    src: "/images/anecdotes/tombouctou.jpg",
    alt: "La mosquée Djingareyber de Tombouctou, en banco, hérissée de poutres de soutien.",
    credit:
      "Mosquée Djingareyber, Tombouctou — Ondřej Havelka, Wikimedia Commons, CC BY-SA 4.0",
  },
  "fleuve-niger": {
    kind: "picture",
    src: "/images/anecdotes/fleuve-niger.jpg",
    alt: "Piroguiers manœuvrant une pinasse chargée sur le fleuve Niger.",
    credit: "Piroguiers sur le Niger — PGskot, Wikimedia Commons, CC BY-SA 4.0",
  },
  ethiopie: {
    kind: "picture",
    src: "/images/anecdotes/ethiopie.jpg",
    alt: "Page enluminée d'un évangile éthiopien sur parchemin, XIVᵉ-XVᵉ siècle.",
    credit:
      "Évangile enluminé, Éthiopie, XIVᵉ-XVᵉ s., Metropolitan Museum of Art — CC0",
  },
  guinee: {
    kind: "picture",
    src: "/images/anecdotes/guinee.jpg",
    alt: "Carte murale de l'Afrique publiée par Boulton en 1794 d'après d'Anville.",
    credit:
      "Carte de l'Afrique, Boulton d'après d'Anville, 1794 — Wikimedia Commons, domaine public",
  },
  tanzanie: {
    kind: "picture",
    src: "/images/anecdotes/tanzanie.jpg",
    alt: "Portrait de Julius Nyerere photographié en 1975.",
    credit:
      "Julius Nyerere, 1975 — Rob Mieremet / Anefo, Nationaal Archief via Wikimedia Commons, CC0",
  },
  mozambique: {
    kind: "picture",
    src: "/images/anecdotes/mozambique.jpg",
    alt: "L'église São Sebastião, dans le fort du même nom, sur l'île de Mozambique.",
    credit:
      "Église São Sebastião, île de Mozambique — Erik Cleves Kristensen, Wikimedia Commons, CC BY 2.0",
  },
  "sierra-leone": {
    kind: "picture",
    src: "/images/anecdotes/sierra-leone.jpg",
    alt: "Carte marine de la baie de Freetown gravée pour un guide nautique de 1884.",
    credit:
      "Baie de Freetown, Imray, 1884 — British Library via Wikimedia Commons, domaine public",
  },
  "iteso-bakedi": {
    kind: "plate",
    given: "Bakedi",
    own: "Iteso",
    givenBy: "donné par les Baganda, XIXᵉ siècle",
    alt: "Planche onomastique : « Bakedi », le nom reçu, au-dessus du nom « Iteso » que ce peuple se donne.",
  },
  "datoga-mangati": {
    kind: "plate",
    given: "Mang'ati",
    own: "Datooga",
    givenBy: "des Maasai — « les ennemis »",
    alt: "Planche onomastique : « Mang'ati », le nom reçu, au-dessus du nom « Datooga » que ce peuple se donne.",
  },
  "azande-niamniam": {
    kind: "picture",
    src: "/images/anecdotes/azande-niamniam.jpg",
    alt: "Fleurs rouges et jaunes d'Impatiens niamniamensis, cultivée sous serre au jardin botanique de Berlin.",
    credit:
      "Impatiens niamniamensis, jardin botanique de Berlin-Dahlem — Krzysztof Ziarnek (Kenraiz), Wikimedia Commons, CC BY 4.0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Impatiens_niamniamensis_kz04.jpg",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0",
  },
  "wonnin-godie": {
    kind: "plate",
    given: "Godié",
    own: "Wonnin",
    givenBy: "du néyo gwèdji — « chimpanzé-panthère »",
    alt: "Planche onomastique : « Godié », le nom reçu, au-dessus du nom « Wonnin » que ce peuple se donne.",
  },
  "murle-moden": {
    kind: "plate",
    given: "Beir · Jebe · Ajibba",
    own: "Murle",
    givenBy: "des Dinka, des Luo et des Anuak",
    alt: "Planche onomastique : « Beir · Jebe · Ajibba », le nom reçu, au-dessus du nom « Murle » que ce peuple se donne.",
  },
  "kirdi-paien": {
    kind: "plate",
    given: "Kirdi",
    own: "Mafa · Massa · Podoko",
    givenBy: "du kanouri-haoussa — « païen »",
    alt: "Planche onomastique : « Kirdi », le nom reçu, au-dessus du nom « Mafa · Massa · Podoko » que ce peuple se donne.",
  },
  "bambara-refus": {
    kind: "picture",
    src: "/images/anecdotes/bambara-refus.jpg",
    alt: "Cimier de danse chi wara bamana, en bois ajouré, figurant une antilope aux cornes dressées.",
    credit:
      "Cimier chi wara, Bamana, Mali, Huntington Museum of Art — Daderot, Wikimedia Commons, CC0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Chi_Wara_Headdress,_Bamana_people,_Mali,_20th_century,_wood_-_Huntington_Museum_of_Art_-_DSC05130.JPG",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "dogon-habe": {
    kind: "plate",
    given: "Habe",
    own: "Dogon",
    givenBy: "exonyme peul — « étranger »",
    alt: "Planche onomastique : « Habe », le nom reçu, au-dessus du nom « Dogon » que ce peuple se donne.",
  },
  "le-nom-est-une-reponse": {
    kind: "plate",
    given: "Frafra",
    own: "Nankana",
    givenBy: "d'une salutation : ya fara fara ?",
    alt: "Planche onomastique : « Frafra », le nom reçu, au-dessus du nom « Nankana » que ce peuple se donne.",
  },
  "guere-wobe": {
    kind: "picture",
    src: "/images/anecdotes/guere-wobe.jpg",
    alt: "Masque rituel wè de Côte d'Ivoire, au visage saillant cerné de fibres.",
    credit:
      "Masque rituel wè, Côte d'Ivoire — Mickey Mystique, Wikimedia Commons, CC BY-SA 4.0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Ritual_mask,_Gere_people,_Ivory_Coast_01.jpg",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "bamileke-cent-royaumes": {
    kind: "plate",
    given: "Bamiléké",
    own: "Bandjoun · Bafoussam · Dschang",
    givenBy: "de l'administration allemande, dès 1884",
    alt: "Planche onomastique : « Bamiléké », le nom reçu, au-dessus du nom « Bandjoun · Bafoussam · Dschang » que ce peuple se donne.",
  },
  "sara-douzaine": {
    kind: "plate",
    given: "Sara",
    own: "Ngambay · Sar · Mbay",
    givenBy: "des observateurs extérieurs, puis de la France",
    alt: "Planche onomastique : « Sara », le nom reçu, au-dessus du nom « Ngambay · Sar · Mbay » que ce peuple se donne.",
  },
  "bete-plantation": {
    kind: "plate",
    given: "Bété",
    own: "Magwé",
    givenBy: "catégorie administrative française",
    alt: "Planche onomastique : « Bété », le nom reçu, au-dessus du nom « Magwé » que ce peuple se donne.",
  },
  "bassa-nge-distinction": {
    kind: "plate",
    given: "Bassa",
    own: "Bassa Nge",
    givenBy: "distinction ajoutée par les Britanniques",
    alt: "Planche onomastique : « Bassa », le nom reçu, au-dessus du nom « Bassa Nge » que ce peuple se donne.",
  },
  "tswa-recensement": {
    kind: "plate",
    given: "Tsonga · Shangaan",
    own: "Vatswa",
    givenBy: "des recensements, depuis l'époque portugaise",
    alt: "Planche onomastique : « Tsonga · Shangaan », le nom reçu, au-dessus du nom « Vatswa » que ce peuple se donne.",
  },
  "hutu-cartes-identite": {
    kind: "plate",
    given: "Hutu",
    own: "Abahutu",
    givenBy: "fixé par les cartes d'identité belges, 1920",
    alt: "Planche onomastique : « Hutu », le nom reçu, au-dessus du nom « Abahutu » que ce peuple se donne.",
  },
  "kasem-gurunsi": {
    kind: "plate",
    given: "Gurunsi",
    own: "Kasena",
    givenBy: "du djerma — « le fer ne pénètre pas »",
    alt: "Planche onomastique : « Gurunsi », le nom reçu, au-dessus du nom « Kasena » que ce peuple se donne.",
  },
  "dioula-metier": {
    kind: "picture",
    src: "/images/anecdotes/dioula-metier.jpg",
    alt: "La Grande Mosquée de Bobo-Dioulasso, bâtie en banco et hérissée de poutres de soutien.",
    credit:
      "Grande Mosquée de Bobo-Dioulasso, Burkina Faso — Angeline A. van Achterberg, ASC Leiden via Wikimedia Commons, CC BY-SA 4.0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:ASC_Leiden_-_van_Achterberg_Collection_-_5_-_005_-_La_Grande_Mosqu%C3%A9e_de_Bobo-Dioulasso,_avec_21_niveaux_de_protub%C3%A9rances_en_bois_-_Bobo-Dioulasso,_Burkina_Faso,_19-26_ao%C3%BBt_2001.tif",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "teke-vendre": {
    kind: "plate",
    given: "Teke-Tege",
    own: "BaTeke",
    givenBy: "découpage des catalogues linguistiques",
    alt: "Planche onomastique : « Teke-Tege », le nom reçu, au-dessus du nom « BaTeke » que ce peuple se donne.",
  },
  "tetela-watetera": {
    kind: "plate",
    given: "Watetera",
    own: "Motetela",
    givenBy: "terme arabe de la traite, repris en 1885",
    alt: "Planche onomastique : « Watetera », le nom reçu, au-dessus du nom « Motetela » que ce peuple se donne.",
  },
  "tabwa-attache": {
    kind: "picture",
    src: "/images/anecdotes/tabwa-attache.jpg",
    alt: "Figure masculine tabwa en bois sculpté, le torse couvert de scarifications en chevrons.",
    credit:
      "Figure masculine, Tabwa, Metropolitan Museum of Art (1978.412.592) — Wikimedia Commons, CC0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Figure-_Male_MET_1978.412.592_a.jpeg",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "angolar-naufrage": {
    kind: "plate",
    given: "Angolares",
    own: "N'golá",
    givenBy: "du portugais, d'après l'Angola",
    alt: "Planche onomastique : « Angolares », le nom reçu, au-dessus du nom « N'golá » que ce peuple se donne.",
  },
  "crioulo-cap-vert": {
    kind: "plate",
    given: "Crioulo",
    own: "Kabuverdianu",
    givenBy: "du portugais — l'esclave né dans la colonie",
    alt: "Planche onomastique : « Crioulo », le nom reçu, au-dessus du nom « Kabuverdianu » que ce peuple se donne.",
  },
  "kavango-riviere": {
    kind: "plate",
    given: "Okavango people",
    own: "vaKavango",
    givenBy: "d'après la rivière frontière",
    alt: "Planche onomastique : « Okavango people », le nom reçu, au-dessus du nom « vaKavango » que ce peuple se donne.",
  },
  "kaonde-riviere": {
    kind: "plate",
    given: "Mushima wa Kaonde",
    own: "BaKaonde",
    givenBy: "donné par le vainqueur lunda",
    alt: "Planche onomastique : « Mushima wa Kaonde », le nom reçu, au-dessus du nom « BaKaonde » que ce peuple se donne.",
  },
  "manianga-marche": {
    kind: "plate",
    given: "Manianga",
    own: "Ba-sundi",
    givenBy: "d'un marché — ou de Stanley, 1881",
    alt: "Planche onomastique : « Manianga », le nom reçu, au-dessus du nom « Ba-sundi » que ce peuple se donne.",
  },
  "gorowa-village-voisin": {
    kind: "plate",
    given: "Kimbulu · Fiome",
    own: "Gorwaa",
    givenBy: "du swahili, et du village iraqw voisin",
    alt: "Planche onomastique : « Kimbulu · Fiome », le nom reçu, au-dessus du nom « Gorwaa » que ce peuple se donne.",
  },
  "kalabari-calabar": {
    kind: "plate",
    given: "New Calabar",
    own: "Awome",
    givenBy: "des navigateurs portugais, puis britanniques",
    alt: "Planche onomastique : « New Calabar », le nom reçu, au-dessus du nom « Awome » que ce peuple se donne.",
  },
  "omotique-fleuve-omo": {
    kind: "picture",
    src: "/images/anecdotes/omotique-fleuve-omo.jpg",
    alt: "La basse vallée de l'Omo, en Éthiopie du Sud-Ouest, sous un ciel chargé.",
    credit: "Vallée de l'Omo, Éthiopie — pxfuel via Wikimedia Commons, CC0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Omo_Valley_in_Ethiopia.jpg",
    licenceUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
  },
  "gur-mabia": {
    kind: "picture",
    src: "/images/anecdotes/gur-mabia.jpg",
    alt: "Des arbres se reflétant à la surface de la Volta, au Ghana.",
    credit: "La Volta, Ghana — ARchIvlst07, Wikimedia Commons, CC BY-SA 4.0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Trees_reflecting_on_the_Volta_River.jpg",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
  "ronga-junod": {
    kind: "picture",
    src: "/images/anecdotes/ronga-junod.jpg",
    alt: "Carte des groupes tsonga et de leur localisation, dressée par Henri-Alexandre Junod pour son étude.",
    credit:
      "Carte des groupes tsonga, Henri-Alexandre Junod — Wikimedia Commons, domaine public",
    filePage: "https://commons.wikimedia.org/wiki/File:HJ-1-P16.png",
  },
  "fulbe-quatre-noms": {
    kind: "plate",
    given: "Peul · Fula · Fulani · Fellata",
    own: "Fulbe",
    givenBy: "du wolof, du mandingue, du haoussa, de l'arabe",
    alt: "Planche onomastique : « Peul · Fula · Fulani · Fellata », le nom reçu, au-dessus du nom « Fulbe » que ce peuple se donne.",
  },
  "malinke-manden": {
    kind: "plate",
    given: "Mandingo · Mandinka",
    own: "Maninka",
    givenBy: "des administrations coloniales",
    alt: "Planche onomastique : « Mandingo · Mandinka », le nom reçu, au-dessus du nom « Maninka » que ce peuple se donne.",
  },
  "fang-reputation": {
    kind: "picture",
    src: "/images/anecdotes/fang-reputation.jpg",
    alt: "Gardien de reliquaire eyema byeri, sculpture fang du Gabon, aux yeux incrustés de métal.",
    credit:
      "Eyema byeri, gardien de reliquaire fang, Gabon — Metropolitan Museum of Art, CC0",
    filePage: "https://www.metmuseum.org/art/collection/search/310870",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  "beti-cranes": {
    kind: "picture",
    src: "/images/anecdotes/beti-cranes.jpg",
    alt: "Portrait photographique en buste de l'explorateur Paul Belloni Du Chaillu.",
    credit:
      "Portrait de Paul Belloni Du Chaillu — Elliott & Fry, Wikimedia Commons, domaine public",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Portrait_of_Paul_Belloni_Du_Chaillu.jpg",
  },
  "khwe-penduka": {
    kind: "plate",
    given: "Barakwena · Water Bushmen",
    own: "Khwe",
    givenBy: "des voisins bantous, et de l'administration",
    alt: "Planche onomastique : « Barakwena · Water Bushmen », le nom reçu, au-dessus du nom « Khwe » que ce peuple se donne.",
  },
  "west-taa-masarwa": {
    kind: "plate",
    given: "Masarwa",
    own: "!Xoon",
    givenBy: "exonyme tswana, tenu pour péjoratif",
    alt: "Planche onomastique : « Masarwa », le nom reçu, au-dessus du nom « !Xoon » que ce peuple se donne.",
  },
  "antambahoaka-surnom": {
    kind: "plate",
    given: "Ratiambahoaka",
    own: "Antambahoaka",
    givenBy: "surnom du fondateur — « aimé de son peuple »",
    alt: "Planche onomastique : « Ratiambahoaka », le nom reçu, au-dessus du nom « Antambahoaka » que ce peuple se donne.",
  },
  "masa-banana": {
    kind: "plate",
    given: "Banana",
    own: "Masana",
    givenBy: "des voisins — « amical »",
    alt: "Planche onomastique : « Banana », le nom reçu, au-dessus du nom « Masana » que ce peuple se donne.",
  },
  "rendille-baton": {
    kind: "plate",
    given: "Rertit",
    own: "Rendille",
    givenBy: "du somali — « ceux qui ont refusé »",
    alt: "Planche onomastique : « Rertit », le nom reçu, au-dessus du nom « Rendille » que ce peuple se donne.",
  },
  "kaffa-cafe": {
    kind: "plate",
    given: "Keffa",
    own: "Kafficho",
    givenBy: "translittération amharique",
    alt: "Planche onomastique : « Keffa », le nom reçu, au-dessus du nom « Kafficho » que ce peuple se donne.",
  },
  "bono-brong-ahafo": {
    kind: "plate",
    given: "Brong · Abron",
    own: "Bonofoɔ",
    givenBy: "des Asante, puis des Britanniques",
    alt: "Planche onomastique : « Brong · Abron », le nom reçu, au-dessus du nom « Bonofoɔ » que ce peuple se donne.",
  },
  "toura-wen": {
    kind: "plate",
    given: "Toura",
    own: "Wenmebo",
    givenBy: "de l'administration coloniale française",
    alt: "Planche onomastique : « Toura », le nom reçu, au-dessus du nom « Wenmebo » que ce peuple se donne.",
  },
  "bantu-knots": {
    kind: "picture",
    src: "/images/anecdotes/bantu-knots.jpg",
    alt: "Coiffure en petits nœuds sur le mannequin Gwyneth Ellis.",
    credit:
      "Bantu Knots hairstyle, mannequin Gwyneth Ellis — Stephencdickson, Wikimedia Commons, CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    filePage:
      "https://commons.wikimedia.org/wiki/File:Bantu_Knots_hairstyle_-_model_Gwyneth_Ellis.jpg",
  },
};

// @req REQ-113
export function illustrationFor(
  factId: string
): DidYouKnowIllustration | undefined {
  return DID_YOU_KNOW_ILLUSTRATIONS[factId];
}

/**
 * Give a single-fact surface a stable side from the bank's editorial order.
 * Consecutive facts therefore alternate without a client-side draw that could
 * flip the layout after hydration.
 */
// @req REQ-104
// @req REQ-113
export function illustrationSideFor(factId: string): "start" | "end" {
  const index = Object.keys(DID_YOU_KNOW_ILLUSTRATIONS).indexOf(factId);
  return index < 0 || index % 2 === 0 ? "start" : "end";
}
