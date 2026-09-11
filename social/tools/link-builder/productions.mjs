/**
 * The twenty retained productions of `production-list-2026-09-09.md`, reduced
 * to the two things a tagged link needs: where it points, and under what
 * campaign name.
 *
 * The list names several anchors per production; only the first is the
 * destination. A link has one target, and picking it is an editorial decision —
 * the *page the piece sends you to* — not something a script should infer from
 * the order of a markdown table.
 *
 * The campaign slug is short on purpose. It is read months later in a Plausible
 * report, next to nineteen others, so it names the subject rather than
 * restating the title.
 */
export const PRODUCTIONS = [
  // ── Eleven videos, in shooting order ──────────────────────────────────────
  {
    id: "traore-diop",
    kind: "video",
    title: "Un Traoré du Mali peut devenir un Diop au Sénégal.",
    subject: "Noms · Traoré",
    pillar: "Le vrai nom",
    path: "/fr/atlas/noms/PAT_TRAORE",
  },
  {
    id: "sanankuya",
    kind: "video",
    title: "Au Mali, un Keïta et un Coulibaly n'ont pas le droit de se fâcher.",
    subject: "Noms · Keïta et Coulibaly",
    pillar: "La carte cachée",
    path: "/fr/glossaire",
  },
  {
    id: "senegal-correction",
    kind: "video",
    title:
      "On a dit que Sénégal voulait dire « notre pirogue ». Un abonné nous a corrigés.",
    subject: "Pays · Sénégal",
    pillar: "La correction",
    path: "/fr/atlas/pays/SEN",
    notes:
      "Curation de la fiche d'abord : elle affirme encore « vient probablement de Sunugal » et aucune de ses neuf sources ne porte l'étymologie. Version sans crédit par défaut.",
  },
  {
    id: "fleuve-niger",
    kind: "video",
    title: "Le nom du fleuve Niger ne veut pas dire « noir ».",
    subject: "Pays · Niger",
    pillar: "Mythe déconstruit",
    path: "/fr/atlas/pays/NER",
  },
  {
    id: "lac-nyasa",
    kind: "video",
    title: "Au Malawi, le lac Nyasa s'appelle le lac Lac.",
    subject: "Pays · Malawi",
    pillar: "Ce que ce nom veut dire",
    path: "/fr/atlas/pays/MWI",
  },
  {
    id: "krou-klao",
    kind: "video",
    title: "En Côte d'Ivoire, « Krou » ne vient pas de l'anglais crew.",
    subject: "Familles · Krou",
    pillar: "Le vrai nom",
    path: "/fr/atlas/familles/FLG_KROU",
    notes:
      "FLG_KROU est une des pages que l'audit d'audience marque en échec : la vidéo lui envoie du trafic qu'elle doit pouvoir retenir.",
  },
  {
    id: "bassa-deux-langues",
    kind: "video",
    title:
      "Les Bassa du Liberia et les Bassa du Cameroun ne parlent pas la même langue.",
    subject: "Peuples · Bassa",
    pillar: "La carte cachée",
    path: "/fr/atlas/peuples/PPL_BASSA",
  },
  {
    id: "azande-fleur",
    kind: "video",
    title:
      "Une fleur porte encore l'insulte inventée contre les Azande du Congo.",
    subject: "Peuples · Azande",
    pillar: "Le vrai nom",
    path: "/fr/atlas/peuples/PPL_AZANDE_SUD",
  },
  {
    id: "baka-pygmees",
    kind: "video",
    title: "Les Baka du Cameroun ne se sont jamais appelés « Pygmées ».",
    subject: "Peuples · Baka",
    pillar: "Mythe déconstruit",
    path: "/fr/atlas/peuples/PPL_PYGMEES_AUTOCHTONES",
  },
  {
    id: "nzebi-clans",
    kind: "video",
    title:
      "Au Gabon, un homme retenait par cœur l'histoire de tous les clans nzebi.",
    subject: "Peuples · Nzebi",
    pillar: "La carte cachée",
    path: "/fr/atlas/peuples/PPL_NZEBI",
  },
  {
    id: "lesotho-botswana",
    kind: "video",
    title:
      "Lesotho et Botswana ne sont pas des noms de pays. Ce sont des conjugaisons.",
    subject: "Pays · Lesotho et Botswana",
    pillar: "Ce que ce nom veut dire",
    path: "/fr/atlas/pays/LSO",
  },

  // ── Nine carousels ────────────────────────────────────────────────────────
  {
    id: "noms-de-metier",
    kind: "carrousel",
    title:
      "Kouyaté, Camara, Diabaté : au Mali, ton nom dit le métier de tes ancêtres.",
    subject: "Noms · métiers",
    pillar: "Le vrai nom",
    path: "/fr/atlas/noms/PAT_KOUYATE",
  },
  {
    id: "alliances-maliennes",
    kind: "carrousel",
    title:
      "Keïta, Coulibaly, Traoré, Diarra : au Mali, ces familles n'ont pas le droit de se fâcher.",
    subject: "Noms · alliances",
    pillar: "La carte cachée",
    path: "/fr/atlas/noms/PAT_KEITA",
    notes:
      "Compagnon de la vidéo sanankuya, sur les surfaces où la vidéo ne convertit pas.",
  },
  {
    id: "noms-refuses-ameriques",
    kind: "carrousel",
    title:
      "Du Suriname au Belize, six peuples ont refusé le nom qu'on leur avait donné.",
    subject: "Peuples · diaspora",
    pillar: "Le vrai nom",
    path: "/fr/atlas/peuples/PPL_GARIFUNA",
  },
  {
    id: "mercator",
    kind: "carrousel",
    title:
      "Sur la carte de ta salle de classe, l'Afrique n'a pas sa vraie taille.",
    subject: "Jeux · Mercator",
    pillar: "La carte cachée",
    path: "/fr/jeux/mercator",
    notes:
      "Le dossier proportions est hors ligne : décision opérateur, le jeu est une destination suffisante et les trois chiffres citent leurs sources sur la carte.",
  },
  {
    id: "peul-fula-fulani",
    kind: "carrousel",
    title:
      "Du Sénégal au Cameroun : Peul, Fula, Fulani, Fellata. Aucun n'est leur nom.",
    subject: "Peuples · Peul",
    pillar: "Le vrai nom",
    path: "/fr/atlas/peuples/PPL_FULANI_MASSINA",
  },
  {
    id: "tombouctou",
    kind: "carrousel",
    title:
      "Tombouctou, au Mali : personne ne sait vraiment ce que ce nom veut dire.",
    subject: "Pays · Mali",
    pillar: "Mythe déconstruit",
    path: "/fr/atlas/pays/MLI",
    notes: "Le fait publié est le désaccord. Ne pas désigner de gagnant.",
  },
  {
    id: "noms-imposes",
    kind: "carrousel",
    title:
      "Hottentot, Habé, Kirdi, Pahouin : quatre noms que personne n'a choisis.",
    subject: "Peuples · exonymes",
    pillar: "Le vrai nom",
    path: "/fr/atlas/peuples/PPL_KHOIKHOI",
  },
  {
    id: "benin-royaume",
    kind: "carrousel",
    title: "Le Bénin porte le nom d'un royaume qui se trouvait au Nigeria.",
    subject: "Pays · Bénin",
    pillar: "Mythe déconstruit",
    path: "/fr/atlas/pays/BEN",
  },
  {
    id: "noms-de-commerce",
    kind: "carrousel",
    title:
      "Dioula, Teke, Manianga, Kavango : quatre peuples nommés par un commerce ou une rivière.",
    subject: "Peuples · commerce",
    pillar: "Ce que ce nom veut dire",
    path: "/fr/atlas/peuples/PPL_DIOULA",
    notes:
      "Piège à signaler dans la copie : les Diola de Casamance n'ont rien à voir avec les Dioula.",
  },
];
