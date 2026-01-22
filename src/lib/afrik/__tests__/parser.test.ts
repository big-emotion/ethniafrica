import { describe, it, expect } from "vitest";
import { extractIdentifier } from "../parser";

/**
 * TDD Phase: RED
 * Test: Extraction of AFRIK identifiers
 *
 * These tests will fail initially until we implement the parser
 */
describe("AFRIK Parser - Identifier Extraction", () => {
  describe("extractIdentifier", () => {
    it("should extract PPL_ identifier from people file content", () => {
      const content = `
# Nom du peuple
- Nom principal du peuple : Shona
- Identifiant peuple (ID) : PPL_SHONA
`;

      const result = extractIdentifier(content, "PPL");
      expect(result).toBe("PPL_SHONA");
    });

    it("should extract FLG_ identifier from language family file content", () => {
      const content = `
# Famille linguistique
- Identifiant famille linguistique (FLG_xxxxx) : FLG_BANTU
- Nom français : Bantu
`;

      const result = extractIdentifier(content, "FLG");
      expect(result).toBe("FLG_BANTU");
    });

    it("should extract ISO 3166-1 alpha-3 code from country file content", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : République du Zimbabwe
- Identifiant pays (ISO 3166-1 alpha-3) : ZWE
`;

      const result = extractIdentifier(content, "ISO_COUNTRY");
      expect(result).toBe("ZWE");
    });

    it("should extract ISO 639-3 code from language references", () => {
      const content = `
- Langues principales (avec ISO 639-3) : Shona (sna), Ndebele (nde)
- Codes ISO : sna (ISO 639-3)
`;

      const result = extractIdentifier(content, "ISO_LANGUAGE");
      expect(result).toBe("sna");
    });

    it("should throw error if identifier is missing", () => {
      const content = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
`;

      expect(() => extractIdentifier(content, "PPL")).toThrow(
        "Identifier PPL not found"
      );
    });

    it("should extract identifier with underscores correctly", () => {
      const content = `
- Identifiant peuple (ID) : PPL_NDEBELE_ZIM
`;

      const result = extractIdentifier(content, "PPL");
      expect(result).toBe("PPL_NDEBELE_ZIM");
    });

    it("should handle multiple identifiers and return the first one", () => {
      const content = `
- Identifiant peuple (PPL_) : PPL_SHONA
- Autre référence : PPL_AUTRE
`;

      const result = extractIdentifier(content, "PPL");
      expect(result).toBe("PPL_SHONA");
    });
  });
});
