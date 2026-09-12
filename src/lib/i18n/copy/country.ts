import type { Language } from "@/types/shared";

const en = {
  editorialCommonNames: {
    COD: "Democratic Republic of the Congo",
  } as Record<string, string>,
  title: {
    ficheCountry: "country page",
    reference: "ref.",
  },
  summary: {
    title: "In brief",
    referenceYear: (year: number) => `Reference year: ${year}`,
    /**
     * Each count is a name, the reach of what is counted, and what to say
     * when nothing is counted. Folded into one label the way it used to be
     * — "Peoples documented here" over the number 3 — the reach read as a
     * heading and the silence had nowhere to go but the figure's own slot.
     */
    figures: {
      population: { label: "inhabitants", absent: "population not recorded" },
      peoples: {
        label: "peoples",
        scope: "documented here",
        absent: "no people documented here",
      },
      languages: {
        label: "languages",
        scope: "documented here",
        absent: "no language documented here",
      },
      families: {
        label: "language families",
        scope: "documented here",
        absent: "no language family documented here",
      },
      names: {
        label: "names",
        scope: "referenced here",
        absent: "no name referenced here",
      },
    },
    factTier: "Source tier",
  },
  sections: {
    nameAndHistory: "The name and its history",
    history: "History",
    etymology: "Etymology of the name",
    peoples: "Peoples of the country",
    kingdoms: "Kingdoms and political formations",
    namesHistory: "Names through history",
    historicalFacts: "Major historical facts",
    languages: "Languages",
    culture: "Culture and society",
    sources: "Sources",
  },
  historyDateMissing: "Date not recorded",
  languagesDerivedNote:
    "Derived from the people pages documented in the atlas.",
  languagesUnavailable: "Language relations are temporarily unavailable.",
  peoples: {
    inhabitants: "inhabitants",
    documentedInhabitants: "documented inhabitants",
    count: (count: number) => `${count}+ peoples`,
    groupedCount: (count: number) => `${count} peoples`,
    coverage: (share: number) =>
      `The peoples documented here represent ${share}% of the country's population. The remainder is not yet distributed in the atlas.`,
    diversity: "Ethnolinguistic diversity",
    notDetailed: "not individually detailed",
    otherLanguages: (count: number) => `+ ${count} other languages`,
  },
  reportSection: "Report this section",
  sourcesReferences: "Sources and references",
  /**
   * What the apparatus amounts to, counted by standing. A census, never a
   * verdict: the list still shows each source's own standing, and the point
   * of counting them is that a reader can see a page resting on seven
   * unexamined sources without reading all seven first.
   */
  sourcesTally: {
    total: (count: number) => `${count} source${count > 1 ? "s" : ""}`,
    standing: (label: string, count: number) => `${label}: ${count}`,
  },
  targetFacts: {
    written: "Page authored",
    derived: "Presence derived from people pages",
    population: "Population",
    reference: "ref.",
    languages: "Main languages",
    boundary: (id: string) => `${id} · published boundary, drawn on appearance`,
    declaredPeoples: "Peoples declared by the page",
    firstEntries: "First entries",
    none: "No people is attached to this country in the atlas.",
    readFull: "Read the full page",
    documentedOne: "1 documented people",
    documentedMany: (count: string) => `${count} documented peoples`,
  },
  atlas: {
    areaNoun: "the atlas",
    returnTo: (name: string) => `Return to ${name}`,
    missingOutline: (name: string) => `Outline unavailable for ${name}`,
  },
  generated: {
    eras: {
      middleAges: "Middle Ages",
      precolonial: "Precolonial era",
      colonization: "Colonization",
      contemporary: "Contemporary era",
    },
    kingdomTitles: {
      generic: "Historical political entities",
      kingdoms: "Kingdoms & Civilisations",
      sultanates: "Sultanates & Chiefdoms",
      chiefdoms: "Chiefdoms & Entities",
    },
    culture: {
      religion: "Religions",
      economy: "Economy",
      social: "Organisation",
      relations: "Relations",
    },
    historicalPeriods: {
      ancientPeriods: "Ancient periods",
      middleAges: "Middle Ages",
      precolonial: "Precolonial era",
      colonization: "Colonization",
      independenceStruggle: "Struggle for independence",
      postIndependence: "Post-independence era",
    },
    each: "each",
    centers: "Centres",
  },
};

type CountryCopy = typeof en;

const fr: CountryCopy = {
  editorialCommonNames: {
    COD: "République démocratique du Congo",
  },
  title: { ficheCountry: "page du pays", reference: "réf." },
  summary: {
    title: "En bref",
    referenceYear: (year) => `Année de référence : ${year}`,
    figures: {
      population: {
        label: "habitants",
        absent: "population non renseignée",
      },
      peoples: {
        label: "peuples",
        scope: "documentés ici",
        absent: "aucun peuple documenté ici",
      },
      languages: {
        label: "langues",
        scope: "documentées ici",
        absent: "aucune langue documentée ici",
      },
      families: {
        label: "familles linguistiques",
        scope: "documentées ici",
        absent: "aucune famille documentée ici",
      },
      names: {
        label: "noms",
        scope: "référencés ici",
        absent: "aucun nom référencé ici",
      },
    },
    factTier: "Niveau de source",
  },
  sections: {
    nameAndHistory: "Le nom et son histoire",
    history: "Histoire",
    etymology: "Étymologie du nom",
    peoples: "Peuples du pays",
    kingdoms: "Royaumes et formations politiques",
    namesHistory: "Noms à travers l'histoire",
    historicalFacts: "Faits historiques majeurs",
    languages: "Langues",
    culture: "Culture et société",
    sources: "Sources",
  },
  historyDateMissing: "Date non renseignée",
  languagesDerivedNote: "Déduit des pages peuple documentées dans l’atlas.",
  languagesUnavailable:
    "Les liens entre langues et peuples sont temporairement indisponibles.",
  peoples: {
    inhabitants: "habitants",
    documentedInhabitants: "habitants documentés",
    count: (count) => `${count}+ peuples`,
    groupedCount: (count) => `${count} peuples`,
    coverage: (share) =>
      `Les peuples documentés ici représentent ${share}\u00a0% de la population du pays. Le reste n'est pas encore réparti dans l’atlas.`,
    diversity: "Diversité ethnolinguistique",
    notDetailed: "non détaillée individuellement",
    otherLanguages: (count) => `+ ${count} autres langues`,
  },
  reportSection: "Signaler cette section",
  sourcesReferences: "Sources & Références",
  sourcesTally: {
    total: (count) => `${count} source${count > 1 ? "s" : ""}`,
    standing: (label, count) => `${label} : ${count}`,
  },
  targetFacts: {
    written: "Page rédigée",
    derived: "Présence dérivée des pages peuple",
    population: "Population",
    reference: "réf.",
    languages: "Langues principales",
    boundary: (id) => `${id} · frontière publiée, tracée à l'apparition`,
    declaredPeoples: "Peuples déclarés par la page",
    firstEntries: "Premières entrées",
    none: "Aucun peuple rattaché à ce pays dans l’atlas.",
    readFull: "Lire la page complète",
    documentedOne: "1 peuple documenté",
    documentedMany: (count) => `${count} peuples documentés`,
  },
  atlas: {
    areaNoun: "l'atlas",
    returnTo: (name) => `Revenir à ${name}`,
    missingOutline: (name) => `Contour non disponible pour ${name}`,
  },
  generated: {
    eras: {
      middleAges: "Moyen Âge",
      precolonial: "Époque précoloniale",
      colonization: "Colonisation",
      contemporary: "Période contemporaine",
    },
    kingdomTitles: {
      generic: "Entités politiques historiques",
      kingdoms: "Royaumes & Civilisations",
      sultanates: "Sultanats & Chefferies",
      chiefdoms: "Chefferies & Entités",
    },
    culture: {
      religion: "Religions",
      economy: "Économie",
      social: "Organisation",
      relations: "Relations",
    },
    historicalPeriods: {
      ancientPeriods: "Périodes anciennes",
      middleAges: "Moyen Âge",
      precolonial: "Époque précoloniale",
      colonization: "Colonisation",
      independenceStruggle: "Lutte pour l'indépendance",
      postIndependence: "Période post-indépendance",
    },
    each: "chacun",
    centers: "Centres",
  },
};

// @req REQ-145
export const countryCopy: Record<Language, CountryCopy> = { en, fr };
