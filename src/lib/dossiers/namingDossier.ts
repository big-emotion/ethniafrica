import type { PageType } from "@/lib/routing";

/**
 * « Nommer les peuples d'Afrique » — the long-form counterpart of the two
 * naming axes.
 *
 * Appellations and Nom index *what* the corpus records. Neither has anywhere
 * to say *why* recording it is contested, and both were leaving a reader to
 * infer it: three thousand ethnonym forms with no account of where they came
 * from, and five naming systems presented as a taxonomy with no explanation of
 * why one taxonomy cannot cover them.
 *
 * **This is a shell with a starting text, not the finished dossier.** Every
 * claim below is a statement about *this corpus* — a count, a category it
 * publishes, a rule it holds itself to — and each is checkable against the
 * page it links to. Nothing here cites an outside work, deliberately: the
 * external sourcing is editorial work with its own tiers, and inventing a
 * bibliography to fill a template is the one thing a decolonial atlas cannot
 * afford. The module stays `draft` until that work is done.
 */

export interface NamingDossierSection {
  id: string;
  title: string;
  /** One sentence stating what the section argues. */
  lede: string;
  paragraphs: readonly string[];
  /** Where a reader goes to see the corpus make the claim. */
  link: { page: PageType; label: string };
}

// @req REQ-114
export const NAMING_DOSSIER_SECTIONS: readonly NamingDossierSection[] = [
  {
    id: "nommer-un-peuple",
    title: "Nommer un peuple",
    lede: "Le nom sous lequel un peuple est connu est rarement celui qu'il se donne.",
    paragraphs: [
      "L'atlas recense 3 134 formes de noms de peuples. 715 sont des endonymes — des noms que le groupe emploie lui-même. 2 742 sont des exonymes : des noms donnés de l'extérieur, par des voisins, des marchands, des missionnaires ou une administration. Le rapport est de près de un à quatre, et il n'est pas un accident de collecte : ce sont les noms venus du dehors qui ont été écrits, imprimés, recopiés, et qui sont donc arrivés jusqu'ici.",
      "Certains de ces noms sont péjoratifs à l'origine, d'autres sont des malentendus figés par l'écrit, d'autres encore ont été adoptés par les intéressés eux-mêmes. L'atlas ne les trie pas : il les publie tous, avec ce qu'il sait de leur provenance, et laisse la hiérarchie au lecteur plutôt que de la trancher en silence.",
      "Les catégories employées pour regrouper ces peuples ont la même histoire. « Ethnie », « tribu », « Bantou » ne sont pas des mots que les peuples concernés ont forgés pour se décrire ; ce sont des instruments de classement, produits par ceux qui classaient. Les garder tout en disant d'où ils viennent est la position que tient ce corpus — les effacer reviendrait à effacer aussi la trace de qui les a posés.",
    ],
    link: { page: "names", label: "Voir les appellations recensées" },
  },
  {
    id: "nommer-une-personne",
    title: "Nommer une personne",
    lede: "« Nom de famille » est une catégorie européenne, et elle ne décrit pas ce que l'atlas documente.",
    paragraphs: [
      "L'axe Nom publie cinq systèmes de nommage, et trois ne se lisent pas comme un nom de famille : le nom de clan mandingue — le jamu —, la nisba arabo-berbère, et le nom d'éloge. Un quatrième, le clan totémique ganda, tire les prénoms d'une liste fermée que le clan détient, de sorte que c'est l'appartenance à la liste, et non le nom, qui signale la lignée.",
      "Le cinquième est le seul patronyme au sens strict : le patronyme non héréditaire, où le second nom d'une personne est le prénom de son père, régénéré à chaque génération. C'est le système de l'Éthiopie et de l'Érythrée, et c'est aussi le cas où il n'existe, à proprement parler, aucun nom de famille à transmettre.",
      "Un jamu ne se transmet d'ailleurs pas seulement par filiation : l'espace mandingue a intégré des groupes sans lien de sang par alliance politique, clientèle ou captivité. C'est pourquoi l'atlas énonce une association historique entre un nom et des peuples, et jamais l'origine d'une personne. Aucune fonctionnalité ici ne prend un nom et rend une appartenance : la déduction est fausse, et sa mécanique est celle des registres coloniaux.",
    ],
    link: { page: "patronymes", label: "Voir les noms documentés" },
  },
];
