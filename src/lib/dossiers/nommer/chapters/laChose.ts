import type { DossierChapter } from "../types";

/**
 * Chapter five — the thing.
 *
 * The chapter that stops the dossier from being read as a list of grievances.
 * Five objects called African, five different trajectories, and none of the
 * five cells is called "inauthentic" — which is the point, because
 * "authentic" and "fake" is the colonial pair the whole dossier is trying to
 * get out from under.
 *
 * The kente entered this chapter by reversing the brief's own hypothesis. It
 * was proposed as a foreign object mistaken for an African one; it is the
 * opposite — an African cloth carrying a francophone exonym — which makes it
 * the mirror of the wax and completes the matrix rather than repeating it.
 */
// @req REQ-113
export const CHAPITRE_LA_CHOSE: DossierChapter = {
  key: "la-chose",
  ordinal: "05",
  title: "La chose",
  question:
    "Le wax, le café, le cacao, Mami Wata : lesquels sont africains, et en quel sens ?",
  standfirst: {
    text: "Cinq objets qu'on dit africains, cinq trajectoires différentes. Aucune de ces cases ne s'appelle « inauthentique » — et c'est la démonstration du chapitre.",
    sourceRefs: [],
    figureRefs: [],
  },
  measure: {
    value: "Cinq trajectoires",
    unit: "cinq verdicts différents",
    sourceRefs: [],
    figureRefs: [],
  },
  sections: [
    {
      id: "deux-questions-pas-une",
      stepLabel: "05 · La chose",
      heading: "Deux questions, jamais une seule",
      blocks: [
        {
          text: "Demander si un objet est africain mélange deux questions qui n'ont pas la même réponse : d'où vient la chose, et d'où vient son nom. Les séparer suffit à défaire la plupart des débats sur l'authenticité, parce que les deux réponses divergent presque toujours.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
      table: {
        caption:
          "Cinq objets, et ce que chacun répond aux deux questions séparément",
        columns: ["Objet", "La chose vient de", "Le nom vient de"],
        rows: [
          {
            cells: [
              "Le wax",
              "Des Pays-Bas — imitation industrielle du batik javanais",
              "D'Afrique de l'Ouest : ce sont les acheteuses qui nomment les motifs",
            ],
            sourceRefs: ["vlisco-helmond", "trc-leiden-vlisco"],
            figureRefs: [],
          },
          {
            cells: [
              "Le kente, dit « pagne kita »",
              "Du Ghana et du Togo — tissé à la bande sur métier akan et éwé",
              "Du français d'Afrique de l'Ouest : « kita » recouvre nwentoma et kete",
            ],
            sourceRefs: ["conversation-kente", "kente-nwentoma"],
            figureRefs: [],
          },
          {
            cells: [
              "Le café",
              "D'Éthiopie — Coffea arabica, région de Kaffa",
              "De l'arabe qahwa, par le turc et l'italien, revenu sous forme européenne",
            ],
            sourceRefs: ["coffee-qahwa"],
            figureRefs: [],
          },
          {
            cells: [
              "Le cacao",
              "De Mésoamérique — mais introduit en Gold Coast par un Ghanéen",
              "Du nahuatl, par l'espagnol",
            ],
            sourceRefs: ["cocobod-cocoa-story"],
            figureRefs: [],
          },
          {
            cells: [
              "Mami Wata",
              "D'Afrique — des divinités des eaux anciennes et multiples",
              "D'un pidgin de traite, et son image d'une affiche allemande",
            ],
            sourceRefs: ["mami-wata-pidgin", "drewal-2012"],
            figureRefs: [],
          },
        ],
      },
    },
    {
      id: "le-wax-et-le-kita",
      stepLabel: "05 · La chose",
      heading: "Le wax et le kita, exactement inverses",
      blocks: [
        {
          text: "Le wax n'est pas africain d'un bout à l'autre de sa fabrication. C'est une imitation industrielle du batik javanais, mise au point à Helmond, aux Pays-Bas, à partir de 1846 : l'impression au rouleau remplace la réserve à la cire, et le procédé arrive sur les côtes ouest-africaines par les soldats revenus des Indes néerlandaises.",
          sourceRefs: ["vlisco-helmond", "trc-leiden-vlisco"],
          figureRefs: [],
        },
        {
          text: "Les motifs sont dessinés aux Pays-Bas. Les noms, eux, sont donnés sur place, par les femmes qui achètent et revendent les pièces — et ce sont ces noms qui font le sens d'un tissu, pas le dessin. Le pouvoir de fabriquer et le pouvoir de nommer ne sont pas allés ensemble : un objet peut être étranger de bout en bout et appartenir par son nom.",
          sourceRefs: ["trc-leiden-vlisco"],
          figureRefs: [],
        },
        {
          text: "Le kente est le cas exactement inverse, et il corrige une intuition répandue. Le tissu est africain : tissé à la bande sur métier akan et éwé, au Ghana et au Togo. Et il porte deux noms qui disent chacun ce qu'ils décrivent. En akan, nwentoma, « tissu tissé » ; kente est rapproché de kɛntɛn, le panier, pour le motif. En éwé, kete, des deux gestes alternés du métier — ke, ouvrir, et te, presser.",
          sourceRefs: ["conversation-kente", "kente-nwentoma"],
          figureRefs: [],
        },
        {
          text: "« Kita » n'est ni l'un ni l'autre. C'est la forme que l'Afrique de l'Ouest francophone a fixée par-dessus les deux, et elle ne dit ni le tissage ni le panier ni le geste : elle ne dit rien du tout. Un objet africain, deux étymologies africaines qui expliquent le nom, et un troisième nom posé dessus qui n'explique plus rien.",
          sourceRefs: ["kente-nwentoma"],
          figureRefs: [],
        },
        {
          text: "Un objet étranger portant un nom africain, un objet africain portant un nom exogène : les deux cas se lisent d'habitude comme des scandales opposés, et ni l'un ni l'autre n'en est un. Ce sont deux manières ordinaires dont une chose et son nom voyagent séparément.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "le-cafe-et-le-cacao",
      stepLabel: "05 · La chose",
      heading:
        "Le café revient sous un autre nom, le cacao arrive par un Africain",
      blocks: [
        {
          text: "Le caféier est éthiopien : Coffea arabica pousse dans la région de Kaffa. Le mot, lui, part par l'arabe qahwa, devient kahve en turc, puis café dans les langues européennes — et revient en Afrique sous cette forme-là. L'amharique buna, qui nomme la même chose depuis toujours, a été contourné par toute la chaîne d'emprunt.",
          sourceRefs: ["coffee-qahwa"],
          figureRefs: [],
        },
        {
          text: "Une réserve, sur le terrain même de ce dossier. On lit souvent que « café » viendrait de Kaffa, et c'est joli parce que le lieu et le mot se ressemblent. Mais qahwa désigne un vin en arabe plus d'un demi-millénaire avant que le royaume de Kaffa n'existe : le rapprochement n'est pas seulement discuté, il est chronologiquement improbable.",
          sourceRefs: ["coffee-qahwa"],
          figureRefs: [],
        },
        {
          text: "Ce qui reste vrai est plus intéressant que la légende : le caféier est bien éthiopien, et son nom ne vient pas de là. Il vient de la route commerciale qui l'a emporté. Poser l'étymologie de Kaffa comme acquise parce qu'elle est jolie serait commettre exactement l'étymologie populaire que le glossaire définit trois pages plus loin.",
          sourceRefs: ["coffee-qahwa"],
          figureRefs: [],
        },
        {
          text: "Le cacao ne vient pas d'Afrique : il est mésoaméricain, et son nom vient du nahuatl par l'espagnol. Mais le récit d'une plante apportée par l'Europe ne tient pas la date. En 1879, Tetteh Quarshie, forgeron ghanéen revenu de Fernando Po, rapporte des cabosses et plante à Akuapim-Mampong ; les missions bâloises avaient essayé à Aburi dès 1857, l'administration coloniale ne diffusera à grande échelle depuis São Tomé qu'à partir de 1886.",
          sourceRefs: ["cocobod-cocoa-story", "basel-mission-cocoa"],
          figureRefs: [],
        },
        {
          text: "Là encore l'attribution se discute, et il faut le dire plutôt que de choisir le récit le plus net. Un historien attribue l'introduction au révérend Hass ; un autre reconnaît à Quarshie d'avoir popularisé la culture sans l'avoir apportée le premier. Quarshie avait d'ailleurs été formé dans un atelier de la mission de Bâle : le partage entre l'apport missionnaire et l'initiative africaine ne passe pas là où le récit national le place.",
          sourceRefs: ["basel-mission-cocoa"],
          figureRefs: [],
        },
        {
          text: "L'objet est allogène, le nom aussi, et l'agent de l'introduction ne l'est pas. Aucune des trois réponses ne commande les deux autres — et la troisième reste ouverte.",
          sourceRefs: [],
          figureRefs: [],
        },
      ],
    },
    {
      id: "mami-wata",
      stepLabel: "05 · La chose",
      heading: "Mami Wata, ou la divinité au visage emprunté",
      blocks: [
        {
          text: "Les divinités des eaux sont anciennes et multiples sur toute la côte, et elles portaient des noms différents selon les langues. Elles se réunissent sous un nom commun assez tard, vers la fin du XIXe siècle, et ce nom vient probablement d'un pidgin de traite — « mother water ». L'étymologie est disputée, et le chapitre publie le désaccord plutôt que d'en trancher un côté.",
          sourceRefs: ["mami-wata-pidgin"],
          figureRefs: [],
        },
        {
          text: "L'image, elle, est identifiée, et elle est plus retorse encore. La représentation canonique — la femme au serpent — vient d'une affiche de cirque : une chromolithographie imprimée à Hambourg par la maison Adolph Friedländer vers 1885, portrait d'une charmeuse de serpents que le public connaissait sous le nom de Nala Damajanti.",
          sourceRefs: ["drewal-2012", "nala-damajanti"],
          figureRefs: [],
        },
        {
          text: "Nala Damajanti s'appelait en réalité Mathilde Poupon, née en 1861 dans le Jura. Française, elle se produisait chez Barnum puis aux Folies Bergère dans un personnage oriental fabriqué, se disant tour à tour indienne ou originaire de Pondichéry. L'affiche circule ensuite le long des côtes africaines, est reconnue comme un portrait de l'esprit des eaux, et lui donne son visage.",
          sourceRefs: ["nala-damajanti"],
          figureRefs: [],
        },
        {
          text: "Une divinité africaine dont l'iconographie tient à une Française déguisée en Indienne, imprimée par un lithographe allemand, et dont le nom est probablement un créole de commerce : ce n'est ni une imposture ni un vol. Trois emprunts empilés ne font pas un faux. C'est ce que transculturation et indigénisation nomment — et c'est précisément ce que le vocabulaire de l'authenticité est incapable de dire.",
          sourceRefs: ["drewal-2012", "mami-wata-pidgin"],
          figureRefs: [],
        },
      ],
    },
    {
      id: "ce-que-la-source-ne-dit-pas-chose",
      stepLabel: "05 · La chose",
      heading: "Ce que la source ne dit pas",
      blocks: [
        {
          text: "Aucune de ces cinq cases ne s'appelle « inauthentique ». Le couple authentique / faux est lui-même un outil colonial : il suppose qu'une culture aurait un état d'origine, et que tout ce qui est venu après serait une dégradation. Les cinq trajectoires disent l'inverse — les choses et leurs noms circulent, et circuler n'abîme rien.",
          sourceRefs: [],
          figureRefs: [],
        },
        {
          text: "Deux affirmations de ce chapitre demandent encore leur source primaire. La datation de la convergence de Mami Wata est une thèse d'historien, pas un fait de dictionnaire. Et l'archive d'entreprise qui fixerait 1846 et le nom du fabricant du wax n'a pas été consultée directement.",
          sourceRefs: ["mami-wata-pidgin", "vlisco-helmond"],
          figureRefs: [],
        },
      ],
    },
  ],
  entities: [
    { kind: "country", id: "GHA", label: "Ghana" },
    { kind: "country", id: "ETH", label: "Éthiopie" },
    { kind: "country", id: "TGO", label: "Togo" },
  ],
};
