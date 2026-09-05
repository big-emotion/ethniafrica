import type { DossierChapter } from "../types";

/**
 * Chapter one — the people.
 *
 * The chapter the whole dossier rests on, and the one most easily written
 * badly. Two guards are built into the writing itself:
 *
 *   - the lexical probe is published with its method, because a count of word
 *     stems in free prose is not a coding of the corpus and saying so is the
 *     difference between a measure and a rhetorical figure;
 *   - the Herero case is not optional. A chapter that presented every exonym
 *     as an injury would have no standing left when it reaches « Hottentot ».
 */
// @req REQ-113
export const CHAPITRE_LE_PEUPLE: DossierChapter = {
  key: "le-peuple",
  ordinal: "01",
  title: "Le peuple",
  question:
    "Presque tous les peuples de l'atlas portent un nom venu du dehors. Qui le leur a donné ?",
  standfirst: {
    text: "Le corpus tient plus de noms donnés de l'extérieur que de noms revendiqués de l'intérieur. L'écart ne mesure pas d'abord la colonisation : il mesure qui a écrit.",
    sourceRefs: [],
    figureRefs: ["corpus-exonyms", "corpus-autonyms"],
  },
  measure: {
    value: "3 201",
    unit: "exonymes recensés",
    sourceRefs: [],
    figureRefs: ["corpus-exonyms"],
  },
  sections: [
    {
      id: "la-mesure-et-ce-quelle-ne-mesure-pas",
      stepLabel: "01 · Le peuple",
      heading: "La mesure, et ce qu'elle ne mesure pas",
      blocks: [
        {
          text: "Les huit cents fiches de peuple de l'atlas recensent 3 201 noms donnés de l'extérieur, contre 798 noms que les intéressés revendiquent. Quatre pour un.",
          sourceRefs: [],
          figureRefs: ["corpus-peoples", "corpus-exonyms", "corpus-autonyms"],
        },
        {
          text: "L'écart est spectaculaire et il est facile de lui faire dire ce qu'il ne dit pas. Il ne mesure pas combien de peuples ont été renommés de force. Il mesure d'abord une asymétrie d'archive : on a beaucoup plus écrit sur ces peuples qu'ils n'ont écrit d'eux-mêmes, et un atlas qui compile des sources compile ce déséquilibre avec elles.",
          sourceRefs: [],
          figureRefs: [],
        },
        {
          text: "Sur la classification de leur propre nom, les fiches disent trois choses. 460 déclarent leur appellation contestée ou héritée de la colonisation. 19 déclarent autre chose. Et 321 ne déclarent rien du tout.",
          sourceRefs: [],
          figureRefs: [
            "status-contested-or-colonial",
            "status-other",
            "status-undeclared",
          ],
        },
        {
          text: "Ce troisième nombre est le sujet de la phrase, pas sa note de bas de page. Écrire « 57 % des peuples de l'atlas contestent leur nom » laisserait entendre que les autres ont été examinés et jugés sans problème. Ils n'ont pas été examinés. Le chantier est ouvert, et un pourcentage le comptabiliserait comme un résultat.",
          sourceRefs: [],
          figureRefs: ["status-undeclared"],
        },
      ],
    },
    {
      id: "le-sondage-lexical",
      stepLabel: "01 · Le peuple",
      heading: "Qui a donné ces noms, d'après les fiches elles-mêmes",
      blocks: [
        {
          text: "Chaque fiche raconte en toutes lettres d'où vient son exonyme. Ce récit n'est pas une donnée : c'est de la prose. On peut donc y compter des mots, et c'est tout ce que le tableau ci-dessous fait — une fiche qui écrit « ce nom n'est pas d'origine européenne » est comptée dans « europ- » comme les autres.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
      table: {
        caption:
          "Radicaux relevés dans les champs « origine des exonymes » et « pourquoi c'est problématique » des 800 fiches. Un sondage lexical, pas un codage : les mentions se recoupent.",
        columns: ["Radical relevé", "Fiches", "Ce qu'on y lit le plus souvent"],
        rows: [
          {
            cells: [
              "colonial",
              "242",
              "Le nom est daté de la colonisation, ou officialisé par elle",
            ],
            sourceRefs: [],
            figureRefs: ["probe-colonial"],
          },
          {
            cells: [
              "administr-",
              "184",
              "Le nom est un acte de recensement avant d'être un fait de langue",
            ],
            sourceRefs: [],
            figureRefs: ["probe-administration"],
          },
          {
            cells: ["europ-", "124", "Navigateurs, explorateurs, cartographes"],
            sourceRefs: [],
            figureRefs: ["probe-european"],
          },
          {
            cells: [
              "voisin",
              "120",
              "Un exonyme africain, donné par un peuple voisin — souvent le plus ancien de tous",
            ],
            sourceRefs: [],
            figureRefs: ["probe-neighbours"],
          },
          {
            cells: [
              "dépréciatif et voisins",
              "87",
              "La fiche qualifie explicitement le mot de péjoratif, dépréciatif, moqueur ou dérisoire",
            ],
            sourceRefs: [],
            figureRefs: ["probe-pejorative"],
          },
          {
            cells: [
              "portugais",
              "84",
              "La strate la plus profonde de la côte atlantique, dès le XVe siècle",
            ],
            sourceRefs: [],
            figureRefs: ["probe-portuguese"],
          },
          {
            cells: [
              "arab-",
              "75",
              "Antérieur à l'Europe sur le Sahel et la côte orientale",
            ],
            sourceRefs: [],
            figureRefs: ["probe-arabic"],
          },
          {
            cells: [
              "swahili",
              "73",
              "Une langue véhiculaire devenue instrument de désignation",
            ],
            sourceRefs: [],
            figureRefs: ["probe-swahili"],
          },
          {
            cells: ["esclav-", "26", "Le nom naît d'un statut de capture"],
            sourceRefs: [],
            figureRefs: ["probe-slavery"],
          },
          {
            cells: [
              "missionn-",
              "25",
              "Nommer pour évangéliser, puis pour alphabétiser",
            ],
            sourceRefs: [],
            figureRefs: ["probe-missionary"],
          },
        ],
      },
    },
    {
      id: "lexonyme-nest-pas-europeen",
      stepLabel: "01 · Le peuple",
      heading: "L'exonyme n'est pas une invention européenne",
      blocks: [
        {
          text: "Cent vingt fiches attribuent leur exonyme à des voisins, soixante-quinze à l'arabe, soixante-treize au swahili. Nommer l'autre depuis le dehors n'est pas une importation : c'est ce que font les gens qui se rencontrent, partout, depuis toujours. Un dossier qui ne dirait que « l'Europe a mal nommé » raterait sa propre matière.",
          sourceRefs: [],
          figureRefs: ["probe-neighbours", "probe-arabic", "probe-swahili"],
        },
        {
          text: "Ce que la colonisation apporte de neuf n'est donc pas l'exonyme. C'est le registre. Un nom cesse d'être une manière de parler pour devenir une case d'état : recensable, imposable, opposable. Il ne circule plus, il est inscrit — et ce qui est inscrit ne se renégocie plus au contact suivant.",
          sourceRefs: [],
          figureRefs: ["probe-administration"],
        },
        {
          text: "Les Jieng du Soudan du Sud en sont l'exemple le plus net. « Dinka » est un exonyme arabe, venu des marchands du nord, que l'administration anglo-égyptienne a repris et fixé. Il est aujourd'hui universellement accepté, y compris par les intéressés dans les contextes officiels — et « Jieng » monte dans les revendications identitaires depuis l'indépendance de 2011. Un exonyme peut être adopté sans cesser d'être un exonyme.",
          sourceRefs: ["afrik-ppl-dinka"],
          figureRefs: [],
        },
      ],
    },
    {
      id: "quand-le-nom-est-une-moquerie",
      stepLabel: "01 · Le peuple",
      heading: "Quand le nom est une moquerie",
      blocks: [
        {
          text: "Quatre-vingt-sept fiches qualifient leur exonyme de péjoratif, dépréciatif, moqueur ou dérisoire. Deux cas montrent ce que le mot fait, et ce que le remplacer ne répare pas.",
          sourceRefs: [],
          figureRefs: ["probe-pejorative"],
        },
      ],
      pairs: [
        {
          endonym: "Khoekhoe",
          endonymGloss: "« les hommes des hommes »",
          exonym: "Hottentot",
          imposedBy:
            "colons néerlandais, par imitation moqueuse des consonnes claquantes",
          pejorative: true,
          sourceRefs: ["britannica-khoekhoe"],
        },
        {
          endonym: "ǂKhomani, Ju|'hoansi, !Xun",
          endonymGloss: "les nations, une par une",
          exonym: "Bushmen, puis San",
          imposedBy:
            "colons anglophones ; « San » est lui-même un exonyme khoekhoe déprécié",
          pejorative: true,
          sourceRefs: ["saho-khoisan", "san-council-2003"],
        },
        {
          endonym: "Jieng",
          endonymGloss: "au singulier Muonyjang",
          exonym: "Dinka",
          imposedBy: "marchands arabes, puis administration anglo-égyptienne",
          pejorative: false,
          sourceRefs: ["afrik-ppl-dinka"],
        },
        {
          endonym: "Ovaherero",
          endonymGloss: "« les possesseurs de bétail »",
          exonym: "Herero",
          imposedBy: "contact colonial du XIXe siècle",
          pejorative: false,
          sourceRefs: ["ethnologue-her", "afrik-ppl-herero"],
        },
      ],
    },
    {
      id: "remplacer-nest-pas-reparer",
      stepLabel: "01 · Le peuple",
      heading: "Remplacer un exonyme par un exonyme ne répare rien",
      blocks: [
        {
          text: "« Hottentot » a été retiré de l'usage savant, puis de la loi. « Bushmen » a été remplacé par « San » dans l'anthropologie de langue anglaise à partir des années 1970. Le second remplacement pose un problème que le premier n'avait pas : « San » est lui-même un mot khoekhoe déprécié, qui désignait les chasseurs-cueilleurs sans bétail.",
          sourceRefs: ["saho-khoisan"],
          figureRefs: [],
        },
        {
          text: "Les intéressés ont tranché autrement. En 2003, leurs représentants ont demandé à être désignés par le nom de leur nation — ǂKhomani, Ju|'hoansi, !Xun — plutôt que par un terme de couverture, quel qu'il soit. La demande porte moins sur le mot que sur l'échelle : un seul nom pour des peuples distincts est déjà une décision prise à leur place.",
          sourceRefs: ["san-council-2003", "saho-khoisan"],
          figureRefs: [],
        },
      ],
    },
    {
      id: "le-contre-exemple",
      stepLabel: "01 · Le peuple",
      heading: "Le contre-exemple, sans lequel le reste ne vaut rien",
      blocks: [
        {
          text: "Le dossier d'appellation des Ovaherero prend soin d'écrire l'inverse de ce qu'on attendrait. « Herero » est l'exonyme international, né du contact colonial — et, à la différence d'autres exonymes coloniaux du corpus, aucune source ne documente de connotation péjorative attachée au mot lui-même.",
          sourceRefs: ["afrik-ppl-herero", "ethnologue-her"],
          figureRefs: [],
        },
        {
          text: "La fiche va plus loin et dit pourquoi cela compte : la violence coloniale que ce peuple a subie — le génocide herero et nama — porte sur d'autres registres que la dénomination. Confondre les deux serait consoler d'un crime en corrigeant un mot.",
          sourceRefs: ["afrik-ppl-herero"],
          figureRefs: [],
        },
        {
          text: "D'où la règle que ce chapitre défend : un exonyme n'est pas coupable par sa position. Il l'est par ce qu'il dit, par qui l'a imposé, et par ce que les intéressés en disent aujourd'hui. Un dossier qui condamnerait en bloc perdrait le droit d'être cru sur « Hottentot ».",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "ce-que-latlas-en-fait",
      stepLabel: "01 · Le peuple",
      heading: "Ce que la source ne dit pas",
      blocks: [
        {
          text: "Le corpus enregistre d'où vient un exonyme. Il n'enregistre pas ce qui l'a fait tenir. On peut compter les fiches qui emploient le mot « administration » ; on ne peut pas compter les noms qu'une administration a réellement imposés, et ce chapitre ne le fait pas.",
          sourceRefs: [],
          figureRefs: ["exonyms-imposed-by-administration"],
        },
        {
          text: "Et il reste les 321 fiches muettes. Elles ne disent pas que tout va bien : elles disent que personne n'a encore regardé. C'est la première dette de ce dossier envers son propre corpus.",
          sourceRefs: [],
          figureRefs: ["status-undeclared"],
        },
      ],
    },
  ],
  entities: [
    { kind: "people", id: "PPL_DINKA", label: "Dinka" },
    { kind: "people", id: "PPL_HERERO", label: "Herero" },
    { kind: "country", id: "SSD", label: "Soudan du Sud" },
    { kind: "country", id: "NAM", label: "Namibie" },
  ],
};
