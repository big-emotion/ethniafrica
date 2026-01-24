import { describe, it, expect } from "vitest";
import { parseSection, parseSections } from "../parser";

/**
 * TDD Phase: RED
 * Test: Parsing of sections from AFRIK files
 */
describe("AFRIK Parser - Section Parsing", () => {
  describe("parseSection", () => {
    it("should parse a simple section with single value", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : République du Zimbabwe
- Étymologie du nom : Le nom vient de "dzimba-dza-mabwe"
`;

      const result = parseSection(content, "Nom du pays");
      expect(result).toEqual({
        "Nom officiel actuel": "République du Zimbabwe",
        "Étymologie du nom": 'Le nom vient de "dzimba-dza-mabwe"',
      });
    });

    it("should parse historical names section with sub-periods", () => {
      const content = `
# 1. Appellations historiques et origines du nom
- Antiquité : Le territoire était peuplé de groupes bantous
- Moyen Âge : Royaume du Grand Zimbabwe
- Colonisation : Rhodésie du Sud
`;

      const result = parseSection(
        content,
        "1. Appellations historiques et origines du nom"
      );
      expect(result).toEqual({
        Antiquité: "Le territoire était peuplé de groupes bantous",
        "Moyen Âge": "Royaume du Grand Zimbabwe",
        Colonisation: "Rhodésie du Sud",
      });
    });

    it("should parse structured entries like kingdoms", () => {
      const content = `
# 2. Civilisations, royaumes et entités politiques historiques
- [Royaume du Grand Zimbabwe] :
  - Période : XIe siècle - XVe siècle
  - Peuples dominants : Shona
  - Centres politiques : Grand Zimbabwe
`;

      const result = parseSection(
        content,
        "2. Civilisations, royaumes et entités politiques historiques"
      );
      expect(result).toBeDefined();
      expect(result).not.toBeUndefined();
      if (result && !Array.isArray(result)) {
        expect(result).toHaveProperty("kingdoms");
        expect(Array.isArray(result.kingdoms)).toBe(true);
      }
    });

    it("should return undefined for non-existent section", () => {
      const content = `
# Section 1
- Data : value
`;

      const result = parseSection(content, "Section 2");
      expect(result).toBeUndefined();
    });

    it("should handle multiline values", () => {
      const content = `
# Description
- Étymologie : Le nom "Zimbabwe" vient du terme shona "dzimba-dza-mabwe",
  qui signifie "maisons de pierre" ou "grandes maisons de pierre".
  Ce terme fait référence aux ruines du Grand Zimbabwe.
`;

      const result = parseSection(content, "Description");
      expect(result["Étymologie"]).toContain("dzimba-dza-mabwe");
      expect(result["Étymologie"]).toContain("maisons de pierre");
    });
  });

  describe("parseSections", () => {
    it("should parse all sections from a file", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Zimbabwe
- Identifiant pays (ISO 3166-1 alpha-3) : ZWE

# 1. Appellations historiques
- Antiquité : Territoire bantou
- Colonisation : Rhodésie du Sud

# 2. Culture
- Langues : Shona, Ndebele
`;

      const result = parseSections(content);
      expect(result).toHaveProperty("Nom du pays");
      expect(result).toHaveProperty("1. Appellations historiques");
      expect(result).toHaveProperty("2. Culture");
    });

    it("should detect unknown sections and include them", () => {
      const content = `
# Known Section
- Data : value

# New Unknown Section
- New data : new value
`;

      const result = parseSections(content);
      expect(result).toHaveProperty("Known Section");
      expect(result).toHaveProperty("New Unknown Section");
    });

    it("should not fail on missing optional sections", () => {
      const content = `
# Required Section
- Data : value
`;

      expect(() => parseSections(content)).not.toThrow();
    });
  });
});
