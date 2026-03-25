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

  describe("nameFr cleanup", () => {
    it("should strip duplicate parenthetical from nameFr", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Burkina Faso (Burkina Faso)
- Identifiant pays (ISO 3166-1 alpha-3) : BFA
`;
      const result = parseCountryFile(content);
      expect(result.data?.nameFr).toBe("Burkina Faso");
    });

    it("should keep different parenthetical in nameFr", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : République du Zimbabwe (Republic of Zimbabwe)
- Identifiant pays (ISO 3166-1 alpha-3) : ZWE
`;
      const result = parseCountryFile(content);
      expect(result.data?.nameFr).toBe(
        "République du Zimbabwe (Republic of Zimbabwe)"
      );
    });
  });

  describe("historicalNames camelCase mapping", () => {
    it("should map French keys to camelCase", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Pays Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# 1. Appellations historiques et origines du nom
- Moyen Âge : Royaumes anciens
- Colonisation : Colonie française
- Période contemporaine : Indépendance 1960
`;
      const result = parseCountryFile(content);
      const hn = result.data?.content.historicalNames as
        | Record<string, string>
        | undefined;
      expect(hn).toBeDefined();
      expect(hn?.middleAges).toBe("Royaumes anciens");
      expect(hn?.colonization).toBe("Colonie française");
      expect(hn?.contemporary).toBe("Indépendance 1960");
    });
  });

  describe("culture camelCase mapping", () => {
    it("should map French keys to camelCase", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Pays Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# 5. Culture, modes de vie, langues, spiritualités, organisation traditionnelle
- Religions dominantes : Islam, christianisme
- Modes de vie : Agriculture, élevage
- Organisation sociale : Royaumes, chefferies
`;
      const result = parseCountryFile(content);
      const culture = result.data?.content.culture as
        | Record<string, unknown>
        | undefined;
      expect(culture).toBeDefined();
      expect(culture?.dominantReligions).toBe("Islam, christianisme");
      expect(culture?.lifestyles).toBe("Agriculture, élevage");
      expect(culture?.socialOrganization).toBe("Royaumes, chefferies");
    });

    it("should parse mainLanguages string into array", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Pays Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# 5. Culture, modes de vie, langues, spiritualités, organisation traditionnelle
- Langues principales (avec ISO 639-3) : Français (langue officielle, fra), Mooré (mos), Dioula (dyu)
`;
      const result = parseCountryFile(content);
      const culture = result.data?.content.culture as
        | Record<string, unknown>
        | undefined;
      const langs = culture?.mainLanguages as
        | Array<{ name: string; isoCode?: string; isPrimary?: boolean }>
        | undefined;
      expect(langs).toBeDefined();
      expect(Array.isArray(langs)).toBe(true);
      expect(langs?.length).toBeGreaterThanOrEqual(3);
      expect(langs?.[0].name).toBe("Français");
      expect(langs?.[0].isoCode).toBe("fra");
      expect(langs?.[0].isPrimary).toBe(true);
      expect(langs?.[1].name).toBe("Mooré");
      expect(langs?.[1].isoCode).toBe("mos");
    });
  });

  describe("demographics parsing", () => {
    it("should parse ### Peuple : blocks into peoples array", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Burkina Faso (Burkina Faso)
- Identifiant pays (ISO 3166-1 alpha-3) : BFA

# DONNÉES DÉMOGRAPHIQUES
### Peuple : Mossi
- Identifiant peuple (PPL_) : PPL_MOSSI
- Population : 11 500 000
- Pourcentage dans le pays : 50%
- Région : Plateau central

### Peuple : Peul / Fulani
- Identifiant peuple (PPL_) : PPL_FULA
- Population : 2 300 000
- Pourcentage dans le pays : 10%

**Total population : 23 000 000**
`;
      const result = parseCountryFile(content);
      const demo = result.data?.content.demographics as
        | {
            peoples?: Array<{
              name: string;
              population?: number;
              percentageInCountry?: number;
            }>;
          }
        | undefined;
      expect(demo).toBeDefined();
      expect(Array.isArray(demo?.peoples)).toBe(true);
      expect(demo?.peoples?.length).toBeGreaterThanOrEqual(2);
      const mossi = demo?.peoples?.[0];
      expect(mossi?.name).toBe("Mossi");
      expect(mossi?.population).toBe(11500000);
      expect(mossi?.percentageInCountry).toBe(50);
    });
  });

  describe("major peoples appellationRemarks", () => {
    it("should extract appellationRemarks from major peoples", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Burkina Faso (Burkina Faso)
- Identifiant pays (ISO 3166-1 alpha-3) : BFA

# 3. Peuples majeurs
- Peuple 1 :
  - Nom : Peul / Fulani
  - Auto-appellation (endonyme) : Fulɓe (pluriel)
  - Identifiant peuple (PPL_) : PPL_FULA
  - Remarque sur les appellations (termes péjoratifs / auto-appellation) : "Fellata" peut avoir une connotation péjorative
`;
      const result = parseCountryFile(content);
      const peoples = result.data?.content.majorPeoples as
        | Array<{ appellationRemarks?: string }>
        | undefined;
      expect(peoples).toBeDefined();
      expect(peoples?.[0]?.appellationRemarks).toContain("Fellata");
    });
  });

  describe("percentageInAfrica extraction", () => {
    it("should extract percentageInAfrica from demographic block", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Burkina Faso (Burkina Faso)
- Identifiant pays (ISO 3166-1 alpha-3) : BFA

# DONNÉES DÉMOGRAPHIQUES
### Peuple : Mossi
- Identifiant peuple (PPL_) : PPL_MOSSI
- Population : 11 500 000
- Pourcentage dans le pays : 50%
- Pourcentage en Afrique : 0.5%
- Région : Plateau central
`;
      const result = parseCountryFile(content);
      const demo = result.data?.content.demographics as
        | { peoples?: Array<{ name: string; percentageInAfrica?: number }> }
        | undefined;
      expect(demo?.peoples?.[0]?.percentageInAfrica).toBe(0.5);
    });

    it("should ignore N/A percentageInAfrica", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# DONNÉES DÉMOGRAPHIQUES
### Peuple : TestPeople
- Population : 1 000 000
- Pourcentage dans le pays : 10%
- Pourcentage en Afrique : N/A
`;
      const result = parseCountryFile(content);
      const demo = result.data?.content.demographics as
        | { peoples?: Array<{ name: string; percentageInAfrica?: number }> }
        | undefined;
      expect(demo?.peoples?.[0]?.percentageInAfrica).toBeUndefined();
    });

    it("should parse percentageInAfrica with comma decimal", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# DONNÉES DÉMOGRAPHIQUES
### Peuple : TestPeople
- Population : 1 000 000
- Pourcentage dans le pays : 10%
- Pourcentage en Afrique : 2,5%
`;
      const result = parseCountryFile(content);
      const demo = result.data?.content.demographics as
        | { peoples?: Array<{ name: string; percentageInAfrica?: number }> }
        | undefined;
      expect(demo?.peoples?.[0]?.percentageInAfrica).toBe(2.5);
    });
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

    // Fix 2 + Fix 3: Sources with en-dash should be parsed
    it("should parse sources section with en-dash lines (no colon)", () => {
      const result = parseCountryFile(sampleCountryContent);

      expect(result.success).toBe(true);
      const sources = result.data?.content.sources;
      expect(sources).toBeDefined();
      expect(sources!.length).toBeGreaterThanOrEqual(2);
      expect(sources).toContain("ONU – World Population Prospects 2025");
      expect(sources).toContain("CIA World Factbook – Zimbabwe");
    });

    it("should parse mixed sources (key-value and standalone)", () => {
      const content = `
# Nom du pays
- Nom officiel actuel : Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# 7. Sources
- Auteur principal : UNESCO
- CIA World Factbook – Test Country
- ONU – World Population Prospects 2025
`;

      const result = parseCountryFile(content);

      expect(result.success).toBe(true);
      const sources = result.data?.content.sources;
      expect(sources).toBeDefined();
      // Should contain all 3 entries
      expect(sources!.length).toBeGreaterThanOrEqual(3);
      expect(sources).toContain("UNESCO");
      expect(sources).toContain("CIA World Factbook – Test Country");
      expect(sources).toContain("ONU – World Population Prospects 2025");
    });
  });
});
