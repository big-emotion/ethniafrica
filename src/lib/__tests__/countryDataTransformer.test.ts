import { describe, it, expect } from "vitest";
import {
  flagFromISO3,
  extractEndonym,
  extractPejorative,
  shortenRegion,
  shortenFamily,
  transformHero,
  transformPeoples,
  transformKingdoms,
  transformSources,
  transformHistoricalFacts,
  transformCountryData,
} from "../countryDataTransformer";
import type { CountryDetail } from "@/types/afrik-frontend";
import capeVerdeFiche from "../../../dataset/source/afrik/pays/CPV.json";

// ==========================================
// MOCK DATA: Burkina Faso (BFA)
// ==========================================

const bfaCountry: CountryDetail = {
  id: "BFA",
  nameFr: "Burkina Faso",
  nameCommonFr: "Burkina Faso",
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
    {
      title: "SIL Ethnologue – Languages of Burkina Faso",
      url: null,
      tier: "unverified",
    },
    {
      title: "CIA World Factbook – Burkina Faso",
      url: null,
      tier: "unverified",
    },
    {
      title: "ONU / UNFPA – Démographie Burkina Faso 2025",
      url: null,
      tier: "unverified",
    },
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
        mainLanguageCode: "mos",
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

// ==========================================
// TRANSFORM TESTS
// ==========================================

describe("transformHero", () => {
  it("extracts hero data from BFA", () => {
    const hero = transformHero(bfaCountry);
    expect(hero.countryName).toBe("Burkina Faso");
    expect(hero.iso).toBe("BFA");
    expect(hero.flag).toBe("🇧🇫");
  });

  // @req REQ-001
  it("uses the French common name as the heading and preserves the official name", () => {
    const hero = transformHero({
      ...bfaCountry,
      id: "ZAF",
      nameFr:
        "République d'Afrique du Sud (Republic of South Africa, iNingizimu Afrika)",
      nameCommonFr: "Afrique du Sud",
      nameOfficial:
        "République d'Afrique du Sud (Republic of South Africa, iNingizimu Afrika)",
    });

    expect(hero.countryName).toBe("Afrique du Sud");
    expect(hero.nameOfficial).toBe(
      "République d'Afrique du Sud (Republic of South Africa, iNingizimu Afrika)"
    );
  });
});

describe("transformPeoples", () => {
  // The country population and the people-level coverage are different facts.
  // Cameroon documents only part of its people breakdown, but the official
  // national total is still known and must not disappear with row headcounts.
  // @req REQ-001
  it("uses the declared national total when people headcounts are incomplete", () => {
    const result = transformPeoples({
      totalPopulation: 29900000,
      referenceYear: 2025,
      source: "UNFPA – World Population Dashboard",
      peoples: [{ name: "Beti-Fang-Bulu", percentageInCountry: 22 }],
    });

    expect(result.totalPopulation).toBe(29900000);
    expect(result.totalPopulationFormatted).toMatch(/^29,9\sM$/);
    expect(result.totalPopulationIsNational).toBe(true);
    expect(result.everyPeopleDeclaresPopulation).toBe(false);
    expect(result.populationReferenceYear).toBe(2025);
  });

  // The Cabo Verde fiche used to provide a headcount only for its 1% row,
  // making the country page display 6K documented residents instead of the
  // 2025 national total already recorded in the demographic corpus.
  // @req REQ-001
  it("shows the complete 2025 Cabo Verde population", () => {
    const capeVerde = capeVerdeFiche.content as unknown as CountryDetail;
    const result = transformPeoples(
      capeVerde.demographics,
      capeVerde.majorPeoples
    );

    expect(result.totalPopulation).toBe(500000);
    expect(result.totalPopulationFormatted).toMatch(/^500\sk$/);
    expect(result.everyPeopleDeclaresPopulation).toBe(true);
    expect(result.populationReferenceYear).toBe(2025);
  });

  it("produces people rows for BFA", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    expect(result.totalPopulation).toBe(20700000);
    expect(result.totalPopulationFormatted).toMatch(/^20,7\sM$/);
    // This fixture links none of its rows to a people record, so it counts
    // no people: the count is of records a reader can open, not of rows.
    expect(result.peopleCount).toBe(0);
    expect(result.rows.length).toBeGreaterThan(0);
  });

  // "10+ peoples" counted every row, a group with no record of its own
  // included, and claimed more with its plus sign. A row counts when it
  // carries an id, or when majorPeoples resolves one for its name.
  // @req REQ-154
  it("counts only the peoples linked to a record", () => {
    const result = transformPeoples(
      {
        peoples: [
          { name: "Ovambo", percentageInCountry: 50, peopleId: "PPL_OVAMBO" },
          { name: "Herero", percentageInCountry: 7 },
          { name: "Groupe sans fiche", percentageInCountry: 5 },
        ],
      } as never,
      [{ name: "Herero", peopleId: "PPL_HERERO" }] as never
    );

    expect(result.peopleCount).toBe(2);
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

  // 25 of the 53 country fiches state a share for every people and a
  // population for none — the section printed "0", asserting the corpus had
  // declared South Africa empty. An absent figure is not a zero.
  // @req REQ-001
  it("states no population where the fiche declares none", () => {
    const result = transformPeoples({
      peoples: [
        { name: "Africains noirs", percentageInCountry: 81.4 },
        { name: "Blancs", percentageInCountry: 7.3 },
      ],
    });

    expect(result.totalPopulationFormatted).toBeUndefined();
    expect(result.rows.every((r) => r.populationFormatted === undefined)).toBe(
      true
    );
  });

  // The sum over the peoples that do declare one is a floor, not the
  // country's population, so the section may not label it plain "habitants".
  // @req REQ-001
  it("flags the total as partial when a people declares no population", () => {
    const result = transformPeoples({
      peoples: [
        { name: "Kikuyu", percentageInCountry: 17.1 },
        { name: "Luhya", percentageInCountry: 14.3, population: 7700000 },
      ],
    });

    expect(result.totalPopulationFormatted).toMatch(/^7,7\sM$/);
    expect(result.everyPeopleDeclaresPopulation).toBe(false);
  });

  // @req REQ-001
  it("counts the total as complete when every people declares one", () => {
    const result = transformPeoples({
      peoples: [
        { name: "Mossi", percentageInCountry: 52, population: 11000000 },
        { name: "Peul", percentageInCountry: 8, population: 1700000 },
      ],
    });

    expect(result.everyPeopleDeclaresPopulation).toBe(true);
  });

  // A census headcount is dated by its census. The fiche says so with
  // `referenceYear`, and the section has to print that year rather than the
  // atlas's 2025 — otherwise it dates a 2019 count to a year it never claimed.
  // @req REQ-001
  it("carries the year the counted peoples are dated to", () => {
    const result = transformPeoples({
      peoples: [
        {
          name: "Kikuyu",
          percentageInCountry: 17.1,
          population: 8148668,
          referenceYear: 2019,
        },
        {
          name: "Luhya",
          percentageInCountry: 14.3,
          population: 6823842,
          referenceYear: 2019,
        },
      ],
    });

    expect(result.populationReferenceYear).toBe(2019);
  });

  // @req REQ-001
  it("dates an undated headcount to the atlas reference year", () => {
    const result = transformPeoples({
      peoples: [
        { name: "Mossi", percentageInCountry: 52, population: 11000000 },
      ],
    });

    expect(result.populationReferenceYear).toBe(2025);
  });

  // Two peoples counted in different years share no snapshot, so the section
  // has no single year to print and must not pick one of them.
  // @req REQ-001
  it("states no year when the counted peoples disagree", () => {
    const result = transformPeoples({
      peoples: [
        {
          name: "Kikuyu",
          percentageInCountry: 17.1,
          population: 8148668,
          referenceYear: 2019,
        },
        {
          name: "Luhya",
          percentageInCountry: 14.3,
          population: 7700000,
          referenceYear: 2025,
        },
      ],
    });

    expect(result.populationReferenceYear).toBeUndefined();
  });

  it("maps mainLanguageCode to endonymLang for the lang attribute", () => {
    const result = transformPeoples(
      bfaCountry.demographics,
      bfaCountry.majorPeoples
    );
    const mossi = result.rows.find((r) => r.name === "Mossi");
    expect(mossi?.endonymLang).toBe("mos");
  });
});

describe("transformKingdoms", () => {
  // The mockup's timeline gives each entity a line of what it was, and the
  // transformer used to drop `historicalRole` on the floor: the corpus stated
  // it and no surface could reach it.
  // @req REQ-001
  it("carries the historical role the corpus states", () => {
    const result = transformKingdoms([
      {
        name: "Empire du Mali",
        period: "1235–1670",
        historicalRole: "Contrôle des routes de l'or transsahariennes.",
      },
    ]);

    expect(result.cards[0].historicalRole).toBe(
      "Contrôle des routes de l'or transsahariennes."
    );
  });

  // `tags` keeps its truncated, parenthesis-stripped form for the card layout;
  // `centers` is the same field unflattened, for the timeline that names them.
  // @req REQ-001
  it("keeps the political centres whole, alongside the card's tags", () => {
    const result = transformKingdoms([
      {
        name: "Royaume Mossi",
        period: "XIe siècle - XIXe siècle",
        politicalCenters: ["Ouagadougou", "Tenkodogo", "Fada", "Boussouma"],
      },
    ]);

    expect(result.cards[0].centers).toEqual([
      "Ouagadougou",
      "Tenkodogo",
      "Fada",
      "Boussouma",
    ]);
    expect(result.cards[0].tags).toHaveLength(3);
  });

  /**
   * The list used to be cut to precolonial polities, on the stated promise
   * that colonial administrations and modern states appeared "further down
   * the page" in a history timeline. That timeline was built and never wired,
   * so the promise was never kept and the record simply dropped them. One
   * chronology carries all three kinds now, each typed so its period can be
   * inked by the kind of authority that held it.
   */
  // @req REQ-148
  it("keeps every entry and types it, rather than dropping the colonial ones", () => {
    const result = transformKingdoms(bfaCountry.kingdoms);
    expect(result.cards.some((c) => /colonie/i.test(c.name))).toBe(true);
    expect(result.cards.every((c) => Boolean(c.entryType))).toBe(true);
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

  /**
   * The reason `entryType` is stored rather than guessed from the name: the
   * old `/colonie/i` filter let twenty-five colonial entries through, and
   * these four are what a reader met inside a section titled "Royaumes".
   */
  // @req REQ-148
  it("types a colonial administration that never says colonie", () => {
    const result = transformKingdoms([
      {
        name: "Sultanat d'Ajuran",
        period: "XIIIe siècle - XVIIe siècle",
        entryType: "polity",
      },
      {
        name: "Somaliland britannique",
        period: "1884 - 1960",
        entryType: "colonial",
      },
      {
        name: "Somalie italienne",
        period: "1889 - 1960",
        entryType: "colonial",
      },
      {
        name: "République fédérale du Nigeria",
        period: "1960 - présent",
        entryType: "modern",
      },
    ]);
    expect(result.cards.map((c) => [c.name, c.entryType])).toEqual([
      ["Sultanat d'Ajuran", "polity"],
      ["Somaliland britannique", "colonial"],
      ["Somalie italienne", "colonial"],
      ["République fédérale du Nigeria", "modern"],
    ]);
  });

  /**
   * The name test stays as a fallback while entries are being typed, so a
   * fiche the backfill has not reached still shows its colonial entries as
   * colonial rather than filing them among the kingdoms.
   */
  // @req REQ-148
  it("falls back to the name to type an entry the backfill has not reached", () => {
    const result = transformKingdoms([
      { name: "Royaume Mossi", period: "XIe siècle - XIXe siècle" },
      { name: "Colonie de Haute-Volta", period: "1919-1932, 1947-1960" },
    ]);
    expect(result.cards.map((c) => [c.name, c.entryType])).toEqual([
      ["Royaume Mossi", "polity"],
      ["Colonie de Haute-Volta", "colonial"],
    ]);
  });

  // @req REQ-148
  it("orders dated entries chronologically", () => {
    const result = transformKingdoms([
      {
        name: "Sultanat d'Adal",
        period: "XVe siècle - XVIe siècle",
        entryType: "polity",
        timeRange: { startYear: 1401, endYear: 1600, precision: "century" },
      },
      {
        name: "Sultanat de Mogadiscio",
        period: "Xe siècle - XIXe siècle",
        entryType: "polity",
        timeRange: { startYear: 901, endYear: 1900, precision: "century" },
      },
      {
        name: "Sultanat d'Ajuran",
        period: "XIIIe siècle - XVIIe siècle",
        entryType: "polity",
        timeRange: { startYear: 1201, endYear: 1700, precision: "century" },
      },
    ]);
    expect(result.cards.map((c) => c.name)).toEqual([
      "Sultanat de Mogadiscio",
      "Sultanat d'Ajuran",
      "Sultanat d'Adal",
    ]);
  });

  /**
   * A stable partial sort: undated entries hold their index while the dated
   * ones order themselves around them. Sorting everything would shuffle the
   * 95 still-undated polities unpredictably for the length of the burn-down.
   */
  // @req REQ-148
  it("leaves an undated entry at its own index while dating sorts around it", () => {
    const result = transformKingdoms([
      {
        name: "Royaume tardif",
        period: "XVIIIe siècle",
        entryType: "polity",
        timeRange: { startYear: 1701, endYear: 1800, precision: "century" },
      },
      {
        name: "Royaume non daté",
        period: "Précolonial - présent",
        entryType: "polity",
      },
      {
        name: "Royaume ancien",
        period: "Xe siècle",
        entryType: "polity",
        timeRange: { startYear: 901, endYear: 1000, precision: "century" },
      },
    ]);
    expect(result.cards.map((c) => c.name)).toEqual([
      "Royaume ancien",
      "Royaume non daté",
      "Royaume tardif",
    ]);
  });

  // @req REQ-148
  it("places a still-standing entity after a closed one that began the same year", () => {
    const result = transformKingdoms([
      {
        name: "Toujours debout",
        period: "XIVe siècle - présent",
        entryType: "polity",
        timeRange: { startYear: 1301, ongoing: true, precision: "century" },
      },
      {
        name: "Achevé",
        period: "XIVe siècle - XVe siècle",
        entryType: "polity",
        timeRange: { startYear: 1301, endYear: 1500, precision: "century" },
      },
    ]);
    expect(result.cards.map((c) => c.name)).toEqual([
      "Achevé",
      "Toujours debout",
    ]);
  });

  // @req REQ-148
  it("carries the bounds onto the card without touching the label", () => {
    const result = transformKingdoms([
      {
        name: "Royaume test",
        period: "XIVe siècle",
        entryType: "polity",
        timeRange: { startYear: 1301, endYear: 1400, precision: "century" },
      },
    ]);
    expect(result.cards[0].period).toBe("XIVe siècle");
    expect(result.cards[0].timeRange?.startYear).toBe(1301);
  });
});

describe("transformSources", () => {
  // @req REQ-092
  it("keeps every source whole, so each can show its own standing", () => {
    const result = transformSources(bfaCountry.sources);
    const labels = result.map((source) => source.label);

    expect(labels.some((label) => label.includes("SIL Ethnologue"))).toBe(true);
    expect(labels.some((label) => label.includes("CIA World Factbook"))).toBe(
      true
    );
    expect(result.every((source) => source.standing !== undefined)).toBe(true);
  });

  // @req REQ-092
  it("returns nothing for no sources", () => {
    expect(transformSources(undefined)).toEqual([]);
  });

  // The corpus in dataset/source/afrik/ is now structured, but the database
  // still serves the fiche JSON it was loaded from, which holds bare strings
  // until the loaders re-run. Reading `.title` off a string returned undefined
  // and `.replace` threw, taking every country fiche to HTTP 500.
  // @req REQ-001
  it("still reads a legacy string source, which the database serves until the loaders re-run", () => {
    const legacy = [
      "- SIL Ethnologue — Mooré (mos). https://www.ethnologue.com/language/mos/",
      "CIA World Factbook — Burkina Faso",
    ] as unknown as Parameters<typeof transformSources>[0];

    expect(transformSources(legacy).map((source) => source.label)).toEqual([
      "SIL Ethnologue — Mooré (mos). https://www.ethnologue.com/language/mos/",
      "CIA World Factbook — Burkina Faso",
    ]);
    // A bare string asserts no standing of its own, so it reads as awaiting
    // review rather than being declared unverified.
    expect(transformSources(legacy).map((source) => source.standing)).toEqual([
      "needs_review",
      "needs_review",
    ]);
  });

  // @req REQ-001
  it("skips an entry carrying neither a title nor text, instead of crashing the fiche", () => {
    const malformed = [
      { url: "https://example.org", tier: "unverified" },
      { title: "Kept", url: null, tier: "official" },
    ] as unknown as Parameters<typeof transformSources>[0];

    expect(transformSources(malformed).map((source) => source.label)).toEqual([
      "Kept",
    ]);
  });
});

describe("transformHistoricalFacts", () => {
  it("transforms all historical periods", () => {
    const result = transformHistoricalFacts({
      ancientPeriods:
        "Grandes migrations bantoues (2000 av. J.-C. - 500 apr. J.-C.)",
      middleAges: "Développement des royaumes médiévaux",
      precolonial: "Expansion des empires précoloniaux",
      colonization: "Colonisation européenne à partir du XIXe siècle",
      independenceStruggle: "Mouvements nationalistes des années 1950-1960",
      postIndependence: "Construction nationale et développement",
    });

    expect(result).toBeDefined();
    expect(result!.periods).toHaveLength(6);
    expect(result!.periods[0].label).toBe("Périodes anciennes");
    expect(result!.periods[0].content).toContain("migrations bantoues");
    expect(result!.periods[5].label).toBe("Période post-indépendance");
  });

  it("skips empty periods", () => {
    const result = transformHistoricalFacts({
      colonization: "Colonisation française 1880-1960",
      postIndependence: "Indépendance en 1960",
    });

    expect(result).toBeDefined();
    expect(result!.periods).toHaveLength(2);
    expect(result!.periods[0].label).toBe("Colonisation");
    expect(result!.periods[1].label).toBe("Période post-indépendance");
  });

  it("returns undefined when no historical facts", () => {
    expect(transformHistoricalFacts(undefined)).toBeUndefined();
  });

  it("returns undefined when all fields are empty", () => {
    expect(transformHistoricalFacts({})).toBeUndefined();
  });
});

describe("transformCountryData", () => {
  // @req REQ-140
  // @req REQ-145
  it("localizes generated country-fiche labels in English", () => {
    const result = transformCountryData(bfaCountry, "en");

    expect(result.kingdoms.title).toBe("Kingdoms & Civilisations");
  });

  it("produces complete page data for BFA", () => {
    const result = transformCountryData(bfaCountry);
    expect(result.hero.countryName).toBe("Burkina Faso");
    expect(result.peoples.rows.length).toBeGreaterThan(0);
    expect(result.kingdoms.cards.length).toBeGreaterThan(0);
    expect(result.sources).toBeTruthy();
  });

  it("includes historicalFacts when present on country", () => {
    const countryWithFacts: CountryDetail = {
      ...bfaCountry,
      historicalFacts: {
        colonization: "Colonisation française 1896-1960",
        postIndependence: "Indépendance le 5 août 1960",
      },
    };
    const result = transformCountryData(countryWithFacts);
    expect(result.historicalFacts).toBeDefined();
    expect(result.historicalFacts!.periods).toHaveLength(2);
  });
});
