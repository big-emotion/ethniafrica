import type { DossierChapter } from "../types";

/**
 * Chapter two — the country.
 *
 * The most fragile of the five, and it opens by saying so. The 54 country
 * fiches all fill `etymology` and `nameOriginActor`, and not one of those
 * etymologies is attached to a source: `content.sources[]` documents the
 * demography and nothing else. A dossier that criticises folk etymologies
 * cannot lean on 54 unsourced ones without declaring the fact first.
 *
 * The four families are therefore published as a `read` figure, with the
 * caveat travelling beside them, and the whole classification is offered as
 * contestable — which is why the lists are printed in full rather than
 * summarised.
 */
// @req REQ-113
export const CHAPITRE_LE_PAYS: DossierChapter = {
  key: "le-pays",
  ordinal: "02",
  title: "Le pays",
  question:
    "Les frontières viennent de Berlin. Et les noms qu'on a posés dessus, d'où viennent-ils ?",
  standfirst: {
    text: "Moins d'un tiers des pays du continent portent un nom que des Africains ont choisi. Renommer n'a pas été un moment : c'est une pratique qui court sur soixante ans.",
    sourceRefs: [],
    figureRefs: ["countries-african-choice", "corpus-countries"],
  },
  measure: {
    value: "17 sur 54",
    unit: "noms choisis par des Africains",
    sourceRefs: [],
    figureRefs: ["countries-african-choice", "corpus-countries"],
  },
  sections: [
    {
      id: "un-avertissement-de-methode",
      stepLabel: "02 · Le pays",
      heading: "Un avertissement, avant le premier chiffre",
      blocks: [
        {
          text: "Les cinquante-quatre fiches de pays de l'atlas renseignent toutes l'étymologie de leur nom et l'acteur qui l'a donné. Aucune ne rattache cette étymologie à une source : le chapitre des sources documente la démographie, jamais le nom.",
          sourceRefs: [],
          figureRefs: ["corpus-countries"],
        },
        {
          text: "Le classement qui suit est donc une lecture, faite à la main, à une date. Ce n'est pas une mesure du corpus, et le corpus ne porte aucun champ qui permettrait d'en faire une : la question « ce pays a-t-il été nommé par des Africains ? » n'est aujourd'hui pas interrogeable.",
          sourceRefs: [],
          figureRefs: ["countries-african-choice"],
        },
        {
          text: "Les listes sont donc publiées en entier plutôt que résumées. C'est ce qui rend la lecture contestable, et une lecture contestable vaut mieux qu'une mesure qui n'en est pas une.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "quatre-familles",
      stepLabel: "02 · Le pays",
      heading: "Quatre familles, quatre origines",
      blocks: [
        {
          text: "Un nom de pays vient d'un navigateur, d'un géographe ancien, d'un royaume qui était déjà là, ou d'une décision prise après l'indépendance. Les quatre cas ne se valent pas, et le dernier est le plus rare.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
      table: {
        caption:
          "Les 54 pays, classés à la main d'après le champ « acteur du nom » de leur fiche. Une lecture, pas une mesure.",
        columns: ["Origine du nom", "Pays", "Lesquels"],
        rows: [
          {
            cells: [
              "Exonyme européen conservé",
              "20",
              "Guinée, Guinée équatoriale, Gambie, Sierra Leone, Côte d'Ivoire, Cameroun, Gabon, Sénégal, Nigeria, Libéria, Seychelles, Maurice, Mozambique, São Tomé-et-Príncipe, Érythrée, Djibouti, Mauritanie, Algérie, Tunisie, Madagascar",
            ],
            sourceRefs: [],
            figureRefs: ["countries-european-exonym"],
          },
          {
            cells: [
              "Exonyme ancien, non européen",
              "6",
              "Égypte et Libye (grec), Éthiopie (grec, puis adopté), Soudan (arabe, bilād as-sūdān), Maroc (arabe), Comores (arabo-persan)",
            ],
            sourceRefs: [],
            figureRefs: ["countries-ancient-exonym"],
          },
          {
            cells: [
              "Nom local repris par le colonisateur",
              "11",
              "Rwanda, Burundi, Angola (du titre ngola), Ouganda (du Buganda), Togo (de Togodo), Tchad, Niger, Kenya (de Kirinyaga), Zambie, Somalie, Congo",
            ],
            sourceRefs: [],
            figureRefs: ["countries-local-kept"],
          },
          {
            cells: [
              "Choisi ou restauré par des Africains",
              "17",
              "Ghana 1957, Mali 1960, République centrafricaine 1960, Malawi 1964, Tanzanie 1964, Botswana 1966, Lesotho 1966, Guinée-Bissau 1973, Bénin 1975, Zimbabwe 1980, Burkina Faso 1984, Namibie 1990, Soudan du Sud 2011, Cabo Verde 2013, Eswatini 2018, Afrique du Sud, République démocratique du Congo",
            ],
            sourceRefs: [],
            figureRefs: ["countries-african-choice"],
          },
        ],
      },
    },
    {
      id: "ce-que-dit-le-dix-sept",
      stepLabel: "02 · Le pays",
      heading: "Ce que dit le dix-sept",
      blocks: [
        {
          text: "La renomination n'est pas un événement de 1960. Elle commence avant les indépendances — le Ghana prend son nom en 1957, un mois après la sienne — et elle continue après : Zimbabwe en 1980, Burkina Faso en 1984, Namibie en 1990, Soudan du Sud en 2011, Cabo Verde en 2013, Eswatini en 2018.",
          sourceRefs: ["afrik-pays-gha"],
          figureRefs: ["countries-african-choice"],
        },
        {
          text: "Soixante et un ans séparent le premier de ces gestes du dernier. Ce n'est pas une vague, c'est une pratique : chaque génération reprend la question là où la précédente l'a laissée, et aucune ne la clôt.",
          sourceRefs: [],
          figureRefs: [],
        },
        {
          text: "Le reste du continent vit avec un nom donné par quelqu'un d'autre, et le vit sans drame la plupart du temps. Le Sénégal porte peut-être une expression wolof entendue de travers par des navigateurs portugais ; personne n'en fait une revendication. Un nom hérité n'est pas nécessairement un nom subi.",
          sourceRefs: [],
          figureRefs: ["countries-european-exonym"],
        },
      ],
    },
    {
      id: "trois-cas-qui-defont-la-lecture",
      stepLabel: "02 · Le pays",
      heading: "Trois cas qui défont la lecture simple",
      blocks: [
        {
          text: "Le Nigeria n'a pas été nommé par une administration : il a été nommé par une journaliste. Le 8 janvier 1897, Flora Shaw propose dans le Times de désigner d'un seul mot la « Niger Area » que la Royal Niger Company administrait. Le nom n'est officialisé que seize ans plus tard, en 1914, par Lugard, à l'unification des protectorats du Nord et du Sud.",
          sourceRefs: ["shaw-times-nigeria"],
          figureRefs: [],
        },
        {
          text: "Le détail que ce chapitre ne peut pas passer sous silence est que l'attribution elle-même est nuancée. Shaw a suggéré le nom ; elle ne l'a pas imposé, et c'est l'administration qui l'a rendu réel. Des occurrences antérieures de « Nigerian » sont d'ailleurs signalées chez William Cole en 1862 et chez Richard Burton en 1863, sans qu'on sache si elles sont contemporaines ou ajoutées à l'édition. L'histoire la plus racontée du continent sur l'origine d'un nom est donc, elle aussi, un récit avec des trous.",
          sourceRefs: ["shaw-times-nigeria"],
          figureRefs: [],
        },
        {
          text: "Le Bénin est un nom africain choisi par des Africains — et emprunté à un royaume qui se trouvait dans un autre pays, le Nigeria actuel. Il remplace en 1975 le « Dahomey » colonial, tiré du royaume fon, et il a été retenu pour sa neutralité : il ne désigne aucun des peuples du territoire. Se renommer soi-même a exigé de se désindexer de tous.",
          sourceRefs: ["afrik-pays-ben"],
          figureRefs: [],
        },
        {
          text: "Le Ghana fait le même geste, avec la même liberté. Nkrumah reprend en 1957 le nom d'un empire médiéval qui ne se trouvait pas sur le territoire actuel — la fiche du corpus le note elle-même. Le nom restauré est un choix politique, pas une exactitude géographique, et le chapitre l'assume plutôt que de le masquer.",
          sourceRefs: ["afrik-pays-gha"],
          figureRefs: [],
        },
      ],
    },
    {
      id: "le-nom-du-pays-nest-pas-le-nom-du-peuple",
      stepLabel: "02 · Le pays",
      heading: "Le nom du pays n'est pas le nom du peuple",
      blocks: [
        {
          text: "Sous une même case administrative, l'atlas trouve quatre objets nommés de nature différente. Un fleuve a donné son nom au Niger et au Nigeria. Une montagne, le Kirinyaga des Kikuyu, a donné le Kenya. Une expression de géographes arabes, bilād as-sūdān, « le pays des Noirs », a donné le Soudan. Un royaume a donné le Congo.",
          sourceRefs: [],
          figureRefs: ["countries-local-kept", "countries-ancient-exonym"],
        },
        {
          text: "Hydronyme, oronyme, choronyme, ethnonyme royal : la carte les aplatit tous en « nom de pays », et c'est cet aplatissement qui fait croire qu'un pays et un peuple se recouvrent. Le glossaire donne à chacun son mot, parce que les distinguer est la première chose à faire pour lire une frontière.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "ce-que-la-source-ne-dit-pas-pays",
      stepLabel: "02 · Le pays",
      heading: "Ce que la source ne dit pas",
      blocks: [
        {
          text: "Aucune des étymologies citées ici n'est adossée à une source dans le corpus, et deux d'entre elles sont ouvertement discutées ailleurs. La date de forge du nom « Nigeria » varie selon les récits, et la fiche du corpus retient l'année de l'unification plutôt que celle de l'article.",
          sourceRefs: ["shaw-times-nigeria"],
          figureRefs: [],
        },
        {
          text: "Un champ typé permettrait de compter au lieu de lire, et de cartographier les quatre familles. Il n'existe pas. Tant qu'il n'existe pas, ce chapitre reste ce qu'il annonce en ouverture : une lecture, publiée avec sa méthode et ses trous.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
  ],
  entities: [
    { kind: "country", id: "NGA", label: "Nigeria" },
    { kind: "country", id: "BEN", label: "Bénin" },
    { kind: "country", id: "GHA", label: "Ghana" },
    { kind: "country", id: "KEN", label: "Kenya" },
  ],
};
