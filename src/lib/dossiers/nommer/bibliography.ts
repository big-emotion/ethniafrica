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
      "La préférence de 2003 pour les noms de nation est attestée par plusieurs relais concordants, mais sa formulation d'origine n'a pas été retrouvée. Où chercher : les archives de WIMSA, qui rédige dès 1998 le premier Media and Research Contract des San, et le South African San Council, informel depuis 1996 et représentant trois communautés au conseil de WIMSA. Tant que le texte n'est pas retrouvé, le chapitre attribue la demande sans la citer — ce qui reproduit en petit le défaut qu'il décrit, et doit être corrigé plutôt qu'excusé.",
    discoveredVia: ["en.wikipedia"],
  },

  // ── Le pays ──────────────────────────────────────────────────────────────
  "shaw-times-nigeria": {
    sourceKey: "shaw-times-nigeria",
    title: "How true is the claim that Flora Shaw coined the name Nigeria ?",
    authors: ["Dubawa"],
    publicationYear: 2020,
    publisher: "Dubawa (Premium Times Centre for Investigative Journalism)",
    url: "https://dubawa.org/nigeria60-how-true-is-claim-that-flora-shaw-british-journalist-coined-the-name-nigeria/",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Établit la date — 8 janvier 1897, The Times de Londres — et la citation de l'article. Distingue « suggérer » de « imposer » : le nom n'est officialisé qu'en 1914, par Lugard, à l'amalgamation. Signale aussi des occurrences antérieures de « Nigerian » chez William Cole (1862) et Richard Burton (1863), sans trancher si elles sont contemporaines ou ajoutées à l'édition. La fiche NGA.json disait 1914 et attribuait l'officialisation à Shaw : corrigée avec cette source, qui est la première étymologie sourcée du corpus pays.",
    discoveredVia: [],
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
    url: "https://www.refworld.org/docid/440ed749a.html",
    standing: "official",
    sourceKind: "government",
    notes:
      "Réponse à une demande d'information de la Commission de l'immigration et du statut de réfugié du Canada, qui cite les instruments. Elle atteste le 12 janvier 1972 pour la décision du président et du bureau du MPR, et surtout l'ordonnance-loi du 30 août 1972 : elle introduit au Code pénal une sanction contre tout ministre du culte qui conférerait un prénom étranger lors d'un baptême. C'est cette dernière qui fait du recours à l'authenticité une contrainte de droit et non une exhortation.",
    discoveredVia: [],
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
    url: "https://archive.org/details/comparativegramm00blee",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "L'ouvrage où « bantou » est forgé comme étiquette de classification, à partir du zoulou abantu. Domaine public, numérisé par l'Internet Archive et cité ici par cette numérisation plutôt que par une notice. Ce qui reste ouvert est la page exacte où ba-ntu est construit : le chapitre n'en dépend pas, mais une vérification la donnerait.",
    discoveredVia: [],
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
  "bantu-class-prefixes": {
    sourceKey: "bantu-class-prefixes",
    title:
      "Les préfixes de classe nominale et la distinction langue / peuple / pays",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: "https://www2.iath.virginia.edu/swahili/sect2.html",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Le système de classes nominales, décrit par le cours de swahili de l'Université de Virginie. La classe ki- / isi- / se- forme le nom de la langue et des faits de culture, la classe ba- le collectif humain, la classe mo- l'individu : Botswana le pays, Batswana le peuple, Motswana une personne, Setswana la langue — quatre mots sur une racine. L'usage anglais et français retient le radical nu (Swahili, Tswana, Ndebele) là où la langue dit Kiswahili, Setswana, Sindebele.",
    discoveredVia: [],
  },
  "bantu-education-act-1953": {
    sourceKey: "bantu-education-act-1953",
    title: "Bantu Education Act, No. 47 of 1953",
    authors: ["Union of South Africa"],
    publicationYear: 1953,
    publisher: "Union of South Africa",
    url: "https://sahistory.org.za/archive/bantu-education-act-act-no-47-1953",
    standing: "official",
    sourceKind: "government",
    notes:
      "Le texte de loi lui-même, dans l'archive législative de South African History Online. Sanctionné le 5 octobre 1953, en vigueur au 1er janvier 1954. C'est l'instrument qui institutionnalise le glissement d'une classification linguistique vers une catégorie de scolarisation séparée. Également numérisé par DISA (UKZN) et par l'Internet Archive.",
    discoveredVia: [],
  },

  // ── La chose ─────────────────────────────────────────────────────────────
  "vlisco-helmond": {
    sourceKey: "vlisco-helmond",
    title:
      "Vlisco et l'imitation industrielle du batik javanais (Helmond, à partir de 1846)",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: "https://trc-leiden.nl/trc-digital-exhibition/index.php/out-of-asia/item/199-8-vlisco-and-asian-textiles",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Le Textile Research Centre de Leyde atteste la fondation : Pieter Fentener van Vlissingen (1826-1868) rachète en 1846 une imprimerie textile à Helmond sous le nom P. Fentener van Vlissingen & Co, devenu Vlisco en 1927. Il atteste aussi le point qui compte pour le chapitre — l'imitation du batik des Indes néerlandaises est imprimée au rouleau, et non réservée à la cire.",
    discoveredVia: [],
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
    url: "https://en.wiktionary.org/wiki/%D9%82%D9%87%D9%88%D8%A9",
    standing: "referenced",
    sourceKind: "linguistic_reference",
    notes:
      "La notice étymologique de l'arabe qahwa. Elle donne la chaîne solide — qahwa, emprunté en turc kahve, puis dans les langues européennes — et l'argument qui affaiblit l'autre hypothèse : qahwa désigne un vin en arabe plus d'un demi-millénaire avant l'existence du royaume de Kaffa, ce qui rend le rapprochement improbable plutôt que simplement discuté. Aucun document ne tranche définitivement, et le chapitre le dit.",
    discoveredVia: [],
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
  "basel-mission-cocoa": {
    sourceKey: "basel-mission-cocoa",
    title:
      "The Introduction of Cocoa in the Gold Coast: The Roles of the Basel Mission and Tetteh Quarshie",
    authors: [],
    publicationYear: null,
    publisher: "Basel Mission Forum",
    url: "https://baselfo.ch/the-introduction-of-cocoa-in-the-gold-coast-the-roles-of-the-basel-mission-and-tetteh-quarshie/",
    standing: "referenced",
    sourceKind: "academic",
    notes:
      "Porte la nuance que le récit ghanéen officiel laisse de côté : des missionnaires néerlandais plantent du cacao sur la côte dès 1815, les missionnaires bâlois à Aburi en 1857, et Quarshie — formé dans un atelier de la mission de Bâle à Akropong — introduit ses cabosses de Fernando Po en 1879. L'attribution est disputée : un historien l'attribue au révérend Hass, tandis que le professeur Perbi reconnaît à Quarshie d'avoir popularisé la culture plutôt que de l'avoir apportée le premier.",
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
      "Pivot du cas Mami Wata : c'est Drewal qui rattache l'affiche de cirque à l'iconographie de l'esprit des eaux. Le chapitre de 2012 n'a pas été retrouvé par son DOI — c'est ce qui manque ici, et rien d'autre : l'identité de l'artiste et la maison d'impression sont établies par ailleurs. Voir aussi Drewal 2008, Mami Wata: Arts for Water Spirits in Africa and Its Diasporas. Une première rédaction, appuyée sur un résumé de seconde main, la disait samoane et la faisait se produire au zoo de Hambourg : les deux étaient faux.",
    discoveredVia: ["en.wikipedia"],
  },
  "nala-damajanti": {
    sourceKey: "nala-damajanti",
    title: "Nala Damajanti, de son vrai nom Mathilde Marie Amélia Poupon",
    authors: [],
    publicationYear: null,
    publisher: null,
    url: null,
    standing: "needs_review",
    sourceKind: "academic",
    notes:
      "Établit que la charmeuse de serpents de l'affiche était française — née le 4 juillet 1861 à Nantey — et se produisait sous un personnage oriental fabriqué, se disant tour à tour hindoue, des « provinces françaises de l'Inde » ou de Pondichéry. Barnum à partir de 1885, Folies Bergère le 18 février 1887. La chromolithographie est d'Adolph Friedländer, à Hambourg. À reprendre sur un travail d'histoire du spectacle plutôt que sur une notice encyclopédique.",
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
