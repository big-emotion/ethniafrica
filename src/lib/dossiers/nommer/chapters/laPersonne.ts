import type { DossierChapter } from "../types";

/**
 * Chapter three — the person.
 *
 * The hinge of the dossier: chapter one shows a name being fixed, this one
 * shows a person being fixed by the same instrument. It is also where the
 * atlas states, to the reader rather than in a code comment, the one thing it
 * refuses to do — take a family name and return an ethnic origin.
 *
 * Two cautions the writing holds. The claim that the hereditary surname is a
 * European state invention is the broadest in the dossier and rests on the
 * thinnest source, so it is written as the mechanism it can document (the
 * registry) rather than as the genealogy it cannot. And the taxonomy of
 * `namingSystem` in the design note governs the naming-system fiches, not the
 * `nameSystem` field of the PAT_* fiches: the two vocabularies are kept apart.
 */
// @req REQ-113
export const CHAPITRE_LA_PERSONNE: DossierChapter = {
  key: "la-personne",
  ordinal: "03",
  title: "La personne",
  question:
    "Le nom de famille se transmet, croit-on, depuis toujours. Depuis quand, exactement ?",
  standfirst: {
    text: "Le nom de famille héréditaire n'est pas une survivance : c'est un artefact administratif. Le corpus documente des systèmes entiers où le nom ne se transmet pas.",
    sourceRefs: ["afrik-naming-taxonomy"],
    figureRefs: ["patronyme-non-hereditary", "patronyme-fiches"],
  },
  measure: {
    value: "4 systèmes",
    unit: "où le nom ne se transmet pas",
    sourceRefs: [],
    figureRefs: ["patronyme-non-hereditary"],
  },
  sections: [
    {
      id: "ce-que-le-corpus-tient",
      stepLabel: "03 · La personne",
      heading: "Ce que le corpus tient",
      blocks: [
        {
          text: "L'atlas documente trente systèmes de nomination. Ils ne se ressemblent pas : un nom de clan, un nom de louange récité, un nom d'attribution géographique, un nom totémique assorti d'un interdit alimentaire. Ce que le mot « patronyme » recouvre en français est, ici, une demi-douzaine de choses différentes.",
          sourceRefs: ["afrik-naming-taxonomy"],
          figureRefs: ["patronyme-fiches"],
        },
        {
          text: "Le chiffre qui compte est le dernier de la colonne : quatre systèmes documentés où le nom ne se transmet pas. Ce n'est pas une curiosité marginale, c'est la démonstration. L'hérédité du nom n'est pas la règle dont ces systèmes seraient l'exception ; c'est une manière de faire parmi d'autres.",
          sourceRefs: [],
          figureRefs: ["patronyme-non-hereditary"],
        },
      ],
      table: {
        caption:
          "Les trente fiches de nom du corpus, par système et par mode de transmission",
        columns: ["Système", "Fiches", "Ce que le nom désigne"],
        rows: [
          {
            cells: [
              "Nom de clan",
              "18",
              "Une appartenance — transmise, mais aussi accordée",
            ],
            sourceRefs: ["afrik-naming-taxonomy"],
            figureRefs: [],
          },
          {
            cells: [
              "Nom totémique clanique",
              "4",
              "Un clan, avec son interdit alimentaire et sa liste fermée de prénoms",
            ],
            sourceRefs: ["afrik-naming-taxonomy"],
            figureRefs: [],
          },
          {
            cells: [
              "Chaîne patronymique non héréditaire",
              "4",
              "Un individu : le prénom du père devient le second nom de l'enfant, et rien ne se fige",
            ],
            sourceRefs: ["afrik-naming-taxonomy"],
            figureRefs: ["patronyme-non-hereditary"],
          },
          {
            cells: [
              "Nom de louange",
              "2",
              "Une lignée louée — l'oríkì yoruba, le jamu mandingue",
            ],
            sourceRefs: ["afrik-naming-taxonomy"],
            figureRefs: [],
          },
          {
            cells: [
              "Nisba",
              "2",
              "Un lieu, une tribu ou un métier, dans le monde arabo-berbère",
            ],
            sourceRefs: ["afrik-naming-taxonomy"],
            figureRefs: [],
          },
        ],
      },
    },
    {
      id: "letat-civil-colonial",
      stepLabel: "03 · La personne",
      heading: "L'état civil, ou le nom rendu héréditaire par l'écriture",
      blocks: [
        {
          text: "Le nom de famille obligatoire et transmissible est un outil d'État avant d'être un usage. Il sert à lever l'impôt, à conscrire et à recenser : il faut pouvoir retrouver la même famille d'une génération à l'autre, et un nom qui change à chaque naissance ne le permet pas.",
          sourceRefs: ["civil-registration-surnames"],
          figureRefs: [],
        },
        {
          text: "Le mécanisme colonial est simple, et c'est ce qui le rend efficace. Entrer dans un registre — de naissance, de baptême, de propriété, de travail — exigeait un nom de forme européenne. Là où il n'en existait pas, l'agent en inscrivait un. Et il devenait héréditaire par le seul fait d'avoir été écrit : la génération suivante héritait de la ligne du registre avant d'hériter d'un usage.",
          sourceRefs: ["civil-registration-surnames"],
          figureRefs: [],
        },
        {
          text: "C'est le même geste que celui du chapitre premier, appliqué à une personne au lieu d'un peuple. Un nom cesse d'être une manière de désigner pour devenir une entrée d'état, et ce qui est inscrit ne se renégocie plus.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "le-postnom",
      stepLabel: "03 · La personne",
      heading: "Le contre-mouvement, et sa date",
      blocks: [
        {
          text: "Le 27 octobre 1971, le régime de Mobutu proclame le recours à l'authenticité. Le 12 janvier 1972, la mesure atteint les noms : les prénoms chrétiens sont abandonnés au profit d'un postnom, et le chef de l'État change le sien le premier.",
          sourceRefs: ["zaire-authenticite-1972"],
          figureRefs: [],
        },
        {
          text: "Le fait qui vaut d'être retenu n'est pas le décret : c'est ce qu'il en reste. Le postnom se porte encore, un demi-siècle après la chute du régime qui l'avait imposé. Une politique du nom survit à la politique qui l'a faite, parce qu'elle a été inscrite au même endroit que la précédente — le registre.",
          sourceRefs: ["zaire-authenticite-1972"],
          figureRefs: [],
        },
        {
          text: "Le contre-mouvement emprunte donc les instruments qu'il conteste : la contrainte, la date d'effet, l'état civil. C'est ce qui le rend efficace, et c'est aussi ce qui rend le geste discutable — décoloniser le nom par décret reste décider à la place des gens.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "ce-quun-nom-ne-dit-pas",
      stepLabel: "03 · La personne",
      heading: "Ce qu'un nom ne dit pas d'une personne vivante",
      blocks: [
        {
          text: "Un nom de famille n'indique pas l'origine d'une personne. Ce n'est pas une précaution juridique, c'est un fait historique : les systèmes de clan ont absorbé des lignées sans lien de sang, par alliance politique, par clientèle et par captivité de guerre. Une fiche peut dire qu'un nom est attesté chez un peuple ; elle ne dit jamais qu'un porteur en est.",
          sourceRefs: ["dec-040"],
          figureRefs: [],
        },
        {
          text: "L'atlas s'y tient dans son code autant que dans sa prose : aucune fonctionnalité de ce site ne prend un nom de famille et ne rend une origine ethnique. Construire l'inverse reviendrait à reproduire en logiciel le registre de l'administration indirecte, avec la même prétention à savoir qui est quoi.",
          sourceRefs: ["dec-040"],
          figureRefs: [],
        },
      ],
      pairs: [
        {
          endonym: "Jamu",
          endonymGloss: "nom de clan mandingue, transmis mais aussi accordé",
          exonym: "« nom de famille »",
          imposedBy: "traduction administrative française",
          pejorative: false,
          sourceRefs: ["afrik-naming-taxonomy"],
        },
        {
          endonym: "Oríkì",
          endonymGloss: "nom de louange yoruba, récité plutôt qu'inscrit",
          exonym: "« patronyme »",
          imposedBy: "réduction à la case d'état civil",
          pejorative: false,
          sourceRefs: ["afrik-naming-taxonomy"],
        },
        {
          endonym: "Postnom",
          endonymGloss: "nom adopté après 1972, en République du Zaïre",
          exonym: "« deuxième prénom »",
          imposedBy: "formulaires étrangers sans case correspondante",
          pejorative: false,
          sourceRefs: ["zaire-authenticite-1972"],
        },
      ],
    },
    {
      id: "ce-que-la-source-ne-dit-pas-personne",
      stepLabel: "03 · La personne",
      heading: "Ce que la source ne dit pas",
      blocks: [
        {
          text: "Que le nom de famille héréditaire soit une invention d'États européens exportée par la colonisation est l'affirmation la plus large de ce dossier, et la moins étayée. Ce que les sources tiennent, c'est le mécanisme : le registre exigeait un nom, et l'exigence a produit l'hérédité. La généalogie européenne de cette exigence reste, ici, une hypothèse de travail.",
          sourceRefs: ["civil-registration-surnames"],
          figureRefs: [],
        },
        {
          text: "Trente fiches de nom, c'est peu au regard des systèmes qui existent. La chaîne somalie, l'abtirsi, n'a pas encore la sienne, et le corpus ne porte aucune fiche dont le système déclaré soit le postnom. Le glossaire les définit quand même, en disant qu'il les définit sans les instancier.",
          sourceRefs: [],
          figureRefs: ["patronyme-fiches"],
        },
      ],
    },
  ],
  entities: [],
};
