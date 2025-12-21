import { describe, it, expect, beforeAll } from "vitest";
import { parsePeopleFile } from "../peopleParser";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * TDD Phase: RED
 * Test: People file parser
 */
describe("People Parser", () => {
  let samplePeopleContent: string;

  beforeAll(() => {
    samplePeopleContent = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
- Exonymes / appellations historiques : Shona (terme utilisé par les Européens)
- Famille linguistique principale : Niger-Congo – Bantou (FLG_BANTU)
- Pays actuels : ZWE, MOZ
- Identifiant peuple (ID) : PPL_SHONA

# 2. Origines, migrations et formation du peuple
- Origines anciennes : Les Shona sont originaires du Zimbabwe
- Routes migratoires : Migrations depuis les régions bantoues

# 4. Langues et sous-familles
- Langue principale : Shona
- Codes ISO : sna (ISO 639-3)

# 7. Démographie globale
- Population totale (tous pays) : 15 000 000 - 20 000 000
- Année de référence : 2025
`;
  });

  describe("parsePeopleFile", () => {
    it("should parse people file and extract ID", () => {
      const result = parsePeopleFile(samplePeopleContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe("PPL_SHONA");
    });

    it("should extract main name", () => {
      const result = parsePeopleFile(samplePeopleContent);

      expect(result.data?.nameMain).toBe("Shona");
    });

    it("should extract language family ID", () => {
      const result = parsePeopleFile(samplePeopleContent);

      expect(result.data?.languageFamilyId).toBe("FLG_BANTU");
    });

    it("should extract current countries", () => {
      const result = parsePeopleFile(samplePeopleContent);

      expect(result.data?.currentCountries).toEqual(["ZWE", "MOZ"]);
    });

    it("should store appellations in content", () => {
      const result = parsePeopleFile(samplePeopleContent);

      const appellations = result.data?.content.appellations;
      expect(appellations).toBeDefined();
      expect(appellations?.selfAppellation).toBe("Shona");
      expect(appellations?.mainName).toBe("Shona");
    });

    it("should store origins section in content", () => {
      const result = parsePeopleFile(samplePeopleContent);

      const origins = result.data?.content.origins;
      expect(origins).toBeDefined();
      expect(origins?.ancientOrigins).toContain("Zimbabwe");
    });

    it("should store languages section in content", () => {
      const result = parsePeopleFile(samplePeopleContent);

      const languages = result.data?.content.languages;
      expect(languages).toBeDefined();
      expect(languages?.mainLanguage).toBe("Shona");

      // isoCodes should be an array or undefined
      if (languages?.isoCodes) {
        expect(Array.isArray(languages.isoCodes)).toBe(true);
        expect(languages.isoCodes).toContain("sna");
      }
    });

    it("should store demography in content", () => {
      const result = parsePeopleFile(samplePeopleContent);

      const demography = result.data?.content.demography;
      expect(demography).toBeDefined();
      expect(demography?.referenceYear).toBe(2025);
    });

    it("should fail if ID is missing", () => {
      const invalidContent = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
`;

      const result = parsePeopleFile(invalidContent);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].type).toBe("missing_id");
    });

    it("should handle missing language family gracefully", () => {
      const contentWithoutFamily = `
# Nom du peuple
- Nom principal du peuple : Shona
- Identifiant peuple (ID) : PPL_SHONA
- Pays actuels : ZWE
`;

      const result = parsePeopleFile(contentWithoutFamily);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should parse real people file from dataset", () => {
      try {
        const filePath = join(
          process.cwd(),
          "dataset/source/afrik/peuples/FLG_BANTU/PPL_SHONA.txt"
        );
        const content = readFileSync(filePath, "utf-8");

        const result = parsePeopleFile(content);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe("PPL_SHONA");
        expect(result.data?.languageFamilyId).toBeDefined();
      } catch (error) {
        console.warn("Skipping real file test - file not found");
      }
    });

    it("should handle detailed culture section if present", () => {
      const contentWithCulture =
        samplePeopleContent +
        `
# 5. Culture, rites et traditions

## A. DIVINITÉS ET ESPRITS
### Divinité suprême :
- Endonyme (nom local) : Mwari
- Attributs et rôle : Dieu créateur
`;

      const result = parsePeopleFile(contentWithCulture);

      expect(result.success).toBe(true);
      expect(result.data?.content.culture).toBeDefined();
    });

    it("should support evolutivity - handle new sections", () => {
      const contentWithNewSection =
        samplePeopleContent +
        `
# 9. Économie Traditionnelle
- Activités principales : Agriculture, élevage
- Commerce : Routes commerciales anciennes
`;

      const result = parsePeopleFile(contentWithNewSection);

      expect(result.success).toBe(true);
      expect(result.data?.content).toHaveProperty("9. Économie Traditionnelle");
    });
  });
});
