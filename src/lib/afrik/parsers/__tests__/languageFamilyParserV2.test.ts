import { describe, it, expect } from "vitest";
import {
  parseSpeakers,
  parseGeographicArea,
  parsePeoples,
  parseLanguageFamilyV2,
  parseDistributionByCountry,
} from "../languageFamilyParserV2";

describe("languageFamilyParserV2", () => {
  describe("parseSpeakers", () => {
    it('should parse "environ X millions" format', () => {
      expect(parseSpeakers("environ 500 millions")).toBe(500000000);
      expect(parseSpeakers("environ 30 millions")).toBe(30000000);
      expect(parseSpeakers("environ 1 million")).toBe(1000000);
    });

    it('should parse "plus de X millions" format', () => {
      expect(parseSpeakers("plus de 30 millions")).toBe(30000000);
      expect(parseSpeakers("plus de 100 millions")).toBe(100000000);
    });

    it('should parse "moins de X millions" format', () => {
      expect(parseSpeakers("moins de 5 millions")).toBe(5000000);
    });

    it('should parse "X millions" format without prefix', () => {
      expect(parseSpeakers("500 millions")).toBe(500000000);
      expect(parseSpeakers("2 millions")).toBe(2000000);
    });

    it("should parse decimal values", () => {
      expect(parseSpeakers("environ 1,5 millions")).toBe(1500000);
      expect(parseSpeakers("environ 2.5 millions")).toBe(2500000);
    });

    it("should return null for invalid formats", () => {
      expect(parseSpeakers("inconnu")).toBeNull();
      expect(parseSpeakers("")).toBeNull();
      expect(parseSpeakers("invalid text")).toBeNull();
    });
  });

  describe("parseGeographicArea", () => {
    it("should parse comma-separated countries", () => {
      expect(parseGeographicArea("Sénégal, Mali, Burkina Faso")).toEqual([
        "Sénégal",
        "Mali",
        "Burkina Faso",
      ]);
    });

    it("should trim whitespace", () => {
      expect(
        parseGeographicArea("  Afrique du Nord  ,  Corne de l'Afrique  ")
      ).toEqual(["Afrique du Nord", "Corne de l'Afrique"]);
    });

    it("should handle empty input", () => {
      expect(parseGeographicArea("")).toEqual([]);
      expect(parseGeographicArea("   ")).toEqual([]);
    });

    it("should handle single area", () => {
      expect(parseGeographicArea("Afrique centrale")).toEqual([
        "Afrique centrale",
      ]);
    });
  });

  describe("parsePeoples", () => {
    it("should parse peoples in harmonized format with IDs", () => {
      const text = `
# 2. Peuples associés
- Peuple 1 : Yoruba (PPL_YORUBA)
- Peuple 2 : Igbo (PPL_IGBO)
- Peuple 3 : Haoussa (PPL_HAOUSSA)
`;
      const result = parsePeoples(text);

      expect(result).toEqual([
        { name: "Yoruba", peopleId: "PPL_YORUBA" },
        { name: "Igbo", peopleId: "PPL_IGBO" },
        { name: "Haoussa", peopleId: "PPL_HAOUSSA" },
      ]);
    });

    it("should parse peoples without IDs", () => {
      const text = `
- Peuple 1 : Yoruba
- Peuple 2 : Igbo
`;
      const result = parsePeoples(text);

      expect(result).toEqual([
        { name: "Yoruba", peopleId: null },
        { name: "Igbo", peopleId: null },
      ]);
    });

    it("should handle whitespace variations", () => {
      const text = `
- Peuple 1:Yoruba(PPL_YORUBA)
-Peuple 2 :   Igbo   ( PPL_IGBO )
`;
      const result = parsePeoples(text);

      expect(result).toEqual([
        { name: "Yoruba", peopleId: "PPL_YORUBA" },
        { name: "Igbo", peopleId: "PPL_IGBO" },
      ]);
    });

    it("should return empty array for empty input", () => {
      expect(parsePeoples("")).toEqual([]);
      expect(parsePeoples("   ")).toEqual([]);
    });
  });

  describe("parseLanguageFamilyV2", () => {
    it("should parse a complete harmonized language family file", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)

- Identifiant famille linguistique (FLG_xxxxx) : FLG_BANTU
- Nom français : Bantou
- Nom anglais / auto-appellation académique : Bantu
- Aire / répartition géographique générale : Afrique centrale, Afrique de l'Est, Afrique australe
- Nombre de langues (estimation) : environ 500
- Nombre total de locuteurs (estimation) : environ 350 millions

------------------------------------------

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Bantou
- Branches internes / sous-groupes : Zone A, Zone B, Zone C
- Aire géographique : Afrique centrale, Afrique de l'Est, Afrique australe
- Nombre de langues : environ 500
- Nombre total de locuteurs : environ 350 millions

# 2. Peuples associés
- Peuple 1 : Zoulou (PPL_ZULU)
- Peuple 2 : Xhosa (PPL_XHOSA)
- Peuple 3 : Luba (PPL_LUBA)
- Peuple 4 : Kongo (PPL_KONGO)

# 3. Caractéristiques linguistiques
- Typologie linguistique : Langues agglutinantes avec système de classes nominales
- Particularités phonologiques : Tons, consonnes prénasalisées

# 4. Histoire et origines
- Origine probable : Région des Grassfields (Cameroun-Nigeria)
- Période d'émergence estimée : 3000 à 5000 ans avant notre ère

# 5. Répartition géographique et démographie
- Nombre total de locuteurs : environ 350 millions
- Répartition par pays : RDC, Tanzanie, Kenya, Afrique du Sud, Angola

# 6. Sources
- Bleek, W. H. I. (1862) – A Comparative Grammar of South African Languages
- Greenberg, J. H. (1963) – The Languages of Africa
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.familyId).toBe("FLG_BANTU");
      expect(result.name).toBe("Bantou");
      expect(result.speakers).toBe(350000000);
      expect(result.geographicArea).toEqual([
        "Afrique centrale",
        "Afrique de l'Est",
        "Afrique australe",
      ]);
      expect(result.peoples).toHaveLength(4);
      expect(result.peoples[0]).toEqual({
        name: "Zoulou",
        peopleId: "PPL_ZULU",
      });
      expect(result.sources).toHaveLength(2);
    });

    it("should handle minimal valid file", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)

- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Aire / répartition géographique générale : Afrique
- Nombre total de locuteurs (estimation) : environ 1 million

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.familyId).toBe("FLG_TEST");
      expect(result.name).toBe("Test");
      expect(result.speakers).toBe(1000000);
    });

    it("should throw error for missing separator", () => {
      const content = `# Famille linguistique

- Identifiant famille linguistique (FLG_xxxxx) : FLG_BANTU
- Nom français : Bantou

# 1. Informations générales
`;

      expect(() => parseLanguageFamilyV2(content)).toThrow(
        'Missing "MODÈLE STRUCTURÉ AFRIK" separator'
      );
    });

    it("should throw error for invalid family ID", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)

- Identifiant famille linguistique (FLG_xxxxx) : INVALID_ID
- Nom français : Test

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
`;

      expect(() => parseLanguageFamilyV2(content)).toThrow(
        "Missing or invalid family ID"
      );
    });

    it("should throw error for missing French name", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)

- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
`;

      expect(() => parseLanguageFamilyV2(content)).toThrow(
        "Missing French name"
      );
    });

    it("should parse linguistic characteristics section", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)

# 3. Caractéristiques linguistiques
- Typologie linguistique : Langues agglutinantes
- Particularités phonologiques : Tons, consonnes prénasalisées
- Liens avec les familles voisines : Emprunts lexicaux
- Innovations clés : Système de classes nominales
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.linguisticCharacteristics).toBeDefined();
      expect(result.linguisticCharacteristics.typology).toBe(
        "Langues agglutinantes"
      );
      expect(result.linguisticCharacteristics.phonologicalFeatures).toBe(
        "Tons, consonnes prénasalisées"
      );
      expect(result.linguisticCharacteristics.relationsWithNeighbors).toBe(
        "Emprunts lexicaux"
      );
      expect(result.linguisticCharacteristics.keyInnovations).toBe(
        "Système de classes nominales"
      );
    });

    it("should parse history and origins section", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)

# 4. Histoire et origines
- Origine probable (théories archéologiques, linguistiques, génétiques) : Région des Grassfields
- Période d'émergence estimée : 3000 à 5000 ans
- Diffusion des langues (routes migratoires, expansion) : Migration vers le sud
- Ruptures historiques (séparations, fusions) : Division en branches
- Zones de contact et métissages : Contacts avec familles voisines
- Événements historiques majeurs ayant influencé la famille : Traite négrière
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.historyAndOrigins).toBeDefined();
      expect(result.historyAndOrigins.probableOrigin).toBe(
        "Région des Grassfields"
      );
      expect(result.historyAndOrigins.emergencePeriod).toBe("3000 à 5000 ans");
      expect(result.historyAndOrigins.diffusion).toBe("Migration vers le sud");
      expect(result.historyAndOrigins.historicalBreaks).toBe(
        "Division en branches"
      );
      expect(result.historyAndOrigins.contactZones).toBe(
        "Contacts avec familles voisines"
      );
      expect(result.historyAndOrigins.majorEvents).toBe("Traite négrière");
    });

    it("should parse decolonial header fields", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Pourquoi le terme pose problème (si applicable) : Terme colonial
- Auto-appellation (locuteurs / linguistes contemporains) : Nom endogène
- Usage contemporain (définition moderne de la famille) : Usage académique

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.decolonialHeader).toBeDefined();
      expect(result.decolonialHeader.whyProblematic).toBe("Terme colonial");
      expect(result.decolonialHeader.selfAppellation).toBe("Nom endogène");
      expect(result.decolonialHeader.contemporaryUsage).toBe(
        "Usage académique"
      );
    });

    it("should parse all 5 decolonial header fields including historicalAppellations and originOfHistoricalTerm", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Appellation(s) historique(s) : « Langues bantoues » ; « Bantou »
- Origine du terme historique : Créé par Bleek en 1862
- Pourquoi le terme pose problème (si applicable) : Terme colonial
- Auto-appellation (locuteurs / linguistes contemporains) : Nom endogène
- Usage contemporain (définition moderne de la famille) : Usage académique

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.decolonialHeader).toBeDefined();
      expect(result.decolonialHeader.whyProblematic).toBe("Terme colonial");
      expect(result.decolonialHeader.selfAppellation).toBe("Nom endogène");
      expect(result.decolonialHeader.contemporaryUsage).toBe(
        "Usage académique"
      );
      expect(result.decolonialHeader.historicalAppellations).toBe(
        "« Langues bantoues » ; « Bantou »"
      );
      expect(result.decolonialHeader.originOfHistoricalTerm).toBe(
        "Créé par Bleek en 1862"
      );
    });

    it("should parse multi-line historicalAppellations and originOfHistoricalTerm", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Appellation(s) historique(s) :
  « Langues bantoues » ; « Bantou » (souvent détourné en « race bantoue »).
- Origine du terme historique :
  Le terme « bantou » a été créé par Bleek en 1862.
  Il a été popularisé par Meinhof en 1906.
- Pourquoi le terme pose problème (si applicable) : Terme colonial

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.decolonialHeader.historicalAppellations).toContain(
        "« Langues bantoues »"
      );
      expect(result.decolonialHeader.originOfHistoricalTerm).toContain(
        "Bleek en 1862"
      );
      expect(result.decolonialHeader.originOfHistoricalTerm).toContain(
        "Meinhof en 1906"
      );
    });

    it("should parse distribution section with parsed distributionByCountry", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Nombre total de locuteurs (estimation) : environ 350 millions

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 350 millions

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)

# 5. Répartition géographique et démographie
- Nombre total de locuteurs : environ 350 millions
- Répartition par pays : RDC, Tanzanie, Kenya, Afrique du Sud
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.distribution).toBeDefined();
      expect(result.distribution?.totalSpeakers).toBe(350000000);
      // Unstructured list without percentages -> empty record
      expect(result.distribution?.distributionByCountry).toEqual({});
    });

    it("should parse distribution section with ISO codes and percentages", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Nombre total de locuteurs (estimation) : environ 10 millions

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 10 millions

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)

# 5. Répartition géographique et démographie
- Nombre total de locuteurs : environ 10 millions
- Répartition par pays : CMR (30%), NGA (25%), TCD (15%)
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.distribution).toBeDefined();
      expect(result.distribution?.distributionByCountry).toEqual({
        CMR: 30,
        NGA: 25,
        TCD: 15,
      });
    });

    it("should parse nameEn and numberOfLanguages from header", () => {
      const content = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Nom anglais / auto-appellation académique : Test Family
- Nombre de langues (estimation) : environ 500

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Afrique
- Nombre total de locuteurs : environ 1 million

# 2. Peuples associés
- Peuple 1 : Test (PPL_TEST)
`;

      const result = parseLanguageFamilyV2(content);

      expect(result.nameEn).toBe("Test Family");
      expect(result.numberOfLanguages).toBe(500);
    });
  });

  describe("parseDistributionByCountry", () => {
    it("should parse ISO codes with percentages in parentheses", () => {
      const result = parseDistributionByCountry(
        "CMR (30%), NGA (25%), TCD (15%)"
      );
      expect(result).toEqual({ CMR: 30, NGA: 25, TCD: 15 });
    });

    it("should parse ISO codes with colon-separated percentages", () => {
      const result = parseDistributionByCountry(
        "CMR : 30%, NGA : 25%, TCD : 15%"
      );
      expect(result).toEqual({ CMR: 30, NGA: 25, TCD: 15 });
    });

    it("should parse decimal percentages", () => {
      const result = parseDistributionByCountry("CMR (30.5%), NGA (25,3%)");
      expect(result).toEqual({ CMR: 30.5, NGA: 25.3 });
    });

    it("should return empty record for plain country names without percentages", () => {
      const result = parseDistributionByCountry(
        "RDC, Tanzanie, Kenya, Afrique du Sud"
      );
      expect(result).toEqual({});
    });

    it("should return empty record for null input", () => {
      const result = parseDistributionByCountry(null);
      expect(result).toEqual({});
    });

    it("should return empty record for empty string", () => {
      const result = parseDistributionByCountry("");
      expect(result).toEqual({});
    });

    it("should return empty record for whitespace-only input", () => {
      const result = parseDistributionByCountry("   ");
      expect(result).toEqual({});
    });
  });
});
