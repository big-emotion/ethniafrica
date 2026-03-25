/**
 * Tests for the AFRIK Cross-Layer Gap Analyzer
 *
 * Verifies that the gap analyzer correctly detects data loss
 * between layers: Source TXT -> Parsers -> Components
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

import {
  analyzePeopleCultureGap,
  analyzeFamilyDecolonialGap,
  analyzeCountryHistoricalFactsGap,
  analyzeCountryDemographicsGap,
  analyzeEtymologyFragilityGap,
  analyzeDistributionTypeGap,
  analyzePeopleDemographyGap,
  analyzeAllGaps,
} from "../gapAnalyzer";
import type { CrossLayerGap } from "../types";

// Paths to real data files
const DATASET_ROOT = path.resolve(__dirname, "../../../dataset/source/afrik");
const PEOPLE_FILE = path.join(DATASET_ROOT, "peuples/FLG_BANTU/PPL_ZULU.txt");
const FAMILY_FILE = path.join(
  DATASET_ROOT,
  "famille_linguistique/FLG_BANTU.txt"
);
const COUNTRY_FILE = path.join(DATASET_ROOT, "pays/BFA.txt");

// Read real files once for all tests
const peopleContent = fs.readFileSync(PEOPLE_FILE, "utf-8");
const familyContent = fs.readFileSync(FAMILY_FILE, "utf-8");
const countryContent = fs.readFileSync(COUNTRY_FILE, "utf-8");

describe("Gap Analyzer", () => {
  describe("analyzePeopleCultureGap", () => {
    it("should detect that culture subsections A-F are flattened by parseSection", () => {
      const gap = analyzePeopleCultureGap(peopleContent);

      // The PPL_ZULU file has a culture section (Section 5) with nested items
      // but parseSection() flattens them into key-value pairs
      expect(gap).not.toBeNull();
      expect(gap!.layer).toBe("source-parser");
      expect(gap!.entityType).toBe("people");
      expect(gap!.field).toBe("culture");
      expect(gap!.severity).toBe("high");
    });

    it("should return a clear, actionable description", () => {
      const gap = analyzePeopleCultureGap(peopleContent);
      expect(gap).not.toBeNull();
      expect(gap!.description).toBeTruthy();
      expect(gap!.description.length).toBeGreaterThan(20);
      // Description should mention the flattening issue
      expect(gap!.description).toMatch(/flat|nested|subsection|structure/i);
    });

    it("should return null for content without a culture section", () => {
      const minimalContent = `# Nom du peuple
- Nom principal du peuple : Test
- Identifiant peuple (ID) : PPL_TEST
- Famille linguistique principale : Test (FLG_TEST)
- Pays actuels : TST`;

      const gap = analyzePeopleCultureGap(minimalContent);
      expect(gap).toBeNull();
    });
  });

  describe("analyzeFamilyDecolonialGap", () => {
    it("should detect missing decolonial header fields in parsed output", () => {
      const gap = analyzeFamilyDecolonialGap(familyContent);

      expect(gap).not.toBeNull();
      expect(gap!.layer).toBe("source-parser");
      expect(gap!.entityType).toBe("languageFamily");
      expect(gap!.field).toBe("decolonialHeader");
      expect(gap!.severity).toBe("medium");
    });

    it("should identify which fields are missing from parser output", () => {
      const gap = analyzeFamilyDecolonialGap(familyContent);
      expect(gap).not.toBeNull();
      // The FLG_BANTU file has all 6 decolonial fields but parser only extracts 3
      // Missing: Appellation(s) historique(s), Origine du terme historique,
      //          Lien avec la famille linguistique
      expect(gap!.description).toMatch(
        /Appellation|Origine du terme|Lien avec la famille/i
      );
    });

    it("should return null if all decolonial fields are extracted", () => {
      // Minimal content with only the 3 fields the parser handles
      const minimalContent = `# Famille linguistique

## HEADER DÉCOLONIAL (obligatoire)

- Identifiant famille linguistique (FLG_xxxxx) : FLG_TEST
- Nom français : Test
- Pourquoi le terme pose problème (si applicable) : Some issue
- Auto-appellation (locuteurs / linguistes contemporains) : Self name
- Usage contemporain (définition moderne de la famille) : Modern use

------------------------------------------

## MODÈLE STRUCTURÉ AFRIK

# 1. Informations générales
- Nom de la famille : Test
- Aire géographique : Africa
- Nombre de langues : 10
- Nombre total de locuteurs : environ 1 millions`;

      const gap = analyzeFamilyDecolonialGap(minimalContent);
      // Should be null since no extra fields exist in source that parser misses
      expect(gap).toBeNull();
    });
  });

  describe("analyzeCountryHistoricalFactsGap", () => {
    it("should always return a gap (known structural gap)", () => {
      const gap = analyzeCountryHistoricalFactsGap();

      expect(gap).toBeDefined();
      expect(gap.layer).toBe("parser-component");
      expect(gap.entityType).toBe("country");
      expect(gap.field).toBe("historicalFacts");
      expect(gap.severity).toBe("high");
    });

    it("should mention countryDataTransformer in the description", () => {
      const gap = analyzeCountryHistoricalFactsGap();
      expect(gap.description).toMatch(
        /transform|countryDataTransformer|UI|display/i
      );
    });
  });

  describe("analyzeCountryDemographicsGap", () => {
    it("should detect percentageInAfrica field in source but not parsed", () => {
      const gap = analyzeCountryDemographicsGap(countryContent);

      // BFA.txt contains "Pourcentage en Afrique" lines
      expect(gap).not.toBeNull();
      expect(gap!.layer).toBe("source-parser");
      expect(gap!.entityType).toBe("country");
      expect(gap!.field).toBe("percentageInAfrica");
      expect(gap!.severity).toBe("low");
    });

    it("should return null for content without percentageInAfrica", () => {
      const contentWithout = `# Nom du pays
- Nom officiel actuel : Test
- Identifiant pays (ISO 3166-1 alpha-3) : TST

# DONNÉES DÉMOGRAPHIQUES
### Peuple : TestPeople
- Population : 1000
- Pourcentage dans le pays : 100%`;

      const gap = analyzeCountryDemographicsGap(contentWithout);
      expect(gap).toBeNull();
    });
  });

  describe("analyzeEtymologyFragilityGap", () => {
    it("should return a static gap about regex fragility", () => {
      const gap = analyzeEtymologyFragilityGap();

      expect(gap).toBeDefined();
      expect(gap.layer).toBe("component-source");
      expect(gap.entityType).toBe("country");
      expect(gap.field).toBe("etymology");
      expect(gap.severity).toBe("medium");
    });

    it("should mention regex patterns in the description", () => {
      const gap = analyzeEtymologyFragilityGap();
      expect(gap.description).toMatch(/regex|pattern|French/i);
    });
  });

  describe("analyzeDistributionTypeGap", () => {
    it("should return a static gap about type mismatch", () => {
      const gap = analyzeDistributionTypeGap();

      expect(gap).toBeDefined();
      expect(gap.layer).toBe("parser-component");
      expect(gap.entityType).toBe("languageFamily");
      expect(gap.field).toBe("distribution.distributionByCountry");
      expect(gap.severity).toBe("medium");
    });

    it("should mention the type mismatch between string and Record", () => {
      const gap = analyzeDistributionTypeGap();
      expect(gap.description).toMatch(/string|Record|type/i);
    });
  });

  describe("analyzePeopleDemographyGap", () => {
    it("should detect missing country-level breakdown in parsed output", () => {
      const gap = analyzePeopleDemographyGap(peopleContent);

      // PPL_ZULU.txt has "Répartition par pays" in Section 7
      expect(gap).not.toBeNull();
      expect(gap!.layer).toBe("source-parser");
      expect(gap!.entityType).toBe("people");
      expect(gap!.field).toBe("demography.distributionByCountry");
      expect(gap!.severity).toBe("medium");
    });

    it("should return null for content without distribution data", () => {
      const minimalContent = `# Nom du peuple
- Nom principal du peuple : Test
- Identifiant peuple (ID) : PPL_TEST
- Famille linguistique principale : Test (FLG_TEST)
- Pays actuels : TST

# 7. Démographie globale
- Population totale (tous pays) : 100 000
- Année de référence : 2025
- Source : Test`;

      const gap = analyzePeopleDemographyGap(minimalContent);
      expect(gap).toBeNull();
    });
  });

  describe("analyzeAllGaps", () => {
    it("should return an array of CrossLayerGap objects", async () => {
      const gaps = await analyzeAllGaps();

      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
    });

    it("should include gaps from all three layers", async () => {
      const gaps = await analyzeAllGaps();

      const layers = new Set(gaps.map((g) => g.layer));
      expect(layers.has("source-parser")).toBe(true);
      expect(layers.has("parser-component")).toBe(true);
      expect(layers.has("component-source")).toBe(true);
    });

    it("should include gaps of all severity levels", async () => {
      const gaps = await analyzeAllGaps();

      const severities = new Set(gaps.map((g) => g.severity));
      expect(severities.has("high")).toBe(true);
      expect(severities.has("medium")).toBe(true);
      expect(severities.has("low")).toBe(true);
    });

    it("should return at least 5 gaps (the known structural issues)", async () => {
      const gaps = await analyzeAllGaps();
      // We know of at least: culture flat, decolonial missing, historicalFacts,
      // etymology regex, distribution type mismatch, plus dynamic ones
      expect(gaps.length).toBeGreaterThanOrEqual(5);
    });

    it("should have valid structure for every gap", async () => {
      const gaps = await analyzeAllGaps();

      for (const gap of gaps) {
        expect(gap.layer).toMatch(
          /^(source-parser|parser-component|component-source)$/
        );
        expect(gap.entityType).toMatch(/^(country|people|languageFamily)$/);
        expect(gap.field).toBeTruthy();
        expect(gap.severity).toMatch(/^(high|medium|low)$/);
        expect(gap.description).toBeTruthy();
        expect(gap.description.length).toBeGreaterThan(10);
      }
    });
  });
});
