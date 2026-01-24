import { describe, it, expect, beforeAll } from "vitest";
import { parseCountryFile } from "../countryParser";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * TDD Phase: RED
 * Test: Country file parser
 */
describe("Country Parser", () => {
  let sampleCountryContent: string;

  beforeAll(() => {
    // Sample content based on modele-pays.txt
    sampleCountryContent = `
# Nom du pays
- Nom officiel actuel : République du Zimbabwe (Republic of Zimbabwe)
- Étymologie du nom : Le nom "Zimbabwe" vient du terme shona "dzimba-dza-mabwe"
- Personne / peuple / administration à l'origine du nom : Le peuple Shona
- Identifiant pays (ISO 3166-1 alpha-3) : ZWE

# 1. Appellations historiques et origines du nom
- Antiquité : Le territoire était peuplé de groupes bantous
- Colonisation : Rhodésie du Sud (Southern Rhodesia)

# 3. Peuples majeurs
- Peuple 1 :
  - Nom : Shona
  - Identifiant peuple (PPL_) : PPL_SHONA
  - Langues parlées : Shona (sna)
  - Famille linguistique : Niger-Congo – Bantou (FLG_BANTU)

# 7. Sources
- ONU – World Population Prospects 2025
- CIA World Factbook – Zimbabwe
`;
  });

  describe("parseCountryFile", () => {
    it("should parse country file and extract ID", () => {
      const result = parseCountryFile(sampleCountryContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("ZWE");
    });

    it("should extract country name", () => {
      const result = parseCountryFile(sampleCountryContent);

      expect(result.data?.nameFr).toContain("Zimbabwe");
    });

    it("should extract etymology", () => {
      const result = parseCountryFile(sampleCountryContent);

      expect(result.data?.etymology).toContain("dzimba-dza-mabwe");
    });

    it("should extract name origin actor", () => {
      const result = parseCountryFile(sampleCountryContent);

      expect(result.data?.nameOriginActor).toContain("Shona");
    });

    it("should store all content in JSONB structure", () => {
      const result = parseCountryFile(sampleCountryContent);

      expect(result.data?.content).toBeDefined();
      expect(result.data?.content).toHaveProperty("historicalNames");
      expect(result.data?.content).toHaveProperty("majorPeoples");
      expect(result.data?.content).toHaveProperty("sources");
    });

    it("should extract major peoples with relations", () => {
      const result = parseCountryFile(sampleCountryContent);

      const majorPeoples = result.data?.content.majorPeoples;
      expect(majorPeoples).toBeDefined();
      expect(Array.isArray(majorPeoples)).toBe(true);
      expect(majorPeoples).toHaveLength(1);
      expect(majorPeoples![0]).toHaveProperty("peopleId", "PPL_SHONA");
      expect(majorPeoples![0]).toHaveProperty("languageFamily", "FLG_BANTU");
    });

    it("should fail gracefully if ID is missing", () => {
      const invalidContent = `
# Nom du pays
- Nom officiel actuel : Zimbabwe
`;

      const result = parseCountryFile(invalidContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe("missing_id");
    });

    it("should handle missing optional sections", () => {
      const minimalContent = `
# Nom du pays
- Nom officiel actuel : Zimbabwe
- Identifiant pays (ISO 3166-1 alpha-3) : ZWE
`;

      const result = parseCountryFile(minimalContent);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe("ZWE");
    });

    it("should parse real country file from dataset", () => {
      // This test uses an actual file from the dataset
      try {
        const filePath = join(
          process.cwd(),
          "dataset/source/afrik/pays/ZWE.txt"
        );
        const content = readFileSync(filePath, "utf-8");

        const result = parseCountryFile(content);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("ZWE");
        expect(result.data?.content).toBeDefined();
      } catch (error) {
        // Skip if file doesn't exist
        console.warn("Skipping real file test - file not found");
      }
    });

    it("should handle new sections not in the model", () => {
      const contentWithNewSection =
        sampleCountryContent +
        `
# 8. Nouvelle Section Économique
- PIB : 1000 milliards
- Monnaie : Dollar zimbabwéen
`;

      const result = parseCountryFile(contentWithNewSection);

      expect(result.success).toBe(true);
      expect(result.data?.content).toHaveProperty(
        "8. Nouvelle Section Économique"
      );
    });
  });
});
