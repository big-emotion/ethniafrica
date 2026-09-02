/**
 * Every work the « Qui a donné ce nom ? » dossier cites, addressed by key.
 *
 * One entry per work, not per use: Bleek 1862 backs a chapter paragraph, a
 * glossary notice and a line of the Sources page, and retyping it three times
 * is how the three would come to disagree. `/fr/sources` renders this map
 * directly, so the site's bibliography cannot drift from the dossier either.
 *
 * `discoveredVia` is the live part. A non-empty array means the claim was
 * first met on Wikipedia and the primary source has not been reached yet;
 * `nommerSources.test.ts` refuses to let a chapter ship while any of its
 * sources still carries one, and the named exemption there can only shrink.
 */

import type { DossierSource, SourceKey } from "./types";

// @req REQ-113
export const NOMMER_BIBLIOGRAPHY: Record<SourceKey, DossierSource> = {
  // ── Le peuple ────────────────────────────────────────────────────────────
  "ethnologue-her": {
    sourceKey: "ethnologue-her",
    title: "Ethnologue: Languages of the World — Herero (her)",
    authors: ["SIL International"],
    publicationYear: 2024,
    publisher: "SIL International",
    url: "https://www.ethnologue.com/language/her/",
    standing: "official",
    sourceKind: "linguistic_reference",
    notes:
      "Références le glossonyme otjiherero et l'ethnonyme Ovaherero. Déjà citée par la fiche PPL_HERERO du corpus. Elle n'atteste aucune connotation péjorative attachée à « Herero » — c'est précisément ce que le chapitre lui fait dire.",
    discoveredVia: [],
  },
  "afrik-ppl-herero": {
    sourceKey: "afrik-ppl-herero",
    title: "EthniAfrica — dossier d'appellation PPL_HERERO",
    authors: ["EthniAfrica"],
    publicationYear: 2026,
    publisher: "EthniAfrica",
    url: null,
    standing: "referenced",
    sourceKind: "repository",
    notes:
      "Le corpus lui-même : dataset/source/afrik/noms/PPL_HERERO.json. Cité pour la formulation du contre-exemple, dont la prudence est reprise mot pour mot.",
    discoveredVia: [],
  },
  "afrik-ppl-dinka": {
    sourceKey: "afrik-ppl-dinka",
    title: "EthniAfrica — fiche PPL_DINKA, chapitre Appellations",
    authors: ["EthniAfrica"],
    publicationYear: 2026,
    publisher: "EthniAfrica",
    url: null,
    standing: "referenced",
    sourceKind: "repository",
    notes:
      "Le corpus atteste l'origine arabe de l'exonyme et sa reprise par l'administration anglo-égyptienne, ainsi que la montée de « Jieng » dans les revendications depuis 2011. Il ne cite lui-même aucune source secondaire pour l'étymologie — voir la remontée demandée.",
    discoveredVia: [],
  },
  "britannica-khoekhoe": {
    sourceKey: "britannica-khoekhoe",
    title: "Khoekhoe",
    authors: ["Encyclopædia Britannica"],
    publicationYear: 2024,
    publisher: "Encyclopædia Britannica",
    url: "https://www.britannica.com/topic/Khoekhoe",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Atteste « Hottentot » comme forge des colons néerlandais et afrikaners, probablement par imitation des clics, et « Khoekhoe » (« hommes des hommes ») comme endonyme. N'établit pas la datation précise de la première attestation.",
    discoveredVia: [],
  },
  "saho-khoisan": {
    sourceKey: "saho-khoisan",
    title: "The Khoisan",
    authors: ["South African History Online"],
    publicationYear: 2024,
    publisher: "South African History Online",
    url: "https://sahistory.org.za/article/khoisan",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Atteste « San » comme terme khoekhoe déprécié désignant des chasseurs-cueilleurs sans bétail, et l'adoption de « San » par l'anthropologie occidentale dans les années 1970.",
    discoveredVia: [],
  },
  "san-council-2003": {
    sourceKey: "san-council-2003",
    title:
      "Préférence exprimée en 2003 pour les noms de nation (ǂKhomani, Ju|'hoansi, !Xun…)",
    authors: [],
    publicationYear: 2003,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "community",
    notes:
      "À citer par la voix qui l'a exprimée — South African San Council ou WIMSA — et non par un tiers. Une préférence collective sourcée par un observateur extérieur reproduirait l'exact défaut que le chapitre décrit.",
    discoveredVia: ["en.wikipedia"],
  },

  // ── Le pays ──────────────────────────────────────────────────────────────
  "shaw-times-nigeria": {
    sourceKey: "shaw-times-nigeria",
    title: "Flora Shaw et la forge du nom « Nigeria »",
    authors: ["Flora Shaw"],
    publicationYear: null,
    publisher: "The Times",
    url: null,
    standing: "needs_review",
    sourceKind: "archive",
    notes:
      "Deux dates circulent et le dépôt se contredit : dataset/source/afrik/pays/NGA.json écrit 1914 (l'amalgamation), la littérature secondaire donne 1897 pour l'article du Times. Trancher sur l'article lui-même, puis corriger la fiche — sans quoi deux surfaces du site se contredisent sur le fait le plus mémorable du chapitre.",
    discoveredVia: ["fr.wikipedia", "en.wikipedia"],
  },
  "afrik-pays-ben": {
    sourceKey: "afrik-pays-ben",
    title: "EthniAfrica — fiche BEN, étymologie",
    authors: ["EthniAfrica"],
    publicationYear: 2026,
    publisher: "EthniAfrica",
    url: null,
    standing: "needs_review",
    sourceKind: "repository",
    notes:
      "Le corpus déclare le choix de 1975 et son motif — la neutralité ethnique. Comme les 53 autres étymologies de pays, elle n'est adossée à aucune source : content.sources[] ne documente que la démographie.",
    discoveredVia: [],
  },
  "afrik-pays-gha": {
    sourceKey: "afrik-pays-gha",
    title: "EthniAfrica — fiche GHA, étymologie",
    authors: ["EthniAfrica"],
    publicationYear: 2026,
    publisher: "EthniAfrica",
    url: null,
    standing: "needs_review",
    sourceKind: "repository",
    notes:
      "Le corpus déclare le choix de 1957 par Nkrumah et note lui-même que l'empire du Ghana ne se trouvait pas sur le territoire actuel. Non sourcée, comme les 53 autres.",
    discoveredVia: [],
  },

  // ── La personne ──────────────────────────────────────────────────────────
  "afrik-naming-taxonomy": {
    sourceKey: "afrik-naming-taxonomy",
    title: "EthniAfrica — taxonomie des systèmes de nomination (ETNI-1460)",
    authors: ["EthniAfrica"],
    publicationYear: 2026,
    publisher: "EthniAfrica",
    url: null,
    standing: "referenced",
    sourceKind: "repository",
    notes:
      "docs/design/naming-subtype-taxonomy.md. Fixe le vocabulaire des systèmes de nomination et distingue explicitement les fiches systemes_onomastiques/ des dossiers noms/.",
    discoveredVia: [],
  },
  "civil-registration-surnames": {
    sourceKey: "civil-registration-surnames",
    title: "L'état civil colonial et la fixation du nom de famille héréditaire",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "academic",
    notes:
      "Thèse-charnière du chapitre : entrer dans un registre exigeait un nom de forme européenne, et le nom devenait héréditaire par le seul fait d'avoir été écrit. Deux sources au minimum, dont de préférence un instrument administratif colonial. En l'état c'est l'affirmation la plus large et la moins étayée du dossier.",
    discoveredVia: ["en.wikipedia"],
  },
  "zaire-authenticite-1972": {
    sourceKey: "zaire-authenticite-1972",
    title:
      "Recours à l'authenticité : le postnom et l'abandon des prénoms chrétiens",
    authors: [],
    publicationYear: 1972,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "government",
    notes:
      "Deux dates au jour près — 27 octobre 1971 pour le recours à l'authenticité, 12 janvier 1972 pour les prénoms — exigent une source au jour près : le Journal officiel de la République du Zaïre, ou à défaut un travail académique qui cite l'instrument.",
    discoveredVia: ["fr.wikipedia"],
  },
  "dec-040": {
    sourceKey: "dec-040",
    title:
      "DEC-040 — un nom de famille ne rend jamais l'origine ethnique d'une personne",
    authors: ["EthniAfrica"],
    publicationYear: 2026,
    publisher: "EthniAfrica",
    url: null,
    standing: "referenced",
    sourceKind: "repository",
    notes:
      "Doctrine du projet, appliquée dans PatronymeBearersSection et dans le sérialiseur des patronymes. Au statut Pending sur Confluence à la date de rédaction : à passer en Accepted avant publication, sinon la page est en avance sur la décision.",
    discoveredVia: [],
  },

  // ── La langue ────────────────────────────────────────────────────────────
  "bleek-1862": {
    sourceKey: "bleek-1862",
    title: "A Comparative Grammar of South African Languages",
    authors: ["Wilhelm Heinrich Immanuel Bleek"],
    publicationYear: 1862,
    publisher: "Trübner & Co.",
    url: null,
    standing: "needs_review",
    sourceKind: "academic",
    notes:
      "L'ouvrage où « bantou » est forgé comme étiquette de classification, à partir du zoulou abantu. Domaine public : à citer par son URL de numérisation, et à vérifier sur la page où ba-ntu est effectivement construit.",
    discoveredVia: ["en.wikipedia"],
  },
  "britannica-bleek": {
    sourceKey: "britannica-bleek",
    title: "Wilhelm Bleek",
    authors: ["Encyclopædia Britannica"],
    publicationYear: 2024,
    publisher: "Encyclopædia Britannica",
    url: "https://www.britannica.com/biography/Wilhelm-Bleek",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Atteste la biographie de Bleek et sa position d'interprète puis de bibliothécaire de l'administration du Cap — le fait que le chapitre retient, parce qu'il situe la forge du mot dans un bureau colonial.",
    discoveredVia: [],
  },
  "saho-bantu": {
    sourceKey: "saho-bantu",
    title: "Defining the term 'Bantu'",
    authors: ["South African History Online"],
    publicationYear: 2024,
    publisher: "South African History Online",
    url: "https://sahistory.org.za/article/defining-term-bantu",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Atteste la forge de 1862 et le devenir politique du mot en Afrique du Sud. Ne suffit pas pour le Bantu Education Act de 1953, qu'il faut citer sur son propre texte.",
    discoveredVia: [],
  },
  "bantu-education-act-1953": {
    sourceKey: "bantu-education-act-1953",
    title: "Bantu Education Act, No. 47 of 1953",
    authors: ["Union of South Africa"],
    publicationYear: 1953,
    publisher: "Union of South Africa",
    url: null,
    standing: "needs_review",
    sourceKind: "government",
    notes:
      "Le texte de loi lui-même, pas sa notice : c'est l'instrument qui institutionnalise le glissement d'une classification linguistique vers une catégorie de scolarisation séparée.",
    discoveredVia: ["en.wikipedia"],
  },

  // ── La chose ─────────────────────────────────────────────────────────────
  "vlisco-helmond": {
    sourceKey: "vlisco-helmond",
    title:
      "Vlisco et l'imitation industrielle du batik javanais (Helmond, à partir de 1846)",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "archive",
    notes:
      "La date de 1846 et le nom de Pieter Fentener van Vlissingen passent aujourd'hui par des relais tertiaires. À citer sur l'archive d'entreprise Vlisco ou sur un travail d'histoire textile.",
    discoveredVia: ["en.wikipedia"],
  },
  "trc-leiden-vlisco": {
    sourceKey: "trc-leiden-vlisco",
    title: "VLISCO and West African printed textiles",
    authors: ["Textile Research Centre, Leiden"],
    publicationYear: 2024,
    publisher: "Textile Research Centre, Leiden",
    url: "https://trc-leiden.nl/trc-digital-exhibition/index.php/textile-travels/item/275-vlisco-and-west-african-printed-textiles",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Atteste l'impression au rouleau plutôt que la réserve à la cire, et le retour des soldats ouest-africains des Indes néerlandaises comme vecteur d'entrée du batik.",
    discoveredVia: [],
  },
  "conversation-kente": {
    sourceKey: "conversation-kente",
    title:
      "What are the origins of the Asante's famous kente cloth? I traced its history to find out",
    authors: [],
    publicationYear: 2025,
    publisher: "The Conversation",
    url: "https://theconversation.com/what-are-the-origins-of-the-asantes-famous-kente-cloth-i-traced-its-history-to-find-out-250093",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Travail d'historien sur l'origine du kente. À utiliser pour le tissage à la bande akan et éwé, pas pour les datations hautes (« dès 1000 av. J.-C. ») qui circulent ailleurs et ne sont pas établies.",
    discoveredVia: [],
  },
  "kente-nwentoma": {
    sourceKey: "kente-nwentoma",
    title:
      "Les appellations du kente : nwentoma en akan, kete en éwé, « kita » en Afrique de l'Ouest francophone",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "linguistic_reference",
    notes:
      "C'est le cœur du cas : l'objet est africain, c'est le nom francophone qui est exogène. Il faut une source linguistique sur nwentoma et sur la fixation de la forme « kita », pas un site marchand.",
    discoveredVia: ["fr.wikipedia"],
  },
  "coffee-qahwa": {
    sourceKey: "coffee-qahwa",
    title: "Étymologie de « café » : qahwa, kahve, et la question de Kaffa",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "linguistic_reference",
    notes:
      "Un dictionnaire étymologique de référence, qui dira aussi que la filiation Kaffa → café est discutée, là où qahwa → kahve → café est solide. Le chapitre doit poser la première comme hypothèse et la seconde comme établie.",
    discoveredVia: ["en.wikipedia"],
  },
  "cocobod-cocoa-story": {
    sourceKey: "cocobod-cocoa-story",
    title: "The Ghana Cocoa Story",
    authors: ["Ghana Cocoa Board"],
    publicationYear: 2024,
    publisher: "Ghana Cocoa Board",
    url: "https://cocobod.gh/cocoa-story",
    standing: "official",
    sourceKind: "government",
    notes:
      "L'institution ghanéenne du cacao atteste l'introduction de 1879 par Tetteh Quarshie depuis Fernando Po. Les plantations des missions bâloises (1857, Aburi) et la diffusion depuis São Tomé (1886) sont trois dates distinctes, à vérifier séparément.",
    discoveredVia: [],
  },
  "drewal-2012": {
    sourceKey: "drewal-2012",
    title:
      "Identification de la charmeuse de serpents de la chromolithographie de Mami Wata",
    authors: ["Henry John Drewal"],
    publicationYear: 2012,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "academic",
    notes:
      "Pivot du cas Mami Wata : l'affiche allemande des années 1880 représente une artiste se produisant au zoo de Hambourg sous le nom de scène samoan Nala Damajanti. À citer par son DOI. Voir aussi Drewal 2008, Mami Wata: Arts for Water Spirits in Africa and Its Diasporas.",
    discoveredVia: ["en.wikipedia"],
  },
  "mami-wata-pidgin": {
    sourceKey: "mami-wata-pidgin",
    title: "L'étymologie disputée de « Mami Wata »",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "academic",
    notes:
      "La lecture dominante fait du théonyme un pidgin anglais (« mother water ») ; d'autres filiations sont proposées et contestées. Le chapitre doit publier le désaccord, pas en trancher un côté — et la datation de la convergence (fin du XIXe siècle) est une thèse d'historien, à sourcer comme telle.",
    discoveredVia: ["en.wikipedia"],
  },
};
