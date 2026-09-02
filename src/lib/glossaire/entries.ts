/**
 * The atlas's vocabulary, defined once.
 *
 * Three surfaces publish onomastics — Appellations, Patronymes, the anecdotes
 * bank — and until this file none of them defined a single term. The word
 * *endonyme* was shown to a reader with nowhere to learn what it meant.
 *
 * Every entry carries an example the corpus actually holds, or declares that
 * it does not and says why (atlas charter §4). Nothing here is defined into
 * the void without admitting it.
 */

import type { GlossaryEntry } from "./types";

// @req REQ-144
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // ── D'où vient le nom ───────────────────────────────────────────────────
  {
    id: "autonyme",
    fr: "Autonyme",
    en: "Autonym",
    family: "origine",
    definition:
      "Le nom qu'un groupe se donne et revendique. Tout autonyme est un endonyme ; l'inverse n'est pas garanti — un nom peut circuler à l'intérieur sans que personne y tienne.",
    corpusExample:
      "Jieng, préféré par les intéressés là où l'usage international dit Dinka.",
    corpusPresence: "instantiated",
    seeAlso: ["endonyme", "exonyme"],
    chapterRef: "le-peuple",
    sourceRefs: ["afrik-ppl-dinka"],
  },
  {
    id: "emique-etique",
    fr: "Émique / étique",
    en: "Emic / etic",
    family: "origine",
    definition:
      "Émique : décrire avec les catégories des intéressés. Étique : décrire avec celles de l'observateur. L'atlas fait porter l'émique et signale l'étique quand il ne peut pas faire autrement.",
    corpusExample:
      "Un peuple rangé sous une famille linguistique forgée en 1862 est décrit étiquement, et la fiche le dit.",
    corpusPresence: "instantiated",
    seeAlso: ["reification-ethnique"],
    chapterRef: "la-langue",
  },
  {
    id: "endonyme",
    fr: "Endonyme",
    en: "Endonym",
    family: "origine",
    definition:
      "Le nom d'un groupe dans sa propre langue. Le corpus en déclare 798 pour 800 fiches — et 3 207 noms venus du dehors.",
    corpusExample: "Ovaherero, « les possesseurs de bétail » en otjiherero.",
    corpusPresence: "instantiated",
    seeAlso: ["autonyme", "exonyme"],
    chapterRef: "le-peuple",
    sourceRefs: ["afrik-ppl-herero"],
  },
  {
    id: "etymologie-populaire",
    fr: "Étymologie populaire",
    en: "Folk etymology",
    family: "origine",
    definition:
      "Une origine expliquée par ressemblance sonore, transmise, et fausse. Elle circule d'autant mieux qu'elle est jolie — c'est le risque propre à un dossier sur les noms.",
    corpusExample:
      "La filiation de Kaffa vers « café » est séduisante et discutée ; celle de qahwa vers kahve ne l'est pas.",
    corpusPresence: "instantiated",
    chapterRef: "la-chose",
    sourceRefs: ["coffee-qahwa"],
  },
  {
    id: "exonyme",
    fr: "Exonyme",
    en: "Exonym",
    family: "origine",
    definition:
      "Le nom donné à un groupe depuis le dehors — un voisin, un marchand, une administration. Ni forcément hostile, ni forcément colonial.",
    corpusExample:
      "3 207 exonymes au corpus ; 120 fiches attribuent le leur à des voisins, 75 à l'arabe.",
    corpusPresence: "instantiated",
    seeAlso: ["endonyme", "exonyme-depreciatif"],
    chapterRef: "le-peuple",
  },
  {
    id: "exonyme-depreciatif",
    fr: "Exonyme dépréciatif",
    en: "Pejorative exonym",
    family: "origine",
    definition:
      "Un exonyme dont la forme même rabaisse : une moquerie, une insulte, un sobriquet devenu officiel. 87 fiches en signalent un.",
    corpusExample:
      "« Hottentot », forgé par des colons néerlandais en imitant les consonnes claquantes du khoekhoe.",
    corpusPresence: "instantiated",
    seeAlso: ["exonyme"],
    chapterRef: "le-peuple",
    sourceRefs: ["britannica-khoekhoe"],
  },
  {
    id: "graphie-historique",
    fr: "Graphie historique",
    en: "Historical spelling",
    family: "origine",
    definition:
      "Une orthographe attestée à une époque, conservée pour que les sources anciennes restent retrouvables. Elle n'est ni un endonyme ni un exonyme : c'est une trace d'écriture.",
    corpusExample: "« Denka » pour Dinka, dans la littérature coloniale.",
    corpusPresence: "instantiated",
    seeAlso: ["exonyme"],
    chapterRef: "le-peuple",
  },
  {
    id: "onomastique",
    fr: "Onomastique",
    en: "Onomastics",
    family: "origine",
    definition:
      "La science des noms propres — qui nomme, quand, et sous quelle autorité. C'est l'axe de lecture de cet atlas plus qu'une discipline qu'il pratiquerait.",
    corpusExample:
      "Les cinq chapitres de ce dossier sont cinq régimes onomastiques.",
    corpusPresence: "instantiated",
    seeAlso: ["ethnonyme", "toponyme", "anthroponyme"],
  },

  // ── Ce qui est nommé ────────────────────────────────────────────────────
  {
    id: "anthroponyme",
    fr: "Anthroponyme",
    en: "Anthroponym",
    family: "objet",
    definition:
      "Le nom d'une personne, tous systèmes confondus — prénom, nom de clan, nom de louange, nom d'attribution. Le terme générique que « patronyme » prétend à tort recouvrir.",
    corpusExample: "Les trente fiches de nom du corpus.",
    corpusPresence: "instantiated",
    seeAlso: ["patronyme-matronyme", "jamu", "oriki", "nisba"],
    chapterRef: "la-personne",
    sourceRefs: ["afrik-naming-taxonomy"],
  },
  {
    id: "chaine-patronymique",
    fr: "Chaîne patronymique",
    en: "Patronymic chain",
    family: "objet",
    definition:
      "Un système où l'on se nomme en enfilant ses ascendants : le prénom du père devient le second nom de l'enfant, et rien ne se fige d'une génération à l'autre.",
    corpusExample:
      "Quatre fiches déclarent une transmission non héréditaire de ce type.",
    corpusPresence: "instantiated",
    absenceReason: undefined,
    seeAlso: ["patronyme-matronyme", "fixation-patronymique"],
    chapterRef: "la-personne",
    sourceRefs: ["afrik-naming-taxonomy"],
  },
  {
    id: "choronyme",
    fr: "Choronyme",
    en: "Choronym",
    family: "objet",
    definition:
      "Le nom d'une région ou d'un territoire, par opposition à un point sur une carte.",
    corpusExample:
      "Bilād as-sūdān, « le pays des Noirs », employé par les géographes arabes, devenu le Soudan.",
    corpusPresence: "instantiated",
    seeAlso: ["toponyme", "hydronyme", "oronyme"],
    chapterRef: "le-pays",
  },
  {
    id: "ethnonyme",
    fr: "Ethnonyme",
    en: "Name of a people",
    family: "objet",
    definition:
      "Le nom d'un peuple. C'est l'objet central de l'atlas, et le plus disputé : 460 fiches déclarent le leur contesté ou hérité de la colonisation.",
    corpusExample:
      "Dinka et Jieng désignent le même peuple, depuis deux côtés.",
    corpusPresence: "instantiated",
    seeAlso: ["exonyme", "endonyme", "tribu"],
    chapterRef: "le-peuple",
  },
  {
    id: "glossonyme",
    fr: "Glossonyme",
    en: "Glossonym",
    family: "objet",
    definition:
      "Le nom d'une langue. Un glossonyme n'est pas un ethnonyme, et une famille de langues ne décrit aucune population.",
    corpusExample:
      "Le corpus range 800 peuples sous 24 familles ; la plus vaste porte un mot forgé en 1862.",
    corpusPresence: "instantiated",
    seeAlso: ["ethnonyme", "reification-ethnique"],
    chapterRef: "la-langue",
    sourceRefs: ["bleek-1862"],
  },
  {
    id: "hydronyme",
    fr: "Hydronyme",
    en: "Hydronym",
    family: "objet",
    definition: "Le nom d'un cours ou d'une étendue d'eau.",
    corpusExample:
      "Le fleuve Niger a donné son nom à deux pays, et le lac Tchad à un troisième.",
    corpusPresence: "instantiated",
    seeAlso: ["toponyme", "choronyme", "oronyme"],
    chapterRef: "le-pays",
  },
  {
    id: "jamu",
    fr: "Jamu",
    en: "Jamu (Mande clan name)",
    family: "objet",
    definition:
      "Nom de clan mandingue. Ni patronyme ni nom de famille : une appartenance, transmise mais aussi accordée — par alliance, par clientèle, par captivité.",
    corpusExample: "Dix-huit fiches du corpus déclarent un nom de clan.",
    corpusPresence: "instantiated",
    seeAlso: ["anthroponyme", "oriki"],
    chapterRef: "la-personne",
    sourceRefs: ["dec-040"],
  },
  {
    id: "nisba",
    fr: "Nisba",
    en: "Nisba",
    family: "objet",
    definition:
      "Nom d'attribution arabo-berbère, formé sur un lieu, un groupe d'origine ou un métier. La littérature dit « tribu » là où l'atlas écrit « groupe » — la règle vaut pour le monde arabe comme pour le reste.",
    corpusExample: "Deux fiches du corpus déclarent ce système.",
    corpusPresence: "instantiated",
    seeAlso: ["anthroponyme"],
    chapterRef: "la-personne",
    sourceRefs: ["afrik-naming-taxonomy"],
  },
  {
    id: "nom-totemique",
    fr: "Nom totémique clanique",
    en: "Totemic clan name",
    family: "objet",
    definition:
      "Nom de clan attaché à un animal ou à une plante, souvent avec un interdit alimentaire et une liste fermée de prénoms permis.",
    corpusExample: "Quatre fiches du corpus déclarent ce système.",
    corpusPresence: "instantiated",
    seeAlso: ["jamu", "anthroponyme"],
    chapterRef: "la-personne",
    sourceRefs: ["afrik-naming-taxonomy"],
  },
  {
    id: "oriki",
    fr: "Oríkì",
    en: "Oríkì",
    family: "objet",
    definition:
      "Nom de louange yoruba : une séquence qui dit la lignée, ses hauts faits et ses attributs. Il se récite plutôt qu'il ne s'inscrit.",
    corpusExample: "Deux fiches du corpus déclarent un nom de louange.",
    corpusPresence: "instantiated",
    seeAlso: ["jamu", "anthroponyme"],
    chapterRef: "la-personne",
    sourceRefs: ["afrik-naming-taxonomy"],
  },
  {
    id: "oronyme",
    fr: "Oronyme",
    en: "Oronym",
    family: "objet",
    definition: "Le nom d'un relief — montagne, massif, escarpement.",
    corpusExample:
      "Kirinyaga, « la montagne de blancheur » en kikuyu, a donné le Kenya.",
    corpusPresence: "instantiated",
    seeAlso: ["toponyme", "hydronyme", "choronyme"],
    chapterRef: "le-pays",
  },
  {
    id: "patronyme-matronyme",
    fr: "Patronyme / matronyme",
    en: "Patronym / matronym",
    family: "objet",
    definition:
      "Nom pris du père, ou de la mère. Ni l'un ni l'autre n'est universel : sur trente fiches, treize déclarent une transmission patrilinéaire, treize une autre voie, quatre aucune.",
    corpusExample:
      "Le nom de famille héréditaire est une manière de faire parmi d'autres, pas la règle.",
    corpusPresence: "instantiated",
    seeAlso: ["anthroponyme", "fixation-patronymique", "chaine-patronymique"],
    chapterRef: "la-personne",
    sourceRefs: ["afrik-naming-taxonomy"],
  },
  {
    id: "postnom",
    fr: "Postnom",
    en: "Postname",
    family: "objet",
    definition:
      "Nom porté après le prénom, institué en République du Zaïre le 12 janvier 1972 en remplacement des prénoms chrétiens, et conservé après la chute du régime qui l'avait décrété.",
    corpusPresence: "defined_only",
    absenceReason:
      "Aucune fiche de nom du corpus ne déclare le postnom comme système. Le terme est défini parce que le chapitre l'emploie, pas parce que l'atlas l'instancie.",
    seeAlso: ["anthroponyme", "tradition-inventee"],
    chapterRef: "la-personne",
    sourceRefs: ["zaire-authenticite-1972"],
  },
  {
    id: "theonyme",
    fr: "Théonyme",
    en: "Theonym",
    family: "objet",
    definition: "Le nom d'une divinité.",
    corpusExample:
      "Mami Wata : un nom collectif tardif, posé sur des divinités des eaux anciennes et multiples.",
    corpusPresence: "defined_only",
    absenceReason:
      "L'atlas ne tient pas de fiches de divinités. Le terme est défini parce que le chapitre « La chose » en a besoin.",
    seeAlso: ["transculturation"],
    chapterRef: "la-chose",
    sourceRefs: ["mami-wata-pidgin"],
  },
  {
    id: "toponyme",
    fr: "Toponyme",
    en: "Toponym",
    family: "objet",
    definition:
      "Le nom d'un lieu, toutes échelles confondues. La carte les aplatit tous en « nom de pays », et c'est cet aplatissement qui fait croire qu'un pays et un peuple se recouvrent.",
    corpusExample:
      "Les 54 fiches de pays renseignent toutes leur étymologie, et aucune ne la source.",
    corpusPresence: "instantiated",
    seeAlso: ["choronyme", "hydronyme", "oronyme"],
    chapterRef: "le-pays",
  },

  // ── Ce que nommer produit ───────────────────────────────────────────────
  {
    id: "asymetrie-documentaire",
    fr: "Asymétrie documentaire",
    en: "Documentary asymmetry",
    family: "effet",
    definition:
      "L'écart entre ce qui a été écrit sur un groupe et ce qu'il a écrit de lui-même. Elle mesure les archives, jamais les peuples.",
    corpusExample:
      "3 207 exonymes pour 798 autonymes — et 321 fiches sur 800 qui ne déclarent aucun statut.",
    corpusPresence: "instantiated",
    seeAlso: ["exonyme", "endonyme"],
    chapterRef: "le-peuple",
  },
  {
    id: "fixation-patronymique",
    fr: "Fixation patronymique",
    en: "Surname fixation",
    family: "effet",
    definition:
      "Le moment où un nom cesse d'être une manière de désigner pour devenir une entrée héréditaire de registre — par le seul fait d'avoir été écrit.",
    corpusExample:
      "L'état civil colonial exigeait un nom de forme européenne ; là où il n'en existait pas, l'agent en inscrivait un.",
    corpusPresence: "instantiated",
    seeAlso: ["patronyme-matronyme", "reification-ethnique"],
    chapterRef: "la-personne",
    sourceRefs: ["civil-registration-surnames"],
  },
  {
    id: "indigenisation",
    fr: "Indigénisation",
    en: "Indigenisation",
    family: "effet",
    definition:
      "L'appropriation par laquelle un objet venu d'ailleurs devient une chose d'ici — souvent en changeant de nom, jamais d'origine.",
    corpusExample:
      "Le wax est fabriqué aux Pays-Bas et nommé par ses acheteuses ouest-africaines.",
    corpusPresence: "instantiated",
    seeAlso: ["transculturation", "tradition-inventee"],
    chapterRef: "la-chose",
    sourceRefs: ["trc-leiden-vlisco"],
  },
  {
    id: "palier-de-source",
    fr: "Palier de source",
    en: "Source tier",
    family: "effet",
    definition:
      "Le degré d'autorité attaché à une citation : Officielle, Référencée, Non vérifiée — plus « En attente d'examen » quand personne n'a encore tranché. Rien n'est écarté ; tout est étiqueté.",
    corpusExample:
      "Chaque source de ce dossier porte le sien, y compris celles qui attendent encore leur source primaire.",
    corpusPresence: "instantiated",
    seeAlso: ["asymetrie-documentaire"],
  },
  {
    id: "reification-ethnique",
    fr: "Réification ethnique",
    en: "Ethnic reification",
    family: "effet",
    definition:
      "Le passage d'une catégorie de classement à une chose qui existe : ce qui était une manière de parler devient une population, avec un chiffre et une frontière.",
    corpusExample:
      "Le glissement de « bantou » : une famille de langues, puis un peuple, puis une catégorie de scolarisation séparée en 1953.",
    corpusPresence: "instantiated",
    seeAlso: ["tribu", "glossonyme", "emique-etique"],
    chapterRef: "la-langue",
    sourceRefs: ["bantu-education-act-1953"],
  },
  {
    id: "tradition-inventee",
    fr: "Tradition inventée",
    en: "Invented tradition",
    family: "effet",
    definition:
      "Une pratique récente qui se présente comme immémoriale — et qui est souvent d'autant plus efficace qu'elle est neuve.",
    corpusExample:
      "Le postnom, décrété en 1972, se porte aujourd'hui comme un héritage.",
    corpusPresence: "instantiated",
    seeAlso: ["postnom", "indigenisation"],
    chapterRef: "la-personne",
    sourceRefs: ["zaire-authenticite-1972"],
  },
  {
    id: "transculturation",
    fr: "Transculturation",
    en: "Transculturation",
    family: "effet",
    definition:
      "Deux cultures qui se rencontrent n'en absorbent pas une : elles produisent une troisième chose, et toutes deux en ressortent changées.",
    corpusExample:
      "Mami Wata et la chromolithographie hambourgeoise des années 1880.",
    corpusPresence: "instantiated",
    seeAlso: ["indigenisation", "theonyme"],
    chapterRef: "la-chose",
    sourceRefs: ["drewal-2012"],
  },
  {
    id: "tribu",
    fr: "Tribu",
    en: "Tribe",
    family: "effet",
    definition:
      "Terme d'administration coloniale, qui hiérarchise là où il prétend décrire. L'atlas écrit « peuple » partout, sans exception, et ne conserve celui-ci que pour en parler.",
    corpusExample:
      "Aucune des 800 fiches n'emploie le mot pour désigner ce qu'elle décrit.",
    corpusPresence: "defined_only",
    absenceReason:
      "Le terme est défini pour être écarté. Il n'instancie rien dans le corpus, et c'est le but.",
    seeAlso: ["ethnonyme", "reification-ethnique"],
    chapterRef: "le-peuple",
  },
];
