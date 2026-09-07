import { ATTRIBUTION_STRING, PRODUCT_NAME } from "@/lib/brand";
import type { Language } from "@/types/shared";

const en = {
  attribution: ATTRIBUTION_STRING,
  partnerLogoAlt: "BIG EMOTION",
  copyright: `${PRODUCT_NAME} — corpus published under the CC BY-SA 4.0 licence.`,
  about: "About",
  api: "API",
  legalNavigationLabel: "Legal information",
  legalNotice: "Legal notice",
  dataPolicy: "Data policy",
  cookieSettings: "Cookie settings",
  accessibility: "Accessibility",
  sitemap: "Sitemap",
  directory: {
    explorerHeading: "Explore",
    axes: {
      atlas: "The atlas",
      dossiers: "The dossiers",
      jeux: "Play",
    },
    participateHeading: "Take part",
    contribute: "Contribute",
    reportError: "Report an error",
    projectHeading: "The project",
    about: "About",
    sources: "Sources",
    glossary: "Glossary",
    contact: "Contact",
    followHeading: "Follow us",
    followPending: "account to come",
  },
};

type FooterCopy = typeof en;

const fr: FooterCopy = {
  attribution: ATTRIBUTION_STRING,
  partnerLogoAlt: "BIG EMOTION",
  // Not "tous droits réservés": the API meta and every citation this site
  // emits declare CC BY-SA 4.0, so the footer was contradicting the corpus
  // four hundred pixels below the citation block that licenses it.
  // Brand charter §2.
  copyright: `${PRODUCT_NAME} — corpus sous licence CC BY-SA 4.0.`,
  about: "À propos",
  // Left the header when it became three intentions rather than ten
  // destinations: the public API is a developer's entry, not a reading
  // one, so it belongs beside « À propos » and not on an axis.
  api: "API",
  legalNavigationLabel: "Informations légales",
  legalNotice: "Mentions légales",
  dataPolicy: "Politique de données",
  cookieSettings: "Gestion des cookies",
  accessibility: "Accessibilité",
  sitemap: "Plan du site",
  // The directory above the legal line.
  //
  // Its Explorer column held the six corpus indexes — Pays, Peuples, Familles,
  // Langues, Noms, Appellations des peuples — for as long as the three axes
  // had no address of their own. ETNI-1555 had deleted `/fr/atlas` and
  // `/fr/jeux`, so a column that meant to offer the ways in could only offer
  // what sat under them. The hubs came back on 7 September 2026 (brand charter
  // §8.6) and the column names them instead, so the reader meets the same
  // three doors at the foot of a page as in the bar above it.
  //
  // The labels are the axes' own — `ACCESS_MODE_LABELS`, through the axes map
  // below — rather than a second spelling of them. A footer that renamed the
  // bar's three entries would be the same drift, one étage down.
  directory: {
    explorerHeading: "Explorer",
    axes: {
      atlas: "L'atlas",
      dossiers: "Les dossiers",
      jeux: "Jouer",
    },
    participateHeading: "Participer",
    contribute: "Contribuer",
    reportError: "Signaler une erreur",
    // The two pages that describe the project rather than the corpus.
    // No access mode lists them — an axis is a way into the corpus — so
    // the footer is where a reader now finds them. Doctrine is reached
    // from here at one remove, through the link on the À propos page
    // itself, rather than as a fourth entry in this rubric.
    projectHeading: "Le projet",
    about: "À propos",
    sources: "Sources",
    glossary: "Glossaire",
    contact: "Contact",
    followHeading: "Nous suivre",
    followPending: "compte à venir",
  },
};

// @req REQ-145
export const footerCopy: Record<Language, FooterCopy> = { en, fr };
