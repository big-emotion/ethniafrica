import type { Language } from "@/types/shared";

const en = {
  title: "Cookie settings",
  description:
    "We use cookies to improve your experience on our site. Essential cookies are required for the site to work. Analytics and functional cookies help us improve our services.",
  dataPolicy: "Data policy",
  essential: "Essential cookies",
  essentialDescription: "Required — necessary for the site to work",
  analytics: "Analytics cookies",
  analyticsDescription: "Plausible — anonymous visit statistics",
  functional: "Functional cookies",
  functionalDescription: "Sentry — error reporting that helps improve the site",
  save: "Save preferences",
  acceptAll: "Accept all",
  reject: "Reject",
  customise: "Customise",
};

type ConsentCopy = typeof en;

const fr: ConsentCopy = {
  title: "Gestion des cookies",
  description:
    "Nous utilisons des cookies pour améliorer votre expérience sur notre site. Les cookies essentiels sont nécessaires au fonctionnement du site. Les cookies analytiques et fonctionnels nous aident à améliorer nos services.",
  dataPolicy: "Politique de données",
  essential: "Cookies essentiels",
  essentialDescription: "Requis — nécessaires au fonctionnement du site",
  analytics: "Cookies analytiques",
  analyticsDescription: "Plausible — statistiques anonymes de visite",
  functional: "Cookies fonctionnels",
  functionalDescription: "Sentry — rapport d'erreurs pour améliorer le site",
  save: "Enregistrer mes préférences",
  acceptAll: "Accepter tout",
  reject: "Refuser",
  customise: "Personnaliser",
};

// @req REQ-145
export const consentCopy: Record<Language, ConsentCopy> = { en, fr };
