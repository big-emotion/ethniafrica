import { describe, it, expect } from "vitest";
import { extractRelations } from "../parser";

/**
 * TDD Phase: RED
 * Test: Extraction of relations from AFRIK files
 */
describe("AFRIK Parser - Relation Extraction", () => {
  describe("extractRelations", () => {
    it('should extract country codes from "Pays actuels" field', () => {
      const content = `
- Pays actuels : ZWE, MOZ
`;

      const result = extractRelations(content, "countries");
      expect(result).toEqual(["ZWE", "MOZ"]);
    });

    it("should extract people IDs from text with PPL_ references", () => {
      const content = `
# Peuples associés
- Peuple 1 : Kongo (PPL_KONGO)
- Peuple 2 : Shona (PPL_SHONA)
- Peuple 3 : Zulu (PPL_ZULU)
`;

      const result = extractRelations(content, "peoples");
      expect(result).toEqual(["PPL_KONGO", "PPL_SHONA", "PPL_ZULU"]);
    });

    it("should extract language family ID from text", () => {
      const content = `
- Famille linguistique principale : Niger-Congo – Bantou (FLG_BANTU)
`;

      const result = extractRelations(content, "languageFamily");
      expect(result).toBe("FLG_BANTU");
    });

    it("should extract multiple language codes from languages section", () => {
      const content = `
- Langues principales (avec ISO 639-3) : Shona (sna), Ndebele (nde), Tonga (tzl)
`;

      const result = extractRelations(content, "languages");
      expect(result).toEqual(["sna", "nde", "tzl"]);
    });

    it("should handle missing relations gracefully", () => {
      const content = `
- Some other field : value
`;

      const result = extractRelations(content, "countries");
      expect(result).toEqual([]);
    });

    it("should extract PPL_ from major peoples section", () => {
      const content = `
# 3. Peuples majeurs
- Peuple 1 :
  - Nom : Shona
  - Identifiant peuple (PPL_) : PPL_SHONA
- Peuple 2 :
  - Nom : Ndebele
  - Identifiant peuple (PPL_) : PPL_NDEBELE_ZIM
`;

      const result = extractRelations(content, "majorPeoples");
      expect(result).toEqual(["PPL_SHONA", "PPL_NDEBELE_ZIM"]);
    });

    it("should extract country code from region historique field", () => {
      const content = `
- Région historique : ZWE, MOZ
- Pays actuels : ZWE, MOZ
`;

      const result = extractRelations(content, "countries");
      expect(result).toEqual(["ZWE", "MOZ"]);
    });

    it("should deduplicate extracted relations", () => {
      const content = `
- Pays 1 : ZWE
- Pays 2 : MOZ
- Autres pays : ZWE, MOZ
`;

      const result = extractRelations(content, "countries");
      expect(result).toEqual(["ZWE", "MOZ"]);
      expect(result.length).toBe(2);
    });

    // Fix 1: FLG_ fallback from filePath when not found in content
    describe("languageFamily fallback from filePath", () => {
      it("should infer FLG_ from filePath when content has no FLG_ reference", () => {
        const content = `
- Famille linguistique : Niger-Congo – Atlantique
`;
        const filePath =
          "dataset/source/afrik/peuples/FLG_ATLANTIQUE/PPL_WOLOF.txt";

        const result = extractRelations(content, "languageFamily", filePath);
        expect(result).toBe("FLG_ATLANTIQUE");
      });

      it("should prefer FLG_ in content over filePath fallback", () => {
        const content = `
- Famille linguistique : Niger-Congo – Bantou (FLG_BANTU)
`;
        const filePath =
          "dataset/source/afrik/peuples/FLG_ATLANTIQUE/PPL_WOLOF.txt";

        const result = extractRelations(content, "languageFamily", filePath);
        expect(result).toBe("FLG_BANTU");
      });

      it("should return empty string when no FLG_ in content and no filePath", () => {
        const content = `
- Famille linguistique : Niger-Congo – Atlantique
`;

        const result = extractRelations(content, "languageFamily");
        expect(result).toBe("");
      });

      it("should handle filePath with nested FLG_ directory", () => {
        const content = `
- Famille linguistique : Nilo-Saharien
`;
        const filePath =
          "/absolute/path/dataset/source/afrik/peuples/FLG_NILO_SAHARIEN/PPL_DINKA.txt";

        const result = extractRelations(content, "languageFamily", filePath);
        expect(result).toBe("FLG_NILO_SAHARIEN");
      });

      it("should return empty string if filePath has no FLG_ segment", () => {
        const content = `
- Famille linguistique : Unknown
`;
        const filePath = "dataset/source/afrik/peuples/UNKNOWN/PPL_TEST.txt";

        const result = extractRelations(content, "languageFamily", filePath);
        expect(result).toBe("");
      });
    });
  });
});
