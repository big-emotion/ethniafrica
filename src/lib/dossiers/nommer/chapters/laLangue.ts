import type { DossierChapter } from "../types";

/**
 * Chapter four — the language.
 *
 * Written first of the five, and it is the template the others follow: one
 * word, one date, one archive, and a conflict that does not resolve. It is
 * also the chapter where the atlas has the most to lose, because it goes on
 * using the word it is criticising, and says so rather than quietly dropping
 * it.
 *
 * The register alternates by section — prose, table, prose, pairs, prose —
 * which is the rule the whole dossier is written to: never two consecutive
 * sections a reader takes in the same way.
 */
// @req REQ-113
export const CHAPITRE_LA_LANGUE: DossierChapter = {
  key: "la-langue",
  ordinal: "04",
  title: "La langue",
  question:
    "Le mot « bantou » range des centaines de peuples. Qui l'a forgé, et pour quoi faire ?",
  standfirst: {
    text: "Une étiquette née dans un bureau colonial classe aujourd'hui la plus grande famille linguistique du continent. Elle est scientifiquement utile et politiquement toxique, et l'atlas continue de l'employer.",
    sourceRefs: ["bleek-1862", "britannica-bleek"],
    figureRefs: ["corpus-language-families"],
  },
  measure: {
    value: "« bantou », 1862",
    unit: "première attestation",
    sourceRefs: ["bleek-1862"],
    figureRefs: [],
  },
  sections: [
    {
      id: "un-mot-forge-dans-un-bureau",
      stepLabel: "04 · La langue",
      heading: "Un mot forgé dans un bureau, en 1862",
      blocks: [
        {
          text: "L'atlas range ses 775 peuples sous vingt-quatre familles linguistiques. La plus vaste porte un nom qui n'a pas de locuteurs : personne ne s'est jamais dit « bantou » avant qu'un linguiste ne l'écrive.",
          sourceRefs: [],
          figureRefs: ["corpus-language-families", "corpus-peoples"],
        },
        {
          text: "Le mot est forgé en 1862 par Wilhelm Bleek, dans sa Comparative Grammar of South African Languages. Il prend au zoulou abantu, « les gens » — ba-, préfixe de pluriel humain, et -ntu, la personne — et en fait une étiquette de classification. Le geste est ordinaire en philologie comparée du XIXe siècle ; ce qui l'est moins, c'est le lieu.",
          sourceRefs: ["bleek-1862", "britannica-bleek"],
          figureRefs: [],
        },
        {
          text: "Bleek était interprète, puis bibliothécaire de l'administration du Cap. Il ne travaillait pas à côté du pouvoir colonial : il travaillait dedans, et lui fournissait des catégories. Cela ne rend pas sa grammaire fausse — l'unité généalogique des langues qu'il regroupe est admise aujourd'hui encore. Cela dit seulement d'où vient le mot, et à qui il a d'abord servi.",
          sourceRefs: ["britannica-bleek", "saho-bantu"],
          figureRefs: [],
        },
      ],
    },
    {
      id: "trois-temps-du-glissement",
      stepLabel: "04 · La langue",
      heading: "Trois glissements, et un seul est contesté",
      blocks: [
        {
          text: "Ce que la critique vise n'est pas la classification : c'est le trajet qu'un mot a fait depuis elle. Il descend d'une famille de langues à une population, puis d'une population à une catégorie administrative — et chaque descente est un pas que la précédente ne justifiait pas.",
          sourceRefs: ["saho-bantu"],
          figureRefs: [],
        },
      ],
      table: {
        caption:
          "Ce que « bantou » désigne, selon qui l'emploie et à quelle époque",
        columns: ["Ce que le mot désigne", "Qui l'emploie", "Statut"],
        rows: [
          {
            cells: [
              "Une famille de langues apparentées",
              "La linguistique comparée, depuis 1862",
              "Admis : la parenté généalogique n'est pas discutée",
            ],
            sourceRefs: ["bleek-1862", "saho-bantu"],
            figureRefs: [],
          },
          {
            cells: [
              "Un peuple, ou un ensemble de peuples",
              "L'ethnographie coloniale, puis l'usage courant",
              "Contesté : une famille de langues ne décrit aucune population",
            ],
            sourceRefs: ["saho-bantu"],
            figureRefs: [],
          },
          {
            cells: [
              "Une catégorie de population administrée",
              "L'État sud-africain, Bantu Education Act, 1953",
              "Le mot devient un instrument de ségrégation scolaire",
            ],
            sourceRefs: ["bantu-education-act-1953", "saho-bantu"],
            figureRefs: [],
          },
        ],
      },
    },
    {
      id: "ce-que-le-prefixe-portait",
      stepLabel: "04 · La langue",
      heading: "Ce que le préfixe portait, et que l'usage a coupé",
      blocks: [
        {
          text: "Les langues de cette famille marquent par un préfixe ce dont elles parlent : la langue, la personne, le peuple, le pays. Ce préfixe n'est pas un ornement — c'est la grammaire qui distingue une langue de ceux qui la parlent, précisément la distinction que le chapitre défend.",
          sourceRefs: ["bantu-class-prefixes"],
          figureRefs: [],
        },
        {
          text: "Le tswana le montre en quatre mots sur une seule racine : Botswana le pays, Batswana le peuple, Motswana une personne, Setswana la langue. Là où le français et l'anglais disent « tswana » pour les quatre, la langue distinguait.",
          sourceRefs: ["bantu-class-prefixes"],
          figureRefs: [],
        },
        {
          text: "L'usage européen a coupé le préfixe. Ce qui reste est un radical nu qui sert indifféremment de nom de langue, de nom de peuple et d'adjectif — et l'ambiguïté que l'atlas passe son temps à défaire est en partie née là.",
          sourceRefs: ["bantu-class-prefixes"],
          figureRefs: [],
        },
      ],
      pairs: [
        {
          endonym: "isiZulu",
          endonymGloss: "isi-, la langue ; le peuple est amaZulu",
          exonym: "zoulou",
          imposedBy: "usage européen, préfixe de classe supprimé",
          pejorative: false,
          sourceRefs: ["bantu-class-prefixes"],
        },
        {
          endonym: "Setswana",
          endonymGloss: "se-, la manière et la langue ; le peuple est Batswana",
          exonym: "tswana",
          imposedBy: "usage européen, préfixe de classe supprimé",
          pejorative: false,
          sourceRefs: ["bantu-class-prefixes"],
        },
        {
          endonym: "Otjiherero",
          endonymGloss: "otji-, la langue ; le peuple est Ovaherero",
          exonym: "herero",
          imposedBy: "contact colonial du XIXe siècle",
          pejorative: false,
          sourceRefs: ["ethnologue-her", "afrik-ppl-herero"],
        },
        {
          endonym: "Kiswahili",
          endonymGloss:
            "ki-, la langue ; le nom vient de l'arabe sawāḥil, « les côtes »",
          exonym: "swahili",
          imposedBy:
            "exonyme arabe devenu glossonyme, puis repris sans son préfixe",
          pejorative: false,
          sourceRefs: ["bantu-class-prefixes"],
        },
      ],
    },
    {
      id: "un-cas-qui-ne-se-resout-pas",
      stepLabel: "04 · La langue",
      heading: "Un cas qui ne se résout pas",
      blocks: [
        {
          text: "En Afrique du Sud, « bantou » est une insulte. Le mot a nommé un ministère, un type d'école et une catégorie de citoyens de seconde classe, et cette mémoire ne se dissout pas parce que la linguistique, elle, l'emploie sans arrière-pensée.",
          sourceRefs: ["saho-bantu", "bantu-education-act-1953"],
          figureRefs: [],
        },
        {
          text: "Partout ailleurs, il reste le terme technique standard, et aucun substitut ne recouvre la même famille. « Niger-congo » désigne un ensemble bien plus large ; les périphrases régionales laissent dehors la moitié des langues concernées. Renoncer au mot, ce serait renoncer à dire une parenté réelle.",
          sourceRefs: ["saho-bantu"],
          figureRefs: [],
        },
        {
          text: "L'atlas tranche donc dans un seul sens : il garde le mot et il l'explique. C'est l'application la plus nette de sa propre doctrine — rien n'est interdit, tout est étiqueté — et c'est aussi la position la moins confortable, parce qu'elle n'offre à personne le soulagement d'un mot neuf.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "la-regle-qui-en-sort",
      stepLabel: "04 · La langue",
      heading: "Ce que la source ne dit pas",
      blocks: [
        {
          text: "Un glossonyme n'est pas un ethnonyme, et une famille linguistique ne décrit pas une population — encore moins une ascendance. Que deux peuples parlent des langues apparentées dit qu'un mot a voyagé, pas que des gens l'ont porté.",
          sourceRefs: [],
          figureRefs: [],
        },
        {
          text: "Le corpus range pourtant chaque peuple sous une famille, et cette page en est la meilleure critique disponible : le classement est un outil de lecture, jamais une origine. Là où l'atlas emploie une étiquette forgée ailleurs, il le dit sur la fiche plutôt qu'ici.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
  ],
  entities: [
    { kind: "family", id: "FLG_BANTU", label: "Famille bantoue" },
    { kind: "people", id: "PPL_HERERO", label: "Herero" },
  ],
};
