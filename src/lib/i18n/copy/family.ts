import type { Language } from "@/types/shared";

const en = {
  title: {
    eyebrow: "Language family",
    reconstructedArea: "an area to reconstruct",
    sharedSelfAndEnglish: (name: string) =>
      `Self-designation and English name: ${name}. Only French adapts the name.`,
    distinctNames: (selfName: string, englishName: string) =>
      `Self-designation: ${selfName}. English name: ${englishName}.`,
    notRecorded: "not recorded",
  },
  targetFacts: {
    description: (id: string, family: string) =>
      `${id} · share of the ${family} footprint`,
    present: (family: string) => `${family} peoples present`,
    total: (count: number) => `Of the family's ${count} peoples`,
    widespread: "Among the most widespread",
    derived: "Derived — the family does not give it",
    readFull: "Read the full page",
    readFullFor: (family: string) => `Read the full page for ${family}`,
  },
  parchment: {
    undeclaredDistribution: "Distribution not declared",
    figures: "The family in figures",
    languages: "Languages",
    speakers: "Speakers",
    branches: "Branches",
    distribution: "Distribution",
    empty: "empty",
    footprint: "The footprint and where it comes from",
    nameOrigin: "Where the family name comes from",
    attachedPeoples: "Attached peoples",
    sources: "Sources",
    countryCount: (count: number) =>
      `${count} ${count === 1 ? "country" : "countries"}`,
    attachedNote: (shown: number, total: number) =>
      `${shown} of ${total} attached peoples, ranked by reach`,
    omitted: (count: number) =>
      `${count} other attached peoples are not listed here.`,
    missingDistribution:
      "This page gives neither its branches nor the countries it covers. The area drawn above is therefore rebuilt from the peoples attached to the family, and said to be.",
    footprintMemberPeoples: (peopleCount: number, countryCount: number) =>
      `The area drawn above is not read from the family page: it is calculated. Each people gives its language family and the countries where it is found today; the union of those countries across the ${peopleCount} peoples attached to this family produces the ${countryCount} shaded countries, with intensity following the number of peoples present.`,
    footprintDeclaredPeoples: (peopleCount: number, countryCount: number) =>
      `The area drawn above is not read from the family page: it is calculated. No people is attached directly to this family: they belong to its subfamilies. Instead of adding those together—which would make the map assert a unity the page itself disputes—the area follows the only list the page endorses, the peoples named by the page: the union of the countries where those ${peopleCount} peoples are found today produces the ${countryCount} shaded countries. The map therefore says nothing beyond the text.`,
    borderNote:
      "The edge remains dashed throughout: a language family has no border, and this aggregate even less than the rest.",
    declaredArea: "Area given here:",
  },
  decolonial: {
    title: "Designations and decolonisation",
    historicalDesignations: "Historical designations",
    frenchName: "French name",
    familyLink: "Link with the family",
    problematic: "Why this term is problematic",
    selfDesignation: "Self-designation",
    contemporaryUsage: "Contemporary usage",
  },
  linguistic: {
    title: "Linguistic characteristics",
    typology: "Typology",
    phonology: "Phonological features",
    neighbours: "Relations with neighbouring languages",
    innovations: "Key innovations",
  },
  history: {
    title: "History and origins",
    probableOrigin: "Probable origin",
    emergencePeriod: "Period of emergence",
    diffusion: "Diffusion",
    historicalBreaks: "Historical disruptions",
    contactZones: "Contact zones",
    majorEvents: "Major events",
    report: "Report this section",
  },
  atlas: {
    missingFootprint: (name: string) =>
      `Geographic footprint unavailable for ${name}`,
  },
};

type FamilyCopy = typeof en;

const fr: FamilyCopy = {
  title: {
    eyebrow: "Famille linguistique",
    reconstructedArea: "une aire à reconstruire",
    sharedSelfAndEnglish: (name) =>
      `Auto-appellation et nom anglais : ${name}. Le français seul francise.`,
    distinctNames: (selfName, englishName) =>
      `Auto-appellation : ${selfName}. Nom anglais : ${englishName}.`,
    notRecorded: "non renseigné",
  },
  targetFacts: {
    description: (id, family) => `${id} · part de l'empreinte ${family}`,
    present: (family) => `Peuples ${family} présents`,
    total: (count) => `Sur les ${count} de la famille`,
    widespread: "Parmi les plus répandus",
    derived: "Dérivé — la famille ne le donne pas",
    readFull: "Lire la page complète",
    readFullFor: (family) => `Lire la page complète de ${family}`,
  },
  parchment: {
    undeclaredDistribution: "Distribution non déclarée",
    figures: "La famille en chiffres",
    languages: "Langues",
    speakers: "Locuteurs",
    branches: "Branches",
    distribution: "Distribution",
    empty: "vide",
    footprint: "L'empreinte, et d'où elle vient",
    nameOrigin: "D'où vient le nom de la famille",
    attachedPeoples: "Peuples rattachés",
    sources: "Sources",
    countryCount: (count) => `${count} pays`,
    attachedNote: (shown, total) =>
      `${shown} des ${total} peuples rattachés, classés par étendue`,
    omitted: (count) =>
      `${count} autres peuples rattachés ne sont pas listés ici.`,
    missingDistribution:
      "Cette page ne donne ni ses branches ni les pays où elle est présente. L'aire dessinée plus haut est donc reconstruite à partir des peuples rattachés à la famille, et c'est écrit.",
    footprintMemberPeoples: (peopleCount, countryCount) =>
      `L'aire dessinée plus haut n'est pas lue dans la page de la famille : elle est calculée. Chaque peuple donne sa famille de langues et les pays où il se trouve aujourd'hui ; l'union de ces pays sur les ${peopleCount} peuples rattachés à cette famille donne les ${countryCount} pays teintés, l'intensité suivant le nombre de peuples présents.`,
    footprintDeclaredPeoples: (peopleCount, countryCount) =>
      `L'aire dessinée plus haut n'est pas lue dans la page de la famille : elle est calculée. Aucun peuple n'est rattaché directement à cette famille : ils relèvent de ses sous-familles. Plutôt que d'additionner celles-ci — ce qui ferait affirmer à la carte une unité que la page elle-même conteste — l'aire suit la seule liste que la page assume, les peuples que la page nomme : l'union des pays où ces ${peopleCount} peuples se trouvent aujourd'hui donne les ${countryCount} pays teintés. La carte ne dit donc rien de plus que le texte.`,
    borderNote:
      "Le bord reste tireté partout : une famille linguistique n'a pas de frontière, et cet agrégat encore moins que le reste.",
    declaredArea: "Aire donnée ici :",
  },
  decolonial: {
    title: "Appellations et décolonisation",
    historicalDesignations: "Appellations historiques",
    frenchName: "Nom français",
    familyLink: "Lien avec la famille",
    problematic: "Pourquoi ce terme est problématique",
    selfDesignation: "Auto-appellation",
    contemporaryUsage: "Usage contemporain",
  },
  linguistic: {
    title: "Caractéristiques linguistiques",
    typology: "Typologie",
    phonology: "Traits phonologiques",
    neighbours: "Relations avec les voisins",
    innovations: "Innovations majeures",
  },
  history: {
    title: "Histoire et origines",
    probableOrigin: "Origine probable",
    emergencePeriod: "Période d'émergence",
    diffusion: "Diffusion",
    historicalBreaks: "Ruptures historiques",
    contactZones: "Zones de contact",
    majorEvents: "Événements majeurs",
    report: "Signaler cette section",
  },
  atlas: {
    missingFootprint: (name) =>
      `Empreinte géographique non disponible pour ${name}`,
  },
};

// @req REQ-145
export const familyCopy: Record<Language, FamilyCopy> = { en, fr };
