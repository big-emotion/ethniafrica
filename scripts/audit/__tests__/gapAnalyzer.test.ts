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

// Paths to real data files (JSON format)
const DATASET_ROOT = path.resolve(__dirname, "../../../dataset/source/afrik");
const PEOPLE_FILE = path.join(DATASET_ROOT, "peuples/FLG_BANTU/PPL_ZULU.json");
const FAMILY_FILE = path.join(
  DATASET_ROOT,
  "famille_linguistique/FLG_BANTU.json"
);
const COUNTRY_FILE = path.join(DATASET_ROOT, "pays/BFA.json");

// Read real files once for all tests
const peopleContent = fs.readFileSync(PEOPLE_FILE, "utf-8");
const familyContent = fs.readFileSync(FAMILY_FILE, "utf-8");
const countryContent = fs.readFileSync(COUNTRY_FILE, "utf-8");

describe("Gap Analyzer", () => {
  describe("analyzePeopleCultureGap", () => {
    it("should return null for JSON files (culture structure is preserved in JSON)", () => {
      // With JSON source format, culture is already structured — gap resolved
      const gap = analyzePeopleCultureGap(peopleContent);
      expect(gap).toBeNull();
    });

    it("should return null for content without a culture section", () => {
      const minimalContent = JSON.stringify({
        id: "PPL_TEST",
        nameMain: "Test",
        languageFamilyId: "FLG_TEST",
        currentCountries: [],
        content: {},
      });

      const gap = analyzePeopleCultureGap(minimalContent);
      expect(gap).toBeNull();
    });
  });

  describe("analyzeFamilyDecolonialGap", () => {
    it("should return null for JSON files (all decolonial fields preserved in JSON)", () => {
      // With JSON source format, all 6 decolonial fields are present — gap resolved
      const gap = analyzeFamilyDecolonialGap(familyContent);
      expect(gap).toBeNull();
    });

    it("should return null for minimal JSON content", () => {
      const minimalContent = JSON.stringify({
        id: "FLG_TEST",
        nameFr: "Test",
        content: { decolonialHeader: null },
      });
      const gap = analyzeFamilyDecolonialGap(minimalContent);
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
    it("should return null for JSON files (percentageInAfrica field in JSON if present)", () => {
      // With JSON format, this specific TXT field pattern no longer exists — gap resolved
      const gap = analyzeCountryDemographicsGap(countryContent);
      expect(gap).toBeNull();
    });

    it("should return null for content without percentageInAfrica", () => {
      const contentWithout = JSON.stringify({
        id: "TST",
        nameFr: "Test",
        content: { demographics: null },
      });

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
    it("should return null for JSON files (distribution data in JSON if present)", () => {
      // With JSON format, Répartition par pays text pattern no longer exists — gap resolved
      const gap = analyzePeopleDemographyGap(peopleContent);
      expect(gap).toBeNull();
    });

    it("should return null for content without distribution data", () => {
      const minimalContent = JSON.stringify({
        id: "PPL_TEST",
        nameMain: "Test",
        content: { demography: { totalPopulation: 100000 } },
      });

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

    it("should include gaps from parser-component and component-source layers", async () => {
      const gaps = await analyzeAllGaps();

      const layers = new Set(gaps.map((g) => g.layer));
      // source-parser gaps are resolved by JSON migration
      expect(layers.has("parser-component")).toBe(true);
      expect(layers.has("component-source")).toBe(true);
    });

    it("should include gaps of multiple severity levels", async () => {
      const gaps = await analyzeAllGaps();

      const severities = new Set(gaps.map((g) => g.severity));
      expect(severities.has("high")).toBe(true);
      expect(severities.has("medium")).toBe(true);
    });

    it("should return at least 3 gaps (the known remaining structural issues)", async () => {
      const gaps = await analyzeAllGaps();
      // Remaining: historicalFacts not displayed, etymology fragility, distribution type mismatch
      expect(gaps.length).toBeGreaterThanOrEqual(3);
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
