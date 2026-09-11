import type { Language } from "@/types/shared";

const en = {
  loading: {
    about: "Loading the presentation",
    accessibility: "Loading the accessibility statement",
    legalNotice: "Loading the legal notice",
    dataPolicy: "Loading the data policy",
  },
  forbidden: {
    title: "Access not authorized",
    body: "This resource requires a role that your account does not have yet.",
    home: "Back to home",
    signOut: "Sign out",
  },
  notFound: {
    title: "Page not found",
    body: "This address leads nowhere. The page may have been renamed, or may not have been published yet.",
    search: "Search for a page",
    report: "Report a broken URL",
    reportSubject: "Broken URL",
  },
  error: {
    title: "An error occurred",
    body: "An unexpected error occurred. You can try again or contact support with the reference below.",
    copy: "Copy reference",
    copied: "Copied",
    retry: "Try again",
    anecdote: "Did you know?",
  },
  empty: {
    searchHint: "Check the spelling or browse by language family.",
    browseFamilies: "Browse language families",
    retry: "Try again",
  },
};

type SystemStatesCopy = typeof en;

const fr: SystemStatesCopy = {
  loading: {
    about: "Chargement de la présentation",
    accessibility: "Chargement de la déclaration d'accessibilité",
    legalNotice: "Chargement des mentions légales",
    dataPolicy: "Chargement de la politique de données",
  },
  forbidden: {
    title: "Accès non autorisé",
    body: "Cette ressource nécessite un rôle que votre compte n'a pas encore.",
    home: "Retour à l'accueil",
    signOut: "Se déconnecter",
  },
  notFound: {
    title: "Page introuvable",
    body: "Cette adresse ne mène à rien. La page a peut-être changé de nom, ou n'est pas encore publiée.",
    search: "Rechercher une page",
    report: "Signaler une URL cassée",
    reportSubject: "URL cassée",
  },
  error: {
    title: "Une erreur est survenue",
    body: "Une erreur inattendue s'est produite. Vous pouvez réessayer ou contacter le support avec la référence ci-dessous.",
    copy: "Copier la référence",
    copied: "Copié",
    retry: "Réessayer",
    anecdote: "Le saviez-vous ?",
  },
  empty: {
    searchHint: "Vérifiez l'orthographe ou parcourez par famille linguistique.",
    browseFamilies: "Parcourir les familles linguistiques",
    retry: "Réessayer",
  },
};

// @req REQ-145
export const systemStatesCopy: Record<Language, SystemStatesCopy> = { en, fr };
