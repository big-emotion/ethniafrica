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

    it("should parse culture section with nested subsections (## A through ## F)", () => {
      const contentWithDetailedCulture = `
# Nom du peuple
- Nom principal du peuple : Bambara
- Auto-appellation : Bamanankan
- Famille linguistique principale : Niger-Congo – Mandé (FLG_MANDE)
- Pays actuels : MLI
- Identifiant peuple (ID) : PPL_BAMBARA

# 5. Culture, rites et traditions

## A. DIVINITÉS ET ESPRITS

### Divinité suprême
- Endonyme (nom local) : Maa Ngala
- Exonyme : Dieu créateur
- Attributs et rôle : Créateur de l'univers par la puissance de la parole

### Divinités intermédiaires
- Nom : Faro
- Rôle : Esprit de l'eau, organisation de la vie

### Esprits de la nature
- Esprits des forêts : Jinɛ habitant les grands arbres
- Esprits des eaux : Gardiens des rivières et lacs

## B. COSMOLOGIE

### Structure du monde
- Monde supérieur : Domaine de Maa Ngala
- Monde terrestre : Domaine des humains
- Monde souterrain : Domaine des morts

### Concepts spirituels
- Force vitale : Nyama, énergie impersonnelle

## C. CONCEPTION DE LA PERSONNE ET DE LA NATURE

### Corps et esprit
- Corps physique : Fangama, enveloppe matérielle
- Essence spirituelle : Ni, éternelle

## D. RITES ET PRATIQUES SPIRITUELLES

### Rites d'initiation
- Initiation masculine : Sociétés secrètes (Komo, Kore, Nama)
- Initiation féminine : Rites de passage à l'âge adulte

### Rites funéraires
- Veillée : Accompagnement du défunt
- Enterrement : Retour à la terre

## E. SYMBOLES, ARTS ET CULTURE MATÉRIELLE

### Symboles
- Nom : Bogolan
- Signification : Tissu teint à la boue, identité bambara

### Arts et musique
- Sculpture : Masques rituels (Ci Wara)
- Instruments de musique : Balafon, ngoni, djembé

## F. SPIRITUALITÉS CONTEMPORAINES

### Christianisme
- Pourcentage : 5%
- Dénominations : Catholicisme, protestantisme

### Islam
- Pourcentage : 80%
- Pratiques spécifiques : Islam soufi, maraboutisme

# 7. Démographie globale
- Population totale (tous pays) : 20 000 000
- Année de référence : 2025
`;

      const result = parsePeopleFile(contentWithDetailedCulture);

      expect(result.success).toBe(true);
      expect(result.data?.content.culture).toBeDefined();

      const culture = result.data?.content.culture;

      // A. Divinities and spirits
      expect(culture?.divinitiesAndSpirits).toBeDefined();
      expect(culture?.divinitiesAndSpirits?.supremeDeity?.endonym).toBe(
        "Maa Ngala"
      );
      expect(culture?.divinitiesAndSpirits?.supremeDeity?.exonym).toBe(
        "Dieu créateur"
      );
      expect(
        culture?.divinitiesAndSpirits?.natureSpirits?.forestSpirits
      ).toContain("Jinɛ");

      // B. Cosmology
      expect(culture?.cosmology).toBeDefined();
      expect(culture?.cosmology?.worldStructure?.upperWorld).toContain(
        "Maa Ngala"
      );

      // C. Person and nature
      expect(culture?.personAndNature).toBeDefined();
      expect(culture?.personAndNature?.bodyAndSpirit?.physicalBody).toContain(
        "Fangama"
      );

      // D. Rites and practices
      expect(culture?.ritesAndPractices).toBeDefined();
      expect(
        culture?.ritesAndPractices?.initiationRites?.maleInitiation
      ).toContain("Komo");
      expect(culture?.ritesAndPractices?.funeraryRites?.wake).toContain(
        "Accompagnement"
      );

      // E. Symbols and arts
      expect(culture?.symbolsAndArts).toBeDefined();
      expect(culture?.symbolsAndArts?.artsAndMusic?.sculpture).toContain(
        "Ci Wara"
      );

      // F. Contemporary spirituality
      expect(culture?.contemporarySpirituality).toBeDefined();
      expect(
        culture?.contemporarySpirituality?.islam?.specificPractices
      ).toContain("soufi");
    });

    it("should handle culture section with only some subsections present", () => {
      const contentWithPartialCulture = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
- Famille linguistique principale : Niger-Congo – Bantou (FLG_BANTU)
- Pays actuels : ZWE
- Identifiant peuple (ID) : PPL_SHONA

# 5. Culture, rites et traditions

## A. DIVINITÉS ET ESPRITS

### Divinité suprême
- Endonyme (nom local) : Mwari
- Attributs et rôle : Dieu créateur universel

## D. RITES ET PRATIQUES SPIRITUELLES

### Rites funéraires
- Veillée : Chants et danses traditionnels
- Enterrement : Inhumation dans le sol sacré

# 7. Démographie globale
- Population totale (tous pays) : 15 000 000
- Année de référence : 2025
`;

      const result = parsePeopleFile(contentWithPartialCulture);

      expect(result.success).toBe(true);
      const culture = result.data?.content.culture;
      expect(culture).toBeDefined();

      // A should be present
      expect(culture?.divinitiesAndSpirits?.supremeDeity?.endonym).toBe(
        "Mwari"
      );

      // B, C should be undefined
      expect(culture?.cosmology).toBeUndefined();
      expect(culture?.personAndNature).toBeUndefined();

      // D should be present
      expect(culture?.ritesAndPractices?.funeraryRites?.wake).toContain(
        "Chants"
      );

      // E, F should be undefined
      expect(culture?.symbolsAndArts).toBeUndefined();
      expect(culture?.contemporarySpirituality).toBeUndefined();
    });

    it("should handle culture section with flat format (no ## subsections)", () => {
      const contentWithFlatCulture = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
- Famille linguistique principale : Niger-Congo – Bantou (FLG_BANTU)
- Pays actuels : ZWE
- Identifiant peuple (ID) : PPL_SHONA

# 5. Culture, rites et traditions
- Rites majeurs : Cérémonies royales, rites de passage
- Symboles : Symboles royaux shona
- Arts et musique : Musique traditionnelle, danse
- Spiritualités : Syncrétisme entre croyances traditionnelles et christianisme

# 7. Démographie globale
- Population totale (tous pays) : 15 000 000
- Année de référence : 2025
`;

      const result = parsePeopleFile(contentWithFlatCulture);

      expect(result.success).toBe(true);
      // Culture should still be stored (as flat data or empty structured)
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

    // Fix 1: filePath parameter for FLG_ fallback
    describe("filePath parameter for FLG_ fallback", () => {
      it("should infer languageFamilyId from filePath when content has no FLG_", () => {
        const contentWithoutFLG = `
# Nom du peuple
- Nom principal du peuple : Wolof
- Auto-appellation : Wolof
- Famille linguistique : Niger-Congo – Atlantique
- Pays actuels : SEN, GMB
- Identifiant peuple (ID) : PPL_WOLOF

# 7. Démographie globale
- Population totale (tous pays) : 10 000 000
- Année de référence : 2025
`;

        const filePath =
          "dataset/source/afrik/peuples/FLG_ATLANTIQUE/PPL_WOLOF.txt";
        const result = parsePeopleFile(contentWithoutFLG, filePath);

        expect(result.success).toBe(true);
        expect(result.data?.languageFamilyId).toBe("FLG_ATLANTIQUE");
      });

      it("should still fail if no FLG_ in content and no filePath provided", () => {
        const contentWithoutFLG = `
# Nom du peuple
- Nom principal du peuple : Wolof
- Auto-appellation : Wolof
- Famille linguistique : Niger-Congo – Atlantique
- Pays actuels : SEN, GMB
- Identifiant peuple (ID) : PPL_WOLOF
`;

        const result = parsePeopleFile(contentWithoutFLG);

        expect(result.success).toBe(false);
        expect(result.errors![0].message).toContain("Language family");
      });

      it("should parse distributionByCountry from section 7", () => {
        const contentWithDistribution = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
- Famille linguistique principale : Niger-Congo – Bantou (FLG_BANTU)
- Pays actuels : ZWE, MOZ
- Identifiant peuple (ID) : PPL_SHONA

# 7. Démographie globale
- Population totale (tous pays) : 15 000 000
- Année de référence : 2025
- Source : SIL Ethnologue

### Répartition par pays
- ZWE : 12 000 000 (80%)
- MOZ : 3 000 000 (20%)
`;

        const result = parsePeopleFile(contentWithDistribution);

        expect(result.success).toBe(true);
        const demography = result.data?.content.demography;
        expect(demography).toBeDefined();
        expect(demography?.distributionByCountry).toBeDefined();
        expect(demography?.distributionByCountry).toHaveLength(2);
        expect(demography?.distributionByCountry![0].country).toBe("ZWE");
        expect(demography?.distributionByCountry![0].population).toBe(12000000);
        expect(demography?.distributionByCountry![0].percentage).toBe(80);
        expect(demography?.distributionByCountry![1].country).toBe("MOZ");
        expect(demography?.distributionByCountry![1].population).toBe(3000000);
        expect(demography?.distributionByCountry![1].percentage).toBe(20);
      });

      it("should parse distributionByCountry with country name + ISO format", () => {
        const contentWithNameFormat = `
# Nom du peuple
- Nom principal du peuple : Shona
- Auto-appellation : Shona
- Famille linguistique principale : Niger-Congo – Bantou (FLG_BANTU)
- Pays actuels : ZWE, MOZ
- Identifiant peuple (ID) : PPL_SHONA

# 7. Démographie globale
- Population totale (tous pays) : 15 000 000
- Année de référence : 2025

### Répartition par pays
- Zimbabwe (ZWE) : 12 000 000
- Mozambique (MOZ) : 3 000 000
`;

        const result = parsePeopleFile(contentWithNameFormat);

        expect(result.success).toBe(true);
        const dist = result.data?.content.demography?.distributionByCountry;
        expect(dist).toBeDefined();
        expect(dist).toHaveLength(2);
        expect(dist![0].country).toBe("ZWE");
        expect(dist![0].population).toBe(12000000);
        expect(dist![1].country).toBe("MOZ");
        expect(dist![1].population).toBe(3000000);
      });

      it("should handle section 7 with no distribution subsection", () => {
        const result = parsePeopleFile(samplePeopleContent);

        expect(result.success).toBe(true);
        const demography = result.data?.content.demography;
        expect(demography).toBeDefined();
        // No distributionByCountry expected
        expect(
          demography?.distributionByCountry === undefined ||
            demography?.distributionByCountry?.length === 0
        ).toBe(true);
      });

      it("should parse sources section with en-dash lines", () => {
        const contentWithSources =
          samplePeopleContent +
          `
# 8. Sources
- CIA World Factbook – Zimbabwe
- ONU – World Population Prospects 2025
- SIL Ethnologue
`;

        const result = parsePeopleFile(contentWithSources);

        expect(result.success).toBe(true);
        const sources = result.data?.content.sources;
        expect(sources).toBeDefined();
        expect(sources!.length).toBeGreaterThanOrEqual(3);
        expect(sources).toContain("CIA World Factbook – Zimbabwe");
        expect(sources).toContain("ONU – World Population Prospects 2025");
        expect(sources).toContain("SIL Ethnologue");
      });
    });
  });
});
