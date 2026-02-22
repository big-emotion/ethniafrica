import { describe, it, expect } from "vitest";
import {
  flagFromISO3,
  formatPopulation,
  extractEndonym,
  extractPejorative,
  shortenRegion,
  shortenFamily,
  extractKeywords,
  transformHero,
  transformEtymology,
  transformOrigin,
  transformTimeline,
  transformPeoples,
  transformKingdoms,
  transformLanguages,
  transformCulture,
  transformSources,
  transformCountryData,
} from "../countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";

// ==========================================
// MOCK DATA: Burkina Faso (BFA)
// ==========================================

const bfaCountry: CountryDetail = {
  id: "BFA",
  nameFr: "Burkina Faso",
  nameOfficial: "Burkina Faso",
  etymology:
    'Le nom "Burkina Faso" signifie "Pays des hommes intègres" en mooré (langue mossi) et en dioula (langue mandé). "Burkina" vient du mooré et signifie "intègres" ou "honnêtes", tandis que "Faso" vient du dioula et signifie "pays" ou "patrie". Le nom a été adopté en 1984 par le président Thomas Sankara pour remplacer "Haute-Volta", nom colonial français.',
  nameOriginActor:
    'Le nom "Burkina Faso" a été choisi par le président Thomas Sankara en 1984 lors de la révolution burkinabè. Il remplace "Haute-Volta" (nom colonial français dérivé du fleuve Volta).',
  historicalNames: {
    middleAges:
      "Développement de royaumes mossi (XIe-XIXe siècles) : Wogodogo (Ouagadougou), Yatenga, Tenkodogo, Fada N'Gourma.",
    precolonial: "Mosaïque de royaumes et chefferies autonomes.",
    colonization:
      "1919-1960 : Haute-Volta (partie de l'Afrique-Occidentale française, AOF). Les Français ont créé la colonie de Haute-Volta en 1919.",
    contemporary:
      "1960-1984 : République de Haute-Volta. 1984 : Burkina Faso (changement de nom le 4 août 1984 par Thomas Sankara).",
  },
  kingdoms: [
    {
      name: "Royaumes Mossi",
      period: "XIe siècle - XIXe siècle",
      dominantPeoples: ["Mossi (Moose)"],
      politicalCenters: [
        "Ouagadougou",
        "Yatenga",
        "Tenkodogo",
        "Fada N'Gourma",
      ],
      historicalRole: "Royaumes mossi puissants et structurés.",
    },
    {
      name: "Royaume de Fada N'Gourma",
      period: "Précolonial - XIXe siècle",
      dominantPeoples: ["Gourmantché"],
      politicalCenters: ["Fada N'Gourma"],
    },
    {
      name: "Chefferies Gur",
      period: "Précolonial - présent",
      dominantPeoples: ["Bobo", "Gourounsi", "Dagara", "Lobi", "Birifor"],
      politicalCenters: ["Chefferies traditionnelles locales"],
    },
    {
      name: "Colonie de Haute-Volta",
      period: "1919-1932, 1947-1960",
      dominantPeoples: [
        "Tous les peuples burkinabés sous domination française",
      ],
      politicalCenters: ["Ouagadougou"],
    },
  ],
  majorPeoples: [
    {
      name: "Mossi",
      selfAppellation: "Moaga (singulier), Moose (pluriel)",
      appellationRemarks: "Pas de terme péjoratif connu.",
    },
    {
      name: "Peul / Fulani",
      selfAppellation: "Fulɓe (pluriel), Pullo (singulier)",
      appellationRemarks:
        '"Fellata" peut avoir une connotation péjorative dans certains contextes.',
    },
  ],
  culture: {
    mainLanguages: [
      { name: "Français", isoCode: "fra", isPrimary: true },
      { name: "Mooré", isoCode: "mos" },
      { name: "Fulfulde", isoCode: "ful" },
      { name: "Gourmantché", isoCode: "gux" },
      { name: "Bobo", isoCode: "bwq" },
      { name: "Lobi", isoCode: "lob" },
      { name: "Birifor", isoCode: "bfo" },
      { name: "Bissa", isoCode: "bib" },
      { name: "Gourounsi", isoCode: "gur" },
      { name: "Dagara", isoCode: "dga" },
      { name: "Senoufo", isoCode: "syc" },
      { name: "Tamasheq", isoCode: "taq" },
    ],
    dominantReligions:
      "Islam (majoritaire, surtout dans le nord), christianisme (catholicisme et protestantisme), religions traditionnelles africaines",
    lifestyles:
      "Agriculture (Mossi, Bobo, cultures vivrières, coton), élevage (Peuls, Touaregs, bovins), artisanat (forgerons Bobo, cuivre, cuir)",
    socialOrganization:
      "Organisation en royaumes historiques (Mossi, système monarchique naaba), chefferies traditionnelles (Gur), structures claniques patrilinéaires",
    regionalRelations:
      "Relations historiques avec le Mali (commerce), la Côte d'Ivoire (commerce, migrations), le Ghana (Dagara, commerce). Intégration dans la CEDEAO et l'UEMOA.",
  },
  sources: [
    "SIL Ethnologue – Languages of Burkina Faso",
    "CIA World Factbook – Burkina Faso",
    "ONU / UNFPA – Démographie Burkina Faso 2025",
  ],
  demographics: {
    peoples: [
      {
        name: "Mossi",
        population: 11500000,
        percentageInCountry: 50,
        region:
          "Plateau central du Burkina Faso (Ouagadougou, Yatenga, Tenkodogo)",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Peul / Fulani",
        population: 2300000,
        percentageInCountry: 10,
        region: "Nord du Burkina Faso, Sahel (pasteurs nomades et sédentaires)",
        languageFamily: "Niger-Congo – Atlantique (FLG_ATLANTIQUE)",
      },
      {
        name: "Gourmantché",
        population: 1610000,
        percentageInCountry: 7,
        region: "Est du Burkina Faso (Fada N'Gourma)",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Lobi / Birifor",
        population: 1150000,
        percentageInCountry: 5,
        region: "Sud-ouest du Burkina Faso",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Bobo",
        population: 920000,
        percentageInCountry: 4,
        region: "Ouest du Burkina Faso",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Dagara",
        population: 920000,
        percentageInCountry: 4,
        region: "Sud-ouest du Burkina Faso",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Bissa",
        population: 690000,
        percentageInCountry: 3,
        region: "Centre-sud du Burkina Faso",
        languageFamily: "Niger-Congo – Mandé (FLG_MANDE)",
      },
      {
        name: "Gourounsi",
        population: 690000,
        percentageInCountry: 3,
        region: "Centre-ouest du Burkina Faso",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Senoufo",
        population: 690000,
        percentageInCountry: 3,
        region: "Sud-ouest du Burkina Faso",
        languageFamily: "Niger-Congo – Gur (FLG_GUR)",
      },
      {
        name: "Touareg",
        population: 230000,
        percentageInCountry: 1,
        region: "Nord du Burkina Faso, Sahara",
        languageFamily: "Afro-asiatique – Berbère (FLG_BERBERE)",
      },
      {
        name: "Autres peuples",
        population: 2300000,
        percentageInCountry: 10,
        region: "Diverses régions",
      },
    ],
  },
};

// ==========================================
// UTILITY TESTS
// ==========================================

describe("flagFromISO3", () => {
  it("converts BFA to Burkina Faso flag", () => {
    expect(flagFromISO3("BFA")).toBe("🇧🇫");
  });

  it("converts NGA to Nigeria flag", () => {
    expect(flagFromISO3("NGA")).toBe("🇳🇬");
  });

  it("returns empty string for unknown code", () => {
    expect(flagFromISO3("XXX")).toBe("");
  });
});

describe("formatPopulation", () => {
  it("formats millions", () => {
    expect(formatPopulation(23000000)).toBe("23M");
  });

  it("formats millions with decimal", () => {
    expect(formatPopulation(11500000)).toBe("11.5M");
  });

  it("formats thousands", () => {
    expect(formatPopulation(920000)).toBe("920K");
  });

  it("formats small numbers", () => {
    expect(formatPopulation(500)).toBe("500");
  });
});

describe("extractEndonym", () => {
  it("extracts endonym from parenthetical format", () => {
    expect(extractEndonym("Moaga (singulier), Moose (pluriel)")).toBe(
      "Moaga · Moose"
    );
  });

  it("returns raw text when no parentheses", () => {
    expect(extractEndonym("Gourmantché")).toBe("Gourmantché");
  });
});

describe("extractPejorative", () => {
  it("extracts pejorative term", () => {
    expect(
      extractPejorative(
        '"Fellata" peut avoir une connotation péjorative dans certains contextes.'
      )
    ).toBe("Fellata");
  });

  it("returns undefined when no pejorative", () => {
    expect(extractPejorative("Pas de terme péjoratif connu.")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(extractPejorative("")).toBeUndefined();
  });
});

describe("shortenRegion", () => {
  it("shortens region with 'du'", () => {
    expect(
      shortenRegion(
        "Plateau central du Burkina Faso (Ouagadougou, Yatenga, Tenkodogo)"
      )
    ).toBe("Plateau central");
  });

  it("removes parenthetical content", () => {
    expect(shortenRegion("Nord du Burkina Faso, Sahel (pasteurs)")).toBe(
      "Nord"
    );
  });
});

describe("shortenFamily", () => {
  it("shortens family with FLG code", () => {
    expect(shortenFamily("Niger-Congo – Gur (FLG_GUR)")).toBe(
      "Niger-Congo Gur"
    );
  });
});

describe("extractKeywords", () => {
  it("extracts up to 5 keywords", () => {
    const result = extractKeywords(
      "Islam (majoritaire), christianisme (catholicisme), religions traditionnelles africaines"
    );
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result[0]).toBe("Islam");
    expect(result[1]).toBe("christianisme");
  });
});

// ==========================================
// TRANSFORM TESTS
// ==========================================

describe("transformHero", () => {
  it("extracts hero data from BFA", () => {
    const hero = transformHero(bfaCountry);
    expect(hero.countryName).toBe("Burkina Faso");
    expect(hero.iso).toBe("BFA");
    expect(hero.flag).toBe("🇧🇫");
    expect(hero.year).toBe("1984");
    expect(hero.meaningQuote).toBe("Pays des hommes");
    expect(hero.meaningHighlight).toBe("intègres");
    expect(hero.isUncertain).toBe(false);
  });

  it("uses + separator and captures lang+family for meaningLangs", () => {
    const hero = transformHero(bfaCountry);
    expect(hero.meaningLangs).toContain(" + ");
    expect(hero.meaningLangs).toContain("(Mossi)");
    expect(hero.meaningLangs).toContain("(Mandé)");
  });
});

describe("transformEtymology", () => {
  it("detects split bilingue variant for BFA", () => {
    const result = transformEtymology(bfaCountry.etymology);
    expect(result).toBeDefined();
    expect(result!.variant).toBe("split");
    expect(result!.words).toHaveLength(2);
    expect(result!.words[0].word).toBe("Burkina");
    expect(result!.words[0].lang).toBe("Mooré (Mossi)");
    expect(result!.words[0].definition).toBe("Intègres");
    expect(result!.words[1].word).toBe("Faso");
    expect(result!.words[1].lang).toBe("Dioula (Mandé)");
    expect(result!.words[1].definition).toBe("Pays");
  });

  it("detects uncertain variant", () => {
    const result = transformEtymology(
      'L\'origine du nom "Djibouti" est débattue. Hypothèse 1: du mot afar "gabouti" (plateau).'
    );
    expect(result).toBeDefined();
    expect(result!.variant).toBe("uncertain");
  });

  it("returns undefined for empty etymology", () => {
    expect(transformEtymology(undefined)).toBeUndefined();
  });
});

describe("transformOrigin", () => {
  it("extracts revolution tonality for BFA", () => {
    const result = transformOrigin(
      bfaCountry.nameOriginActor,
      bfaCountry.etymology
    );
    expect(result).toBeDefined();
    expect(result!.tonality).toBe("revolution");
    expect(result!.personName).toContain("Thomas Sankara");
    expect(result!.initials).toBe("TS");
    expect(result!.oldName).toBe("Haute-Volta");
    // Date is just year (no full date in nameOriginActor)
    expect(result!.date).toBe("1984");
    // Description cleaned of "lors de la" prefix
    expect(result!.description).toMatch(/^Révolution/i);
    expect(result!.description!.length).toBeLessThanOrEqual(140);
  });

  it("detects colonial tonality", () => {
    const result = transformOrigin(
      "Flora Shaw, journaliste britannique coloniale, a nommé le territoire en 1897.",
      undefined
    );
    expect(result).toBeDefined();
    expect(result!.tonality).toBe("colonial");
  });

  it("returns undefined when no origin actor", () => {
    expect(transformOrigin(undefined, undefined)).toBeUndefined();
  });
});

describe("transformTimeline", () => {
  it("produces timeline items for BFA", () => {
    const result = transformTimeline(bfaCountry.historicalNames);
    expect(result.items.length).toBeGreaterThan(0);

    const types = result.items.map((i) => i.type);
    expect(types).toContain("kingdom");
    expect(types).toContain("colonial");
    expect(types).toContain("sovereign");
  });

  it("calculates gradient stops", () => {
    const result = transformTimeline(bfaCountry.historicalNames);
    expect(result.gradientStops.goldEnd).toBeGreaterThan(0);
    expect(result.gradientStops.colonialEnd).toBeGreaterThan(
      result.gradientStops.goldEnd
    );
  });

  it("handles empty historical names", () => {
    const result = transformTimeline(undefined);
    expect(result.items).toHaveLength(0);
  });
});

describe("transformPeoples", () => {
  it("produces people rows for BFA", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    expect(result.totalPopulation).toBe(20700000);
    expect(result.totalPopulationFormatted).toBe("20.7M");
    expect(result.peopleCount).toBe(10);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it("sorts by percentage descending", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    const nonOtherRows = result.rows.filter(
      (r) => !r.isOther && !r.groupedNames
    );
    for (let i = 0; i < nonOtherRows.length - 1; i++) {
      expect(nonOtherRows[i].percentage).toBeGreaterThanOrEqual(
        nonOtherRows[i + 1].percentage
      );
    }
  });

  it("extracts pejorative for Peul / Fulani", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    const peul = result.rows.find((r) => r.name.includes("Peul"));
    expect(peul?.pejorativeTerm).toBe("Fellata");
  });

  it("groups peoples with same percentage", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    // Bissa, Gourounsi, Senoufo are all at 3%
    const grouped = result.rows.find((r) => r.groupedNames);
    expect(grouped).toBeDefined();
    expect(grouped!.groupedNames).toHaveLength(3);
  });

  it("filters out 'Autres' catch-all groups", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    const autres = result.rows.find((r) => /\bautres\b/i.test(r.name));
    expect(autres).toBeUndefined();
  });
});

describe("transformKingdoms", () => {
  it("filters out colonies", () => {
    const result = transformKingdoms(bfaCountry.kingdoms);
    expect(result.cards.every((c) => !/colonie/i.test(c.name))).toBe(true);
  });

  it("produces 3 cards for BFA (excluding colony)", () => {
    const result = transformKingdoms(bfaCountry.kingdoms);
    expect(result.cards).toHaveLength(3);
  });

  it("chooses scroll layout for >= 3 cards", () => {
    const result = transformKingdoms(bfaCountry.kingdoms);
    expect(result.layout).toBe("scroll");
  });

  it("sets adaptive title", () => {
    const result = transformKingdoms(bfaCountry.kingdoms);
    expect(result.title).toBe("Royaumes & Civilisations");
  });

  it("extracts tags from political centers and removes parenthetical content", () => {
    const result = transformKingdoms(bfaCountry.kingdoms);
    const mossi = result.cards.find((c) => c.name.includes("Mossi"));
    expect(mossi?.tags).toContain("Ouagadougou");
    // Tags should not contain parenthetical content
    for (const tag of mossi?.tags || []) {
      expect(tag).not.toMatch(/\(/);
    }
  });
});

describe("transformLanguages", () => {
  it("produces 12 bubbles for BFA", () => {
    const result = transformLanguages(bfaCountry.culture);
    expect(result.bubbles).toHaveLength(12);
    expect(result.totalCount).toBe(12);
    expect(result.overflowCount).toBe(0);
  });

  it("marks French as official", () => {
    const result = transformLanguages(bfaCountry.culture);
    const french = result.bubbles.find((b) => b.name === "Français");
    expect(french?.isOfficial).toBe(true);
    expect(french?.size).toBe("big");
  });

  it("assigns correct sizes", () => {
    const result = transformLanguages(bfaCountry.culture);
    // First 3 should be big
    expect(result.bubbles[0].size).toBe("big");
    expect(result.bubbles[1].size).toBe("big");
    expect(result.bubbles[2].size).toBe("big");
    // Middle should be regular
    expect(result.bubbles[5].size).toBe("regular");
    // Last ones should be small
    expect(result.bubbles[11].size).toBe("small");
  });
});

describe("transformCulture", () => {
  it("produces 4 grid items", () => {
    const result = transformCulture(bfaCountry.culture);
    expect(result.items).toHaveLength(4);
    expect(result.items.map((i) => i.slot)).toEqual([
      "religion",
      "economy",
      "social",
      "relations",
    ]);
  });

  it("extracts religion keywords (capitalized, max 3)", () => {
    const result = transformCulture(bfaCountry.culture);
    const religion = result.items.find((i) => i.slot === "religion");
    expect(religion?.keywords.length).toBeGreaterThan(0);
    expect(religion?.keywords.length).toBeLessThanOrEqual(3);
    expect(religion?.keywords[0]).toBe("Islam");
    // Keywords should be capitalized
    for (const kw of religion?.keywords || []) {
      expect(kw[0]).toBe(kw[0].toUpperCase());
    }
  });

  it("uses mosque icon for religion", () => {
    const result = transformCulture(bfaCountry.culture);
    const religion = result.items.find((i) => i.slot === "religion");
    expect(religion?.icon).toBe("☪️");
  });
});

describe("transformSources", () => {
  it("joins sources with separator", () => {
    const result = transformSources(bfaCountry.sources);
    expect(result).toContain(" · ");
    expect(result).toContain("SIL Ethnologue");
    expect(result).toContain("CIA World Factbook");
  });

  it("returns empty string for no sources", () => {
    expect(transformSources(undefined)).toBe("");
  });
});

describe("transformCountryData", () => {
  it("produces complete page data for BFA", () => {
    const result = transformCountryData(bfaCountry);
    expect(result.hero.countryName).toBe("Burkina Faso");
    expect(result.etymology).toBeDefined();
    expect(result.origin).toBeDefined();
    expect(result.timeline.items.length).toBeGreaterThan(0);
    expect(result.peoples.rows.length).toBeGreaterThan(0);
    expect(result.kingdoms.cards.length).toBeGreaterThan(0);
    expect(result.languages.bubbles.length).toBeGreaterThan(0);
    expect(result.culture.items).toHaveLength(4);
    expect(result.sources).toBeTruthy();
  });
});
