/**
 * The legal documents, held apart from `translations.ts` on purpose.
 *
 * They are read by exactly three server-rendered routes — mentions légales,
 * politique de données, accessibilité — and by nothing a reader downloads.
 * Left inside the translations object they travelled into every client bundle
 * that reaches for any other string in it: adding the corpus licence section
 * pushed the quiz play island from 11.9 KB to 12.48 KB gzipped and broke its
 * budget, which is how far a quiz player was carrying the site's legal notice.
 *
 * Anything here is prose a reader only meets by navigating to a legal page.
 * Nothing else belongs in this file.
 */
// @req REQ-088
export const legalPages = {
  legalNotice: {
    eyebrow: "Informations essentielles",
    title: "Mentions légales",
    lastUpdated: "Dernière mise à jour : 25 juillet 2026",
    introduction:
      "Cette page présente l’éditeur, le responsable de publication et l’hébergeur d’EthniAfrica.",
    sections: [
      {
        title: "Éditeur du site",
        paragraphs: [
          "EthniAfrica est édité par BIG EMOTION, SASU (société par actions simplifiée à associé unique) au capital de 500 €.",
          "Siège social : 14 rue Bausset, 75015 Paris, France. RCS Paris : 983 423 351. TVA intracommunautaire : FR30983423351.",
          "Contact : hello@big-emotion.com.",
        ],
      },
      {
        title: "Directeur de la publication",
        paragraphs: ["Jean-Noé Kollo, président de BIG EMOTION."],
      },
      {
        title: "Conception et réalisation",
        paragraphs: [
          "La conception et la réalisation du site ont été confiées à l’agence BIG EMOTION.",
          "Site web : big-emotion.com.",
          "Courriel : hello@big-emotion.com.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: [
          "Le site est hébergé et distribué par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Les services applicatifs et les données du projet sont configurés selon les régions documentées dans l’infrastructure d’EthniAfrica.",
        ],
      },
      {
        title: "Licence du corpus",
        paragraphs: [
          "Le corpus d’EthniAfrica — les fiches de peuples, de pays et de familles linguistiques, ainsi que les textes éditoriaux du site et les données qui en sont dérivées — est mis à disposition sous licence Creative Commons Attribution – Partage dans les mêmes conditions 4.0 International (CC BY-SA 4.0).",
          "Cette licence autorise la reproduction, la modification et la réutilisation, y compris commerciale, à deux conditions : citer EthniAfrica et l’adresse de la fiche réutilisée, et placer toute œuvre dérivée sous la même licence. Le bloc de citation présent sur chaque fiche fournit la formule d’attribution à recopier.",
          "Le texte complet de la licence est disponible sur creativecommons.org/licenses/by-sa/4.0/deed.fr.",
        ],
      },
      {
        title: "Ce que la licence ne couvre pas",
        paragraphs: [
          "Le code source du site n’est pas concerné par cette licence. Il reste la propriété de BIG EMOTION et aucun droit de réutilisation n’est concédé à son égard.",
          "Les données, citations, marques, documents et visuels provenant de tiers restent la propriété de leurs titulaires et conservent leurs propres conditions d’utilisation, que le site indique au cas par cas. Leur présence sur EthniAfrica n’emporte aucun transfert de droits, et la licence ci-dessus ne s’y étend pas.",
          "Les faits eux-mêmes ne sont pas protégeables par le droit d’auteur. La base de données constituée par le projet bénéficie en revanche, au titre de l’article L. 341-1 du code de la propriété intellectuelle, d’une protection distincte au bénéfice de BIG EMOTION en qualité de producteur ; l’extraction substantielle de son contenu reste soumise à la licence ci-dessus.",
        ],
      },
      {
        title: "Responsabilité éditoriale",
        paragraphs: [
          "EthniAfrica documente des réalités historiques, linguistiques et culturelles susceptibles d’évoluer ou de faire l’objet de débats. Le projet publie ses sources et rend visibles les signalements afin de permettre la correction et la discussion documentée.",
        ],
      },
    ],
  },
  dataPolicy: {
    eyebrow: "Vie privée et transparence",
    title: "Politique de données",
    lastUpdated: "Dernière mise à jour : 25 juillet 2026",
    introduction:
      "EthniAfrica limite la collecte de données personnelles au strict nécessaire et distingue clairement les données du compte, les contributions éditoriales et les mesures techniques.",
    sections: [
      {
        title: "Responsable du traitement",
        paragraphs: [
          "Le responsable du traitement est BIG EMOTION, 14 rue Bausset, 75015 Paris, France. Pour toute question ou demande relative aux données personnelles : contact@ethniafrica.com.",
        ],
      },
      {
        title: "Données traitées",
        paragraphs: [
          "Lors de la création d’un compte, EthniAfrica peut traiter une adresse e-mail, un nom d’affichage, les informations nécessaires à l’authentification et la confirmation d’âge.",
          "Les contributions, corrections et signalements sont conservés avec les informations nécessaires à leur instruction et à la transparence éditoriale. Les journaux techniques peuvent contenir des informations limitées liées au fonctionnement et à la sécurité du service.",
          "Les préférences de consentement sont enregistrées dans le navigateur pour mémoriser les choix effectués.",
        ],
      },
      {
        title: "Finalités et bases légales",
        paragraphs: [
          "Les données de compte servent à fournir l’accès aux fonctionnalités de contribution. Les signalements et journaux éditoriaux répondent à l’intérêt légitime de fiabilité, de sécurité et de transparence du projet.",
          "La mesure d’audience Plausible n’est activée qu’après consentement. La préférence fonctionnelle contrôle l’association d’un contexte utilisateur à Sentry ; sans elle, ce contexte est effacé. Les diagnostics techniques strictement nécessaires à la sécurité et à la stabilité peuvent être traités au titre de l’intérêt légitime.",
          "Les choix de consentement peuvent être modifiés à tout moment depuis « Gestion des cookies » dans le pied de page.",
        ],
      },
      {
        title: "Services et sous-traitants",
        paragraphs: [
          "Supabase fournit l’authentification et l’hébergement de la base de données. Vercel assure l’hébergement et la distribution de l’application.",
          "Plausible Analytics fournit, après consentement, des statistiques de fréquentation sans cookie publicitaire. Sentry peut recevoir un contexte technique limité et expurgé des données personnelles identifiables afin de diagnostiquer les erreurs.",
          "Aucune donnée personnelle n’est vendue, louée ou utilisée à des fins de profilage publicitaire.",
        ],
      },
      {
        title: "Durées de conservation",
        paragraphs: [
          "Le profil contributeur est conservé tant que le compte reste actif, puis supprimé dans les trente jours suivant une demande de clôture.",
          "Les contributions et signalements peuvent être conservés dans le journal éditorial ; ils sont anonymisés lorsqu’un compte est effacé. Les journaux d’erreurs Sentry sont conservés au maximum trente jours. Les préférences de consentement expirent après douze mois.",
        ],
      },
      {
        title: "Mineurs",
        paragraphs: [
          "Les fonctionnalités de contribution sont réservées aux personnes âgées d’au moins seize ans. Entre treize et quinze ans, la participation nécessite le consentement explicite et vérifiable d’un parent ou représentant légal, selon la législation applicable.",
        ],
      },
      {
        title: "Droits et réclamation",
        paragraphs: [
          "Toute personne dispose, selon sa situation, de droits d’accès, de rectification, d’effacement, d’opposition, de limitation et de portabilité. Ces droits peuvent être exercés à l’adresse contact@ethniafrica.com.",
          "Une réclamation peut également être adressée à la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France.",
        ],
      },
    ],
  },
  accessibility: {
    eyebrow: "Un atlas ouvert à toutes et tous",
    title: "Accessibilité",
    lastUpdated: "Dernière mise à jour : 25 juillet 2026",
    introduction:
      "EthniAfrica vise une expérience utilisable sur mobile, au clavier et avec les technologies d’assistance. Cette déclaration décrit l’état actuel du site sans le surestimer.",
    sections: [
      {
        title: "État de conformité",
        paragraphs: [
          "EthniAfrica n’a pas encore fait l’objet d’un audit d’accessibilité complet par un tiers. Le site ne revendique donc aucun taux de conformité au RGAA ou aux WCAG à ce stade.",
        ],
      },
      {
        title: "Mesures déjà en place",
        paragraphs: [
          "Les interfaces principales utilisent des titres structurés, des libellés explicites, des zones de navigation identifiables et des contrôles accessibles au clavier.",
          "Les composants sont conçus en mobile-first, les contrastes sont vérifiés dans le système de design et les animations essentielles respectent la préférence de réduction des mouvements.",
        ],
      },
      {
        title: "Limites connues",
        paragraphs: [
          "Certains graphiques, contenus historiques et parcours plus anciens peuvent encore nécessiter une description alternative ou une navigation clavier améliorée.",
          "L’équipe poursuit l’évaluation des parcours et corrige en priorité les obstacles qui empêchent l’accès à une information ou à une fonctionnalité.",
        ],
      },
      {
        title: "Signaler un obstacle",
        paragraphs: [
          "Pour signaler un problème d’accessibilité, écrivez à contact@ethniafrica.com en indiquant la page concernée, l’appareil ou la technologie d’assistance utilisée et la difficulté rencontrée.",
        ],
      },
    ],
  },
} as const;
