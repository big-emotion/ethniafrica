import { describe, it, expect } from "vitest";
import {
  formatPeoplePopulation,
  extractAppellationShort,
  transformPeopleHero,
  transformPeopleOrigins,
  transformPeopleLanguages,
  transformPeopleHistory,
  transformPeopleCulture,
  transformPeopleRelatedPeoples,
  transformPeopleCountries,
  transformPeopleData,
} from "../peopleDataTransformer";
import type { PeopleDetail } from "@/types/afrik-frontend";

// ==========================================
// MOCK DATA: Yoruba (PPL_YORUBA)
// ==========================================

const yorubaPeople: PeopleDetail = {
  id: "PPL_YORUBA",
  nameMain: "Yoruba",
  languageFamilyId: "FLG_NIGER_CONGO",
  languageFamilyName: "Niger-Congo",
  currentCountries: ["NGA", "BEN", "TGO"],
  classificationStatus: "consensual",
  appellations: {
    mainName: "Yoruba",
    selfAppellation: "Ọmọ Oòduà (singulier), Yorùbá (pluriel)",
    exonyms: ["Nago", "Anago", "Yariba"],
    originOfExonyms: "Term 'Yariba' used by Hausa neighbors",
    whyProblematic: "'Yariba' peut être considéré péjoratif",
    contemporaryUsage: "Yoruba is widely used and self-accepted",
    linguisticFamily: "FLG_NIGER_CONGO",
    ethnoLinguisticGroup: "Yoruboïd",
    historicalRegion: "Yorubaland (Nigeria du sud-ouest)",
    currentCountries: ["NGA", "BEN", "TGO"],
  },
  ethnicities: ["Oyo", "Egba", "Ijebu", "Ife", "Ekiti"],
  origins: {
    ancientOrigins: "Origines préhistoriques dans le bassin du Bénué",
    formationPeriod: "Ier millénaire de notre ère",
    migrationRoutes: ["Du fleuve Bénué vers le golfe de Guinée"],
    historicalSettlementZones: ["Yorubaland", "Lagos", "Ibadan"],
    unificationsOrDivisions: "Unification autour d'Ile-Ife, cité sacrée",
    externalInfluences: "Influence du califat de Sokoto au XIXe siècle",
    majorHistoricalEvents: "Guerres yoruba du XIXe siècle",
  },
  organization: {
    traditionalPoliticalSystem: "Monarchies constitutionnelles (Obas)",
    clanOrganization: "Organisation en clans patrilinéaires (idile)",
    ageClassSystems: "Systèmes d'âge dans certaines communautés",
    roleOfLineages: "Rôle central des lignages dans la vie sociale",
    religiousAuthority: "Alaafin d'Oyo, Ooni d'Ife",
  },
  languages: {
    mainLanguage: "Yoruba",
    isoCodes: ["yor"],
    dialects: ["Oyo", "Lagos", "Ekiti", "Ondo"],
    vehicularRole: "Langue véhiculaire en Afrique de l'Ouest",
  },
  culture: {
    divinitiesAndSpirits: {
      supremeDeity: {
        name: "Olodumare",
        attributes: "Créateur suprême",
        veneration: "Indirect via Orisha",
      },
      intermediateDivinities: [
        {
          name: "Shango",
          domain: "Tonnerre et foudre",
          role: "Dieu du tonnerre",
        },
        { name: "Oya", domain: "Vent et changement" },
      ],
    },
    ritesAndPractices: {
      initiationRites: {
        maleInitiation: "Initiation à l'Ogboni",
        femaleInitiation: "Rites de puberté",
      },
      funeraryRites: {
        wake: "Veillée funèbre Egungun",
        burial: "Inhumation traditionnelle",
      },
    },
    symbolsAndArts: {
      symbols: [
        { name: "Ile-Ife", meaning: "Cité berceau" },
        { name: "Ase", meaning: "Pouvoir divin" },
      ],
      artsAndMusic: {
        musicalInstruments: "Bàtá, gangan (tambour parlant)",
        dances: "Bata dance",
      },
      gastronomy: {
        emblematicDishes: "Egusi soup, jollof rice, pounded yam",
      },
    },
    contemporarySpirituality: {
      christianity: {
        percentageOfPopulation: 40,
        denominations: "Pentecôtisme, catholicisme",
      },
      islam: {
        percentageOfPopulation: 50,
        specificPractices: "Pratiques soufies",
      },
      religiousSyncretism: {
        coexistenceOfPractices: "Coexistence Islam-Christianisme-Ifá",
      },
    },
  },
  historicalRole: {
    kingdomsOrChiefdoms:
      "Empire Oyo (XVIe-XIXe siècles), Royaumes d'Ife, Ijebu",
    relationsWithNeighbors:
      "Conflits avec le Dahomey, commerce avec les Européens",
    conflictsOrAlliances:
      "Guerres yoruba du XIXe siècle, alliance avec les Britanniques",
    diaspora: "Importante diaspora en Amérique du Sud (Brésil), Cuba, Caraïbes",
  },
  demography: {
    totalPopulation: 40000000,
    distributionByCountry: [
      { country: "NGA", population: 35000000, percentage: 87.5 },
      { country: "BEN", population: 3000000, percentage: 7.5 },
      { country: "TGO", population: 500000, percentage: 1.25 },
    ],
    referenceYear: 2025,
    source: "SIL Ethnologue 2025",
  },
  sources: [
    "SIL Ethnologue – Yoruba",
    "CIA World Factbook – Nigeria",
    "UNESCO – Cultural heritage of the Yoruba people",
  ],
};

const minimalPeople: PeopleDetail = {
  id: "PPL_TEST",
  nameMain: "TestPeople",
  languageFamilyId: "FLG_BANTU",
  currentCountries: [],
};

// ==========================================
// UTILITY TESTS
// ==========================================

describe("formatPeoplePopulation", () => {
  it("formats whole millions", () => {
    expect(formatPeoplePopulation(40000000)).toBe("40M");
  });

  it("formats millions with decimal", () => {
    expect(formatPeoplePopulation(35000000)).toBe("35M");
  });

  it("formats fractional millions", () => {
    expect(formatPeoplePopulation(3500000)).toBe("3.5M");
  });

  it("formats thousands", () => {
    expect(formatPeoplePopulation(500000)).toBe("500K");
  });

  it("formats small numbers", () => {
    expect(formatPeoplePopulation(999)).toBe("999");
  });

  it("formats zero", () => {
    expect(formatPeoplePopulation(0)).toBe("0");
  });
});

describe("extractAppellationShort", () => {
  it("extracts short forms from parenthetical format", () => {
    expect(extractAppellationShort("Moaga (singulier), Moose (pluriel)")).toBe(
      "Moaga · Moose"
    );
  });

  it("returns raw text when no parentheses", () => {
    expect(extractAppellationShort("Yoruba")).toBe("Yoruba");
  });

  it("returns empty string for undefined", () => {
    expect(extractAppellationShort(undefined)).toBe("");
  });

  it("trims whitespace", () => {
    expect(extractAppellationShort("  Moaga  ")).toBe("Moaga");
  });
});

// ==========================================
// TRANSFORM TESTS
// ==========================================

describe("transformPeopleHero", () => {
  it("extracts basic identity fields", () => {
    const hero = transformPeopleHero(yorubaPeople);
    expect(hero.peopleId).toBe("PPL_YORUBA");
    expect(hero.nameMain).toBe("Yoruba");
    expect(hero.languageFamilyId).toBe("FLG_NIGER_CONGO");
    expect(hero.languageFamilyName).toBe("Niger-Congo");
  });

  it("includes currentCountries", () => {
    const hero = transformPeopleHero(yorubaPeople);
    expect(hero.currentCountries).toEqual(["NGA", "BEN", "TGO"]);
  });

  it("extracts selfAppellation and exonyms from appellations", () => {
    const hero = transformPeopleHero(yorubaPeople);
    expect(hero.selfAppellation).toBe(
      "Ọmọ Oòduà (singulier), Yorùbá (pluriel)"
    );
    expect(hero.exonyms).toEqual(["Nago", "Anago", "Yariba"]);
  });

  it("extracts decolonial fields", () => {
    const hero = transformPeopleHero(yorubaPeople);
    expect(hero.whyProblematic).toBe("'Yariba' peut être considéré péjoratif");
    expect(hero.historicalRegion).toBe("Yorubaland (Nigeria du sud-ouest)");
    expect(hero.ethnoLinguisticGroup).toBe("Yoruboïd");
  });

  it("includes classificationStatus", () => {
    const hero = transformPeopleHero(yorubaPeople);
    expect(hero.classificationStatus).toBe("consensual");
  });

  it("handles missing appellations without throwing", () => {
    const hero = transformPeopleHero(minimalPeople);
    expect(hero.selfAppellation).toBeUndefined();
    expect(hero.exonyms).toEqual([]);
    expect(hero.currentCountries).toEqual([]);
  });
});

describe("transformPeopleOrigins", () => {
  it("extracts all origin fields", () => {
    const result = transformPeopleOrigins(yorubaPeople.origins);
    expect(result.ancientOrigins).toBe(
      "Origines préhistoriques dans le bassin du Bénué"
    );
    expect(result.formationPeriod).toBe("Ier millénaire de notre ère");
    expect(result.unificationsOrDivisions).toBe(
      "Unification autour d'Ile-Ife, cité sacrée"
    );
    expect(result.externalInfluences).toContain("Sokoto");
    expect(result.majorHistoricalEvents).toContain("Guerres yoruba");
  });

  it("returns arrays for migrationRoutes and historicalSettlementZones", () => {
    const result = transformPeopleOrigins(yorubaPeople.origins);
    expect(result.migrationRoutes).toEqual([
      "Du fleuve Bénué vers le golfe de Guinée",
    ]);
    expect(result.historicalSettlementZones).toContain("Yorubaland");
  });

  it("returns empty arrays when origins is undefined", () => {
    const result = transformPeopleOrigins(undefined);
    expect(result.migrationRoutes).toEqual([]);
    expect(result.historicalSettlementZones).toEqual([]);
    expect(result.ancientOrigins).toBeUndefined();
  });
});

describe("transformPeopleLanguages", () => {
  it("extracts language data", () => {
    const result = transformPeopleLanguages(yorubaPeople.languages);
    expect(result.mainLanguage).toBe("Yoruba");
    expect(result.isoCodes).toEqual(["yor"]);
    expect(result.dialects).toContain("Oyo");
    expect(result.vehicularRole).toContain("véhiculaire");
  });

  it("returns empty arrays when languages is undefined", () => {
    const result = transformPeopleLanguages(undefined);
    expect(result.isoCodes).toEqual([]);
    expect(result.dialects).toEqual([]);
    expect(result.mainLanguage).toBeUndefined();
  });

  it("handles languages with no dialects", () => {
    const result = transformPeopleLanguages({
      mainLanguage: "Bambara",
      isoCodes: ["bam"],
    });
    expect(result.dialects).toEqual([]);
    expect(result.isoCodes).toEqual(["bam"]);
  });
});

describe("transformPeopleHistory", () => {
  it("extracts all historical role fields", () => {
    const result = transformPeopleHistory(yorubaPeople.historicalRole);
    expect(result.kingdomsOrChiefdoms).toContain("Empire Oyo");
    expect(result.relationsWithNeighbors).toContain("Dahomey");
    expect(result.conflictsOrAlliances).toContain("Britanniques");
    expect(result.diaspora).toContain("Brésil");
  });

  it("handles undefined historicalRole without throwing", () => {
    const result = transformPeopleHistory(undefined);
    expect(result.kingdomsOrChiefdoms).toBeUndefined();
    expect(result.relationsWithNeighbors).toBeUndefined();
    expect(result.conflictsOrAlliances).toBeUndefined();
    expect(result.diaspora).toBeUndefined();
  });
});

describe("transformPeopleCulture", () => {
  it("extracts supreme deity name", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.supremeDeity).toBe("Olodumare");
  });

  it("extracts intermediate divinities as name list", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.intermediates).toContain("Shango");
    expect(result.intermediates).toContain("Oya");
  });

  it("extracts initiation rites", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.initiation).toContain("Ogboni");
  });

  it("extracts funerary rites", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.funerary).toContain("Egungun");
  });

  it("extracts symbols as name list", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.symbols).toContain("Ile-Ife");
    expect(result.symbols).toContain("Ase");
  });

  it("extracts music and gastronomy", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.music).toContain("Bàtá");
    expect(result.gastronomy).toContain("Egusi");
  });

  it("extracts spirituality percentages", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.christianityPercentage).toBe(40);
    expect(result.islamPercentage).toBe(50);
  });

  it("extracts syncretism description", () => {
    const result = transformPeopleCulture(yorubaPeople.culture);
    expect(result.syncretism).toContain("Ifá");
  });

  it("returns safe defaults when culture is undefined", () => {
    const result = transformPeopleCulture(undefined);
    expect(result.supremeDeity).toBeUndefined();
    expect(result.intermediates).toEqual([]);
    expect(result.symbols).toEqual([]);
    expect(result.christianityPercentage).toBeUndefined();
  });
});

describe("transformPeopleRelatedPeoples", () => {
  it("extracts ethnicities list", () => {
    const result = transformPeopleRelatedPeoples(
      yorubaPeople.ethnicities,
      yorubaPeople.organization
    );
    expect(result.ethnicities).toEqual([
      "Oyo",
      "Egba",
      "Ijebu",
      "Ife",
      "Ekiti",
    ]);
  });

  it("extracts organization data", () => {
    const result = transformPeopleRelatedPeoples(
      yorubaPeople.ethnicities,
      yorubaPeople.organization
    );
    expect(result.politicalSystem).toContain("Obas");
    expect(result.clanOrganization).toContain("patrilinéaires");
    expect(result.ageClassSystems).toContain("âge");
  });

  it("returns empty ethnicities array when undefined", () => {
    const result = transformPeopleRelatedPeoples(undefined, undefined);
    expect(result.ethnicities).toEqual([]);
  });

  it("handles missing organization without throwing", () => {
    const result = transformPeopleRelatedPeoples(["Oyo"], undefined);
    expect(result.politicalSystem).toBeUndefined();
    expect(result.ethnicities).toEqual(["Oyo"]);
  });
});

describe("transformPeopleCountries", () => {
  it("extracts total population and formats it", () => {
    const result = transformPeopleCountries(yorubaPeople.demography);
    expect(result.totalPopulation).toBe(40000000);
    expect(result.totalPopulationFormatted).toBe("40M");
  });

  it("maps distribution entries with formatted population", () => {
    const result = transformPeopleCountries(yorubaPeople.demography);
    expect(result.distributions).toHaveLength(3);
    const nga = result.distributions.find((d) => d.country === "NGA");
    expect(nga).toBeDefined();
    expect(nga!.population).toBe(35000000);
    expect(nga!.populationFormatted).toBe("35M");
    expect(nga!.percentage).toBe(87.5);
  });

  it("includes referenceYear and source", () => {
    const result = transformPeopleCountries(yorubaPeople.demography);
    expect(result.referenceYear).toBe(2025);
    expect(result.source).toBe("SIL Ethnologue 2025");
  });

  it("returns safe defaults when demography is undefined", () => {
    const result = transformPeopleCountries(undefined);
    expect(result.totalPopulation).toBe(0);
    expect(result.totalPopulationFormatted).toBe("0");
    expect(result.distributions).toEqual([]);
  });

  it("handles distribution entries with no population", () => {
    const result = transformPeopleCountries({
      totalPopulation: 1000000,
      distributionByCountry: [{ country: "ZAF", percentage: 100 }],
    });
    expect(result.distributions[0].populationFormatted).toBeUndefined();
    expect(result.distributions[0].percentage).toBe(100);
  });
});

// ==========================================
// MAIN TRANSFORM TESTS
// ==========================================

describe("transformPeopleData", () => {
  it("produces a complete PeoplePageData for Yoruba", () => {
    const result = transformPeopleData(yorubaPeople);
    expect(result.hero.nameMain).toBe("Yoruba");
    expect(result.origin.migrationRoutes).toHaveLength(1);
    expect(result.language.mainLanguage).toBe("Yoruba");
    expect(result.history.kingdomsOrChiefdoms).toContain("Oyo");
    expect(result.culture.supremeDeity).toBe("Olodumare");
    expect(result.relatedPeoples.ethnicities).toHaveLength(5);
    expect(result.countries.totalPopulation).toBe(40000000);
    expect(result.sources).toBeTruthy();
  });

  it("all 8 sections are present in the result", () => {
    const result = transformPeopleData(yorubaPeople);
    expect(result).toHaveProperty("hero");
    expect(result).toHaveProperty("origin");
    expect(result).toHaveProperty("language");
    expect(result).toHaveProperty("history");
    expect(result).toHaveProperty("culture");
    expect(result).toHaveProperty("relatedPeoples");
    expect(result).toHaveProperty("countries");
    expect(result).toHaveProperty("sources");
  });

  it("joins sources with separator", () => {
    const result = transformPeopleData(yorubaPeople);
    expect(result.sources).toContain(" · ");
    expect(result.sources).toContain("SIL Ethnologue");
    expect(result.sources).toContain("UNESCO");
  });

  it("handles a minimal PeopleDetail without throwing", () => {
    expect(() => transformPeopleData(minimalPeople)).not.toThrow();
    const result = transformPeopleData(minimalPeople);
    expect(result.hero.nameMain).toBe("TestPeople");
    expect(result.origin.migrationRoutes).toEqual([]);
    expect(result.language.isoCodes).toEqual([]);
    expect(result.culture.intermediates).toEqual([]);
    expect(result.relatedPeoples.ethnicities).toEqual([]);
    expect(result.countries.distributions).toEqual([]);
    expect(result.sources).toBe("");
  });
});
