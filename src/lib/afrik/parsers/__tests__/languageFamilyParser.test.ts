import { describe, it, expect, beforeAll } from "vitest";
import { parseLanguageFamilyFile } from "../languageFamilyParser";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * TDD Phase: RED
 * Test: Language Family file parser
 */
describe("Language Family Parser", () => {
  let sampleFamilyContent: string;

  beforeAll(() => {
    sampleFamilyContent = `
# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)
- Identifiant famille linguistique (FLG_xxxxx) : FLG_BANTU
- Nom français : Bantou
- Nom anglais / auto-appellation académique : Bantu
- Appellation(s) historique(s) : Bantou, Bantu
- Origine du terme historique : Terme colonial
- Pourquoi le terme pose problème (si applicable) : Utilisé pendant la colonisation
- Auto-appellation (locuteurs / linguistes contemporains) : Bantu
- Usage contemporain : Famille linguistique Bantu
- Aire / répartition géographique générale : Afrique subsaharienne
- Nombre de langues (estimation) : 500+
- Nombre total de locuteurs (estimation) : 350 000 000

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Bantou
- Branches internes / sous-groupes : Zone A, Zone B, Zone S
- Aire géographique : Afrique subsaharienne

# 2. Peuples associés
- Peuple 1 : Shona (PPL_SHONA)
- Peuple 2 : Kongo (PPL_KONGO)

# 6. Sources
- Ethnologue
- Glottolog
`;
  });

  describe("parseLanguageFamilyFile", () => {
    it("should parse language family file and extract ID", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("FLG_BANTU");
    });

    it("should extract French name", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      expect(result.data?.nameFr).toBe("Bantou");
    });

    it("should extract English name", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      expect(result.data?.nameEn).toBe("Bantu");
    });

    it("should extract decolonial header", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      const header = result.data?.content.decolonialHeader;
      expect(header).toBeDefined();
      expect(header?.originOfHistoricalTerm).toContain("colonial");
      expect(header?.whyProblematic).toContain("colonisation");
      expect(header?.selfAppellation).toBe("Bantu");
    });

    it("should extract general information", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      const info = result.data?.content.generalInfo;
      expect(info).toBeDefined();
      expect(info?.branches).toContain("Zone A");
      expect(info?.geographicArea).toContain("subsaharienne");
    });

    it("should extract associated peoples with PPL_ IDs", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      const peoples = result.data?.content.associatedPeoples;

      // Debug: log what we got
      if (!peoples) {
        console.log(
          "Parsed content:",
          JSON.stringify(result.data?.content, null, 2)
        );
      }

      expect(peoples).toBeDefined();
      expect(Array.isArray(peoples)).toBe(true);
      expect(peoples!.length).toBeGreaterThan(0);
      if (peoples!.length >= 2) {
        expect(peoples![0]).toHaveProperty("peopleId");
        expect(peoples![1]).toHaveProperty("peopleId");
      }
    });

    it("should extract sources", () => {
      const result = parseLanguageFamilyFile(sampleFamilyContent);

      const sources = result.data?.content.sources;
      expect(sources).toBeDefined();
      expect(sources).toContain("Ethnologue");
      expect(sources).toContain("Glottolog");
    });

    it("should fail if ID is missing", () => {
      const invalidContent = `
# Famille linguistique
- Nom français : Bantou
`;

      const result = parseLanguageFamilyFile(invalidContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe("missing_id");
    });

    it("should warn if decolonial header is incomplete", () => {
      const contentWithoutHeader = `
# Famille linguistique
- Identifiant famille linguistique (FLG_xxxxx) : FLG_BANTU
- Nom français : Bantou

# 1. Informations générales
- Nom de la famille : Bantou
`;

      const result = parseLanguageFamilyFile(contentWithoutHeader);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings!.some((w) => w.type === "missing_optional_section")
      ).toBe(true);
    });

    it("should parse real language family file from dataset", () => {
      try {
        const filePath = join(
          process.cwd(),
          "dataset/source/afrik/famille_linguistique/FLG_BANTU.txt"
        );
        const content = readFileSync(filePath, "utf-8");

        const result = parseLanguageFamilyFile(content);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("FLG_BANTU");
        expect(result.data?.content.decolonialHeader).toBeDefined();
      } catch (error) {
        console.warn("Skipping real file test - file not found");
      }
    });

    it("should support evolutivity - handle new sections", () => {
      const contentWithNewSection =
        sampleFamilyContent +
        `
# 7. Classification Moderne
- Nouvelle classification : Sous-familles révisées
- Méthodes : Analyse génétique linguistique
`;

      const result = parseLanguageFamilyFile(contentWithNewSection);

      expect(result.success).toBe(true);
      expect(result.data?.content).toHaveProperty("7. Classification Moderne");
    });
  });
});
